import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff, RetryError } from '../retryWithBackoff';

vi.mock('../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  }
}));

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on failure and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('transient error'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('throws RetryError after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent error'));

    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 100 });
    const rejection = expect(promise).rejects.toThrow(RetryError);
    await vi.runAllTimersAsync();
    await rejection;
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  test('calls onRetry callback on each retry attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockResolvedValue('ok');

    const onRetry = vi.fn();
    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100, onRetry });
    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
  });

  test('RetryError contains attempt count and last error', async () => {
    const lastError = new Error('final error');
    const fn = vi.fn().mockRejectedValue(lastError);

    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 100 });
    const rejection = promise.catch(e => e);
    await vi.runAllTimersAsync();
    const err = await rejection;

    expect(err).toBeInstanceOf(RetryError);
    expect((err as RetryError).attempts).toBe(3);
    expect((err as RetryError).lastError).toBe(lastError);
  });

  test('respects maxDelay cap', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((cb, delay, ...args) => {
      delays.push(delay as number);
      return origSetTimeout(cb, 0, ...args);
    });

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 2000,
      backoffMultiplier: 10
    });
    const rejection = promise.catch(() => {});
    await vi.runAllTimersAsync();
    await rejection;

    // All delays should be capped at maxDelay (2000ms)
    for (const delay of delays) {
      expect(delay).toBeLessThanOrEqual(2000);
    }
  });
});

describe('RetryError', () => {
  test('has correct name and properties', () => {
    const lastError = new Error('original');
    const error = new RetryError('retry failed', 3, lastError);
    expect(error.name).toBe('RetryError');
    expect(error.message).toBe('retry failed');
    expect(error.attempts).toBe(3);
    expect(error.lastError).toBe(lastError);
  });
});

