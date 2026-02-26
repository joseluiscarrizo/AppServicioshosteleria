import Logger from './logger.ts';
import { CircuitBreaker } from './circuitBreaker.ts';
import { retryWithBackoff } from './retryWithBackoff.ts';

// Almacenar circuit breakers por API
const circuitBreakers = new Map<string, CircuitBreaker>();

function getOrCreateCircuitBreaker(apiName: string): CircuitBreaker {
  if (!circuitBreakers.has(apiName)) {
    circuitBreakers.set(apiName, new CircuitBreaker(apiName));
  }
  return circuitBreakers.get(apiName)!;
}

/**
 * Envuelve llamadas a API externa con circuit breaker + retry
 */
export async function executeResilientAPICall<T>(
  apiName: string,
  fn: () => Promise<T>,
  options?: {
    fallback?: () => Promise<T>;
    onFailure?: (error: Error) => void;
  }
): Promise<T> {
  try {
    const breaker = getOrCreateCircuitBreaker(apiName);

    return await breaker.execute(async () => {
      return await retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        onRetry: (attempt, error) => {
          Logger.warn(
            `[RESILIENT_API] ${apiName} retry ${attempt}: ${error.message}`
          );
        }
      });
    });
  } catch (error) {
    const err = error as Error;
    Logger.error(
      `[RESILIENT_API] ${apiName} failed after retries: ${err.message}`
    );

    if (options?.fallback) {
      try {
        Logger.info(`[RESILIENT_API] Executing fallback for ${apiName}`);
        return await options.fallback();
      } catch (fallbackError) {
        Logger.error(
          `[RESILIENT_API] Fallback also failed: ${(fallbackError as Error).message}`
        );
      }
    }

    if (options?.onFailure) {
      options.onFailure(err);
    }

    throw err;
  }
}
