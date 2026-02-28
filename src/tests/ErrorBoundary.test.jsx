import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Component that throws an error on demand
function BrokenComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working Component</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('displays error message in fallback UI', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Test error')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('allows resetting the error state', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/intentar de nuevo/i));

    rerender(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Working Component')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('calls onError prop when an error occurs', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
    consoleError.mockRestore();
  });

  it('accepts a custom fallback component', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const CustomFallback = () => <div>Custom Fallback</div>;
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
