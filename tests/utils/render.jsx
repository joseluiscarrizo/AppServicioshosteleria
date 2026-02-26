import React from 'react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { createMockQueryClient } from './mocks.js';

export function renderWithProviders(ui, options = {}) {
  const { queryClient = createMockQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient
  };
}
