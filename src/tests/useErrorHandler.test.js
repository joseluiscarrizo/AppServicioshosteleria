import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../hooks/useErrorHandler';

describe('useErrorHandler', () => {
  it('should handle errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler('TestComponent'));
    const error = new Error('Test error');

    const errorLog = result.current.handleError(error);

    expect(errorLog.component).toBe('TestComponent');
    expect(errorLog.message).toBe('Test error');
    expect(errorLog.timestamp).toBeDefined();
  });

  it('should handle async errors', async () => {
    const { result } = renderHook(() => useErrorHandler('TestComponent'));
    const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'));

    await expect(
      act(async () => {
        await result.current.handleAsyncError(asyncFn);
      })
    ).rejects.toThrow('Async error');

    expect(asyncFn).toHaveBeenCalled();
  });

  it('should include context in error log', () => {
    const { result } = renderHook(() => useErrorHandler('TestComponent'));
    const error = new Error('Test error');
    const context = { userId: '123', action: 'fetchData' };

    const errorLog = result.current.handleError(error, context);

    expect(errorLog.context).toEqual(context);
  });
});
