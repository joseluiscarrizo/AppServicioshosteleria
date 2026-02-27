/**
 * Sliding window rate limiter using an in-memory store.
 * Suitable for single-instance deployments (Cloud Functions / Deno Edge).
 * For multi-instance deployments, replace the store with a shared backend (e.g. Redis).
 */

export interface RateLimitOptions {
  /** Time window length in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the oldest request in the window expires */
  resetAt: number;
  /** Seconds to wait before retrying (only set when allowed is false) */
  retryAfter?: number;
}

/**
 * In-memory sliding window rate limiter.
 *
 * @example
 * const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 10 });
 * const result = limiter.check('user-123');
 * if (!result.allowed) {
 *   return rateLimitResponse(result, 10);
 * }
 */
export class RateLimiter {
  private store: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  /**
   * Check whether a request identified by `key` is within the allowed rate.
   * Records the request timestamp if it is allowed.
   *
   * @param key - Unique identifier for the caller (e.g. user ID or IP)
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Retrieve and prune timestamps outside the current window
    const timestamps = (this.store.get(key) ?? []).filter(t => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldestTimestamp = timestamps[0];
      const resetAt = oldestTimestamp + this.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    // Record the new request
    timestamps.push(now);
    this.store.set(key, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetAt: now + this.windowMs,
    };
  }
}

/**
 * Build a 429 Too Many Requests Response with standard rate-limit headers.
 *
 * @param result - Result returned by `RateLimiter.check()` when `allowed` is false
 * @param limit  - The configured maximum number of requests for the limiter
 */
export function rateLimitResponse(result: RateLimitResult, limit: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        'Retry-After': String(result.retryAfter ?? 60),
      },
    }
  );
}

/**
 * Attach standard rate-limit headers to an existing Response.
 *
 * @param response - The Response to annotate
 * @param result   - Rate-limit result for the current request
 * @param limit    - The configured maximum number of requests for the limiter
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult, limit: number): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', String(limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
