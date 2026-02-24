// webhookImprovements.ts

export class WhatsAppApiError extends Error {
    code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'WhatsAppApiError';
        this.code = code;
    }
}

/**
 * Executes a WhatsApp API operation, wrapping errors in WhatsAppApiError.
 * @param operation - The async operation to execute.
 */
export async function executeWhatsAppOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof WhatsAppApiError) {
            throw error;
        }
        throw new WhatsAppApiError('UNKNOWN', (error as Error).message);
    }
}

/**
 * Returns a consistent HTTP error Response for webhook handlers.
 * @param error - The error to report.
 * @param status - HTTP status code (default 500).
 */
export function handleWebhookError(error: Error, status: number = 500): Response {
    return Response.json(
        {
            error: error.message,
            code: error instanceof WhatsAppApiError ? error.code : 'INTERNAL_ERROR'
        },
        { status }
    );
}
