/**
 * Registro de actividad en Netlify Database (Postgres) y consultas del backoffice.
 *
 * Usa el driver HTTP de Neon para funcionar igual en la Edge Function (Deno) y en las
 * Functions (Node). Registrar nunca debe romper el chat: los errores solo se registran en logs.
 */

import { neon } from "@neondatabase/serverless";

import { env } from "./env.ts";

type Sql = ReturnType<typeof neon>;
let client: Sql | null = null;

function db(): Sql | null {
  const url = env("NETLIFY_DB_URL");
  if (!url) return null;
  client ??= neon(url);
  return client;
}

/* ---------- Contexto del dispositivo ---------- */

export type Geo = { country?: { code?: string; name?: string }; city?: string };

export type ClientInfo = {
  deviceId: string;
  conversationId: string | null;
  deviceType: string;
  browser: string;
  os: string;
  country: string | null;
  city: string | null;
};

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

function deviceType(ua: string): string {
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

function browser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Otro";
}

function os(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Otro";
}

export function clientInfo(req: Request, geo?: Geo): ClientInfo {
  const ua = req.headers.get("user-agent") ?? "";
  const device = req.headers.get("x-device-id") ?? "";
  const conversation = req.headers.get("x-conversation-id") ?? "";
  return {
    deviceId: SAFE_ID.test(device) ? device : "desconocido",
    conversationId: SAFE_ID.test(conversation) ? conversation : null,
    deviceType: deviceType(ua),
    browser: browser(ua),
    os: os(ua),
    country: geo?.country?.name ?? geo?.country?.code ?? null,
    city: geo?.city ?? null,
  };
}

/* ---------- Registro ---------- */

export type EventInput = {
  type: "visit" | "question" | "download";
  client: ClientInfo;
  question?: string;
  answer?: string;
  relatedGuides?: string[];
  status?: "ok" | "no_guide" | "refusal" | "error";
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  pdfName?: string;
};

const MAX_TEXT = 8_000;

export async function recordEvent(event: EventInput): Promise<void> {
  const sql = db();
  if (!sql) return;
  const c = event.client;
  try {
    await sql.query(
      `INSERT INTO events (type, device_id, conversation_id, device_type, browser, os, country, city,
         question, answer, related_guides, status, latency_ms, input_tokens, output_tokens,
         cache_read_tokens, pdf_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        event.type,
        c.deviceId,
        c.conversationId,
        c.deviceType,
        c.browser,
        c.os,
        c.country,
        c.city,
        event.question?.slice(0, MAX_TEXT) ?? null,
        event.answer?.slice(0, MAX_TEXT) ?? null,
        event.relatedGuides ?? null,
        event.status ?? null,
        event.latencyMs ?? null,
        event.inputTokens ?? null,
        event.outputTokens ?? null,
        event.cacheReadTokens ?? null,
        event.pdfName ?? null,
      ],
    );
  } catch (error) {
    console.error("No se pudo registrar el evento", error);
  }
}

/* ---------- Backoffice ---------- */

type Row = Record<string, unknown>;

const num = (value: unknown) => Number(value ?? 0);

export async function stats(days: number) {
  const sql = db();
  if (!sql) throw new Error("Base de datos no configurada.");
  const since = `${days} days`;

  const [kpis, perDay, devices, countries, guides, pdfs, recent] = (await Promise.all([
    sql.query(
      `SELECT
         COUNT(DISTINCT device_id) FILTER (WHERE created_at > now() - interval '5 minutes')  AS devices_now,
         COUNT(DISTINCT device_id) FILTER (WHERE created_at > now() - interval '24 hours')   AS devices_24h,
         COUNT(DISTINCT device_id)                                                           AS devices_period,
         COUNT(*) FILTER (WHERE type = 'question')                                           AS questions,
         COUNT(*) FILTER (WHERE type = 'download')                                           AS downloads,
         COUNT(DISTINCT conversation_id) FILTER (WHERE type = 'question')                    AS conversations,
         ROUND(AVG(latency_ms) FILTER (WHERE type = 'question' AND status <> 'error'))       AS avg_latency_ms,
         COUNT(*) FILTER (WHERE type = 'question' AND status = 'no_guide')                   AS no_guide,
         COUNT(*) FILTER (WHERE type = 'question' AND status = 'error')                      AS errors,
         COALESCE(SUM(input_tokens), 0)                                                      AS input_tokens,
         COALESCE(SUM(output_tokens), 0)                                                     AS output_tokens,
         COALESCE(SUM(cache_read_tokens), 0)                                                 AS cache_read_tokens
       FROM events WHERE created_at > now() - $1::interval`,
      [since],
    ),
    sql.query(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD') AS day,
              COUNT(*) FILTER (WHERE type = 'question') AS questions,
              COUNT(DISTINCT device_id) AS devices
       FROM events WHERE created_at > now() - $1::interval
       GROUP BY 1 ORDER BY 1`,
      [since],
    ),
    sql.query(
      `SELECT COALESCE(device_type, 'desconocido') AS label, COUNT(DISTINCT device_id) AS value
       FROM events WHERE created_at > now() - $1::interval GROUP BY 1 ORDER BY 2 DESC`,
      [since],
    ),
    sql.query(
      `SELECT COALESCE(country, 'Desconocido') AS label, COUNT(DISTINCT device_id) AS value
       FROM events WHERE created_at > now() - $1::interval GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      [since],
    ),
    sql.query(
      `SELECT guide AS label, COUNT(*) AS value
       FROM events, unnest(related_guides) AS guide
       WHERE type = 'question' AND created_at > now() - $1::interval
       GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      [since],
    ),
    sql.query(
      `SELECT pdf_name AS label, COUNT(*) AS value
       FROM events WHERE type = 'download' AND created_at > now() - $1::interval
       GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      [since],
    ),
    sql.query(
      `SELECT created_at, question, left(answer, 600) AS answer, related_guides, status, latency_ms,
              device_type, browser, os, country, city, left(device_id, 8) AS device
       FROM events WHERE type = 'question' AND created_at > now() - $1::interval
       ORDER BY created_at DESC LIMIT 100`,
      [since],
    ),
  ])) as Row[][];

  const k = kpis[0] ?? {};
  const series = (rows: Row[]) => rows.map((row) => ({ label: String(row.label), value: num(row.value) }));
  return {
    days,
    generated_at: new Date().toISOString(),
    kpis: {
      devices_now: num(k.devices_now),
      devices_24h: num(k.devices_24h),
      devices_period: num(k.devices_period),
      questions: num(k.questions),
      conversations: num(k.conversations),
      downloads: num(k.downloads),
      avg_latency_ms: num(k.avg_latency_ms),
      no_guide: num(k.no_guide),
      errors: num(k.errors),
      input_tokens: num(k.input_tokens),
      output_tokens: num(k.output_tokens),
      cache_read_tokens: num(k.cache_read_tokens),
    },
    per_day: perDay.map((row) => ({ day: String(row.day), questions: num(row.questions), devices: num(row.devices) })),
    device_types: series(devices),
    countries: series(countries),
    guides: series(guides),
    pdfs: series(pdfs),
    recent: recent.map((row) => ({
      created_at: row.created_at,
      question: row.question,
      answer: row.answer,
      related_guides: row.related_guides ?? [],
      status: row.status,
      latency_ms: row.latency_ms,
      device_type: row.device_type,
      browser: row.browser,
      os: row.os,
      country: row.country,
      city: row.city,
      device: row.device,
    })),
  };
}
