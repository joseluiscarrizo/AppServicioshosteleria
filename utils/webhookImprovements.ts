// webhookImprovements.ts

/**
 * Creates a structured JSON error response for webhook endpoints.
 * @param error - The error that occurred.
 * @param statusCode - HTTP status code to return.
 * @returns A Response with structured JSON error body.
 */
export function handleWebhookError(error: Error, statusCode: number): Response {
  return Response.json(
    {
      error: error.message || 'Error interno del servidor',
      code: error.name || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, { cause });
    this.name = 'DatabaseError';
  }
}

export class WhatsAppApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, { cause });
    this.name = 'WhatsAppApiError';
  }
}

/**
 * Wraps a database operation and converts any error into a DatabaseError.
 */
export async function executeDbOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(
      error instanceof Error ? error.message : 'Database operation failed',
      error
    );
  }
}

/**
 * Wraps a WhatsApp API operation and converts any error into a WhatsAppApiError.
 */
export async function executeWhatsAppOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof WhatsAppApiError) throw error;
    throw new WhatsAppApiError(
      error instanceof Error ? error.message : 'WhatsApp API operation failed',
      error
    );
  }
}
