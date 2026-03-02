// resilientAPI.ts - Wrapper combining CircuitBreaker and retryWithBackoff

import { CircuitBreaker } from './circuitBreaker';
import { retryWithBackoff } from './retryWithBackoff';
import { CircuitBreakerOptions, ResilientAPIOptions } from './types';

interface CircuitBreakerEntry {
    instance: CircuitBreaker;
    options: Required<CircuitBreakerOptions>;
}

/** Global registry of circuit breakers keyed by API name. */
const circuitBreakers = new Map<string, CircuitBreakerEntry>();

/**
 * Expand partial circuit breaker options to their fully-resolved defaults so
 * that equality comparisons are reliable across callers.
 */
function normaliseOptions(options: CircuitBreakerOptions = {}): Required<CircuitBreakerOptions> {
    return {
        failureThreshold: options.failureThreshold ?? 5,
        successThreshold: options.successThreshold ?? 2,
        timeout: options.timeout ?? 30000,
    };
}

/**
 * Get or create a CircuitBreaker instance for the given API name.
 *
 * Each API name maps to exactly one set of circuit-breaker options for the
 * lifetime of the process. Calling this function with the same name but
 * different options is a programming error and will throw to prevent silent
 * misconfiguration.
 *
 * @throws {Error} If `name` already has a circuit breaker with different options.
 */
function getCircuitBreaker(name: string, options: ResilientAPIOptions): CircuitBreaker {
    const cbOptions = normaliseOptions(options.circuitBreaker);
    const existing = circuitBreakers.get(name);

    if (existing) {
        const prev = existing.options;
        if (
            prev.failureThreshold !== cbOptions.failureThreshold ||
            prev.successThreshold !== cbOptions.successThreshold ||
            prev.timeout !== cbOptions.timeout
        ) {
            throw new Error(
                `Circuit breaker "${name}" already exists with different options. ` +
                    `Each API name must always use the same circuit breaker configuration. ` +
                    `Use a different API name or ensure consistent options across all call sites. ` +
                    `Previous: ${JSON.stringify(prev)}, Requested: ${JSON.stringify(cbOptions)}`
            );
        }
        return existing.instance;
    }

    const instance = new CircuitBreaker(cbOptions);
    circuitBreakers.set(name, { instance, options: cbOptions });
    return instance;
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
    circuitBreakers.get(name)?.instance.reset();
}

/**
 * Clear all circuit breakers. Useful for testing.
 */
export function clearAllCircuitBreakers(): void {
    circuitBreakers.clear();
}
