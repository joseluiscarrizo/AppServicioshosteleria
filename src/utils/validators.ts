// validators.ts - Frontend validation utilities

/**
 * Validate if the given email is valid.
 * @param {string} email - Email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/**
 * Validate if the given phone number is valid.
 * @param {string} phoneNumber - Phone number to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
    return phoneRegex.test(phoneNumber);
}

/**
 * Validate if the given date is valid (format YYYY-MM-DD).
 * @param {string} date - Date to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validateDate(date: string): boolean {
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    return dateRegex.test(date);
}

/**
 * Check if all required fields are present in the data object.
 * @param {Record<string, unknown>} data - Data object to validate.
 * @param {string[]} requiredFields - List of required field names.
 * @returns {boolean} - True if all required fields are present, false otherwise.
 */
export function validateRequiredFields(data: Record<string, unknown>, requiredFields: string[]): boolean {
    if (!data || typeof data !== 'object') return false;
    return requiredFields.every(field => field in data && data[field] !== null && data[field] !== undefined);
}

/** Number of seconds before expiration to consider a token as needing refresh. */
const REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

/**
 * Validate the structure and basic integrity of an authentication token.
 * For JWTs, also validates expiration and detects tokens close to expiry.
 * @param {string | null | undefined} token - Token to validate.
 * @returns {{ valid: boolean; reason?: string; isExpired?: boolean; shouldRefresh?: boolean }} - Validation result.
 */
export function validateToken(token: string | null | undefined): {
    valid: boolean;
    reason?: string;
    isExpired?: boolean;
    shouldRefresh?: boolean;
} {
    if (!token) {
        return { valid: false, reason: 'Token is missing' };
    }
    if (typeof token !== 'string') {
        return { valid: false, reason: 'Token must be a string' };
    }
    if (token.trim().length === 0) {
        return { valid: false, reason: 'Token is empty' };
    }
    // Basic JWT structure check: three dot-separated base64 segments
    const jwtParts = token.split('.');
    if (jwtParts.length === 3) {
        try {
            const payload = JSON.parse(atob(jwtParts[1]));
            if (payload.exp) {
                const nowSeconds = Math.floor(Date.now() / 1000);
                if (nowSeconds > payload.exp) {
                    return { valid: false, reason: 'Token expired', isExpired: true };
                }
                const secondsUntilExpiry = payload.exp - nowSeconds;
                if (secondsUntilExpiry < REFRESH_THRESHOLD_SECONDS) {
                    return { valid: true, shouldRefresh: true };
                }
            }
        } catch {
            // Not a standard JWT – treat as opaque token, still valid structurally
        }
    }
    return { valid: true };
}
