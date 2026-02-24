// webhookImprovements.ts

/**
 * Custom error class for Gmail API errors.
 */
export class GmailApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly details?: string,
    ) {
        super(message);
        this.name = 'GmailApiError';
    }
}

/**
 * Custom error class for database operation errors.
 */
export class DatabaseError extends Error {
    constructor(
        message: string,
        public readonly details?: string,
    ) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Custom error class for validation errors.
 */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly field?: string,
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Executes a Gmail API operation and wraps errors in GmailApiError.
 * @param operation - Async operation to execute.
 * @returns Result of the operation.
 */
export async function executeGmailOperation<T>(
    operation: () => Promise<T>,
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof GmailApiError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new GmailApiError(`Gmail API operation failed: ${message}`);
    }
}

/**
 * Executes a database operation and wraps errors in DatabaseError.
 * @param operation - Async operation to execute.
 * @returns Result of the operation.
 */
export async function executeDbOperation<T>(
    operation: () => Promise<T>,
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new DatabaseError(`Database operation failed: ${message}`);
    }
}

/**
 * Returns a consistent HTTP error response for webhook handlers.
 * @param error - The error to handle.
 * @param defaultStatus - HTTP status code to use (default: 500).
 * @returns A Response object with error details.
 */
export function handleWebhookError(
    error: unknown,
    defaultStatus = 500,
): Response {
    if (error instanceof ValidationError) {
        return Response.json(
            { error: error.message, code: 'VALIDATION_ERROR', field: error.field },
            { status: 400 },
        );
    }
    if (error instanceof GmailApiError) {
        return Response.json(
            {
                error: error.message,
                code: 'GMAIL_API_ERROR',
                details: error.details,
            },
            { status: error.statusCode ?? 502 },
        );
    }
    if (error instanceof DatabaseError) {
        return Response.json(
            { error: error.message, code: 'DATABASE_ERROR' },
            { status: 503 },
        );
    }
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
        { error: message, code: 'INTERNAL_ERROR' },
        { status: defaultStatus },
    );
}
