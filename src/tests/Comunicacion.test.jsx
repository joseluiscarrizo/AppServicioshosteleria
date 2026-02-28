import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';

// Test the core auth-loading fix applied to Comunicacion and Chat pages.
// The fix uses a 'userLoaded' state (instead of checking '!user') to prevent
// infinite loading when auth.me() fails or returns null.

function AuthLoadingFixture({ authMe }) {
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    authMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => {
        clearTimeout(timeout);
        setUserLoaded(true);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [authMe]);

  if (!userLoaded) {
    return <div data-testid="loading-spinner" className="animate-spin" />;
  }

  return <div data-testid="page-content">Comunicación - {user?.name || 'Guest'}</div>;
}

describe('Comunicacion - auth loading fix', () => {
  it('shows spinner while auth is pending', () => {
    const authMe = vi.fn(() => new Promise(() => {}));
    render(<AuthLoadingFixture authMe={authMe} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows page content after successful auth', async () => {
    const authMe = vi.fn().mockResolvedValue({ id: 'user-1', name: 'Ana García' });
    render(<AuthLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('page-content')).toBeInTheDocument());
    expect(screen.getByText('Comunicación - Ana García')).toBeInTheDocument();
  });

  it('shows page content when auth fails (prevents infinite loading)', async () => {
    const authMe = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<AuthLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('page-content')).toBeInTheDocument());
    expect(screen.getByText('Comunicación - Guest')).toBeInTheDocument();
  });

  it('shows page content when auth returns null', async () => {
    const authMe = vi.fn().mockResolvedValue(null);
    render(<AuthLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('page-content')).toBeInTheDocument());
  });

  it('calls auth.me exactly once on mount', async () => {
    const authMe = vi.fn().mockResolvedValue({ id: 'user-1', name: 'Test' });
    render(<AuthLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('page-content')).toBeInTheDocument());
    expect(authMe).toHaveBeenCalledTimes(1);
  });
});
