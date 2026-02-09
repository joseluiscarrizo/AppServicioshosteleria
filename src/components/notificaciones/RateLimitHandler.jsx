import { useEffect } from 'react';
import { toast } from 'sonner';

// Componente global para manejar errores de rate limit
export default function RateLimitHandler() {
  useEffect(() => {
    // Interceptar errores de rate limit
    const handleError = (event) => {
      const errorMessage = event.reason?.message || event.error?.message || '';
      
      if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('rate limit')) {
        event.preventDefault(); // Prevenir que el error se propague
        
        toast.warning('⏱️ Demasiadas solicitudes. Espera unos segundos antes de continuar.', {
          duration: 6000,
          id: 'rate-limit-toast' // Prevenir múltiples toasts
        });
      }
    };

    const handleErrorEvent = (event) => {
      const errorMessage = event.error?.message || '';
      
      if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('rate limit')) {
        event.preventDefault();
        
        toast.warning('⏱️ Demasiadas solicitudes. Espera unos segundos antes de continuar.', {
          duration: 6000,
          id: 'rate-limit-toast'
        });
      }
    };

    window.addEventListener('unhandledrejection', handleError);
    window.addEventListener('error', handleErrorEvent);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('error', handleErrorEvent);
    };
  }, []);

  return null;
}