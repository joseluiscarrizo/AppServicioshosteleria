// errorHandler.ts - Consistent error response formatting

export interface ErrorResponse {
  error: string;
  code?: string;
}

/** Return a standardized JSON error response. */
export function errorResponse(
  message: string,
  status: number,
  code?: string,
): Response {
  const body: ErrorResponse = { error: message };
  if (code) body.code = code;
  return Response.json(body, { status });
}

/** Return a 400 Bad Request response. */
export function badRequest(message: string, code?: string): Response {
  return errorResponse(message, 400, code);
}

/** Return a 401 Unauthorized response. */
export function unauthorized(message = "No autorizado"): Response {
  return errorResponse(message, 401);
}

/** Return a 403 Forbidden response. */
export function forbidden(message = "Acceso denegado"): Response {
  return errorResponse(message, 403);
}

/** Return a 404 Not Found response. */
export function notFound(message = "Recurso no encontrado"): Response {
  return errorResponse(message, 404);
}

/** Return a 500 Internal Server Error response. */
export function internalError(message = "Error interno del servidor"): Response {
  return errorResponse(message, 500);
}
