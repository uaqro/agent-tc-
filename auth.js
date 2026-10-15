/** Sesión con Supabase Auth y llamadas autenticadas al backend. */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "./config.js";

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY);

let onSignedOut = () => {};

export function setSignedOutHandler(handler) {
  onSignedOut = handler;
}

export async function currentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  onSignedOut();
}

export function apiUrl(path) {
  return `${CONFIG.API_BASE_URL.replace(/\/$/, "")}${path}`;
}

/** `fetch` al backend con el token de la sesión. Si el token ya no es válido, cierra sesión. */
export async function apiFetch(path, options = {}) {
  const session = await currentSession();
  if (!session) {
    onSignedOut();
    throw new Error("Inicia sesión para continuar.");
  }
  const headers = new Headers(options.headers ?? {});
  headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(apiUrl(path), { ...options, headers });
  if (response.status === 401) {
    await signOut();
    throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  }
  return response;
}

/** Descarga un archivo protegido (no se puede con un <a href> porque requiere el token). */
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
