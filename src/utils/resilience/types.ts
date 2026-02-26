// types.ts - Error types and interfaces for the resilience module

/**
 * Error thrown when the circuit breaker is open and requests are being blocked.
 */
export class CircuitBreakerError extends Error {
    public readonly state: CircuitBreakerState;

    constructor(message: string, state: CircuitBreakerState) {
        super(message);
        this.name = 'CircuitBreakerError';
        this.state = state;
    }
}

/**
 * Error thrown when all retry attempts have been exhausted.
 */
export class RetryError extends Error {
    public readonly attempts: number;
    public readonly errors: Error[];

    constructor(message: string, attempts: number, errors: Error[]) {
        super(message);
        this.name = 'RetryError';
        this.attempts = attempts;
        this.errors = errors;
    }
}

/**
 * Possible states of a circuit breaker.
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Configuration options for the circuit breaker.
 */
export interface CircuitBreakerOptions {
    /** Number of failures before the circuit opens. Default: 5 */
    failureThreshold?: number;
    /** Number of successes in HALF_OPEN before the circuit closes. Default: 2 */
    successThreshold?: number;
    /** Milliseconds to wait in OPEN state before transitioning to HALF_OPEN. Default: 30000 */
    timeout?: number;
}

/**
 * Configuration options for retryWithBackoff.
 */
export interface RetryOptions {
    /** Maximum number of retry attempts. Default: 3 */
    maxRetries?: number;
    /** Initial delay in milliseconds before the first retry. Default: 1000 */
    initialDelay?: number;
    /** Maximum delay in milliseconds between retries. Default: 30000 */
    maxDelay?: number;
    /** Multiplier applied to the delay after each retry. Default: 2 */
    backoffMultiplier?: number;
    /** Callback invoked before each retry attempt. */
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Configuration options for executeResilientAPICall.
 */
export interface ResilientAPIOptions extends RetryOptions {
    /** Fallback function called when all attempts fail. */
    fallback?: () => Promise<unknown>;
    /** Callback invoked on final failure (after all retries). */
    onFailure?: (error: Error) => void;
    /** Circuit breaker options. */
    circuitBreaker?: CircuitBreakerOptions;
}
