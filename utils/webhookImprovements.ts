// webhookImprovements.ts

import { retryWithExponentialBackoff } from './retryHandler.ts';

// ── Custom error classes ──────────────────────────────────────────────────────

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

// ── Execute wrappers with retry and structured error handling ─────────────────

export async function executeDbOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await retryWithExponentialBackoff(operation);
    } catch (error) {
        throw new DatabaseError('Database operation failed', error);
    }
}

export async function executeWhatsAppOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await retryWithExponentialBackoff(operation);
    } catch (error) {
        throw new WhatsAppApiError('WhatsApp API operation failed', error);
    }
}

export async function executeGmailOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await retryWithExponentialBackoff(operation);
    } catch (error) {
        throw new GmailApiError('Gmail API operation failed', error);
    }
}

// ── Webhook error handler ─────────────────────────────────────────────────────
// Returns ok:true to suppress WhatsApp delivery retries

export function handleWebhookError(error: unknown): Response {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: true, error: message });
}
