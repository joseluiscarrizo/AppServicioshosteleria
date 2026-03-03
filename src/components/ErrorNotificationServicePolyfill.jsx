
// Polyfill para ErrorNotificationService - DEBE CARGARSE PRIMERO
if (typeof window !== 'undefined' && !window.ErrorNotificationService) {
  window.ErrorNotificationService = {
    getMessage: (error) => error?.message || String(error) || 'Error',
    getDetails: (error) => error?.details || '',
    log: (error) => console.error('Error:', error)
  };
}

export default window.ErrorNotificationService;
