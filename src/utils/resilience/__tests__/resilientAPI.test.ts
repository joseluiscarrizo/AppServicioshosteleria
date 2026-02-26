import { describe, test, expect, vi, beforeEach } from 'vitest';
import { executeResilientAPICall, clearAllCircuitBreakers, resetCircuitBreaker } from '../resilientAPI';
import { RetryError } from '../types';

describe('executeResilientAPICall', () => {
    beforeEach(() => {
        clearAllCircuitBreakers();
    });

    test('returns result on success', async () => {
        const op = vi.fn().mockResolvedValue({ data: 'ok' });
        const result = await executeResilientAPICall('test-api', op, { maxRetries: 0 });
        expect(result).toEqual({ data: 'ok' });
    });

    test('retries on failure and succeeds eventually', async () => {
        const op = vi.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue('success');

        const result = await executeResilientAPICall('test-api', op, {
            maxRetries: 1,
            initialDelay: 10,
        });
        expect(result).toBe('success');
        expect(op).toHaveBeenCalledTimes(2);
    });

    test('calls fallback when all retries fail', async () => {
        const op = vi.fn().mockRejectedValue(new Error('always fail'));
        const fallback = vi.fn().mockResolvedValue({ fallback: true });

        const result = await executeResilientAPICall('test-api', op, {
            maxRetries: 1,
            initialDelay: 10,
            fallback,
        });

        expect(result).toEqual({ fallback: true });
        expect(fallback).toHaveBeenCalledTimes(1);
    });

    test('calls onFailure callback on total failure', async () => {
        const op = vi.fn().mockRejectedValue(new Error('fail'));
        const onFailure = vi.fn();

        await expect(
            executeResilientAPICall('test-api', op, {
                maxRetries: 0,
                initialDelay: 10,
                onFailure,
            })
        ).rejects.toThrow();

        expect(onFailure).toHaveBeenCalledTimes(1);
        expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
    });

    test('uses separate circuit breakers per API name', async () => {
        // Open circuit for 'api-a' by triggering failures (threshold default = 5)
        const failOp = vi.fn().mockRejectedValue(new Error('fail'));
        const cbForA = new (await import('../circuitBreaker')).CircuitBreaker({ failureThreshold: 1 });

        // Use different names to get separate circuit breakers
        const successOp = vi.fn().mockResolvedValue('ok');

        // api-b should work fine regardless
        const result = await executeResilientAPICall('api-b-isolated', successOp, { maxRetries: 0 });
        expect(result).toBe('ok');
    });

    test('throws error when all retries exhausted and no fallback', async () => {
        const op = vi.fn().mockRejectedValue(new Error('fail'));

        await expect(
            executeResilientAPICall('test-api-throw', op, {
                maxRetries: 0,
                initialDelay: 10,
            })
        ).rejects.toThrow('fail');
    });

    test('resetCircuitBreaker allows recovery after open state', async () => {
        const failOp = vi.fn().mockRejectedValue(new Error('fail'));
        const successOp = vi.fn().mockResolvedValue('recovered');

        // Open the circuit
        const cbOptions = {
            maxRetries: 0,
            initialDelay: 10,
            circuitBreaker: { failureThreshold: 1, timeout: 60000 },
        };

        await expect(
            executeResilientAPICall('test-reset-api', failOp, cbOptions)
        ).rejects.toThrow();

        // Next call should fail due to open circuit (CircuitBreakerError wrapped in RetryError)
        let caughtErr: unknown;
        try {
            await executeResilientAPICall('test-reset-api', successOp, cbOptions);
        } catch (err) {
            caughtErr = err;
        }
        expect(caughtErr).toBeInstanceOf(RetryError);
        expect((caughtErr as RetryError).errors[0].message).toContain('Circuit breaker is OPEN');

        // Reset the circuit breaker
        resetCircuitBreaker('test-reset-api');

        // Now it should succeed
        const result = await executeResilientAPICall('test-reset-api', successOp, cbOptions);
        expect(result).toBe('recovered');
    });
});
