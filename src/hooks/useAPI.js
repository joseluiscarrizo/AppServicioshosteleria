import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_TIMEOUT = 30000;

/**
 * Custom hook for API requests with AbortController, timeout, and error handling.
 *
 * @param {Function} fetchFn - Async function that receives a signal and returns data.
 * @param {object} options
 * @param {boolean} [options.immediate=true] - Whether to run on mount.
 * @param {number} [options.timeout=30000] - Timeout in milliseconds.
 * @param {Array} [options.deps=[]] - Dependencies that trigger a re-fetch.
 */
export function useAPI(fetchFn, options = {}) {
  const { immediate = true, timeout = DEFAULT_TIMEOUT, deps = [] } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async () => {
    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(controller.signal);
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        if (err.name === 'AbortError') {
          setError(new Error('La solicitud superó el tiempo límite'));
        } else {
          setError(err);
        }
      }
    } finally {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchFn, timeout]);

  useEffect(() => {
    if (immediate) {
      execute();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return { data, loading, error, refetch: execute };
}
