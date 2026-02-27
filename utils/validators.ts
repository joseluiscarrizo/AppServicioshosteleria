// validators.ts

/**
 * Validate if the given phone number is valid.
 * @param {string} phoneNumber - Phone number to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
    return phoneRegex.test(phoneNumber);
}

/**
 * Strict phone number validation (E.164 / international format).
 * Rejects injection attempts and non-numeric content.
 * @param {string} phoneNumber - Phone number to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validatePhoneNumberStrict(phoneNumber: string): boolean {
    if (typeof phoneNumber !== 'string') return false;
    // Strip allowed formatting characters only
    const cleaned = phoneNumber.replace(/[\s\-().]/g, '');
    // Must be E.164 compatible: optional + then 7-15 digits
    const strictRegex = /^\+?[1-9]\d{6,14}$/;
    return strictRegex.test(cleaned);
}

/**
 * Validate message length is within acceptable bounds.
 * @param {string} message - Message to validate.
 * @param {number} maxLength - Maximum allowed length (default 4096).
 * @returns {boolean} - True if valid, false otherwise.
 */
function validateMessageLength(message: string, maxLength = 4096): boolean {
    if (typeof message !== 'string') return false;
    return message.length > 0 && message.length <= maxLength;
}

/**
 * Sanitize user input to prevent XSS attacks.
 * @param {string} input - Input string to sanitize.
 * @returns {string} - Sanitized string.
 */
function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    // Removing < and > is the primary XSS defence (prevents HTML injection).
    // The remaining patterns are defence-in-depth for non-HTML contexts.
    return input
        .replace(/[<>]/g, '')
        .replace(/\b(javascript|data|vbscript):/gi, '')
        .replace(/\bon[a-zA-Z]+\s*=/gi, '')
        .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/g, '&amp;')
        .trim();
}

/**
 * Validate if the given email is valid.
 * @param {string} email - Email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/**
 * Validate if the given date is valid.
 * @param {string} date - Date to validate in YYYY-MM-DD format.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validateDate(date) {
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    return dateRegex.test(date);
}

/**
 * Check if the required fields are present.
 * @param {Object} data - Data object to validate.
 * @param {Array<string>} requiredFields - List of required field names.
 * @returns {boolean} - True if all required fields are present, false otherwise.
 */
function validateRequiredFields(data, requiredFields) {
    return requiredFields.every(field => field in data);
}

export { validatePhoneNumber, validatePhoneNumberStrict, validateEmail, validateDate, validateRequiredFields, validateMessageLength, sanitizeInput };