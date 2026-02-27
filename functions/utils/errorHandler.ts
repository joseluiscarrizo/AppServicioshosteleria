/**
 * functions/utils/errorHandler.ts
 *
 * Re-exports all error classes and utilities from the shared errorHandler for
 * use in Deno Cloud Functions.
 */
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  toErrorResponse,
  handleWebhookError,
} from '../../utils/errorHandler.ts';

export type { ErrorResponse } from '../../utils/errorHandler.ts';
