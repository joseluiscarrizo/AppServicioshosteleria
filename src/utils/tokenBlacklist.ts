// tokenBlacklist.ts - In-memory token revocation/blacklist management

interface BlacklistEntry {
    revokedAt: number;
    reason?: string;
}

/** Internal blacklist store keyed by token identifier (jti or token hash) */
const blacklist = new Map<string, BlacklistEntry>();

/**
 * Derives a stable identifier from a token.
 * Uses the JWT `jti` claim if present; otherwise falls back to a simple hash of the token string.
 */
function getTokenId(token: string): string {
    const parts = token.split('.');
    if (parts.length === 3) {
        try {
            const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
            if (typeof payload.jti === 'string' && payload.jti.length > 0) {
                return payload.jti;
            }
        } catch {
            // Not a decodable JWT — fall through to hash
        }
    }
    // Simple deterministic hash for non-JWT or JWT-without-jti tokens
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        hash = (Math.imul(31, hash) + token.charCodeAt(i)) | 0;
    }
    return `hash:${hash >>> 0}`;
}

/**
 * Adds a token to the blacklist so it can no longer be considered valid.
 *
 * @param token  - The token string to revoke.
 * @param reason - Optional human-readable reason for revocation.
 */
export function revokeToken(token: string, reason?: string): void {
    if (!token || typeof token !== 'string') return;
    const id = getTokenId(token);
    blacklist.set(id, { revokedAt: Date.now(), reason });
}

/**
 * Returns true if the given token has been explicitly revoked.
 *
 * @param token - The token string to check.
 */
export function isTokenRevoked(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const id = getTokenId(token);
    return blacklist.has(id);
}

/**
 * Removes all blacklist entries older than `maxAgeMs` milliseconds.
 * Call periodically to prevent unbounded memory growth.
 *
 * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours).
 */
export function pruneExpiredEntries(maxAgeMs = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, entry] of blacklist.entries()) {
        if (entry.revokedAt < cutoff) {
            blacklist.delete(id);
        }
    }
}

/**
 * Returns the number of tokens currently in the blacklist.
 * Useful for monitoring/diagnostics.
 */
export function blacklistSize(): number {
    return blacklist.size;
}

/**
 * Clears the entire blacklist. Intended for testing only.
 * @internal
 */
export function clearBlacklist(): void {
    blacklist.clear();
}
