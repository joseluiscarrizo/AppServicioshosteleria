import { useCallback } from 'react';

export const useErrorHandler = (componentName = 'Unknown') => {
  const handleError = useCallback(
    (error, context = {}) => {
      const errorLog = {
        timestamp: new Date().toISOString(),
        component: componentName,
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        context,
      };

      console.error('[Error Handler]', errorLog);

      // Send to error tracking service
      if (window.errorTracker) {
        window.errorTracker.captureException(error, {
          contexts: { component: context },
        });
      }

      return errorLog;
    },
    [componentName]
  );

  const handleAsyncError = useCallback(
    async (asyncFn, context = {}) => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, context);
        throw error;
      }
    },
    [handleError]
  );

  return { handleError, handleAsyncError };
};
