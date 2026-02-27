// tokenManager.ts - Complete token lifecycle management

import { validateAndCheckTokenStatus, getTimeUntilExpiration, TokenValidationResult } from './tokenRefresh';
import { revokeToken, isTokenRevoked } from './tokenBlacklist';
import Logger from './logger';

/** Metadata stored alongside each managed token */
export interface TokenMetadata {
    issuedAt: number;
    expiresAt: number | null;
    subject: string | null;
    issuer: string | null;
    jti: string | null;
}

/** Result returned by token lifecycle operations */
export interface TokenLifecycleResult {
    valid: boolean;
    reason?: string;
    metadata?: TokenMetadata;
    validationResult?: TokenValidationResult;
}

/**
 * Extracts standard JWT claims from a token payload without verifying the signature.
 * Returns null for non-JWT or malformed tokens.
 */
function extractJwtClaims(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        return JSON.parse(atob(parts[1])) as Record<string, unknown>;
    } catch {
        return null;
    }
}

/**
 * Builds TokenMetadata from JWT claims or falls back to default values for opaque tokens.
 */
function buildMetadata(token: string): TokenMetadata {
    const claims = extractJwtClaims(token);
    const nowSeconds = Math.floor(Date.now() / 1000);
    return {
        issuedAt: typeof claims?.iat === 'number' ? claims.iat : nowSeconds,
        expiresAt: typeof claims?.exp === 'number' ? claims.exp : null,
        subject: typeof claims?.sub === 'string' ? claims.sub : null,
        issuer: typeof claims?.iss === 'string' ? claims.iss : null,
        jti: typeof claims?.jti === 'string' ? claims.jti : null,
    };
}

/**
 * Validates a token through the complete lifecycle check:
 * 1. Structural validation and expiration via `validateAndCheckTokenStatus`
 * 2. Revocation check against the blacklist
 * 3. Optional issuer / subject validation when `expectedIssuer` or `expectedSubject` are provided
 *
 * @param token           - The token string to validate.
 * @param expectedIssuer  - If provided, the token's `iss` claim must match.
 * @param expectedSubject - If provided, the token's `sub` claim must match.
 */
export function validateTokenLifecycle(
    token: string | null | undefined,
    expectedIssuer?: string,
    expectedSubject?: string
): TokenLifecycleResult {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return { valid: false, reason: 'Token is missing or empty' };
    }

    // Step 1 – structural + expiration check
    const validationResult = validateAndCheckTokenStatus(token);
    if (!validationResult.valid) {
        Logger.warn('Token lifecycle validation failed', { reason: validationResult.reason });
        return { valid: false, reason: validationResult.reason, validationResult };
    }

    // Step 2 – revocation check
    if (isTokenRevoked(token)) {
        Logger.warn('Token has been revoked');
        return { valid: false, reason: 'Token has been revoked', validationResult };
    }

    // Step 3 – optional claim validation
    const metadata = buildMetadata(token);

    if (expectedIssuer && metadata.issuer !== expectedIssuer) {
        Logger.warn('Token issuer mismatch', { expected: expectedIssuer, actual: metadata.issuer });
        return { valid: false, reason: 'Token issuer does not match', metadata, validationResult };
    }

    if (expectedSubject && metadata.subject !== expectedSubject) {
        Logger.warn('Token subject mismatch', { expected: expectedSubject, actual: metadata.subject });
        return { valid: false, reason: 'Token subject does not match', metadata, validationResult };
    }

    return { valid: true, metadata, validationResult };
}

/**
 * Rotates a token by revoking the old one and returning the new token for storage.
 * Call this after a successful token refresh to prevent reuse of the old token.
 *
 * @param oldToken - The previously used token to revoke.
 * @param newToken - The freshly issued replacement token.
 */
export function rotateToken(oldToken: string, newToken: string): void {
    if (!oldToken || !newToken) return;
    revokeToken(oldToken, 'token_rotation');
    Logger.info('Token rotated – old token revoked');
}

/**
 * Returns the number of seconds until the token expires, or null if unknown.
 * Returns 0 if the token is already expired.
 */
export function getTokenExpiresIn(token: string): number | null {
    return getTimeUntilExpiration(token);
}

/**
 * Extracts the token metadata (issued_at, expires_at, sub, iss, jti) for audit logging.
 *
 * @param token - The token to inspect.
 */
export function getTokenMetadata(token: string): TokenMetadata {
    return buildMetadata(token);
}

/**
 * Performs a complete token audit log entry.
 * Logs the operation together with token metadata for observability.
 *
 * @param operation - Human-readable operation name (e.g. 'login', 'refresh', 'logout').
 * @param token     - The token involved in the operation.
 */
export function auditTokenOperation(operation: string, token: string): void {
    const metadata = buildMetadata(token);
    Logger.info(`Token audit: ${operation}`, {
        operation,
        jti: metadata.jti,
        subject: metadata.subject,
        issuer: metadata.issuer,
        issuedAt: metadata.issuedAt,
        expiresAt: metadata.expiresAt,
    });
}
