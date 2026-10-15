/**
 * Base de conocimiento en Netlify Blobs (privada; no vive en el repositorio).
 *
 * Store "tcplus":
 *   guides/<carpeta>/<archivo>.md   guías curadas con frontmatter (editables por admins)
 *   pdf/<nombre>.pdf                 guías oficiales en PDF para descarga
 *   bundle.json                      todas las guías ya procesadas, listas para el prompt
 */

import { getStore } from "@netlify/blobs";

export const STORE_NAME = "tcplus";
export const GUIDE_PREFIX = "guides/";
export const PDF_PREFIX = "pdf/";
const BUNDLE_KEY = "bundle.json";
/** Ruta visible de una guía (la que el agente cita en `Fuentes:`). */
export const GUIDE_ROOT = "knowledge/portal-web/";

export type Store = ReturnType<typeof getStore>;

export type Guide = {
  path: string;
  titulo: string;
  modulo: string;
  ruta: string;
  pdf: string[];
  body: string;
};

export type Bundle = { guides: Guide[]; updatedAt: string };

export function store(): Store {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

/* ---------- Frontmatter (subconjunto YAML: `clave: valor` y listas `  - item`) ---------- */

export function parseFrontmatter(text: string): { meta: Record<string, string | string[]>; body: string } {
  if (!text.startsWith("---")) return { meta: {}, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: text };

  const meta: Record<string, string | string[]> = {};
  let currentKey = "";
  for (const line of text.slice(3, end).split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && currentKey) {
      const list = Array.isArray(meta[currentKey]) ? (meta[currentKey] as string[]) : [];
      list.push(item[1].trim());
      meta[currentKey] = list;
      continue;
    }
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (pair) {
      currentKey = pair[1];
      meta[currentKey] = pair[2].trim();
    }
  }
  return { meta, body: text.slice(end + 4).replace(/^\n+/, "") };
}

function asText(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

function asList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/* ---------- Guías ---------- */

const SAFE_GUIDE = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*\.md$/i;

/** "knowledge/portal-web/02-combustible/x.md" -> "guides/02-combustible/x.md" (validada). */
export function guideKey(path: string): string {
  const relative = path.startsWith(GUIDE_ROOT) ? path.slice(GUIDE_ROOT.length) : path;
  if (!SAFE_GUIDE.test(relative) || relative.includes("..")) {
    throw new Error("Ruta de guía inválida.");
  }
  return GUIDE_PREFIX + relative;
}

export function guidePath(key: string): string {
  return GUIDE_ROOT + key.slice(GUIDE_PREFIX.length);
}

export async function listGuideKeys(blobs: Store): Promise<string[]> {
  const { blobs: items } = await blobs.list({ prefix: GUIDE_PREFIX });
  return items.map((item) => item.key).sort();
}

export async function buildBundle(blobs: Store): Promise<Bundle> {
  const guides: Guide[] = [];
  for (const key of await listGuideKeys(blobs)) {
    const text = await blobs.get(key, { type: "text" });
    if (text === null) continue;
    const { meta, body } = parseFrontmatter(text);
    guides.push({
      path: guidePath(key),
      titulo: asText(meta.titulo) || key,
      modulo: asText(meta.modulo),
      ruta: asText(meta.ruta),
      pdf: asList(meta.pdf).map((name) => name.normalize("NFC")),
      body: body.trim(),
    });
  }
  const bundle: Bundle = { guides, updatedAt: new Date().toISOString() };
  await blobs.setJSON(BUNDLE_KEY, bundle);
  bundleCache = { expires: Date.now() + BUNDLE_TTL_MS, bundle };
  return bundle;
}

const BUNDLE_TTL_MS = 60_000;
let bundleCache: { expires: number; bundle: Bundle } | null = null;

export async function loadBundle(blobs: Store = store()): Promise<Bundle> {
  if (bundleCache && bundleCache.expires > Date.now()) return bundleCache.bundle;
  const bundle = ((await blobs.get(BUNDLE_KEY, { type: "json" })) as Bundle | null) ?? (await buildBundle(blobs));
  bundleCache = { expires: Date.now() + BUNDLE_TTL_MS, bundle };
  return bundle;
}

/** Texto de todas las guías para el system prompt (estable entre peticiones: se cachea). */
export function renderKnowledge(bundle: Bundle): string {
  const parts = bundle.guides.map((guide) => {
    const header = [`<guia archivo="${guide.path}">`, `Título: ${guide.titulo}`];
    if (guide.modulo) header.push(`Módulo: ${guide.modulo}`);
    if (guide.ruta) header.push(`Ruta en el portal: ${guide.ruta}`);
    return `${header.join("\n")}\n\n${guide.body}\n</guia>`;
  });
  return `<guias_del_portal>\n${parts.join("\n\n")}\n</guias_del_portal>`;
}

/* ---------- PDFs ---------- */

const PDF_TITLE_PREFIX = /^TC\+_Gu[ií]a_\s*/i;

export function pdfTitle(filename: string): string {
  const stem = filename.normalize("NFC").replace(/\.pdf$/i, "");
  const title = stem
    .replace(PDF_TITLE_PREFIX, "")
    .replace("yo_o", "y/o")
    .replace(/_/g, " ")
    .replace(/\s*\(\d+\)/g, "")
    .replace("-combinado", " (guía completa)");
  return title.replace(/^[\s.]+|[\s.]+$/g, "") || stem;
}

/**
 * El nombre del PDF va en la URL como base64url (solo ASCII): el enrutador de Netlify altera
 * rutas con `+` o acentos (p. ej. "TC+_Guía_..."), así que no se usa el nombre tal cual.
 */
export function pdfId(filename: string): string {
  const bytes = new TextEncoder().encode(filename.normalize("NFC"));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pdfNameFromId(id: string): string {
  const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function pdfUrl(filename: string): string {
  return `/api/materials/${pdfId(filename)}`;
}

export function pdfKey(filename: string): string {
  const name = filename.normalize("NFC");
  if (!/\.pdf$/i.test(name) || name.includes("/") || name.includes("\\") || name.startsWith(".")) {
    throw new Error("Nombre de PDF inválido.");
  }
  return PDF_PREFIX + name;
}
