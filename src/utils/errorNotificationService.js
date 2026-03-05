/**
 * ErrorNotificationService - Servicio centralizado de notificación de errores al usuario.
 * 
 * Proporciona métodos para mostrar errores al usuario de forma consistente,
 * tanto en consola (desarrollo) como en la UI (producción via toast si disponible).
 */

// Mapa de mensajes de error legibles para el usuario
const ERROR_MESSAGES = {
  TOKEN_EXPIRED: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.',
  AUTH_ERROR: 'Error de autenticación. Por favor, recarga la página.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  SERVER_ERROR: 'Error del servidor. Por favor, inténtalo de nuevo.',
  VALIDATION_ERROR: 'Los datos introducidos no son válidos.',
  DEFAULT: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
};

class ErrorNotificationService {
  /**
   * Muestra un mensaje de error al usuario.
   * Usa toast de sonner si está disponible, si no usa console.warn.
   * @param {string} message - Mensaje de error a mostrar.
   */
  static notify(message) {
    const msg = message || ERROR_MESSAGES.DEFAULT;
    // En desarrollo, siempre loggear
    if (import.meta.env?.DEV) {
      console.warn(`[ErrorNotification] ${msg}`);
    }
    // Intentar usar toast de sonner si está disponible globalmente
    try {
      if (typeof window !== 'undefined' && window.__sonner_toast) {
        window.__sonner_toast.error(msg);
      }
    } catch {
      // Si toast no está disponible, el console.warn es suficiente
    }
  }

  /**
   * Alias de notify() — Notifica al usuario con un mensaje de error.
   * Mantiene compatibilidad con llamadas a .notifyUser() en AuthContext y FichajeQR.
   * @param {string} message - Mensaje a mostrar al usuario.
   */
  static notifyUser(message) {
    return ErrorNotificationService.notify(message);
  }

  /**
   * Obtiene un mensaje de error legible para el usuario a partir de una clave.
   * @param {string} key - Clave del mensaje (ej: 'TOKEN_EXPIRED').
   * @returns {string} Mensaje legible para el usuario.
   */
  static getMessage(key) {
    return ERROR_MESSAGES[key] || ERROR_MESSAGES.DEFAULT;
  }

  /**
   * Loguea un error técnico (solo visible en consola, no al usuario).
   * @param {string} context - Contexto donde ocurrió el error.
   * @param {Error|unknown} error - El error capturado.
   */
  static logError(context, error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ErrorNotification][${context}] ${message}`, error);
  }
}

export default ErrorNotificationService;
