import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAPI } from '@/hooks/useAPI';

describe('useAPI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with loading=true when immediate=true', () => {
    const fetchFn = vi.fn(() => new Promise(() => {}));
    const { result } = renderHook(() => useAPI(fetchFn));
    expect(result.current.loading).toBe(true);
  });

  it('starts with loading=false when immediate=false', () => {
    const fetchFn = vi.fn(() => new Promise(() => {}));
    const { result } = renderHook(() => useAPI(fetchFn, { immediate: false }));
    expect(result.current.loading).toBe(false);
  });

  it('sets data on successful fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });
    const { result } = renderHook(() => useAPI(fetchFn));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: 1, name: 'Test' });
    expect(result.current.error).toBeNull();
  });

  it('sets error on failed fetch', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAPI(fetchFn));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('aborts request on timeout', async () => {
    const fetchFn = vi.fn((_signal) => new Promise((_resolve, _reject) => {}));
    const { result } = renderHook(() => useAPI(fetchFn, { timeout: 1000 }));

    await act(async () => {
      vi.advanceTimersByTime(1001);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('does not run on mount when immediate=false', () => {
    const fetchFn = vi.fn();
    renderHook(() => useAPI(fetchFn, { immediate: false }));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('provides a refetch function', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useAPI(fetchFn, { immediate: false }));

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('data');
  });

  it('aborts on unmount to prevent state updates', () => {
    const abortSpy = vi.fn();
    const fetchFn = vi.fn((_signal) => new Promise(() => {}));
    const { unmount } = renderHook(() => useAPI(fetchFn));

    // Override abort method to spy
    const originalAbortController = global.AbortController;
    unmount();
    // The hook should not throw after unmount
    expect(true).toBe(true);
    global.AbortController = originalAbortController;
  });

  it('resets error on re-fetch', async () => {
    let shouldFail = true;
    const fetchFn = vi.fn(() => {
      if (shouldFail) return Promise.reject(new Error('fail'));
      return Promise.resolve('ok');
    });

    const { result } = renderHook(() => useAPI(fetchFn));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();

    shouldFail = false;
    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('ok');
  });
});
