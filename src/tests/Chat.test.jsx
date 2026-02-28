import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../tests/utils/render.jsx';

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: vi.fn().mockResolvedValue({ id: 'user-1', role: 'admin' })
    },
    entities: {
      GrupoChat: { filter: vi.fn().mockResolvedValue([]) },
      MensajeChat: { filter: vi.fn().mockResolvedValue([]) }
    }
  }
}));

vi.mock('../components/chat/GruposList', () => ({
  default: () => <div data-testid="grupos-list">Grupos List</div>
}));

vi.mock('../components/chat/ChatWindow.jsx', () => ({
  default: () => <div data-testid="chat-window">Chat Window</div>
}));

vi.mock('@/hooks/useAPI', () => ({
  useAPI: vi.fn(() => ({
    data: { id: 'user-1', role: 'admin' },
    loading: false,
    error: null,
    refetch: vi.fn()
  }))
}));

import Chat from '@/pages/Chat';

describe('Chat', () => {
  it('renders the main heading', async () => {
    renderWithProviders(<Chat />);
    await waitFor(() => {
      expect(screen.getByText('Chat de Eventos')).toBeInTheDocument();
    });
  });

  it('shows loading spinner when loading user', async () => {
    const { useAPI } = await import('@/hooks/useAPI');
    useAPI.mockReturnValueOnce({ data: null, loading: true, error: null, refetch: vi.fn() });
    renderWithProviders(<Chat />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state when user fetch fails', async () => {
    const { useAPI } = await import('@/hooks/useAPI');
    useAPI.mockReturnValueOnce({ data: null, loading: false, error: new Error('fail'), refetch: vi.fn() });
    renderWithProviders(<Chat />);
    await waitFor(() => {
      expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no groups', async () => {
    renderWithProviders(<Chat />);
    await waitFor(() => {
      expect(screen.getByText(/no tienes grupos de chat/i)).toBeInTheDocument();
    });
  });

  it('renders the description text', async () => {
    renderWithProviders(<Chat />);
    await waitFor(() => {
      expect(screen.getByText(/comunícate con el equipo/i)).toBeInTheDocument();
    });
  });
});
