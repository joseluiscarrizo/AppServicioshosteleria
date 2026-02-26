import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerError } from '../circuitBreaker';

// Mock Logger to avoid console output in tests
vi.mock('../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  }
}));

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    // Create circuit breaker with low thresholds for testing
    breaker = new CircuitBreaker('test-api', 3, 2, 100);
  });

  test('starts in CLOSED state', () => {
    expect(breaker.getState()).toBe('closed');
  });

  test('executes function successfully in CLOSED state', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await breaker.execute(fn);
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('transitions to OPEN after reaching failure threshold', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('fail');
    }

    expect(breaker.getState()).toBe('open');
  });

  test('throws CircuitBreakerError when OPEN', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }

    // Now it should be OPEN and throw CircuitBreakerError
    await expect(breaker.execute(vi.fn())).rejects.toThrow(CircuitBreakerError);
  });

  test('transitions to HALF_OPEN after timeout', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }

    expect(breaker.getState()).toBe('open');

    // Wait for timeout (100ms in test)
    await new Promise(resolve => setTimeout(resolve, 150));

    // Attempt should move to HALF_OPEN and execute
    const successFn = vi.fn().mockResolvedValue('ok');
    await breaker.execute(successFn);
    expect(successFn).toHaveBeenCalled();
  });

  test('transitions from HALF_OPEN to CLOSED after success threshold', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Execute success threshold (2) times
    const successFn = vi.fn().mockResolvedValue('ok');
    await breaker.execute(successFn);
    await breaker.execute(successFn);

    expect(breaker.getState()).toBe('closed');
  });

  test('transitions from HALF_OPEN back to OPEN on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Fail in HALF_OPEN state
    await expect(breaker.execute(fn)).rejects.toThrow();

    expect(breaker.getState()).toBe('open');
  });
});

describe('CircuitBreakerError', () => {
  test('has correct name', () => {
    const error = new CircuitBreakerError('test message');
    expect(error.name).toBe('CircuitBreakerError');
    expect(error.message).toBe('test message');
  });
});
