// webhookImprovements.ts

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

export class GmailApiError extends Error {
  constructor(public readonly code: string | number, message: string) {
    super(message);
    this.name = 'GmailApiError';
  }
}

/**
 * Wraps a Gmail API operation and converts any error into a GmailApiError.
 */
export async function executeGmailOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof GmailApiError) throw error;
    throw new GmailApiError(
      'GMAIL_API_ERROR',
      error instanceof Error ? error.message : 'Gmail API operation failed'
    );
  }
}

/**
 * Returns a consistent JSON error Response for webhook handlers.
 * @param error - The error to respond with.
 * @param status - HTTP status code (default 500).
 */
export function handleWebhookError(error: Error, status = 500): Response {
  return Response.json(
    { error: error.message },
    { status }
  );
}
