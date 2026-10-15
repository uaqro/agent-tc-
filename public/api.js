/** Llamadas a la API del asistente (mismo sitio: Netlify Functions en /api/*). */

import { CONFIG } from "./config.js";

export function apiUrl(path) {
  return `${CONFIG.API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), options);
}

/** Descarga un archivo de la API como blob y lo guarda con su nombre original. */
export async function downloadFile(path, filename) {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error(`No se pudo descargar (${response.status}).`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
