/**
 * Validate if the given phone number is valid.
 * Supports optional country code (1-3 digits) followed by 9 to 10 digits.
 * Examples of valid formats: "+34612345678", "612345678", "+1 6123456789"
 * Note: does not support all international formats (e.g. UK numbers with 11 digits).
 * @param {string} phoneNumber - Phone number to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validatePhoneNumber(phoneNumber) {
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{9,10}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Validate if the given email is valid.
 * Covers the most common email formats. Does not support internationalized
 * domain names (IDN) or all RFC 5321 edge cases.
 * @param {string} email - Email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Check if the required fields are present and non-empty.
 * @param {Object} data - Data object to validate.
 * @param {string[]} requiredFields - List of required field names.
 * @returns {boolean} - True if all required fields are present and non-empty.
 */
export function validateRequiredFields(data, requiredFields) {
  return requiredFields.every(
    (field) => field in data && data[field] !== '' && data[field] !== null && data[field] !== undefined
  );
}
