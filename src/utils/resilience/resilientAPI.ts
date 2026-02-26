// resilientAPI.ts - Wrapper combining CircuitBreaker and retryWithBackoff

import { CircuitBreaker } from './circuitBreaker';
import { retryWithBackoff } from './retryWithBackoff';
import { ResilientAPIOptions } from './types';

/** Global registry of circuit breakers keyed by API name. */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a CircuitBreaker instance for the given API name.
 */
function getCircuitBreaker(name: string, options: ResilientAPIOptions): CircuitBreaker {
    if (!circuitBreakers.has(name)) {
        circuitBreakers.set(name, new CircuitBreaker(options.circuitBreaker));
    }
    return circuitBreakers.get(name)!;
}

/**
 * Execute an API call with circuit breaker and retry-with-backoff resilience.
 *
 * @param name - Unique name for this API (used to key the circuit breaker).
 * @param operation - The async operation to execute.
 * @param options - Resilience configuration options.
 * @returns The result of the operation, or the fallback result if all attempts fail.
 */
export async function executeResilientAPICall<T>(
    name: string,
    operation: () => Promise<T>,
    options: ResilientAPIOptions = {}
): Promise<T> {
    const { fallback, onFailure, ...retryOptions } = options;
    const circuitBreaker = getCircuitBreaker(name, options);

    try {
        return await retryWithBackoff(
            () => circuitBreaker.execute(operation),
            retryOptions
        );
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onFailure?.(err);

        if (fallback) {
            return fallback() as Promise<T>;
        }

        throw err;
    }
}

/**
 * Reset the circuit breaker for a specific API name.
 * Useful for testing or manual recovery.
 */
export function resetCircuitBreaker(name: string): void {
    circuitBreakers.get(name)?.reset();
}

/**
 * Clear all circuit breakers. Useful for testing.
 */
export function clearAllCircuitBreakers(): void {
    circuitBreakers.clear();
}
