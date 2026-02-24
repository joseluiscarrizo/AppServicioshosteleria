/**
 * Validate if the given email is valid.
 * @param {string} email - Email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/**
 * Validate if the given phone number is valid.
 * @param {string} phoneNumber - Phone number to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{9,10}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
}

/**
 * Check if the required fields are present and non-empty.
 * @param {Object} data - Data object to validate.
 * @param {string[]} requiredFields - List of required field names.
 * @returns {boolean} - True if all required fields are present and non-empty.
 */
export function validateRequiredFields(data, requiredFields) {
    return requiredFields.every(field => field in data && data[field] !== '');
}
