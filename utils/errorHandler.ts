// errorHandler.ts
// Unified error handler with structured logging and standardized response format

import Logger from './logger.ts';
import { DatabaseError, WhatsAppApiError, GmailApiError, ValidationError, RBACError, getErrorCode } from './errorClasses.ts';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    function: string;
  };
}

export class ErrorHandler {
  /**
   * Handles an error and returns a standardized HTTP Response.
   * Logs the error with context, then returns a structured JSON error response.
   *
   * @param error - The caught error
   * @param functionName - Name of the Cloud Function for logging context
   * @returns Response with standardized error payload
   */
  static handle(error: unknown, functionName: string): Response {
    const message = error instanceof Error ? error.message : String(error);
    const code = getErrorCode(error);

    Logger.error(`[${functionName}] [${code}]: ${message}`);

    let status = 500;
    if (error instanceof RBACError) {
      status = error.statusCode;
    } else if (error instanceof ValidationError) {
      status = 422;
    }

    const body: ErrorResponse = {
      success: false,
      error: { code, message },
      metadata: {
        timestamp: new Date().toISOString(),
        function: functionName,
      },
    };

    return Response.json(body, { status });
  }
}

// Re-export error classes and helpers for convenience
export { DatabaseError, WhatsAppApiError, GmailApiError, ValidationError, RBACError, getErrorCode };
