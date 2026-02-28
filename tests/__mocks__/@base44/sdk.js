// Stub for @base44/sdk used in test environment
import { vi } from 'vitest';

export const createClient = vi.fn(() => ({
  auth: {
    me: vi.fn().mockResolvedValue(null),
    login: vi.fn(),
    logout: vi.fn(),
  },
  entities: {},
  functions: { invoke: vi.fn() },
  integrations: {},
}));
