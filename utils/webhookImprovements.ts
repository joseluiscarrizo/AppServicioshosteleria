// webhookImprovements.ts
// Utility wrappers for database, WhatsApp, and Gmail operations with structured error handling.

import { retryWithExponentialBackoff } from './retryHandler.ts';
import Logger from './logger.ts';

// ─── Custom Error Classes ─────────────────────────────────────────────────────

export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class WhatsAppApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

export class GmailApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GmailApiError';
  }
}

// ─── Operation Wrappers ───────────────────────────────────────────────────────

/**
 * Execute a database operation with retry and structured error handling.
 */
export async function executeDbOperation<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await retryWithExponentialBackoff(operation, retries);
  } catch (error) {
    Logger.error(`Database operation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new DatabaseError('Database operation failed', error);
  }
}

/**
 * Execute a WhatsApp API operation with retry and structured error handling.
 */
export async function executeWhatsAppOperation<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await retryWithExponentialBackoff(operation, retries);
  } catch (error) {
    Logger.error(`WhatsApp API operation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new WhatsAppApiError('WhatsApp API operation failed', error);
  }
}

/**
 * Execute a Gmail/email operation with retry and structured error handling.
 */
export async function executeGmailOperation<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await retryWithExponentialBackoff(operation, retries);
  } catch (error) {
    Logger.error(`Gmail operation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new GmailApiError('Gmail operation failed', error);
  }
}

/**
 * Handle a webhook error and return a consistent JSON response.
 * Note: Returns `ok: true` intentionally – WhatsApp retries delivery on non-2xx responses,
 * so we acknowledge receipt while still surfacing the error message in the body.
 */
export function handleWebhookError(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(`Webhook error: ${message}`);
  return Response.json({ ok: true, error: message });
}
