/**
 * Centralized input validation utilities for Cloud Functions.
 * Provides protection against injection attacks, buffer overflows, and invalid inputs.
 */

const MAX_STRING_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 4096;
const MAX_PHONE_LENGTH = 20;
const MIN_PHONE_DIGITS = 9;
const MAX_TOKEN_LENGTH = 256;
const MAX_ARRAY_LENGTH = 500;

// XSS/HTML injection pattern - covers tags, javascript: URIs, data: URIs, and event handler attributes
const XSS_PATTERN = /<[^>]*>|javascript:|data:|vbscript:|on\w+\s*=/i;

// Token: only alphanumeric characters, hyphens, underscores, and dots
const TOKEN_PATTERN = /^[a-zA-Z0-9\-_\.]+$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a phone number string.
 * - Must not be empty
 * - Must not exceed max length
 * - Must contain only digits, spaces, +, -, (, )
 */
export function validatePhoneInput(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Teléfono es requerido' };
  }

  if (phone.length > MAX_PHONE_LENGTH) {
    return { valid: false, error: `Teléfono no puede exceder ${MAX_PHONE_LENGTH} caracteres` };
  }

  if (!/^[\d\s\+\-\(\)]+$/.test(phone)) {
    return { valid: false, error: 'Teléfono contiene caracteres inválidos' };
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < MIN_PHONE_DIGITS) {
    return { valid: false, error: 'Número de teléfono demasiado corto' };
  }

  return { valid: true };
}

/**
 * Validates a string's length and content.
 */
export function validateStringInput(
  value: string,
  fieldName: string,
  options: { required?: boolean; maxLength?: number; minLength?: number } = {}
): ValidationResult {
  const { required = true, maxLength = MAX_STRING_LENGTH, minLength = 0 } = options;

  if (!value || typeof value !== 'string') {
    if (required) {
      return { valid: false, error: `${fieldName} es requerido` };
    }
    return { valid: true };
  }

  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} no puede exceder ${maxLength} caracteres` };
  }

  if (value.length < minLength) {
    return { valid: false, error: `${fieldName} debe tener al menos ${minLength} caracteres` };
  }

  return { valid: true };
}

/**
 * Validates message content against XSS/injection patterns.
 */
export function validateMessageInput(message: string): ValidationResult {
  const lengthCheck = validateStringInput(message, 'Mensaje', { maxLength: MAX_MESSAGE_LENGTH });
  if (!lengthCheck.valid) return lengthCheck;

  if (XSS_PATTERN.test(message)) {
    return { valid: false, error: 'Mensaje contiene caracteres o patrones no permitidos' };
  }

  return { valid: true };
}

/**
 * Validates QR token format.
 * Only alphanumeric characters, hyphens, underscores, and dots are allowed.
 */
export function validateTokenInput(token: string): ValidationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token es requerido' };
  }

  if (token.length > MAX_TOKEN_LENGTH) {
    return { valid: false, error: `Token no puede exceder ${MAX_TOKEN_LENGTH} caracteres` };
  }

  if (!TOKEN_PATTERN.test(token)) {
    return { valid: false, error: 'Token contiene caracteres inválidos' };
  }

  return { valid: true };
}

/**
 * Validates an array of ID strings.
 */
export function validateArrayInput(
  arr: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number } = {}
): ValidationResult {
  const { minLength = 1, maxLength = MAX_ARRAY_LENGTH } = options;

  if (!Array.isArray(arr)) {
    return { valid: false, error: `${fieldName} debe ser un array` };
  }

  if (arr.length < minLength) {
    return { valid: false, error: `${fieldName} debe contener al menos ${minLength} elemento(s)` };
  }

  if (arr.length > maxLength) {
    return { valid: false, error: `${fieldName} no puede contener más de ${maxLength} elementos` };
  }

  for (const item of arr) {
    if (typeof item !== 'string' || item.trim() === '') {
      return { valid: false, error: `${fieldName} contiene elementos inválidos` };
    }
  }

  return { valid: true };
}

/**
 * Validates a numeric input within a range.
 */
export function validateNumericInput(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number } = {}
): ValidationResult {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return { valid: false, error: `${fieldName} debe ser un número válido` };
  }

  if (num < min) {
    return { valid: false, error: `${fieldName} debe ser al menos ${min}` };
  }

  if (num > max) {
    return { valid: false, error: `${fieldName} no puede exceder ${max}` };
  }

  return { valid: true };
}
