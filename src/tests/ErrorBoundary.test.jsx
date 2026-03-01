import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ErrorBoundary from '../components/ErrorBoundary';

const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test children</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test children')).toBeInTheDocument();
  });

  it('should render error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Oops/i)).toBeInTheDocument();
  });

  it('should reset error when reset button is clicked', async () => {
    let shouldThrow = true;
    const ConditionalError = () => {
      if (shouldThrow) throw new Error('Test error');
      return <div>Test children</div>;
    };

    render(
      <ErrorBoundary>
        <ConditionalError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Oops/i)).toBeInTheDocument();

    shouldThrow = false;
    const resetButton = screen.getByText(/Intentar de nuevo/i);
    await userEvent.click(resetButton);

    expect(screen.getByText('Test children')).toBeInTheDocument();
  });
});
