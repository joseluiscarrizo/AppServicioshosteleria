/**
 * webhookImprovements - Módulo de mejoras para manejo de errores y validación.
 *
 * Provides a browser-compatible error class hierarchy and a structured
 * handleWebhookError() that returns a typed error object instead of a plain string.
 */

/** Base class for all application errors. */
export class AppError extends Error {
  constructor(message, details) {
    super(message);
    this.name = this.constructor.name;
    if (details !== undefined) {
      this.details = details;
    }
  }

  toResponse() {
    const response = {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: new Date().toISOString(),
    };
    if (this.details !== undefined) {
      response.details = this.details;
    }
    return response;
  }
}

/** 400 - Input validation failed; not retryable */
export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, details);
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
    this.retryable = false;
  }
}

/** 401 - Authentication required; retryable after re-auth */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message);
    this.code = 'AUTHENTICATION_ERROR';
    this.statusCode = 401;
    this.retryable = true;
  }
}

/** 403 - Access denied to a resource; not retryable */
export class AuthorizationError extends AppError {
  constructor(resource) {
    super(resource ? `Access denied to resource: ${resource}` : 'Access denied');
    this.code = 'AUTHORIZATION_ERROR';
    this.statusCode = 403;
    this.retryable = false;
  }
}

/** 404 - Resource not found; not retryable */
export class NotFoundError extends AppError {
  constructor(resource) {
    super(resource ? `Resource not found: ${resource}` : 'Resource not found');
    this.code = 'NOT_FOUND_ERROR';
    this.statusCode = 404;
    this.retryable = false;
  }
}

/** 429 - Rate limit exceeded; retryable after back-off */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.code = 'RATE_LIMIT_ERROR';
    this.statusCode = 429;
    this.retryable = true;
  }
}

/** 500 - Database operation failed; retryable */
export class DatabaseError extends AppError {
  constructor(message, details) {
    super(message, details);
    this.code = 'DATABASE_ERROR';
    this.statusCode = 500;
    this.retryable = true;
  }
}

/** 503 - External service unavailable; retryable */
export class ExternalServiceError extends AppError {
  constructor(service) {
    super(service ? `External service error: ${service}` : 'External service unavailable');
    this.code = 'EXTERNAL_SERVICE_ERROR';
    this.statusCode = 503;
    this.retryable = true;
  }
}

/**
 * Map an error code string to the legacy `type` string used by AuthContext.
 * @param {string} code - AppError code.
 * @returns {string}
 */
function codeToType(code) {
  const mapping = {
    AUTHENTICATION_ERROR: 'auth_required',
    AUTHORIZATION_ERROR: 'auth_required',
    VALIDATION_ERROR: 'validation_error',
    NOT_FOUND_ERROR: 'not_found',
    DATABASE_ERROR: 'database_error',
    EXTERNAL_SERVICE_ERROR: 'external_service_error',
    RATE_LIMIT_ERROR: 'rate_limit_error',
  };
  return mapping[code] || 'unknown';
}

/**
 * Handles errors and returns a structured error descriptor.
 *
 * @param {Error | AppError | unknown} error - The error to handle.
 * @returns {{ code: string, type: string, message: string, statusCode: number, retryable: boolean, timestamp: string, details?: object }}
 */
export function handleWebhookError(error) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      type: codeToType(error.code),
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      timestamp: new Date().toISOString(),
      ...(error.details !== undefined ? { details: error.details } : {}),
    };
  }

  // Handle HTTP-like errors (e.g., from the base44 SDK)
  if (error && typeof error === 'object') {
    const status = error.status ?? error.statusCode;
    if (status === 401 || status === 403) {
      return {
        code: 'AUTHENTICATION_ERROR',
        type: 'auth_required',
        message: error.message || 'Authentication required',
        statusCode: status,
        retryable: true,
        timestamp: new Date().toISOString(),
      };
    }
    if (status === 404) {
      return {
        code: 'NOT_FOUND_ERROR',
        type: 'not_found',
        message: error.message || 'Resource not found',
        statusCode: 404,
        retryable: false,
        timestamp: new Date().toISOString(),
      };
    }
    // Check for a custom "user not registered" message pattern
    if (typeof error.message === 'string' && /not registered/i.test(error.message)) {
      return {
        code: 'AUTHORIZATION_ERROR',
        type: 'user_not_registered',
        message: error.message,
        statusCode: 403,
        retryable: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    type: 'unknown',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    statusCode: 500,
    retryable: false,
    timestamp: new Date().toISOString(),
  };
}
