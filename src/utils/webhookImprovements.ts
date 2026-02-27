/** Structured error result returned by {@link handleWebhookError}. */
export interface MappedError {
    type: string;
    message: string;
    retryable: boolean;
}

/**
 * Error thrown for validation / bad-input failures.
 * Does NOT count as a circuit-breaking failure.
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/** Error thrown when a database / persistence operation fails. */
export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Maps an arbitrary Error (including HTTP errors from axios / fetch) to a
 * structured {@link MappedError} that callers can inspect without parsing raw
 * error messages.
 *
 * HTTP status codes are read from `error.status` or `error.response?.status`.
 */
export function handleWebhookError(error: unknown): MappedError {
    if (error instanceof ValidationError) {
        return { type: 'validation_error', message: error.message, retryable: false };
    }

    if (error instanceof DatabaseError) {
        return { type: 'database_error', message: error.message, retryable: true };
    }

    // HTTP-style errors (axios, fetch wrappers, etc.)
    const httpError = error as Record<string, unknown>;
    const status =
        (typeof httpError.status === 'number' ? httpError.status : undefined) ??
        (typeof (httpError.response as Record<string, unknown> | undefined)?.status === 'number'
            ? (httpError.response as Record<string, unknown>).status as number
            : undefined);

    if (status === 401 || status === 403) {
        return { type: 'auth_required', message: 'Authentication required', retryable: false };
    }

    // Body-level error types returned by the backend
    const data = httpError.response
        ? (httpError.response as Record<string, unknown>).data
        : httpError.data;
    const bodyType = typeof (data as Record<string, unknown> | undefined)?.type === 'string'
        ? (data as Record<string, unknown>).type as string
        : undefined;

    if (bodyType === 'user_not_registered') {
        return { type: 'user_not_registered', message: 'User not registered for this app', retryable: false };
    }

    if (bodyType === 'auth_required') {
        return { type: 'auth_required', message: 'Authentication required', retryable: false };
    }

    if (status && status >= 500) {
        return { type: 'server_error', message: 'Server error. Please try again.', retryable: true };
    }

    if (status && status >= 400 && status < 500) {
        return { type: 'client_error', message: 'Request error.', retryable: false };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { type: 'network_error', message: message || 'Connection error. Please try again.', retryable: true };
}