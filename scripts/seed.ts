/**
 * Carga (o actualiza) las guías y los PDF en Netlify Blobs. No sube nada al repositorio.
 *
 *   NETLIFY_SITE_ID=... NETLIFY_AUTH_TOKEN=... node scripts/seed.ts \
 *     --guides ../backend/knowledge/portal-web --pdfs ../backend/knowledge_pdf
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { parseArgs } from "node:util";

import { getStore } from "@netlify/blobs";

import { buildBundle, guideKey, PDF_PREFIX, pdfKey, STORE_NAME } from "../netlify/lib/knowledge.ts";

const { values } = parseArgs({ options: { guides: { type: "string" }, pdfs: { type: "string" } } });
const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!siteID || !token) throw new Error("Define NETLIFY_SITE_ID y NETLIFY_AUTH_TOKEN.");

const blobs = getStore({ name: STORE_NAME, siteID, token, consistency: "strong" });

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : Promise.resolve([join(dir, entry.name)]))),
  );
  return files.flat();
}

const now = new Date().toISOString();

if (values.guides) {
  const files = (await walk(values.guides)).filter((file) => file.endsWith(".md"));
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const key = guideKey(relative(values.guides, file).split(sep).join("/"));
    await blobs.set(key, content, { metadata: { size: Buffer.byteLength(content), modified: now } });
    console.log("guía", key);
  }
}

if (values.pdfs) {
  // Reemplaza todos los PDF (también limpia claves de formatos anteriores).
  const { blobs: old } = await blobs.list({ prefix: PDF_PREFIX });
  for (const item of old) await blobs.delete(item.key);

  const files = (await readdir(values.pdfs)).filter((name) => name.toLowerCase().endsWith(".pdf"));
  for (const name of files) {
    const data = await readFile(join(values.pdfs, name));
    const key = pdfKey(name);
    await blobs.set(key, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer, {
      metadata: { name: name.normalize("NFC"), size: data.byteLength, modified: now },
    });
    console.log("pdf ", name, `${Math.round(data.byteLength / 1024)} KB`);
  }
}

const bundle = await buildBundle(blobs);
console.log(`Paquete publicado: ${bundle.guides.length} guías.`);
