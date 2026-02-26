// webhookImprovements.ts

import { RBACError } from './rbacValidator.ts';

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
  constructor(message: string) {
    super(message);
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
 * Handles webhook errors and returns an appropriate HTTP Response.
 */
export function handleWebhookError(error: unknown): Response {
  if (error instanceof RBACError) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ error: message }, { status: 500 });
}
