import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEmail, validateToken, validateNonEmptyString, validateUrl } from '../../src/utils/validators.ts';

// Helper: build a minimal JWT with the given payload (no real signature)
function makeJwt(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.fakesig`;
}

describe('validateEmail', () => {
    test('accepts a standard email', () => {
        expect(validateEmail('user@example.com')).toBe(true);
    });

    test('accepts plus-sign addressing', () => {
        expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    test('rejects missing domain', () => {
        expect(validateEmail('user@')).toBe(false);
    });

    test('rejects missing @', () => {
        expect(validateEmail('userexample.com')).toBe(false);
    });

    test('rejects null without throwing (runtime type check)', () => {
        // TypeScript allows the cast for testing purposes
        expect(validateEmail(null as unknown as string)).toBe(false);
    });

    test('rejects undefined without throwing', () => {
        expect(validateEmail(undefined as unknown as string)).toBe(false);
    });

    test('rejects domain with leading hyphen', () => {
        expect(validateEmail('user@-bad.com')).toBe(false);
    });

    test('rejects domain with trailing hyphen', () => {
        expect(validateEmail('user@bad-.com')).toBe(false);
    });

    test('rejects consecutive dots in local part', () => {
        expect(validateEmail('user..name@example.com')).toBe(false);
    });
});

describe('validateToken', () => {
    test('rejects null – shouldRefresh is always present', () => {
        const result = validateToken(null);
        expect(result.valid).toBe(false);
        expect(result.shouldRefresh).toBe(false);
    });

    test('rejects undefined', () => {
        const result = validateToken(undefined);
        expect(result.valid).toBe(false);
        expect(result.shouldRefresh).toBe(false);
    });

    test('rejects empty string', () => {
        const result = validateToken('');
        expect(result.valid).toBe(false);
        expect(result.shouldRefresh).toBe(false);
    });

    test('rejects whitespace-only string', () => {
        const result = validateToken('   ');
        expect(result.valid).toBe(false);
        expect(result.shouldRefresh).toBe(false);
    });

    test('accepts opaque (non-JWT) token with shouldRefresh: false', () => {
        const result = validateToken('opaque-token-value');
        expect(result.valid).toBe(true);
        expect(result.shouldRefresh).toBe(false);
    });

    test('marks valid, non-expiring JWT with shouldRefresh: false', () => {
        const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const token = makeJwt({ sub: '1', exp });
        const result = validateToken(token);
        expect(result.valid).toBe(true);
        expect(result.shouldRefresh).toBe(false);
    });

    test('marks expiring JWT (< 5 min) with shouldRefresh: true', () => {
        const exp = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now
        const token = makeJwt({ sub: '1', exp });
        const result = validateToken(token);
        expect(result.valid).toBe(true);
        expect(result.shouldRefresh).toBe(true);
    });

    test('marks expired JWT as invalid with isExpired: true', () => {
        const exp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
        const token = makeJwt({ sub: '1', exp });
        const result = validateToken(token);
        expect(result.valid).toBe(false);
        expect(result.isExpired).toBe(true);
        expect(result.shouldRefresh).toBe(false);
    });

    test('accepts JWT with non-numeric exp without throwing', () => {
        // exp as string – should be ignored, token treated as opaque
        const token = makeJwt({ sub: '1', exp: 'not-a-number' });
        const result = validateToken(token);
        expect(result.valid).toBe(true);
        expect(result.shouldRefresh).toBe(false);
    });

    test('handles malformed base64 payload gracefully', () => {
        const result = validateToken('header.!!!.sig');
        expect(result.valid).toBe(true);
        expect(result.shouldRefresh).toBe(false);
    });
});

describe('validateNonEmptyString', () => {
    test('returns true for a non-empty string', () => {
        expect(validateNonEmptyString('hello')).toBe(true);
    });

    test('returns false for whitespace-only string', () => {
        expect(validateNonEmptyString('   ')).toBe(false);
    });

    test('returns false for empty string', () => {
        expect(validateNonEmptyString('')).toBe(false);
    });

    test('returns false for null', () => {
        expect(validateNonEmptyString(null)).toBe(false);
    });

    test('returns false for a number', () => {
        expect(validateNonEmptyString(42)).toBe(false);
    });
});

describe('validateUrl', () => {
    test('accepts an https URL', () => {
        expect(validateUrl('https://example.com')).toBe(true);
    });

    test('accepts an http URL', () => {
        expect(validateUrl('http://example.com/path?q=1')).toBe(true);
    });

    test('rejects an ftp URL', () => {
        expect(validateUrl('ftp://example.com')).toBe(false);
    });

    test('rejects a plain string', () => {
        expect(validateUrl('not a url')).toBe(false);
    });

    test('rejects null', () => {
        expect(validateUrl(null)).toBe(false);
    });

    test('rejects a number', () => {
        expect(validateUrl(123)).toBe(false);
    });

    test('rejects an empty string', () => {
        expect(validateUrl('')).toBe(false);
    });
});
