// webhookImprovements.ts

export class ValidationError extends Error {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
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

/**
 * Wraps a Gmail API operation and converts any error into a structured Error.
 */
export async function executeGmailOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Gmail operation failed',
    );
  }
}

/**
 * Handles a webhook or function error and returns a structured HTTP Response.
 */
export function handleWebhookError(error: unknown, statusCode = 500): Response {
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof WhatsAppApiError) {
    return Response.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof DatabaseError) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const message = error instanceof Error ? error.message : "Error inesperado";
  return Response.json({ error: message }, { status: statusCode });
}
