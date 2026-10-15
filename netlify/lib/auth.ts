/**
 * Acceso. El asistente es público (sin login): el chat y la descarga de PDFs no piden sesión
 * y se protegen con límite de peticiones por IP (ver `config.rateLimit` en cada función).
 *
 * Las funciones de administración (editar guías, subir PDFs, publicar) solo se habilitan si
 * existe la variable `ADMIN_TOKEN` y la petición trae `Authorization: Bearer <ADMIN_TOKEN>`.
 * Sin esa variable quedan desactivadas; las guías se actualizan con `npm run seed`.
 */

import { env } from "./env.ts";
import { HttpError } from "./http.ts";

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export function isAdmin(req: Request): boolean {
  const token = env("ADMIN_TOKEN");
  const header = req.headers.get("authorization") ?? "";
  return Boolean(token) && header.toLowerCase().startsWith("bearer ") && timingSafeEqual(header.slice(7).trim(), token);
}

export function requireAdmin(req: Request): void {
  if (!isAdmin(req)) throw new HttpError(403, "Función de administración no disponible.");
}
