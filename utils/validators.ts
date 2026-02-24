// validators.ts

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validate if the given phone number is valid.
 * Accepts 9–12 digit numbers, optionally preceded by a country code prefix.
 * @param {string} phoneNumber - Phone number to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{9,12}$/;
    return phoneRegex.test(phoneNumber.trim());
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

export { validatePhoneNumber, validateEmail, validateDate, validateRequiredFields };