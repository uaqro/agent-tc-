/**
 * POST /api/chat/stream — responde en streaming (SSE) cómo operar el portal Ticket Car+.
 *
 * Corre como Edge Function: no tiene el límite de 10-26 s de las funciones normales mientras
 * la respuesta siga fluyendo. Todas las guías van en el system prompt (cacheado), así que no
 * hace falta un paso de búsqueda.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "@netlify/edge-functions";

import { settings } from "../lib/env.ts";
import { SYSTEM_PROMPT } from "../lib/guidelines.ts";
import { errorResponse, HttpError } from "../lib/http.ts";
import { type Bundle, loadBundle, pdfTitle, pdfUrl, renderKnowledge } from "../lib/knowledge.ts";

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

/** Guías citadas en la respuesta y sus PDFs descargables. */
function citations(answer: string, bundle: Bundle) {
  const cited = bundle.guides.filter((guide) => answer.includes(guide.path));
  const seen = new Set<string>();
  const downloads = [];
  for (const guide of cited) {
    for (const name of guide.pdf) {
      if (seen.has(name)) continue;
      seen.add(name);
      downloads.push({ name, title: pdfTitle(name), url: pdfUrl(name) });
    }
  }
  return { sources: cited.map((guide) => guide.path), downloads };
}

export default async (req: Request): Promise<Response> => {
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

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      // Primer byte inmediato: las Edge Functions deben empezar a responder en < 40 s.
      controller.enqueue(encoder.encode(": ok\n\n"));

      let answer = "";
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
        const { sources, downloads } = citations(answer, bundle);
        send({ type: "sources", sources });
        send({ type: "downloads", downloads });
        send({ type: "done" });
      } catch (error) {
        console.error("chat error", error);
        const message =
          error instanceof Anthropic.RateLimitError
            ? "El asistente está saturado. Intenta de nuevo en un momento."
            : "Ocurrió un error al procesar tu mensaje.";
        send({ type: "error", message });
      } finally {
        controller.close();
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
