/**
 * Validators - Módulo de validación de entradas para la aplicación.
 */

/**
 * Valida si el token QR de fichaje es válido (no vacío y formato básico).
 * @param {string} token - Token a validar.
 * @returns {boolean} - True si el token es válido, false en caso contrario.
 */
export function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  return trimmed.length > 0;
}

/**
 * Valida si el email dado es válido.
 * @param {string} email - Email a validar.
 * @returns {boolean} - True si es válido, false en caso contrario.
 */
export function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Valida si el número de teléfono dado es válido.
 * @param {string} phoneNumber - Número de teléfono a validar.
 * @returns {boolean} - True si es válido, false en caso contrario.
 */
export function validatePhoneNumber(phoneNumber) {
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Valida si la fecha dada es válida (formato YYYY-MM-DD).
 * @param {string} date - Fecha a validar.
 * @returns {boolean} - True si es válida, false en caso contrario.
 */
export function validateDate(date) {
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  return dateRegex.test(date);
}

/**
 * Verifica que los campos requeridos estén presentes en un objeto.
 * @param {Object} data - Objeto de datos a validar.
 * @param {Array<string>} requiredFields - Lista de campos requeridos.
 * @returns {boolean} - True si todos los campos están presentes, false en caso contrario.
 */
export function validateRequiredFields(data, requiredFields) {
  if (!data || typeof data !== 'object') return false;
  return requiredFields.every(field => field in data && data[field] !== null && data[field] !== undefined);
}
