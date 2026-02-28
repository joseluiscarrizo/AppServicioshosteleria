import { useCallback } from 'react';

export const useErrorHandler = () => {
  const handleError = useCallback((error, context) => {
    console.error(`Error in ${context}:`, error);
    // Aquí podría ir logging centralizado
  }, []);

  return { handleError };
};
