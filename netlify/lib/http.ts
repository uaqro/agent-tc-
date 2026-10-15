export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

/** Convierte cualquier error en una respuesta JSON `{detail}` sin filtrar detalles internos. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const headers: Record<string, string> = error.status === 401 ? { "WWW-Authenticate": "Bearer" } : {};
    return json({ detail: error.message }, error.status, headers);
  }
  console.error(error);
  return json({ detail: "Error interno del servidor." }, 500);
}
