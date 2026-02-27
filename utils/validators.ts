// validators.ts - Unified input validation module

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Sanitize a string to prevent injection attacks by removing control characters and null bytes. */
export function sanitizeString(value: string): string {
  return value
    // Remove null bytes and other dangerous control characters
    // (excludes tab \x09, newline \x0A, carriage return \x0D which are valid text)
    // deno-lint-ignore no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

/** Validate a string for type, minimum and maximum length. */
export function validateString(
  value: unknown,
  minLength = 0,
  maxLength = 10_000,
): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Debe ser una cadena de texto" };
  }
  if (value.length < minLength) {
    return {
      valid: false,
      error: `Mínimo ${minLength} caracteres requeridos`,
    };
  }
  if (value.length > maxLength) {
    return {
      valid: false,
      error: `Máximo ${maxLength} caracteres permitidos`,
    };
  }
  return { valid: true };
}

/** Validate a non-empty string ID (max 255 characters). */
export function validateId(value: unknown): ValidationResult {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return { valid: false, error: "ID inválido o requerido" };
  }
  if (value.length > 255) {
    return { valid: false, error: "ID demasiado largo" };
  }
  return { valid: true };
}

/** Validate an array for type and length bounds. */
export function validateArray(
  value: unknown,
  minLength = 1,
  maxLength = 500,
): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, error: "Debe ser un array" };
  }
  if (value.length < minLength) {
    return {
      valid: false,
      error: `El array debe tener al menos ${minLength} elemento(s)`,
    };
  }
  if (value.length > maxLength) {
    return {
      valid: false,
      error: `El array no puede tener más de ${maxLength} elementos`,
    };
  }
  return { valid: true };
}

/** Validate a number within an inclusive range. */
export function validateNumber(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): ValidationResult {
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: "Debe ser un número válido" };
  }
  if (value < min) {
    return { valid: false, error: `El valor mínimo es ${min}` };
  }
  if (value > max) {
    return { valid: false, error: `El valor máximo es ${max}` };
  }
  return { valid: true };
}

/** Validate if the given phone number is valid. */
export function validatePhoneNumber(phoneNumber: unknown): boolean {
  if (typeof phoneNumber !== "string") return false;
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
  return phoneRegex.test(phoneNumber);
}

/** Validate if the given email is valid. */
export function validateEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/** Validate if the given date string is in YYYY-MM-DD format. */
export function validateDate(date: unknown): boolean {
  if (typeof date !== "string") return false;
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  return dateRegex.test(date);
}

/** Check if the required fields are present and non-empty in a data object. */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[],
): boolean {
  return requiredFields.every(
    (field) =>
      field in data &&
      data[field] !== null &&
      data[field] !== undefined &&
      data[field] !== "",
  );
}