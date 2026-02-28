import { useState, useCallback, useRef } from 'react';

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Hook for API requests with timeout, retry logic, and abort controller support.
 */
export function useAPI({ timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, retryDelay = DEFAULT_RETRY_DELAY } = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (apiFn, options = {}) => {
    const { onSuccess, onError, skipRetry = false } = options;

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    let lastError;
    const maxAttempts = skipRetry ? 1 : retries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), timeout);
        const result = await apiFn(abortControllerRef.current.signal);
        clearTimeout(timeoutId);

        setIsLoading(false);
        onSuccess?.(result);
        return result;
      } catch (err) {
        lastError = err;
        if (err?.name === 'AbortError') break;
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    setError(lastError);
    setIsLoading(false);
    onError?.(lastError);
    return null;
  }, [timeout, retries, retryDelay]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { execute, isLoading, error, abort };
}
