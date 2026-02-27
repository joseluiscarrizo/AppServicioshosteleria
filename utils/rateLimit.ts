// rateLimit.ts - In-memory rate limiting for Cloud Functions

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limit store.
 * NOTE: This store does not persist across Cloud Function cold starts or
 * multiple function instances. For production distributed rate limiting,
 * use an external store such as Redis.
 */
const store = new Map<string, RateLimitEntry>();

/** Remove entries whose time window has already expired to prevent unbounded growth. */
function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Time window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check whether the given key is within the rate limit.
 * Returns { allowed, remaining, resetAt }.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();

  // Periodically remove stale entries to prevent unbounded memory growth
  if (store.size > 1000) {
    pruneExpiredEntries();
  }

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // First request or window expired — reset counter
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/** Return a 429 Too Many Requests response. */
export function rateLimitExceeded(resetAt: number): Response {
  return Response.json(
    { error: "Demasiadas solicitudes. Inténtalo más tarde." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
    },
  );
}
