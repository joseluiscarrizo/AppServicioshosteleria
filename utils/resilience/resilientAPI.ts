// resilientAPI.ts - Resilience wrapper for Deno serverless functions

/**
 * Execute an API call with retry-with-backoff resilience.
 *
 * @param name - Unique name for this API (used for logging on failure).
 * @param operation - The async operation to execute.
 * @param options - Resilience configuration options.
 * @returns The result of the operation, or the fallback result if all attempts fail.
 */
export async function executeResilientAPICall<T>(
  name: string,
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    fallback?: () => Promise<T>;
    onFailure?: (error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    fallback,
    onFailure,
  } = options;

  const errors: Error[] = [];
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      if (attempt < maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  const finalError = errors[errors.length - 1];
  onFailure?.(finalError);
  console.error(`[${name}] All ${maxRetries + 1} attempt(s) failed: ${finalError.message}`);

  if (fallback) {
    return fallback();
  }

  throw finalError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
