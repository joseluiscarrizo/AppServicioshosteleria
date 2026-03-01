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
  // Store options in a ref so fetchData always reads the latest value
  // without needing options in useCallback deps (avoids infinite re-renders
  // when the caller passes an inline object).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      timeoutIdRef.current = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, timeout);

      const response = await fetch(url, {
        ...optionsRef.current,
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
  }, [url, timeout]);

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
