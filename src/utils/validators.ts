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
 * Validate the structure and basic integrity of an authentication token.
 * Checks that the token is a non-empty string with a plausible format.
 * @param {string | null | undefined} token - Token to validate.
 * @returns {{ valid: boolean; reason?: string }} - Validation result.
 */
export function validateToken(token: string | null | undefined): { valid: boolean; reason?: string } {
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
            if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
                return { valid: false, reason: 'Token has expired' };
            }
        } catch {
            // Not a standard JWT – treat as opaque token, still valid structurally
        }
    }
    return { valid: true };
}
