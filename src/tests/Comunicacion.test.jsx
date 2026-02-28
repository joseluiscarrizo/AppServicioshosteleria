import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('@/components/ui/PullToRefresh', () => ({
  default: ({ children }) => <div>{children}</div>
}));

vi.mock('../components/comunicacion/ChatEventos', () => ({
  default: () => <div data-testid="chat-eventos">Chat Eventos</div>
}));

vi.mock('../components/comunicacion/ChatCoordinadores', () => ({
  default: () => <div data-testid="chat-coordinadores">Chat Coordinadores</div>
}));

vi.mock('../components/comunicacion/ChatClientes', () => ({
  default: () => <div data-testid="chat-clientes">Chat Clientes</div>
}));

vi.mock('../components/comunicacion/PartesTrabajos', () => ({
  default: () => <div data-testid="partes-trabajos">Partes Trabajos</div>
}));

vi.mock('@/hooks/useAPI', () => ({
  useAPI: vi.fn(() => ({
    data: { id: 'user-1', role: 'admin' },
    loading: false,
    error: null,
    refetch: vi.fn()
  }))
}));

import Comunicacion from '@/pages/Comunicacion';

describe('Comunicacion', () => {
  it('renders the main heading', async () => {
    renderWithProviders(<Comunicacion />);
    await waitFor(() => {
      expect(screen.getByText('Comunicación')).toBeInTheDocument();
    });
  });

  it('renders the tabs', async () => {
    renderWithProviders(<Comunicacion />);
    await waitFor(() => {
      expect(screen.getByText(/chat eventos/i)).toBeInTheDocument();
    });
  });

  it('shows loading spinner when loading', async () => {
    const { useAPI } = await import('@/hooks/useAPI');
    useAPI.mockReturnValueOnce({ data: null, loading: true, error: null, refetch: vi.fn() });
    renderWithProviders(<Comunicacion />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    const { useAPI } = await import('@/hooks/useAPI');
    useAPI.mockReturnValueOnce({ data: null, loading: false, error: new Error('fail'), refetch: vi.fn() });
    renderWithProviders(<Comunicacion />);
    await waitFor(() => {
      expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
    });
  });

  it('renders ChatEventos tab content by default', async () => {
    renderWithProviders(<Comunicacion />);
    await waitFor(() => {
      expect(screen.getByTestId('chat-eventos')).toBeInTheDocument();
    });
  });
});
