import { describe, test, expect, vi } from 'vitest';
import { retryWithBackoff } from '../retryWithBackoff';
import { RetryError } from '../types';

describe('retryWithBackoff', () => {
    test('returns result on first success', async () => {
        const op = vi.fn().mockResolvedValue('success');
        const result = await retryWithBackoff(op, { maxRetries: 3, initialDelay: 10 });
        expect(result).toBe('success');
        expect(op).toHaveBeenCalledTimes(1);
    });

    test('retries on failure and returns result eventually', async () => {
        const op = vi.fn()
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValue('success');

        const result = await retryWithBackoff(op, { maxRetries: 3, initialDelay: 10 });
        expect(result).toBe('success');
        expect(op).toHaveBeenCalledTimes(3);
    });

    test('throws RetryError after all retries exhausted', async () => {
        const op = vi.fn().mockRejectedValue(new Error('always fail'));

        await expect(
            retryWithBackoff(op, { maxRetries: 2, initialDelay: 10 })
        ).rejects.toThrow(RetryError);

        expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    test('RetryError contains attempt count and error history', async () => {
        const op = vi.fn()
            .mockRejectedValueOnce(new Error('error 1'))
            .mockRejectedValueOnce(new Error('error 2'))
            .mockRejectedValueOnce(new Error('error 3'));

        let retryErr: RetryError | null = null;
        try {
            await retryWithBackoff(op, { maxRetries: 2, initialDelay: 10 });
        } catch (err) {
            retryErr = err as RetryError;
        }

        expect(retryErr).toBeInstanceOf(RetryError);
        expect(retryErr!.attempts).toBe(3);
        expect(retryErr!.errors).toHaveLength(3);
        expect(retryErr!.errors[0].message).toBe('error 1');
        expect(retryErr!.errors[2].message).toBe('error 3');
    });

    test('calls onRetry callback with attempt number and error', async () => {
        const onRetry = vi.fn();
        const op = vi.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue('ok');

        await retryWithBackoff(op, { maxRetries: 3, initialDelay: 10, onRetry });

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    test('respects maxDelay cap', async () => {
        const delays: number[] = [];
        const originalSetTimeout = globalThis.setTimeout;
        vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, ms) => {
            delays.push(ms as number);
            return originalSetTimeout(fn as () => void, 0);
        });

        const op = vi.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue('ok');

        await retryWithBackoff(op, {
            maxRetries: 2,
            initialDelay: 1000,
            maxDelay: 1500,
            backoffMultiplier: 2,
        });

        expect(delays[0]).toBe(1000);
        expect(delays[1]).toBe(1500); // capped at maxDelay
        vi.restoreAllMocks();
    });

    test('with maxRetries 0 makes only one attempt', async () => {
        const op = vi.fn().mockRejectedValue(new Error('fail'));
        await expect(
            retryWithBackoff(op, { maxRetries: 0, initialDelay: 10 })
        ).rejects.toThrow(RetryError);
        expect(op).toHaveBeenCalledTimes(1);
    });
});
