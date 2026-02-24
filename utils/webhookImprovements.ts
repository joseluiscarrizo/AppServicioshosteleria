// webhookImprovements.ts

/**
 * Custom error for validation failures.
 */
export class ValidationError extends Error {
    field?: string;

    constructor(message: string, field?: string) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Custom error for WhatsApp API failures.
 */
export class WhatsAppApiError extends Error {
    statusCode?: number;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = 'WhatsAppApiError';
        this.statusCode = statusCode;
    }
}

/**
 * Handles webhook errors and returns a user-friendly message and retry hint.
 * @param {Error} error - The error to handle.
 * @returns {{ message: string; retryable: boolean }}
 */
export const handleWebhookError = (error: Error): { message: string; retryable: boolean } => {
    if (error instanceof ValidationError) {
        return { message: error.message, retryable: false };
    }
    if (error instanceof WhatsAppApiError) {
        return { message: error.message, retryable: true };
    }
    return { message: 'Error desconocido al procesar la solicitud', retryable: true };
};
