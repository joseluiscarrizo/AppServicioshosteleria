import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAPI } from '../hooks/useAPI';

describe('useAPI Hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useAPI('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useAPI('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();
  });

  it('should handle timeout by aborting the request', async () => {
    // Simulate a fetch that resolves after abort is called
    global.fetch.mockImplementationOnce((_url, { signal } = {}) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const err = new Error('AbortError');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    vi.useFakeTimers();

    const { result } = renderHook(() => useAPI('/api/test', {}, 100));

    // Advance timers to trigger the abort timeout
    vi.advanceTimersByTime(200);

    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // AbortError should not be set as an error
    expect(result.current.error).toBeNull();
  });

  it('should refetch data', async () => {
    const mockData = { id: 1 };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useAPI('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.refetch();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should not fetch when url is empty', async () => {
    const { result } = renderHook(() => useAPI(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});
