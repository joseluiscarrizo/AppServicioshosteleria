// useTokenStatus.ts - Hook for accessing token expiration status in components

import { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { REFRESH_THRESHOLD_SECONDS } from '@/utils/tokenRefresh';

export interface TokenStatus {
  /** True if the user is currently authenticated */
  isAuthenticated: boolean;
  /** True if the token expires in less than REFRESH_THRESHOLD_SECONDS */
  isExpiring: boolean;
  /** Minutes remaining until expiration, or null if unknown */
  minutesRemaining: number | null;
  /** True if the token has already expired */
  isExpired: boolean;
  /** The raw token string, or null if not authenticated */
  token: string | null;
}

/**
 * Returns token expiration status for the currently authenticated user.
 * Useful for showing session expiry warnings in UI components.
 *
 * @example
 * ```tsx
 * function SessionWarning() {
 *   const { isAuthenticated, isExpiring, minutesRemaining } = useTokenStatus();
 *   if (!isAuthenticated || !isExpiring) return null;
 *   return <div>Session expires in {minutesRemaining} minute(s)</div>;
 * }
 * ```
 */
export function useTokenStatus(): TokenStatus {
  const { token, isTokenExpired, timeUntilExpiration, isAuthenticated } = useAuth();

  return useMemo(() => {
    if (!token || !isAuthenticated) {
      return {
        isAuthenticated: false,
        isExpiring: false,
        minutesRemaining: null,
        isExpired: isTokenExpired ?? false,
        token: token ?? null
      };
    }

    const timeRemaining = timeUntilExpiration ?? null;
    const isExpiring = timeRemaining !== null && timeRemaining > 0 && timeRemaining < REFRESH_THRESHOLD_SECONDS;
    const minutesRemaining = timeRemaining !== null && timeRemaining > 0
      ? Math.ceil(timeRemaining / 60)
      : null;

    return {
      isAuthenticated: true,
      isExpiring,
      minutesRemaining,
      isExpired: isTokenExpired ?? false,
      token
    };
  }, [token, isTokenExpired, timeUntilExpiration, isAuthenticated]);
}
