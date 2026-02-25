// webhookImprovements.ts - Custom error types and improved webhook error handling

/**
 * Error thrown when input validation fails.
 */
export class ValidationError extends Error {
    public readonly field?: string;

    constructor(message: string, field?: string) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Error thrown for database-related failures.
 */
export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Handle a webhook or API error, mapping HTTP status codes to structured error info.
 * @param {unknown} error - The caught error object.
 * @returns {{ type: string; message: string; retryable: boolean }} - Structured error info.
 */
export function handleWebhookError(error: unknown): { type: string; message: string; retryable: boolean } {
    if (error instanceof ValidationError) {
        return {
            type: 'validation_error',
            message: error.message,
            retryable: false,
        };
    }
    if (error instanceof DatabaseError) {
        return {
            type: 'database_error',
            message: error.message,
            retryable: true,
        };
    }
    if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;
        const status = err.status as number | undefined;
        if (status === 401) {
            return { type: 'auth_required', message: 'Authentication required', retryable: false };
        }
        if (status === 403) {
            const reason = (err.data as Record<string, unknown>)?.extra_data as Record<string, unknown> | undefined;
            const reasonStr = (reason?.reason as string) ?? 'forbidden';
            return { type: reasonStr, message: String(err.message ?? 'Forbidden'), retryable: false };
        }
        if (status === 404) {
            return { type: 'not_found', message: String(err.message ?? 'Resource not found'), retryable: false };
        }
        if (status && status >= 500) {
            return { type: 'server_error', message: String(err.message ?? 'Server error'), retryable: true };
        }
        if (err.message) {
            return { type: 'unknown', message: String(err.message), retryable: false };
        }
    }
    return { type: 'unknown', message: 'An unexpected error occurred', retryable: false };
}
