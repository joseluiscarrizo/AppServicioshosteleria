// validators.ts - Frontend validation utilities

import Logger from './logger';
import { REFRESH_THRESHOLD_SECONDS } from './tokenRefresh';

/** Explicit return type for token validation results. */
export interface TokenValidationResult {
    valid: boolean;
    reason?: string;
    isExpired?: boolean;
    shouldRefresh: boolean;
}

/**
 * Decodes a base64 string in a way that is compatible with both Node.js and browser environments.
 * @param {string} base64 - Base64-encoded string to decode.
 * @returns {string} - Decoded UTF-8 string.
 */
function decodeBase64(base64: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(base64, 'base64').toString('utf-8');
    }
    return atob(base64);
}

/**
 * Validate if the given email is valid.
 * Performs a runtime type check before applying the regex.
 *
 * @param {string} email - Email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 * @example
 * validateEmail('user@example.com')     // true
 * validateEmail('user+tag@example.com') // true
 * validateEmail('bad@')                 // false
 */
export function validateEmail(email: string): boolean {
    if (typeof email !== 'string') return false;
    // Supports standard addresses, plus-sign addressing; rejects consecutive dots and leading/trailing hyphens in domain labels
    const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9](?:[a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/**
 * Validate the structure and basic integrity of an authentication token.
 * For JWTs, also validates expiration and detects tokens close to expiry.
 *
 * @param {string | null | undefined} token - Token to validate.
 * @returns {TokenValidationResult} - Validation result with explicit `shouldRefresh` property.
 * @example
 * validateToken(null)           // { valid: false, reason: 'Token is missing', shouldRefresh: false }
 * validateToken('some.jwt.tok') // { valid: true, shouldRefresh: false }
 */
export function validateToken(token: string | null | undefined): TokenValidationResult {
    if (!token) {
        return { valid: false, reason: 'Token is missing', shouldRefresh: false };
    }
    if (typeof token !== 'string') {
        return { valid: false, reason: 'Token must be a string', shouldRefresh: false };
    }
    if (token.trim().length === 0) {
        return { valid: false, reason: 'Token is empty', shouldRefresh: false };
    }
    // Basic JWT structure check: three dot-separated base64 segments
    const jwtParts = token.split('.');
    if (jwtParts.length === 3) {
        try {
            const payload = JSON.parse(decodeBase64(jwtParts[1]));
            if (typeof payload.exp === 'number') {
                const nowSeconds = Math.floor(Date.now() / 1000);
                if (nowSeconds > payload.exp) {
                    return { valid: false, reason: 'Token expired', isExpired: true, shouldRefresh: false };
                }
                const secondsUntilExpiry = payload.exp - nowSeconds;
                if (secondsUntilExpiry < REFRESH_THRESHOLD_SECONDS) {
                    return { valid: true, shouldRefresh: true };
                }
            }
        } catch (err) {
            // Not a standard JWT – treat as opaque token, still valid structurally
            Logger.debug('JWT payload parse failed', { error: String(err) });
        }
    }
    return { valid: true, shouldRefresh: false };
}

/**
 * Validate whether the given value is a non-empty string (after trimming whitespace).
 *
 * @param {unknown} value - Value to check.
 * @returns {boolean} - True if value is a non-empty string.
 * @example
 * validateNonEmptyString('hello') // true
 * validateNonEmptyString('  ')    // false
 * validateNonEmptyString(null)    // false
 */
export function validateNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate whether the given value is a valid URL (http or https).
 *
 * @param {unknown} value - Value to check.
 * @returns {boolean} - True if value is a valid URL.
 * @example
 * validateUrl('https://example.com') // true
 * validateUrl('ftp://example.com')   // false
 * validateUrl('not a url')           // false
 */
export function validateUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}
