import Logger from './logger.ts';

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error | null
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Ejecuta función con retry y exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry
  } = options || {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        Logger.warn(
          `[RETRY] Attempt ${attempt + 1}/${maxRetries} failed. ` +
          `Retrying in ${delay}ms. Error: ${lastError.message}`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new RetryError(
    `Failed after ${maxRetries + 1} attempts`,
    maxRetries + 1,
    lastError
  );
}
