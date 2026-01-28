import { useEffect } from 'react';
import { toast } from 'sonner';

// Componente global para manejar errores de rate limit
export default function RateLimitHandler() {
  useEffect(() => {
    // Interceptar errores de rate limit
    const handleError = (event) => {
      if (event.reason?.message?.includes('Rate limit exceeded')) {
        toast.error('Demasiadas solicitudes. Por favor, espera un momento.', {
          duration: 5000,
          id: 'rate-limit-toast' // Prevenir múltiples toasts
        });
        
        // Limpiar cache de React Query para forzar una recarga más espaciada
        const queryClient = window.__REACT_QUERY_CLIENT__;
        if (queryClient) {
          queryClient.clear();
        }
      }
    };

    window.addEventListener('unhandledrejection', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return null;
}