/**
 * API del asistente (todo excepto el chat, que es una Edge Function).
 *
 * Público (sin login, con límite por IP):
 *   GET    /api/health
 *   GET    /api/me                     estado del asistente
 *   DELETE /api/sessions/:id           no-op (el historial vive en el navegador)
 *   GET    /api/materials              lista de guías PDF
 *   GET    /api/materials/:nombre      descarga
 *
 * Admin (solo con ADMIN_TOKEN, ver lib/auth.ts):
 *   POST   /api/materials              sube PDFs
 *   GET    /api/knowledge              árbol de guías
 *   GET|PUT|POST|DELETE /api/knowledge/file   leer/guardar/crear/eliminar guía
 *   POST   /api/ingest                 republica el paquete de guías
 */

import type { Config } from "@netlify/functions";

import { isAdmin, requireAdmin } from "../lib/auth.ts";
import { settings } from "../lib/env.ts";
import { errorResponse, HttpError, json } from "../lib/http.ts";
import {
  buildBundle,
  GUIDE_PREFIX,
  GUIDE_ROOT,
  guideKey,
  guidePath,
  loadBundle,
  PDF_PREFIX,
  pdfKey,
  pdfNameFromId,
  pdfTitle,
  pdfUrl,
  store,
} from "../lib/knowledge.ts";

// Las funciones de Netlify responden hasta ~6 MB; se deja margen.
const MAX_PDF_BYTES = 4.5 * 1024 * 1024;
const MAX_GUIDE_CHARS = 200_000;

type PdfMeta = { size?: number; modified?: string };

/* ---------- Materiales (PDF) ---------- */

async function listMaterials() {
  const blobs = store();
  const { blobs: items } = await blobs.list({ prefix: PDF_PREFIX });
  const materials = [];
  for (const item of items) {
    const name = item.key.slice(PDF_PREFIX.length);
    const meta = ((await blobs.getMetadata(item.key))?.metadata ?? {}) as PdfMeta;
    materials.push({ name, title: pdfTitle(name), size: meta.size ?? 0, modified: meta.modified ?? "", url: pdfUrl(name) });
  }
  materials.sort((a, b) => a.title.localeCompare(b.title, "es"));
  return { materials };
}

