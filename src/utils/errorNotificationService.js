/**
 * ErrorNotificationService - Servicio de notificación de errores al usuario.
 */

const errorMessages = {
  NETWORK_ERROR: 'There was a network error. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An error occurred on the server. Please try again later.',
  AUTH_REQUIRED: 'Authentication is required to access this resource.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  USER_NOT_REGISTERED: 'Your account is not registered for this application.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

class ErrorNotificationService {
  /**
   * Get a user-friendly error message for the given error type.
   * @param {string} errorType - The error type key.
   * @returns {string} - A human-readable error message.
   */
  static getMessage(errorType) {
    const key = (errorType || 'UNKNOWN').toUpperCase();
    return errorMessages[key] ?? errorMessages.UNKNOWN;
  }

  /**
   * Notify the user with a console warning.
   * @param {string} message - Message to display to the user.
   */
  static notifyUser(message) {
    console.warn(`[ErrorNotification] ${message}`);
  }

  /**
   * Alias for notifyUser.
   * @param {string} message - Message to display to the user.
   */
  static notify(message) {
    console.warn(`[ErrorNotification] ${message}`);
  }
}

export default ErrorNotificationService;