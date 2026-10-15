/**
 * POST /api/chat/stream — responde en streaming (SSE) cómo operar el portal Ticket Car+.
 *
 * Corre como Edge Function: no tiene el límite de 10-26 s de las funciones normales mientras
 * la respuesta siga fluyendo. Todas las guías van en el system prompt (cacheado), así que no
 * hace falta un paso de búsqueda.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Config, Context } from "@netlify/edge-functions";

import { clientInfo, recordEvent } from "../lib/analytics.ts";
import { settings } from "../lib/env.ts";
import { SYSTEM_PROMPT } from "../lib/guidelines.ts";
import { errorResponse, HttpError } from "../lib/http.ts";
import { type Bundle, type Guide, loadBundle, pdfTitle, pdfUrl, renderKnowledge } from "../lib/knowledge.ts";

const MAX_MESSAGE_CHARS = 8_000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARS = 20_000;

type ChatBody = { message?: unknown; history?: unknown };

/** Historial que manda el navegador -> mensajes válidos (alternados, empezando por usuario). */
function toMessages(body: ChatBody): Anthropic.MessageParam[] {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    throw new HttpError(400, "El mensaje está vacío o es demasiado largo.");
  }

  const raw = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_MESSAGES) : [];
  const messages: Anthropic.MessageParam[] = [];
  for (const item of raw) {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = typeof item?.content === "string" ? item.content.slice(0, MAX_HISTORY_CHARS).trim() : "";
    if (!role || !content) continue;
    if (messages.length === 0 && role !== "user") continue;
    const last = messages.at(-1);
    if (last && last.role === role) {
      last.content = `${last.content}\n\n${content}`;
    } else {
      messages.push({ role, content });
    }
  }
  if (messages.at(-1)?.role === "user") messages.pop();
  messages.push({ role: "user", content: message });
  return messages;
}

function normalize(text: string, dropParentheses = false): string {
  let value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (dropParentheses) value = value.replace(/\([^)]*\)/g, " ");
  return value.replace(/\s+/g, " ").trim();
}

/** Guías que la respuesta nombra en su línea final "Guía relacionada: ..." (máximo dos). */
function relatedGuides(answer: string, bundle: Bundle): Guide[] {
  const marker = normalize(answer).lastIndexOf("guia relacionada");
  if (marker === -1) return [];
  const line = normalize(answer).slice(marker);
  // Primero el título exacto; si el modelo lo abrevió, sin el texto entre paréntesis.
  let related = bundle.guides.filter((guide) => line.includes(normalize(guide.titulo)));
  if (related.length === 0) {
    const loose = normalize(line, true);
    const matches = bundle.guides.filter((guide) => loose.includes(normalize(guide.titulo, true)));
    // Si un título está contenido en otro también encontrado, gana el más específico.
    related = matches.filter(
      (guide) =>
        !matches.some(
          (other) => other !== guide && normalize(other.titulo, true).includes(normalize(guide.titulo, true)),
        ),
    );
  }

  return related.slice(0, 2);
}

function downloadsFor(guides: Guide[]) {
  const seen = new Set<string>();
  const downloads = [];
  for (const guide of guides) {
    for (const name of guide.pdf) {
      if (seen.has(name)) continue;
      seen.add(name);
      downloads.push({ name, title: pdfTitle(name), url: pdfUrl(name) });
    }
  }
  return downloads;
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== "POST") return errorResponse(new HttpError(405, "Método no permitido."));

  let messages: Anthropic.MessageParam[];
  let bundle: Bundle;
  try {
    messages = toMessages((await req.json().catch(() => ({}))) as ChatBody);
    bundle = await loadBundle();
  } catch (error) {
    return errorResponse(error);
  }
  // Sin guías el modelo respondería sin fuente: mejor avisarlo que inventar.
  if (bundle.guides.length === 0) {
    return errorResponse(new HttpError(503, "La base de conocimiento aún no está cargada."));
  }

  const config = settings();
  if (!config.anthropicApiKey) return errorResponse(new HttpError(503, "El asistente no está configurado."));
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const encoder = new TextEncoder();
  const device = clientInfo(req, context.geo);
  const question = String((messages.at(-1)?.content as string) ?? "");
  const startedAt = Date.now();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      // Primer byte inmediato: las Edge Functions deben empezar a responder en < 40 s.
      controller.enqueue(encoder.encode(": ok\n\n"));

      let answer = "";
      let record: Parameters<typeof recordEvent>[0] = { type: "question", client: device, question };
      try {
        const stream = client.messages.stream({
          model: config.anthropicModel,
          max_tokens: config.anthropicMaxTokens,
          system: [
            { type: "text", text: SYSTEM_PROMPT },
            { type: "text", text: renderKnowledge(bundle), cache_control: { type: "ephemeral" } },
          ],
          messages,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            answer += event.delta.text;
            send({ type: "token", text: event.delta.text });
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "token", text: answer ? "" : "No puedo ayudarte con esa solicitud." });
        }
        const guides = relatedGuides(answer, bundle);
        send({ type: "downloads", downloads: downloadsFor(guides) });
        send({ type: "done" });
        record = {
          ...record,
          answer,
          relatedGuides: guides.map((guide) => guide.titulo),
          status: final.stop_reason === "refusal" ? "refusal" : guides.length ? "ok" : "no_guide",
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
          cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
        };
      } catch (error) {
        console.error("chat error", error);
        const message =
          error instanceof Anthropic.RateLimitError
            ? "El asistente está saturado. Intenta de nuevo en un momento."
            : "Ocurrió un error al procesar tu mensaje.";
        send({ type: "error", message });
        record = { ...record, answer, status: "error" };
      } finally {
        controller.close();
        // Se guarda después de responder, sin hacer esperar al usuario.
        context.waitUntil(recordEvent({ ...record, latencyMs: Date.now() - startedAt }));
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "X-Accel-Buffering": "no",
    },
  });
};

export const config: Config = {
  path: "/api/chat/stream",
  // Sin login: se limita por IP para controlar el gasto del modelo.
  rateLimit: { windowLimit: 15, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
