import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  generateIdempotencyKey,
  isDuplicate,
  markSent,
  evictExpiredEntries,
  clearDedupCache
} from '../../utils/notificationDedup.ts';

describe('notificationDedup', () => {
  beforeEach(() => {
    clearDedupCache();
  });

  describe('generateIdempotencyKey', () => {
    test('generates key from type and recipient', () => {
      const key = generateIdempotencyKey('34600000000', 'whatsapp');
      expect(key).toBe('whatsapp:34600000000');
    });

    test('includes contextId when provided', () => {
      const key = generateIdempotencyKey('34600000000', 'whatsapp', 'asignacion-123');
      expect(key).toBe('whatsapp:34600000000:asignacion-123');
    });

    test('generates different keys for different recipients', () => {
      const key1 = generateIdempotencyKey('34600000001', 'whatsapp');
      const key2 = generateIdempotencyKey('34600000002', 'whatsapp');
      expect(key1).not.toBe(key2);
    });

    test('generates different keys for different types', () => {
      const key1 = generateIdempotencyKey('user@example.com', 'email');
      const key2 = generateIdempotencyKey('user@example.com', 'whatsapp');
      expect(key1).not.toBe(key2);
    });
  });

  describe('isDuplicate', () => {
    test('returns false for a new (unseen) key', () => {
      const key = generateIdempotencyKey('34600000000', 'whatsapp', 'pedido-1');
      expect(isDuplicate(key)).toBe(false);
    });

    test('returns true for a key seen within the window', () => {
      const key = generateIdempotencyKey('34600000000', 'whatsapp', 'pedido-1');
      isDuplicate(key); // first call marks it
      expect(isDuplicate(key)).toBe(true);
    });

    test('returns false after the deduplication window expires', () => {
      vi.useFakeTimers();
      const key = generateIdempotencyKey('34600000000', 'whatsapp', 'pedido-2');
      isDuplicate(key, 1000); // 1 second window

      vi.advanceTimersByTime(1001);

      expect(isDuplicate(key, 1000)).toBe(false);
      vi.useRealTimers();
    });

    test('treats different keys independently', () => {
      const key1 = generateIdempotencyKey('34600000001', 'whatsapp', 'pedido-1');
      const key2 = generateIdempotencyKey('34600000002', 'whatsapp', 'pedido-1');
      isDuplicate(key1);
      expect(isDuplicate(key2)).toBe(false);
    });
  });

  describe('markSent', () => {
    test('marks a key so that subsequent isDuplicate calls return true', () => {
      const key = generateIdempotencyKey('34600000000', 'email', 'pedido-3');
      markSent(key);
      expect(isDuplicate(key)).toBe(true);
    });
  });

  describe('evictExpiredEntries', () => {
    test('removes expired entries from the cache', () => {
      vi.useFakeTimers();
      const key = generateIdempotencyKey('34600000000', 'whatsapp', 'pedido-4');
      isDuplicate(key, 500); // seen once

      vi.advanceTimersByTime(600);
      evictExpiredEntries(500);

      // After eviction, the key should be treated as unseen
      expect(isDuplicate(key, 500)).toBe(false);
      vi.useRealTimers();
    });

    test('keeps non-expired entries', () => {
      vi.useFakeTimers();
      const key = generateIdempotencyKey('34600000000', 'whatsapp', 'pedido-5');
      isDuplicate(key, 60_000);

      vi.advanceTimersByTime(100);
      evictExpiredEntries(60_000);

      expect(isDuplicate(key, 60_000)).toBe(true);
      vi.useRealTimers();
    });
  });
});
