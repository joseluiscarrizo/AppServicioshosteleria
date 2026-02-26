// webhookImprovements.ts
import Logger from './logger';

/**
 * Error class for validation failures (invalid input data).
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Error class for database operation failures.
 */
export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Handles webhook errors by classifying and logging them via the centralized Logger.
 * @param {Error} error - The error to handle.
 */
export function handleWebhookError(error: Error): void {
    if (error instanceof ValidationError) {
        Logger.warn(`[ValidationError] ${error.message}`);
    } else if (error instanceof DatabaseError) {
        Logger.error(`[DatabaseError] ${error.message}`);
    } else {
        Logger.error(`[WebhookError] ${error.message}`);
    }
}
