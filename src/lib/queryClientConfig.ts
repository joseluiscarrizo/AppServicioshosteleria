import { QueryClient } from '@tanstack/react-query';

const STALE_TIME = 5 * 60 * 1000;   // 5 minutes
const CACHE_TIME = 30 * 60 * 1000;  // 30 minutes

const retryDelay = (attemptIndex: number): number =>
  Math.min(1000 * 2 ** attemptIndex, 30000);

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay,
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
    },
    mutations: {
      onError: (error: unknown) => {
        console.error('[QueryClient] Mutation error:', error);
      },
    },
  },
};

export const queryClientInstance = new QueryClient(queryClientConfig);
