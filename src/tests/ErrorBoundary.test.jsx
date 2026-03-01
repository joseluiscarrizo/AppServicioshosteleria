import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../components/ErrorBoundary';

// Suppress console.error for tests
const originalError = console.error;
beforeAll(() => {
  console.error = () => {};
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
    const user = userEvent.setup();

    // Use a controlled component that can conditionally throw
    let shouldThrow = true;
    const MaybeThrow = () => {
      if (shouldThrow) throw new Error('Test error');
      return <div>Test children</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Oops/i)).toBeInTheDocument();

    // Stop throwing before clicking reset
    shouldThrow = false;

    const resetButton = screen.getByText(/Intentar de nuevo/i);
    await user.click(resetButton);

    rerender(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test children')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Detalles del Error/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
