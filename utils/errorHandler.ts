/**
 * errorHandler.ts - Hierarchical error classes for robust error handling.
 *
 * Provides a structured error hierarchy with:
 * - Consistent error codes and HTTP status codes
 * - Retryable vs non-retryable classification
 * - Structured toResponse() for uniform API error responses
 */

export interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  retryable: boolean;
  timestamp: string;
  details?: Record<string, unknown>;
}

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly retryable: boolean;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toResponse(): ErrorResponse {
    const response: ErrorResponse = {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: new Date().toISOString(),
    };
    if (this.details) {
      response.details = this.details;
    }
    return response;
  }
}

/** 400 - Input validation failed; not retryable */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly retryable = false;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** 401 - Authentication required; retryable after re-auth */
export class AuthenticationError extends AppError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
  readonly retryable = true;

  constructor(message = 'Authentication required') {
    super(message);
  }
}

/** 403 - Access denied to a resource; not retryable */
export class AuthorizationError extends AppError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
  readonly retryable = false;

  constructor(resource?: string) {
    super(resource ? `Access denied to resource: ${resource}` : 'Access denied');
  }
}

/** 404 - Resource not found; not retryable */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND_ERROR';
  readonly statusCode = 404;
  readonly retryable = false;

  constructor(resource?: string) {
    super(resource ? `Resource not found: ${resource}` : 'Resource not found');
  }
}

/** 429 - Rate limit exceeded; retryable after back-off */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly statusCode = 429;
  readonly retryable = true;

  constructor(message = 'Rate limit exceeded') {
    super(message);
  }
}

/** 500 - Database operation failed; retryable */
export class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
  readonly retryable = true;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** 503 - External service unavailable; retryable */
export class ExternalServiceError extends AppError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 503;
  readonly retryable = true;

  constructor(service?: string) {
    super(service ? `External service error: ${service}` : 'External service unavailable');
  }
}

/**
 * Convert any caught value into a structured ErrorResponse.
 * If the error is already an AppError its toResponse() is used;
 * otherwise a generic INTERNAL_ERROR response is returned.
 * Stack traces are never included in the response.
 */
export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return error.toResponse();
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
    retryable: false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a Deno-compatible Response from any caught error.
 * @param error - The caught error value.
 * @param defaultStatus - HTTP status to use when the error is not an AppError.
 */
export function handleWebhookError(error: unknown, defaultStatus = 500): Response {
  if (error instanceof AppError) {
    const body = error.toResponse();
    return Response.json(body, { status: body.statusCode });
  }
  const body: ErrorResponse = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: defaultStatus,
    retryable: false,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status: defaultStatus });
}
