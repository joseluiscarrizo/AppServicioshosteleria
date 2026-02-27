// webhookImprovements.ts

import Logger from './logger.ts';

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

export class GmailApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, { cause });
    this.name = 'GmailApiError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, { cause });
    this.name = 'ValidationError';
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
 * Wraps a Gmail/email operation and converts any error into a GmailApiError.
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
 * Centralized webhook error handler – returns a standardized JSON error Response.
 */
export function handleWebhookError(error: unknown, defaultStatus = 500): Response {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(`Webhook error: ${message}`);
  return Response.json(
    {
      success: false,
      error: { code: 'WEBHOOK_ERROR', message },
      metadata: { timestamp: new Date().toISOString() },
    },
    { status: defaultStatus }
  );
}
