import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook para requests HTTP con manejo de timeouts y cleanup
 * @param {string} url - URL del endpoint
 * @param {object} options - Opciones fetch (method, headers, body, etc)
 * @param {number} timeout - Timeout en milisegundos (default: 30000)
 * @returns {object} { data, loading, error, refetch }
 */
export const useAPI = (url, options = {}, timeout = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const timeoutIdRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      timeoutIdRef.current = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, timeout);

      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutIdRef.current);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error desconocido');
        console.error(`Error en fetch de ${url}:`, err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, timeout]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    fetchData();

    return () => {
      clearTimeout(timeoutIdRef.current);
      abortControllerRef.current?.abort();
    };
  }, [url, fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};
