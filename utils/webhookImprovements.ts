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
  constructor(message: string, public readonly cause?: unknown) {
    super(message, { cause });
    this.name = 'GmailApiError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
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
      error instanceof Error ? error.message : 'Gmail API operation failed',
      error
    );
  }
}

/**
 * Handles webhook errors and returns an appropriate Response.
 */
export function handleWebhookError(error: Error, statusCode = 500): Response {
  const message = error instanceof ValidationError
    ? error.message
    : 'Internal server error';
  const status = error instanceof ValidationError ? 400 : statusCode;
  return Response.json({ error: message }, { status });
}
