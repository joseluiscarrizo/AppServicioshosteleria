// tokenValidator.ts - QR fichaje token validation with TTL support

import { validateAndCheckTokenStatus, TokenValidationResult } from './tokenRefresh';

export type { TokenValidationResult };

/**
 * Validates a QR fichaje token with full expiration (TTL) checking.
 *
 * For JWT tokens the `exp` claim is checked against the current time.
 * Opaque (non-JWT) tokens are accepted if they are non-empty strings,
 * matching the behaviour of the existing backend validation.
 *
 * @param token - The raw token string obtained from the URL parameter.
 * @returns A TokenValidationResult describing the token status.
 */
export function validateQRToken(token: string | null | undefined): TokenValidationResult {
    return validateAndCheckTokenStatus(token);
}

/**
 * Returns true only when the token passes all validation checks
 * (non-empty, correct format, and not expired).
 *
 * This is a convenience wrapper suitable for simple boolean guards.
 *
 * @param token - The raw token string.
 */
export function isQRTokenValid(token: string | null | undefined): boolean {
    return validateQRToken(token).valid;
}
