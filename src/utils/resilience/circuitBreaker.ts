// circuitBreaker.ts - Circuit Breaker pattern implementation

import { CircuitBreakerError, CircuitBreakerOptions, CircuitBreakerState } from './types';

/**
 * Implements the Circuit Breaker pattern to prevent cascading failures.
 *
 * States:
 * - CLOSED: Normal operation. Requests pass through.
 * - OPEN: Circuit is open. Requests are blocked immediately.
 * - HALF_OPEN: Testing recovery. Limited requests are allowed.
 */
export class CircuitBreaker {
    private state: CircuitBreakerState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private nextAttemptTime = 0;

    private readonly failureThreshold: number;
    private readonly successThreshold: number;
    private readonly timeout: number;

    constructor(options: CircuitBreakerOptions = {}) {
        this.failureThreshold = options.failureThreshold ?? 5;
        this.successThreshold = options.successThreshold ?? 2;
        this.timeout = options.timeout ?? 30000;
    }

    /**
     * Execute an operation through the circuit breaker.
     * @param operation - Async operation to execute.
     * @returns The result of the operation.
     * @throws CircuitBreakerError if the circuit is OPEN.
     * @throws The original error if the operation fails.
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttemptTime) {
                throw new CircuitBreakerError(
                    `Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`,
                    this.state
                );
            }
            this.state = 'HALF_OPEN';
            this.successCount = 0;
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Get the current state of the circuit breaker.
     */
    getState(): CircuitBreakerState {
        return this.state;
    }

    /**
     * Reset the circuit breaker to its initial CLOSED state.
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = 0;
    }

    private onSuccess(): void {
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.failureCount = 0;
                this.successCount = 0;
            }
        } else {
            this.failureCount = 0;
        }
    }

    private onFailure(): void {
        this.failureCount++;
        if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.failureCount = 0;
            this.successCount = 0;
        }
    }
}
