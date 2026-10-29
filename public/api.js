/** Llamadas a la API del asistente (mismo sitio: Netlify Functions en /api/*). */

import { CONFIG } from "./config.js";

export function apiUrl(path) {
  return `${CONFIG.API_BASE_URL.replace(/\/$/, "")}${path}`;
}

const DEVICE_KEY = "damian.device";
// sessionStorage: el token de administrador se olvida al cerrar la pestaña.
const ADMIN_KEY = "damian.admin";

export function getAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAdminToken(token) {
  try {
    if (token) sessionStorage.setItem(ADMIN_KEY, token);
    else sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    // Sin almacenamiento: el acceso de administrador no se conserva.
  }
}

/** Identificador anónimo y aleatorio de este navegador (para contar dispositivos). */
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "sin-almacenamiento";
  }
}

export function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  headers.set("X-Device-Id", deviceId());
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...options, headers });
}

/** Registra la visita (una vez por carga de página); si falla no afecta la app. */
export function trackVisit() {
  apiFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "visit" }),
    keepalive: true,
  }).catch(() => {});
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
