import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAPI } from '../hooks/useAPI';

describe('useAPI Hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
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

  it('should handle timeout', async () => {
    vi.useFakeTimers();
    global.fetch.mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useAPI('/api/test', {}, 1000));

    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.useRealTimers();
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

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
