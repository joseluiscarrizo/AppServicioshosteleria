import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';

// Test the core auth-loading fix applied to Chat page.
// The fix uses a 'userLoaded' state (instead of checking '!user') to prevent
// infinite loading when auth.me() fails or returns null.

function ChatLoadingFixture({ authMe }) {
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

  return (
    <div data-testid="chat-content">
      <h1>Chat de Eventos</h1>
      {user ? <span>Welcome {user.name}</span> : <span>No groups available</span>}
    </div>
  );
}

describe('Chat - auth loading fix', () => {
  it('shows spinner while auth is pending', () => {
    const authMe = vi.fn(() => new Promise(() => {}));
    render(<ChatLoadingFixture authMe={authMe} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders chat page after successful auth', async () => {
    const authMe = vi.fn().mockResolvedValue({ id: 'user-1', name: 'Carlos', role: 'admin' });
    render(<ChatLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('chat-content')).toBeInTheDocument());
    expect(screen.getByText('Chat de Eventos')).toBeInTheDocument();
    expect(screen.getByText('Welcome Carlos')).toBeInTheDocument();
  });

  it('renders chat page even when auth fails (no infinite loading)', async () => {
    const authMe = vi.fn().mockRejectedValue(new Error('Auth error'));
    render(<ChatLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('chat-content')).toBeInTheDocument());
    expect(screen.getByText('No groups available')).toBeInTheDocument();
  });

  it('renders chat page when auth returns null', async () => {
    const authMe = vi.fn().mockResolvedValue(null);
    render(<ChatLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('chat-content')).toBeInTheDocument());
    expect(screen.getByText('No groups available')).toBeInTheDocument();
  });

  it('calls auth.me exactly once on mount', async () => {
    const authMe = vi.fn().mockResolvedValue({ id: 'user-1', name: 'Test', role: 'admin' });
    render(<ChatLoadingFixture authMe={authMe} />);
    await waitFor(() => expect(screen.getByTestId('chat-content')).toBeInTheDocument());
    expect(authMe).toHaveBeenCalledTimes(1);
  });
});
