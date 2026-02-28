import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorProvider } from '@/contexts/ErrorContext';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

function TestConsumer({ options }) {
  const { errors, handleError, clearError, clearAllErrors } = useErrorHandler();
  return (
    <div>
      <button onClick={() => handleError(new Error('Test error'), options)}>
        Trigger Error
      </button>
      <button onClick={() => clearAllErrors()}>Clear All</button>
      <div data-testid="error-count">{errors.length}</div>
      {errors.map(e => (
        <div key={e.id} data-testid="error-item">
          <span>{e.message}</span>
          <button onClick={() => clearError(e.id)}>Clear</button>
        </div>
      ))}
    </div>
  );
}

describe('useErrorHandler', () => {
  it('throws if used outside ErrorProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow();
    consoleError.mockRestore();
  });

  it('adds an error when handleError is called', async () => {
    const { getByText, getByTestId } = render(
      <ErrorProvider>
        <TestConsumer />
      </ErrorProvider>
    );
    await act(async () => {
      getByText('Trigger Error').click();
    });
    expect(getByTestId('error-count').textContent).toBe('1');
  });

  it('clears a specific error when clearError is called', async () => {
    const { getByText, getByTestId } = render(
      <ErrorProvider>
        <TestConsumer />
      </ErrorProvider>
    );
    await act(async () => {
      getByText('Trigger Error').click();
    });
    expect(getByTestId('error-count').textContent).toBe('1');
    await act(async () => {
      getByText('Clear').click();
    });
    expect(getByTestId('error-count').textContent).toBe('0');
  });

  it('clears all errors when clearAllErrors is called', async () => {
    const { getByText, getByTestId } = render(
      <ErrorProvider>
        <TestConsumer />
      </ErrorProvider>
    );
    await act(async () => {
      getByText('Trigger Error').click();
      getByText('Trigger Error').click();
    });
    await act(async () => {
      getByText('Clear All').click();
    });
    expect(getByTestId('error-count').textContent).toBe('0');
  });
});
