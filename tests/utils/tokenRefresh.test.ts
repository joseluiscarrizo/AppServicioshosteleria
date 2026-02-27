// tokenRefresh.test.ts – Tests for token refresh, blacklist, and lifecycle utilities
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  validateAndCheckTokenStatus,
  getTimeUntilExpiration,
  refreshTokenIfNeeded,
} from '../../src/utils/tokenRefresh';
import {
  revokeToken,
  isTokenRevoked,
  pruneExpiredEntries,
  blacklistSize,
  clearBlacklist,
} from '../../src/utils/tokenBlacklist';
import {
  validateTokenLifecycle,
  rotateToken,
  getTokenMetadata,
  auditTokenOperation,
} from '../../src/utils/tokenManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal base64url-encoded JWT with the given payload */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');
  return `${header}.${body}.fakesignature`;
}

function futureExp(secondsFromNow: number): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

function pastExp(secondsAgo: number): number {
  return Math.floor(Date.now() / 1000) - secondsAgo;
}

// ---------------------------------------------------------------------------
// tokenRefresh – validateAndCheckTokenStatus
// ---------------------------------------------------------------------------

describe('validateAndCheckTokenStatus', () => {
  test('returns invalid for null token', () => {
    const result = validateAndCheckTokenStatus(null);
    expect(result.valid).toBe(false);
    expect(result.isExpired).toBe(false);
  });

  test('returns invalid for empty string token', () => {
    const result = validateAndCheckTokenStatus('');
    expect(result.valid).toBe(false);
  });

  test('opaque token (no exp claim) is treated as valid', () => {
    const result = validateAndCheckTokenStatus('opaque-token-string');
    expect(result.valid).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.shouldRefresh).toBe(false);
    expect(result.expiresIn).toBeNull();
  });

  test('valid JWT with future expiration is valid', () => {
    const token = makeJwt({ exp: futureExp(3600) });
    const result = validateAndCheckTokenStatus(token);
    expect(result.valid).toBe(true);
    expect(result.isExpired).toBe(false);
  });

  test('expired JWT is detected correctly', () => {
    const token = makeJwt({ exp: pastExp(60) });
    const result = validateAndCheckTokenStatus(token);
    expect(result.valid).toBe(false);
    expect(result.isExpired).toBe(true);
  });

  test('JWT expiring within 5 minutes triggers shouldRefresh', () => {
    const token = makeJwt({ exp: futureExp(2 * 60) }); // 2 minutes remaining
    const result = validateAndCheckTokenStatus(token);
    expect(result.valid).toBe(true);
    expect(result.shouldRefresh).toBe(true);
  });

  test('JWT with more than 5 minutes does not trigger shouldRefresh', () => {
    const token = makeJwt({ exp: futureExp(10 * 60) }); // 10 minutes remaining
    const result = validateAndCheckTokenStatus(token);
    expect(result.valid).toBe(true);
    expect(result.shouldRefresh).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tokenRefresh – getTimeUntilExpiration
// ---------------------------------------------------------------------------

describe('getTimeUntilExpiration', () => {
  test('returns null for opaque tokens', () => {
    expect(getTimeUntilExpiration('not-a-jwt')).toBeNull();
  });

  test('returns a positive number for a future-expiry JWT', () => {
    const token = makeJwt({ exp: futureExp(600) });
    const result = getTimeUntilExpiration(token);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(600);
  });

  test('returns 0 for an already-expired JWT', () => {
    const token = makeJwt({ exp: pastExp(60) });
    expect(getTimeUntilExpiration(token)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tokenRefresh – refreshTokenIfNeeded
// ---------------------------------------------------------------------------

describe('refreshTokenIfNeeded', () => {
  test('returns null when token does not need refresh', async () => {
    const token = makeJwt({ exp: futureExp(3600) });
    const result = await refreshTokenIfNeeded(token, {});
    expect(result).toBeNull();
  });

  test('attempts refresh when token is near expiry', async () => {
    const nearExpiryToken = makeJwt({ exp: futureExp(2 * 60) });
    const freshToken = makeJwt({ exp: futureExp(3600) });
    const mockClient = {
      auth: {
        me: vi.fn().mockResolvedValue({ id: 'user-1' }),
        getToken: vi.fn().mockResolvedValue(freshToken),
      },
    };
    const result = await refreshTokenIfNeeded(nearExpiryToken, mockClient);
    expect(result).not.toBeNull();
    expect(result!.token).toBe(freshToken);
    expect(result!.expiresIn).toBeGreaterThan(0);
  });

  test('returns null when base44 client throws', async () => {
    const nearExpiryToken = makeJwt({ exp: futureExp(2 * 60) });
    const mockClient = {
      auth: {
        me: vi.fn().mockRejectedValue(new Error('network error')),
      },
    };
    const result = await refreshTokenIfNeeded(nearExpiryToken, mockClient);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// tokenBlacklist
// ---------------------------------------------------------------------------

describe('tokenBlacklist', () => {
  beforeEach(() => clearBlacklist());

  test('newly created token is not revoked', () => {
    const token = makeJwt({ jti: 'abc-123', exp: futureExp(3600) });
    expect(isTokenRevoked(token)).toBe(false);
  });

  test('revoked token is detected', () => {
    const token = makeJwt({ jti: 'tok-revoke', exp: futureExp(3600) });
    revokeToken(token);
    expect(isTokenRevoked(token)).toBe(true);
  });

  test('revoking opaque token by hash works', () => {
    const token = 'opaque-token-xyz';
    revokeToken(token);
    expect(isTokenRevoked(token)).toBe(true);
  });

  test('different tokens are independent', () => {
    const t1 = makeJwt({ jti: 'jti-1', exp: futureExp(3600) });
    const t2 = makeJwt({ jti: 'jti-2', exp: futureExp(3600) });
    revokeToken(t1);
    expect(isTokenRevoked(t1)).toBe(true);
    expect(isTokenRevoked(t2)).toBe(false);
  });

  test('blacklistSize returns correct count', () => {
    const t1 = makeJwt({ jti: 'j1', exp: futureExp(600) });
    const t2 = makeJwt({ jti: 'j2', exp: futureExp(600) });
    expect(blacklistSize()).toBe(0);
    revokeToken(t1);
    expect(blacklistSize()).toBe(1);
    revokeToken(t2);
    expect(blacklistSize()).toBe(2);
  });

  test('pruneExpiredEntries removes old entries', () => {
    const token = makeJwt({ jti: 'prune-me', exp: futureExp(600) });
    revokeToken(token);
    expect(blacklistSize()).toBe(1);
    // Prune with negative maxAge so every entry (even just-added) is considered expired
    pruneExpiredEntries(-1);
    expect(blacklistSize()).toBe(0);
  });

  test('revokeToken ignores empty token', () => {
    revokeToken('');
    expect(blacklistSize()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tokenManager – validateTokenLifecycle
// ---------------------------------------------------------------------------

describe('validateTokenLifecycle', () => {
  beforeEach(() => clearBlacklist());

  test('returns invalid for null token', () => {
    const result = validateTokenLifecycle(null);
    expect(result.valid).toBe(false);
  });

  test('valid unexpired non-revoked token passes', () => {
    const token = makeJwt({ exp: futureExp(3600), iss: 'myapp', sub: 'user1' });
    const result = validateTokenLifecycle(token);
    expect(result.valid).toBe(true);
    expect(result.metadata).toBeDefined();
  });

  test('revoked token fails lifecycle check', () => {
    const token = makeJwt({ jti: 'revoked-lifecycle', exp: futureExp(3600) });
    revokeToken(token);
    const result = validateTokenLifecycle(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/revoked/i);
  });

  test('expired token fails lifecycle check', () => {
    const token = makeJwt({ exp: pastExp(60) });
    const result = validateTokenLifecycle(token);
    expect(result.valid).toBe(false);
  });

  test('issuer mismatch fails when expectedIssuer is provided', () => {
    const token = makeJwt({ exp: futureExp(3600), iss: 'other-app' });
    const result = validateTokenLifecycle(token, 'myapp');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/issuer/i);
  });

  test('issuer match passes when expectedIssuer is provided', () => {
    const token = makeJwt({ exp: futureExp(3600), iss: 'myapp', sub: 'user1' });
    const result = validateTokenLifecycle(token, 'myapp');
    expect(result.valid).toBe(true);
  });

  test('subject mismatch fails when expectedSubject is provided', () => {
    const token = makeJwt({ exp: futureExp(3600), sub: 'user2' });
    const result = validateTokenLifecycle(token, undefined, 'user1');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/subject/i);
  });

  test('subject match passes when expectedSubject is provided', () => {
    const token = makeJwt({ exp: futureExp(3600), sub: 'user1' });
    const result = validateTokenLifecycle(token, undefined, 'user1');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// tokenManager – rotateToken
// ---------------------------------------------------------------------------

describe('rotateToken', () => {
  beforeEach(() => clearBlacklist());

  test('old token is revoked after rotation', () => {
    const old = makeJwt({ jti: 'old-jti', exp: futureExp(600) });
    const fresh = makeJwt({ jti: 'new-jti', exp: futureExp(3600) });
    rotateToken(old, fresh);
    expect(isTokenRevoked(old)).toBe(true);
    expect(isTokenRevoked(fresh)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tokenManager – getTokenMetadata
// ---------------------------------------------------------------------------

describe('getTokenMetadata', () => {
  test('extracts claims from a JWT', () => {
    const token = makeJwt({ iat: 1000, exp: 2000, sub: 'u1', iss: 'app', jti: 'xyz' });
    const meta = getTokenMetadata(token);
    expect(meta.issuedAt).toBe(1000);
    expect(meta.expiresAt).toBe(2000);
    expect(meta.subject).toBe('u1');
    expect(meta.issuer).toBe('app');
    expect(meta.jti).toBe('xyz');
  });

  test('returns sensible defaults for opaque token', () => {
    const meta = getTokenMetadata('opaque');
    expect(meta.expiresAt).toBeNull();
    expect(meta.subject).toBeNull();
    expect(meta.issuer).toBeNull();
    expect(meta.jti).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// tokenManager – auditTokenOperation (smoke test)
// ---------------------------------------------------------------------------

describe('auditTokenOperation', () => {
  test('does not throw for valid token', () => {
    const token = makeJwt({ jti: 'audit-jti', exp: futureExp(3600) });
    expect(() => auditTokenOperation('login', token)).not.toThrow();
  });
});
