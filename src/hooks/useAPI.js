import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook for centralized API calls with loading and error state management.
 *
 * @param {object} [options]
 * @param {boolean} [options.showErrorToast=true] - Whether to show a toast on error.
 * @param {string} [options.errorMessage] - Override the default error message.
 * @returns {{ execute, isLoading, error, reset }}
 */
export function useAPI({ showErrorToast = true, errorMessage } = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const execute = useCallback(
    async (apiFn, options = {}) => {
      const { onSuccess, onError, successMessage, errorMsg } = options;
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiFn();
        if (successMessage) {
          toast.success(successMessage);
        }
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (err) {
        const message = errorMsg || errorMessage || err?.message || 'Algo salió mal';
        setError(message);
        if (showErrorToast) {
          toast.error(message);
        }
        if (onError) {
          onError(err);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [showErrorToast, errorMessage]
  );

  return { execute, isLoading, error, reset };
}
