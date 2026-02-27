// errorClasses.ts
// Custom error classes for structured error handling across Cloud Functions

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

export class RBACError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'RBACError';
    this.statusCode = statusCode;
  }
}

export function getErrorCode(error: unknown): string {
  if (error instanceof DatabaseError) return 'DB_ERROR';
  if (error instanceof WhatsAppApiError) return 'WHATSAPP_ERROR';
  if (error instanceof GmailApiError) return 'GMAIL_ERROR';
  if (error instanceof ValidationError) return 'VALIDATION_ERROR';
  if (error instanceof RBACError) return 'RBAC_ERROR';
  return 'INTERNAL_ERROR';
}
