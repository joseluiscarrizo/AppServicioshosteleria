// retryWithBackoff.ts - Retry with exponential backoff implementation

import { RetryError, RetryOptions } from './types';

/**
 * Retry an async operation with exponential backoff.
 *
 * @param operation - The async operation to retry.
 * @param options - Retry configuration options.
 * @returns The result of the operation.
 * @throws RetryError if all retry attempts are exhausted.
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 30000,
        backoffMultiplier = 2,
        onRetry,
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
                onRetry?.(attempt + 1, err);
                await sleep(delay);
                delay = Math.min(delay * backoffMultiplier, maxDelay);
            }
        }
    }

    throw new RetryError(
        `Operation failed after ${maxRetries + 1} attempt(s)`,
        maxRetries + 1,
        errors
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
