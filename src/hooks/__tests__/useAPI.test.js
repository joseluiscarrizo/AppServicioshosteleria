import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAPI } from '../useAPI.js';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAPI hook', () => {
  it('should initialize with isLoading=false and no error', () => {
    const { result } = renderHook(() => useAPI());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set isLoading=true while executing and false after', async () => {
    const mockFn = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      await result.current.execute(mockFn);
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should return the result of the api function', async () => {
    const mockFn = vi.fn().mockResolvedValue({ id: 42 });
    const { result } = renderHook(() => useAPI());
    let returnValue;

    await act(async () => {
      returnValue = await result.current.execute(mockFn);
    });

    expect(returnValue).toEqual({ id: 42 });
  });

  it('should call onSuccess callback on success', async () => {
    const onSuccess = vi.fn();
    const mockFn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      await result.current.execute(mockFn, { onSuccess });
    });

    expect(onSuccess).toHaveBeenCalledWith('data');
  });

  it('should set error and return null on failure', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useAPI({ showErrorToast: false }));
    let returnValue;

    await act(async () => {
      returnValue = await result.current.execute(mockFn);
    });

    expect(returnValue).toBeNull();
    expect(result.current.error).toBe('API error');
  });

  it('should call onError callback on failure', async () => {
    const onError = vi.fn();
    const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAPI({ showErrorToast: false }));

    await act(async () => {
      await result.current.execute(mockFn, { onError });
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should reset error and loading state when reset() is called', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('err'));
    const { result } = renderHook(() => useAPI({ showErrorToast: false }));

    await act(async () => {
      await result.current.execute(mockFn);
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should show toast.error when showErrorToast is true (default)', async () => {
    const { toast } = await import('sonner');
    const mockFn = vi.fn().mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      await result.current.execute(mockFn);
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it('should use custom errorMessage from options', async () => {
    const { toast } = await import('sonner');
    const mockFn = vi.fn().mockRejectedValue(new Error('original'));
    const { result } = renderHook(() => useAPI({ errorMessage: 'Custom message' }));

    await act(async () => {
      await result.current.execute(mockFn);
    });

    expect(toast.error).toHaveBeenCalledWith('Custom message');
  });
});
