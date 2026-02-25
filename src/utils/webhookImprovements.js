/**
 * Custom error class for database-related errors.
 */
export class DatabaseError extends Error {
    constructor(message, context) {
        super(message);
        this.name = 'DatabaseError';
        this.context = context || {};
    }
}

/**
 * Handles webhook errors with contextual logging.
 * @param {Error} error - The error object to handle.
 * @param {Object} context - Additional context for the error.
 * @returns {void}
 */
export function handleWebhookError(error, context) {
    console.error('Webhook error:', error.message, context || {});
}
