import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeResilientAPICall } from '../resilientAPI';

vi.mock('../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  }
}));

describe('executeResilientAPICall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns result when API call succeeds', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const result = await executeResilientAPICall('test-api-success', fn);
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('executes fallback when all retries fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('API down'));
    const fallback = vi.fn().mockResolvedValue({ ok: true, encolado: true });

    const promise = executeResilientAPICall('test-api-fallback2', fn, { fallback });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ ok: true, encolado: true });
    expect(fallback).toHaveBeenCalled();
  });

  test('calls onFailure when all retries fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('API down'));
    const onFailure = vi.fn();

    const promise = executeResilientAPICall('test-api-onfailure2', fn, { onFailure });
    const rejection = promise.catch(e => e);
    await vi.runAllTimersAsync();
    await rejection;

    expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
  });

  test('throws error when all retries fail and no fallback', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent error'));

    const promise = executeResilientAPICall('test-api-throw2', fn);
    // Attach catch immediately to prevent unhandled rejection tracking
    const caught = promise.catch(e => e);
    await vi.runAllTimersAsync();
    const err = await caught;

    expect(err).toBeInstanceOf(Error);
  });

  test('retries on transient failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue({ ok: true });

    const promise = executeResilientAPICall('test-api-retry2', fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

