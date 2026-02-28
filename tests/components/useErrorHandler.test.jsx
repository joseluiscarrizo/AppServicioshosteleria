import { describe, test, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { ErrorProvider, useErrorHandler } from '@/contexts/ErrorContext';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

const TestConsumer = ({ onReady }) => {
  const ctx = useErrorHandler();
  React.useEffect(() => { onReady(ctx); }, []);
  return (
    <div>
      <span data-testid="error-count">{ctx.errors.length}</span>
    </div>
  );
};

describe('useErrorHandler', () => {
  test('starts with no errors', () => {
    let ctx;
    render(
      <ErrorProvider>
        <TestConsumer onReady={(c) => { ctx = c; }} />
      </ErrorProvider>
    );
    expect(screen.getByTestId('error-count').textContent).toBe('0');
  });

  test('handleError adds an error to state', () => {
    let ctx;
    render(
      <ErrorProvider>
        <TestConsumer onReady={(c) => { ctx = c; }} />
      </ErrorProvider>
    );

    act(() => {
      ctx.handleError(new Error('test'), { showNotification: false });
    });

    expect(screen.getByTestId('error-count').textContent).toBe('1');
  });

  test('clearError removes a specific error', () => {
    let ctx;
    render(
      <ErrorProvider>
        <TestConsumer onReady={(c) => { ctx = c; }} />
      </ErrorProvider>
    );

    let errorId;
    act(() => {
      errorId = ctx.handleError(new Error('to remove'), { showNotification: false });
    });

    expect(screen.getByTestId('error-count').textContent).toBe('1');

    act(() => {
      ctx.clearError(errorId);
    });

    expect(screen.getByTestId('error-count').textContent).toBe('0');
  });

  test('clearAllErrors removes all errors', () => {
    let ctx;
    render(
      <ErrorProvider>
        <TestConsumer onReady={(c) => { ctx = c; }} />
      </ErrorProvider>
    );

    act(() => {
      ctx.handleError(new Error('err1'), { showNotification: false });
      ctx.handleError(new Error('err2'), { showNotification: false });
    });

    expect(screen.getByTestId('error-count').textContent).toBe('2');

    act(() => {
      ctx.clearAllErrors();
    });

    expect(screen.getByTestId('error-count').textContent).toBe('0');
  });

  test('throws when used outside ErrorProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bad = () => {
      useErrorHandler();
      return null;
    };
    expect(() => render(<Bad />)).toThrow('useErrorHandler must be used within ErrorProvider');
    spy.mockRestore();
  });
});
