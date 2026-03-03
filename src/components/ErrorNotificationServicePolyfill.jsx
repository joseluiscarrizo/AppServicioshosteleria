/**
 * Polyfill para ErrorNotificationService
 * Evita el error "ErrorNotificationService.getMessage is not a function"
 */

if (typeof window !== 'undefined') {
  if (!window.ErrorNotificationService) {
    window.ErrorNotificationService = {
      getMessage: (error) => {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        return 'Error desconocido';
      },
      getDetails: (error) => {
        return error?.details || '';
      },
      log: (error) => {
        console.error('ErrorNotificationService:', error);
      }
    };
  }
}

export default window.ErrorNotificationService;