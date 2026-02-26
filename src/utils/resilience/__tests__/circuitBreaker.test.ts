import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker } from '../circuitBreaker';
import { CircuitBreakerError } from '../types';

describe('CircuitBreaker', () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
        cb = new CircuitBreaker({ failureThreshold: 3, successThreshold: 2, timeout: 1000 });
    });

    test('starts in CLOSED state', () => {
        expect(cb.getState()).toBe('CLOSED');
    });

    test('passes through successful operations', async () => {
        const result = await cb.execute(() => Promise.resolve(42));
        expect(result).toBe(42);
        expect(cb.getState()).toBe('CLOSED');
    });

    test('opens after reaching failure threshold', async () => {
        const failingOp = () => Promise.reject(new Error('fail'));

        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(failingOp)).rejects.toThrow('fail');
        }

        expect(cb.getState()).toBe('OPEN');
    });

    test('throws CircuitBreakerError when OPEN', async () => {
        const failingOp = () => Promise.reject(new Error('fail'));

        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(failingOp)).rejects.toThrow('fail');
        }

        await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow(CircuitBreakerError);
    });

    test('transitions to HALF_OPEN after timeout', async () => {
        const fastCb = new CircuitBreaker({ failureThreshold: 1, timeout: 50 });
        await expect(fastCb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
        expect(fastCb.getState()).toBe('OPEN');

        await new Promise(r => setTimeout(r, 60));

        // Next call should transition to HALF_OPEN
        await expect(fastCb.execute(() => Promise.reject(new Error('fail2')))).rejects.toThrow('fail2');
        // After failure in HALF_OPEN it goes back to OPEN
        expect(fastCb.getState()).toBe('OPEN');
    });

    test('closes after success threshold in HALF_OPEN', async () => {
        const fastCb = new CircuitBreaker({ failureThreshold: 1, successThreshold: 2, timeout: 50 });
        await expect(fastCb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
        expect(fastCb.getState()).toBe('OPEN');

        await new Promise(r => setTimeout(r, 60));

        // Successes in HALF_OPEN
        await fastCb.execute(() => Promise.resolve(1));
        await fastCb.execute(() => Promise.resolve(2));
        expect(fastCb.getState()).toBe('CLOSED');
    });

    test('reset restores initial CLOSED state', async () => {
        const failingOp = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(failingOp)).rejects.toThrow();
        }
        expect(cb.getState()).toBe('OPEN');

        cb.reset();
        expect(cb.getState()).toBe('CLOSED');

        const result = await cb.execute(() => Promise.resolve('ok'));
        expect(result).toBe('ok');
    });

    test('resets failure count on success in CLOSED state', async () => {
        // Two failures (below threshold of 3)
        await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
        await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
        // A success resets the failure count
        await cb.execute(() => Promise.resolve('ok'));
        // Should still be CLOSED and two more failures needed before opening
        await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
        await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
        expect(cb.getState()).toBe('CLOSED');
    });
});
