// notificationDedup.ts
// Deduplication service for notifications using idempotency keys.
// Uses an in-memory cache with TTL to prevent duplicate sends within a time window.

const DEFAULT_DEDUP_WINDOW_MS = 60_000; // 1 minute

interface DedupEntry {
  timestamp: number;
}

// In-memory store: idempotencyKey -> DedupEntry
const dedupCache = new Map<string, DedupEntry>();

/**
 * Generates a deterministic idempotency key for a notification.
 * @param recipient - Recipient identifier (phone number, email, user ID, etc.)
 * @param type - Notification type (e.g. 'whatsapp', 'email', 'asignacion')
 * @param contextId - Optional context ID (e.g. pedido_id, asignacion_id)
 * @returns A string idempotency key
 */
export function generateIdempotencyKey(
  recipient: string,
  type: string,
  contextId?: string
): string {
  const base = `${type}:${recipient}${contextId ? `:${contextId}` : ''}`;
  return base;
}

/**
 * Checks whether a notification with the given idempotency key was already sent
 * within the deduplication window and marks it as sent if not.
 *
 * @param idempotencyKey - Unique key for this notification
 * @param windowMs - Time window in milliseconds (default: 60 s)
 * @returns true if the notification is a duplicate (should be skipped), false otherwise
 */
export function isDuplicate(
  idempotencyKey: string,
  windowMs: number = DEFAULT_DEDUP_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = dedupCache.get(idempotencyKey);
  if (entry && now - entry.timestamp < windowMs) {
    return true;
  }
  dedupCache.set(idempotencyKey, { timestamp: now });
  return false;
}

/**
 * Marks a notification as sent so subsequent calls within the window are deduplicated.
 * This is an alias for calling isDuplicate (which also marks the key as seen).
 */
export function markSent(idempotencyKey: string): void {
  dedupCache.set(idempotencyKey, { timestamp: Date.now() });
}

/**
 * Evicts expired entries from the deduplication cache.
 * Call periodically to prevent unbounded memory growth.
 */
export function evictExpiredEntries(windowMs: number = DEFAULT_DEDUP_WINDOW_MS): void {
  const now = Date.now();
  for (const [key, entry] of dedupCache.entries()) {
    if (now - entry.timestamp >= windowMs) {
      dedupCache.delete(key);
    }
  }
}

/** Clears all dedup entries (useful for testing). */
export function clearDedupCache(): void {
  dedupCache.clear();
}