async function downloadMaterial(id: string): Promise<Response> {
  let key: string;
  try {
    key = pdfKey(pdfNameFromId(id));
  } catch {
    throw new HttpError(404, "El material no existe.");
  }
  const data = await store().get(key, { type: "arrayBuffer" });
  if (!data) throw new HttpError(404, "El material no existe.");
  const name = key.slice(PDF_PREFIX.length);
  return new Response(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function uploadMaterials(req: Request) {
  const form = await req.formData();
  const saved = [];
  const errors: string[] = [];
  for (const entry of form.getAll("files")) {
    if (typeof entry === "string") continue;
    try {
      const key = pdfKey(entry.name);
      const bytes = new Uint8Array(await entry.arrayBuffer());
      if (bytes.byteLength > MAX_PDF_BYTES) throw new Error(`${entry.name}: supera 4.5 MB.`);
      if (new TextDecoder().decode(bytes.slice(0, 4)) !== "%PDF") throw new Error(`${entry.name}: no es un PDF.`);
      const metadata: PdfMeta = { size: bytes.byteLength, modified: new Date().toISOString() };
      await store().set(key, bytes.buffer as ArrayBuffer, { metadata });
      const name = key.slice(PDF_PREFIX.length);
      saved.push({ name, title: pdfTitle(name), size: bytes.byteLength, url: pdfUrl(name) });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (saved.length === 0 && errors.length) throw new HttpError(400, errors.join(" "));
  return { saved, errors };
}

/* ---------- Guías (admin) ---------- */

function describeGuide(key: string, size: number, modified = "") {
  const path = guidePath(key);
  return { path, name: path.split("/").pop(), extension: ".md", size, modified, editable: true, protected: false };
}

async function knowledgeTree() {
  const blobs = store();
  const { blobs: items } = await blobs.list({ prefix: GUIDE_PREFIX });
  const files = [];
  for (const item of items.sort((a, b) => a.key.localeCompare(b.key))) {
    const meta = (await blobs.getMetadata(item.key))?.metadata as { size?: number; modified?: string } | undefined;
    files.push(describeGuide(item.key, meta?.size ?? 0, meta?.modified));
  }
  return {
    folders: [
      {
        id: "knowledge",
        title: "Guías curadas",
        description: "Guías del portal que usa el asistente. Los cambios se publican al guardar.",
        path: GUIDE_ROOT.replace(/\/$/, ""),
        files,
      },
    ],
  };
}

function keyFromPath(path: string | null): string {
  try {
    return guideKey(path ?? "");
  } catch {
    throw new HttpError(400, "Ruta de guía inválida.");
  }
}

async function saveGuide(key: string, content: string) {
  if (content.length > MAX_GUIDE_CHARS) throw new HttpError(400, "La guía es demasiado grande.");
  const blobs = store();
  const modified = new Date().toISOString();
  await blobs.set(key, content, { metadata: { size: new TextEncoder().encode(content).byteLength, modified } });
  await buildBundle(blobs);
  return describeGuide(key, content.length, modified);
}

async function readGuide(url: URL) {
  const key = keyFromPath(url.searchParams.get("path"));
  const content = await store().get(key, { type: "text" });
  if (content === null) throw new HttpError(404, "La guía no existe.");
  return { ...describeGuide(key, content.length), content };
}

async function createGuide(req: Request) {
  const body = await req.json().catch(() => ({}));
  const slug = String(body.name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
  if (!slug) throw new HttpError(400, "Nombre de archivo inválido.");
  const key = keyFromPath(`${slug}.md`);
  if ((await store().getMetadata(key)) !== null) throw new HttpError(400, "Ya existe una guía con ese nombre.");
  const title = slug.split("/").pop();
  return saveGuide(key, `---\ntitulo: ${title}\nmodulo: \nruta: \n---\n\n# ${title}\n\n`);
}

async function deleteGuide(url: URL) {
  const key = keyFromPath(url.searchParams.get("path"));
  const blobs = store();
  await blobs.delete(key);
  await buildBundle(blobs);
}

/* ---------- Router ---------- */

async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method;

  if (path === "/api/health" && method === "GET") return json({ status: "ok" });

  if (path === "/api/me" && method === "GET") {
    const bundle = await loadBundle();
    return json({
      is_admin: isAdmin(req),
      indexed_chunks: bundle.guides.length,
      llm_configured: Boolean(settings().anthropicApiKey),
    });
  }

  if (path.startsWith("/api/sessions/") && method === "DELETE") {
    return new Response(null, { status: 204 });
  }

  if (path === "/api/materials") {
    if (method === "GET") {
      return json(await listMaterials());
    }
    if (method === "POST") {
      requireAdmin(req);
      return json(await uploadMaterials(req));
    }
  }
  if (path.startsWith("/api/materials/") && method === "GET") {
    return downloadMaterial(path.slice("/api/materials/".length));
  }

  if (path === "/api/knowledge" && method === "GET") {
    requireAdmin(req);
    return json(await knowledgeTree());
  }
  if (path === "/api/knowledge/file") {
    requireAdmin(req);
    if (method === "GET") return json(await readGuide(url));
    if (method === "PUT") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.content !== "string") throw new HttpError(400, "Contenido inválido.");
      return json(await saveGuide(keyFromPath(body.path), body.content));
    }
    if (method === "POST") return json(await createGuide(req), 201);
    if (method === "DELETE") {
      await deleteGuide(url);
      return new Response(null, { status: 204 });
    }
  }
  if (path === "/api/knowledge/upload" && method === "POST") {
    requireAdmin(req);
    throw new HttpError(400, "En esta versión solo se crean y editan guías .md desde el editor.");
  }
  if (path === "/api/ingest" && method === "POST") {
    requireAdmin(req);
    const bundle = await buildBundle(store());
    return json({ documents: bundle.guides.length, chunks: bundle.guides.length });
  }

  throw new HttpError(404, "Ruta no encontrada.");
}

export default async (req: Request): Promise<Response> => {
  try {
    return await route(req);
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = {
  path: "/api/*",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
