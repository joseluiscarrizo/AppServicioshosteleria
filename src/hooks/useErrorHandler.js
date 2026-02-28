import { useCallback } from 'react';

export const useErrorHandler = (context = 'Component') => {
  const handleError = useCallback((error, additionalInfo = {}) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      message: error?.message,
      stack: error?.stack,
      ...additionalInfo,
    };

    console.error('[Error Handler]', errorLog);

    return errorLog;
  }, [context]);

  return { handleError };
};
