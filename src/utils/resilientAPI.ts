// resilientAPI.ts - Resilient HTTP API utility with retry logic, circuit breaker, caching and more

import Logger from './logger';
import ErrorNotificationService from './errorNotificationService';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Global configuration for the resilient API client. */
export interface ResilientAPIConfig {
    /** Maximum number of retry attempts for transient failures. Default: 3 */
    maxRetries: number;
    /** Base delay in milliseconds before the first retry. Default: 1000 */
    retryDelay: number;
    /** Multiplier applied to retryDelay on each successive retry. Default: 2 */
    retryMultiplier: number;
    /** Request timeout in milliseconds. Default: 30000 (30 s) */
    timeout: number;
    /** Number of consecutive failures before opening the circuit. Default: 5 */
    circuitBreakerThreshold: number;
    /** Milliseconds to wait in open state before attempting a half-open probe. Default: 60000 */
    circuitBreakerResetTime: number;
    /** Enable response caching for GET requests. Default: false */
    enableCache: boolean;
    /** Cache time-to-live in milliseconds. Default: 300000 (5 min) */
    cacheTTL: number;
}

/** Per-request options, extending the global config with HTTP-level fields. */
export interface RequestOptions extends Partial<ResilientAPIConfig> {
    /** Additional HTTP headers. */
    headers?: Record<string, string>;
    /** URL query-string parameters. */
    params?: Record<string, unknown>;
    /** Request body (will be JSON-serialised). */
    body?: unknown;
    /** Skip the cache for this specific request. */
    skipCache?: boolean;
}

/** Successful API response envelope. */
export interface APIResponse<T = unknown> {
    data: T;
    status: number;
    headers: Headers;
    /** Request round-trip time in milliseconds. */
    timing: number;
    /** Whether the response was served from cache. */
    fromCache: boolean;
    /** Number of retries needed to obtain this response. */
    retryCount: number;
}

/** Metrics snapshot emitted per request. */
export interface RequestMetrics {
    url: string;
    method: string;
    duration: number;
    retryCount: number;
    fromCache: boolean;
    circuitBreakerState: CircuitBreakerState;
    success: boolean;
    statusCode?: number;
}

/** Circuit breaker state. */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/** Interceptor types. */
export type BeforeRequestHandler = (url: string, options: RequestInit) => RequestInit | Promise<RequestInit>;
export type AfterResponseHandler = (response: Response, url: string) => Response | Promise<Response>;
export type OnErrorHandler = (error: Error, url: string, attempt: number) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

/**
 * Base API error with an error code and structured context.
 */
export class APIError extends Error {
    code: string;
    statusCode: number;
    context: Record<string, unknown>;

    constructor(message: string, code: string, statusCode = 0, context: Record<string, unknown> = {}) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
    }
}

/** Raised when a network-level failure prevents the request from completing. */
export class NetworkError extends APIError {
    constructor(message: string, context: Record<string, unknown> = {}) {
        super(message, 'NETWORK_ERROR', 0, context);
        this.name = 'NetworkError';
    }
}

/** Raised when the request exceeds the configured timeout. */
export class TimeoutError extends APIError {
    constructor(message: string, context: Record<string, unknown> = {}) {
        super(message, 'TIMEOUT_ERROR', 0, context);
        this.name = 'TimeoutError';
    }
}

/** Raised when the server responds with HTTP 429 Too Many Requests. */
export class RateLimitError extends APIError {
    /** Retry-After header value in seconds, if provided. */
    retryAfter?: number;

    constructor(message: string, retryAfter?: number, context: Record<string, unknown> = {}) {
        super(message, 'RATE_LIMIT_ERROR', 429, context);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

/** Raised when a request is blocked because the circuit breaker is open. */
export class CircuitBreakerError extends APIError {
    constructor(message: string, context: Record<string, unknown> = {}) {
        super(message, 'CIRCUIT_BREAKER_OPEN', 0, context);
        this.name = 'CircuitBreakerError';
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface CircuitBreakerEntry {
    state: CircuitBreakerState;
    failures: number;
    lastFailureTime: number;
    nextAttemptTime: number;
}

interface CacheEntry {
    data: unknown;
    status: number;
    headers: Headers;
    expiresAt: number;
}

const DEFAULT_CONFIG: ResilientAPIConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryMultiplier: 2,
    timeout: 30_000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTime: 60_000,
    enableCache: false,
    cacheTTL: 300_000,
};

/** Resolve the effective config by merging global defaults with per-request overrides. */
function resolveConfig(
    globalConfig: ResilientAPIConfig,
    requestOptions?: RequestOptions,
): ResilientAPIConfig {
    return { ...globalConfig, ...requestOptions };
}

/** Build a URL with serialised query-string parameters. */
function buildURL(url: string, params?: Record<string, unknown>): string {
    if (!params || Object.keys(params).length === 0) return url;
    const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
}

/** Generate a stable cache key from a URL and optional query params. */
function cacheKey(url: string, params?: Record<string, unknown>): string {
    return buildURL(url, params);
}

/** Return true if the status code represents a transient server error. */
function isTransientStatus(status: number): boolean {
    return status >= 500;
}

/** Return true if this error should be retried. */
function isRetryableError(error: unknown): boolean {
    if (error instanceof TimeoutError) return true;
    if (error instanceof NetworkError) return true;
    if (error instanceof APIError) return isTransientStatus(error.statusCode);
    return false;
}

/** Compute exponential backoff delay (ms). */
function backoffDelay(attempt: number, baseDelay: number, multiplier: number): number {
    return baseDelay * Math.pow(multiplier, attempt);
}

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// ResilientAPIClient
// ---------------------------------------------------------------------------

/**
 * Resilient HTTP API client.
 *
 * Provides:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern (per endpoint)
 * - Configurable request timeout via AbortController
 * - Optional GET response caching with TTL
 * - Request / response / error interceptors
 * - Structured logging via Logger
 * - Metrics reporting hook
 *
 * @example
 * ```ts
 * import { resilientAPI } from './utils/resilientAPI';
 *
 * const response = await resilientAPI.get<User[]>('/api/users');
 * console.log(response.data);
 * ```
 */
export class ResilientAPIClient {
    private config: ResilientAPIConfig;
    private circuitBreakers = new Map<string, CircuitBreakerEntry>();
    private cache = new Map<string, CacheEntry>();
    private beforeRequestHandlers: BeforeRequestHandler[] = [];
    private afterResponseHandlers: AfterResponseHandler[] = [];
    private onErrorHandlers: OnErrorHandler[] = [];
    private metricsHook?: (metrics: RequestMetrics) => void;

    constructor(config: Partial<ResilientAPIConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // -----------------------------------------------------------------------
    // Configuration
    // -----------------------------------------------------------------------

    /**
     * Override global configuration defaults.
     * @param config - Partial configuration to merge.
     */
    configure(config: Partial<ResilientAPIConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Register a metrics reporting hook that is called after every request.
     * @param hook - Function receiving a {@link RequestMetrics} object.
     */
    setMetricsHook(hook: (metrics: RequestMetrics) => void): void {
        this.metricsHook = hook;
    }

    // -----------------------------------------------------------------------
    // Interceptors
    // -----------------------------------------------------------------------

    /**
     * Register an interceptor.
     * @param type - One of `'before'`, `'after'`, or `'error'`.
     * @param handler - The interceptor function.
     *
     * @example
     * ```ts
     * resilientAPI.useInterceptor('before', (url, options) => ({
     *   ...options,
     *   headers: { ...options.headers, Authorization: `Bearer ${token}` },
     * }));
     * ```
     */
    useInterceptor(type: 'before', handler: BeforeRequestHandler): void;
    useInterceptor(type: 'after', handler: AfterResponseHandler): void;
    useInterceptor(type: 'error', handler: OnErrorHandler): void;
    useInterceptor(
        type: 'before' | 'after' | 'error',
        handler: BeforeRequestHandler | AfterResponseHandler | OnErrorHandler,
    ): void {
        if (type === 'before') {
            this.beforeRequestHandlers.push(handler as BeforeRequestHandler);
        } else if (type === 'after') {
            this.afterResponseHandlers.push(handler as AfterResponseHandler);
        } else {
            this.onErrorHandlers.push(handler as OnErrorHandler);
        }
    }

    // -----------------------------------------------------------------------
    // Circuit Breaker
    // -----------------------------------------------------------------------

    private getCircuitBreaker(endpoint: string): CircuitBreakerEntry {
        if (!this.circuitBreakers.has(endpoint)) {
            this.circuitBreakers.set(endpoint, {
                state: 'closed',
                failures: 0,
                lastFailureTime: 0,
                nextAttemptTime: 0,
            });
        }
        return this.circuitBreakers.get(endpoint)!;
    }

    private checkCircuitBreaker(endpoint: string, _config: ResilientAPIConfig): void {
        const cb = this.getCircuitBreaker(endpoint);
        const now = Date.now();

        if (cb.state === 'open') {
            if (now >= cb.nextAttemptTime) {
                cb.state = 'half-open';
                Logger.info('[ResilientAPI] Circuit breaker half-open', { endpoint });
            } else {
                throw new CircuitBreakerError(`Circuit breaker open for ${endpoint}`, { endpoint });
            }
        }
        // 'closed' and 'half-open' states allow the request through
    }

    private recordCircuitBreakerSuccess(endpoint: string): void {
        const cb = this.getCircuitBreaker(endpoint);
        if (cb.state !== 'closed') {
            Logger.info('[ResilientAPI] Circuit breaker reset to closed', { endpoint });
        }
        cb.state = 'closed';
        cb.failures = 0;
    }

    private recordCircuitBreakerFailure(endpoint: string, config: ResilientAPIConfig): void {
        const cb = this.getCircuitBreaker(endpoint);
        cb.failures += 1;
        cb.lastFailureTime = Date.now();

        if (cb.failures >= config.circuitBreakerThreshold) {
            cb.state = 'open';
            cb.nextAttemptTime = Date.now() + config.circuitBreakerResetTime;
            Logger.warn('[ResilientAPI] Circuit breaker opened', {
                endpoint,
                failures: cb.failures,
                nextAttemptTime: cb.nextAttemptTime,
            });
            ErrorNotificationService.notifyUser(
                ErrorNotificationService.getMessage('SERVER_ERROR'),
            );
        }
    }

    /**
     * Return the current state of all circuit breakers keyed by endpoint.
     */
    getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
        const result: Record<string, CircuitBreakerState> = {};
        for (const [endpoint, cb] of this.circuitBreakers.entries()) {
            result[endpoint] = cb.state;
        }
        return result;
    }

    /**
     * Reset the circuit breaker for a specific endpoint, or all endpoints.
     * @param endpoint - Optional endpoint URL. If omitted, resets all.
     */
    resetCircuitBreaker(endpoint?: string): void {
        if (endpoint) {
            this.circuitBreakers.delete(endpoint);
        } else {
            this.circuitBreakers.clear();
        }
    }

    // -----------------------------------------------------------------------
    // Cache
    // -----------------------------------------------------------------------

    private getCached(key: string): CacheEntry | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry;
    }

    private setCache(key: string, entry: Omit<CacheEntry, 'expiresAt'>, ttl: number): void {
        this.cache.set(key, { ...entry, expiresAt: Date.now() + ttl });
    }

    /**
     * Clear cached responses.
     * @param urlPattern - Optional regex. Only entries whose key matches are cleared.
     *                     If omitted, all cache entries are cleared.
     */
    clearCache(urlPattern?: RegExp): void {
        if (!urlPattern) {
            this.cache.clear();
            return;
        }
        for (const key of this.cache.keys()) {
            if (urlPattern.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Core request machinery
    // -----------------------------------------------------------------------

    /**
     * Execute an HTTP request with retry logic, circuit breaker, and caching.
     *
     * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE, …).
     * @param url    - Target URL (absolute or relative).
     * @param options - Per-request options.
     * @returns Resolved {@link APIResponse}.
     */
    async request<T = unknown>(
        method: string,
        url: string,
        options: RequestOptions = {},
    ): Promise<APIResponse<T>> {
        const config = resolveConfig(this.config, options);
        const upperMethod = method.toUpperCase();
        const fullURL = buildURL(url, options.params);
        const endpoint = url; // circuit breaker tracks by base URL (no query string)

        // --- Cache check (GET only) ---
        const key = cacheKey(url, options.params);
        if (upperMethod === 'GET' && config.enableCache && !options.skipCache) {
            const cached = this.getCached(key);
            if (cached) {
                Logger.debug('[ResilientAPI] Cache hit', { url: fullURL });
                this.reportMetrics({
                    url: fullURL,
                    method: upperMethod,
                    duration: 0,
                    retryCount: 0,
                    fromCache: true,
                    circuitBreakerState: this.getCircuitBreaker(endpoint).state,
                    success: true,
                    statusCode: cached.status,
                });
                return {
                    data: cached.data as T,
                    status: cached.status,
                    headers: cached.headers,
                    timing: 0,
                    fromCache: true,
                    retryCount: 0,
                };
            }
            Logger.debug('[ResilientAPI] Cache miss', { url: fullURL });
        }

        // --- Circuit breaker check ---
        this.checkCircuitBreaker(endpoint, config);

        // --- Build base fetch options ---
        let fetchOptions: RequestInit = {
            method: upperMethod,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        if (options.body !== undefined) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        Logger.info('[ResilientAPI] Request initiated', {
            method: upperMethod,
            url: fullURL,
            params: options.params as Record<string, unknown>,
        });

        // --- Retry loop ---
        let lastError: Error = new NetworkError('Unknown error');
        const startTime = Date.now();

        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            if (attempt > 0) {
                const delay = backoffDelay(attempt - 1, config.retryDelay, config.retryMultiplier);
                Logger.info('[ResilientAPI] Retrying request', {
                    url: fullURL,
                    attempt,
                    delayMs: delay,
                });
                await sleep(delay);
            }

            // Apply before-request interceptors
            let interceptedOptions = { ...fetchOptions };
            for (const handler of this.beforeRequestHandlers) {
                interceptedOptions = await handler(fullURL, interceptedOptions);
            }

            // Timeout via AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);
            interceptedOptions.signal = controller.signal;

            try {
                const response = await fetch(fullURL, interceptedOptions);
                clearTimeout(timeoutId);

                // Apply after-response interceptors
                let interceptedResponse = response;
                for (const handler of this.afterResponseHandlers) {
                    interceptedResponse = await handler(interceptedResponse, fullURL);
                }

                const timing = Date.now() - startTime;

                // --- Rate limiting ---
                if (interceptedResponse.status === 429) {
                    const retryAfterHeader = interceptedResponse.headers.get('Retry-After');
                    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
                    const err = new RateLimitError(
                        `Rate limited by ${url}`,
                        retryAfter,
                        { url: fullURL, attempt },
                    );
                    Logger.warn('[ResilientAPI] Rate limited', { url: fullURL, retryAfter });
                    // Don't retry rate limit errors - surface immediately
                    this.recordCircuitBreakerFailure(endpoint, config);
                    this.reportMetrics({
                        url: fullURL,
                        method: upperMethod,
                        duration: timing,
                        retryCount: attempt,
                        fromCache: false,
                        circuitBreakerState: this.getCircuitBreaker(endpoint).state,
                        success: false,
                        statusCode: 429,
                    });
                    throw err;
                }

                // --- 4xx client errors (don't retry) ---
                if (interceptedResponse.status >= 400 && interceptedResponse.status < 500) {
                    const err = new APIError(
                        `Client error ${interceptedResponse.status} for ${url}`,
                        'CLIENT_ERROR',
                        interceptedResponse.status,
                        { url: fullURL, attempt },
                    );
                    Logger.error('[ResilientAPI] Client error (not retrying)', {
                        url: fullURL,
                        status: interceptedResponse.status,
                    });
                    this.reportMetrics({
                        url: fullURL,
                        method: upperMethod,
                        duration: timing,
                        retryCount: attempt,
                        fromCache: false,
                        circuitBreakerState: this.getCircuitBreaker(endpoint).state,
                        success: false,
                        statusCode: interceptedResponse.status,
                    });
                    throw err;
                }

                // --- 5xx server errors (retry) ---
                if (interceptedResponse.status >= 500) {
                    const err = new APIError(
                        `Server error ${interceptedResponse.status} for ${url}`,
                        'SERVER_ERROR',
                        interceptedResponse.status,
                        { url: fullURL, attempt },
                    );
                    this.recordCircuitBreakerFailure(endpoint, config);
                    for (const h of this.onErrorHandlers) {
                        await h(err, fullURL, attempt);
                    }
                    lastError = err;
                    if (attempt < config.maxRetries) continue;
                    this.reportMetrics({
                        url: fullURL,
                        method: upperMethod,
                        duration: Date.now() - startTime,
                        retryCount: attempt,
                        fromCache: false,
                        circuitBreakerState: this.getCircuitBreaker(endpoint).state,
                        success: false,
                        statusCode: interceptedResponse.status,
                    });
                    throw lastError;
                }

                // --- Success ---
                this.recordCircuitBreakerSuccess(endpoint);

                let data: T;
                const contentType = interceptedResponse.headers.get('content-type') ?? '';
                if (contentType.includes('application/json')) {
                    data = (await interceptedResponse.json()) as T;
                } else {
                    data = (await interceptedResponse.text()) as unknown as T;
                }

                // Store in cache
                if (upperMethod === 'GET' && config.enableCache && !options.skipCache) {
                    this.setCache(
                        key,
                        { data, status: interceptedResponse.status, headers: interceptedResponse.headers },
                        config.cacheTTL,
                    );
                }

                Logger.info('[ResilientAPI] Response received', {
                    url: fullURL,
                    status: interceptedResponse.status,
                    timingMs: timing,
                    retryCount: attempt,
                });

                this.reportMetrics({
                    url: fullURL,
                    method: upperMethod,
                    duration: timing,
                    retryCount: attempt,
                    fromCache: false,
                    circuitBreakerState: this.getCircuitBreaker(endpoint).state,
                    success: true,
                    statusCode: interceptedResponse.status,
                });

                return {
                    data,
                    status: interceptedResponse.status,
                    headers: interceptedResponse.headers,
                    timing,
                    fromCache: false,
                    retryCount: attempt,
                };
            } catch (err) {
                clearTimeout(timeoutId);

                // Timeout
                if (err instanceof Error && err.name === 'AbortError') {
                    const timeoutErr = new TimeoutError(`Request timed out after ${config.timeout}ms`, {
                        url: fullURL,
                        timeout: config.timeout,
                        attempt,
                    });
                    Logger.warn('[ResilientAPI] Request timed out', {
                        url: fullURL,
                        attempt,
                        timeoutMs: config.timeout,
                    });
                    this.recordCircuitBreakerFailure(endpoint, config);
                    for (const h of this.onErrorHandlers) {
                        await h(timeoutErr, fullURL, attempt);
                    }
                    lastError = timeoutErr;
                    if (attempt < config.maxRetries) continue;
                    break;
                }

                // Re-throw non-retryable errors immediately
                if (!isRetryableError(err)) {
                    throw err;
                }

                // Network error
                if (!(err instanceof APIError)) {
                    const netErr = new NetworkError(
                        err instanceof Error ? err.message : 'Network failure',
                        { url: fullURL, attempt },
                    );
                    Logger.error('[ResilientAPI] Network error', {
                        url: fullURL,
                        attempt,
                        message: netErr.message,
                    });
                    this.recordCircuitBreakerFailure(endpoint, config);
                    for (const h of this.onErrorHandlers) {
                        await h(netErr, fullURL, attempt);
                    }
                    lastError = netErr;
                    if (attempt < config.maxRetries) continue;
                    break;
                }

                lastError = err as Error;
                if (attempt < config.maxRetries) continue;
                break;
            }
        }

        this.reportMetrics({
            url: fullURL,
            method: upperMethod,
            duration: Date.now() - startTime,
            retryCount: config.maxRetries,
            fromCache: false,
            circuitBreakerState: this.getCircuitBreaker(endpoint).state,
            success: false,
        });

        Logger.error('[ResilientAPI] All retries exhausted', {
            url: fullURL,
            maxRetries: config.maxRetries,
            error: lastError.message,
        });

        throw lastError;
    }

    private reportMetrics(metrics: RequestMetrics): void {
        if (this.metricsHook) {
            try {
                this.metricsHook(metrics);
            } catch (err) {
                // Never let the metrics hook affect request behaviour
                Logger.debug('[ResilientAPI] Metrics hook threw an error', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }

    // -----------------------------------------------------------------------
    // Public HTTP verb helpers
    // -----------------------------------------------------------------------

    /**
     * Perform a GET request.
     * @param url - Target URL.
     * @param options - Request options.
     */
    get<T = unknown>(url: string, options?: RequestOptions): Promise<APIResponse<T>> {
        return this.request<T>('GET', url, options);
    }

    /**
     * Perform a POST request.
     * @param url - Target URL.
     * @param body - Request body (will be JSON-serialised).
     * @param options - Request options.
     */
    post<T = unknown>(url: string, body: unknown, options?: RequestOptions): Promise<APIResponse<T>> {
        return this.request<T>('POST', url, { ...options, body });
    }

    /**
     * Perform a PUT request.
     * @param url - Target URL.
     * @param body - Request body (will be JSON-serialised).
     * @param options - Request options.
     */
    put<T = unknown>(url: string, body: unknown, options?: RequestOptions): Promise<APIResponse<T>> {
        return this.request<T>('PUT', url, { ...options, body });
    }

    /**
     * Perform a DELETE request.
     * @param url - Target URL.
     * @param options - Request options.
     */
    delete<T = unknown>(url: string, options?: RequestOptions): Promise<APIResponse<T>> {
        return this.request<T>('DELETE', url, options);
    }

    /**
     * Perform a PATCH request.
     * @param url - Target URL.
     * @param body - Request body (will be JSON-serialised).
     * @param options - Request options.
     */
    patch<T = unknown>(url: string, body: unknown, options?: RequestOptions): Promise<APIResponse<T>> {
        return this.request<T>('PATCH', url, { ...options, body });
    }
}

// ---------------------------------------------------------------------------
// Request Builder
// ---------------------------------------------------------------------------

/**
 * Fluent builder for constructing HTTP requests.
 *
 * @example
 * ```ts
 * const response = await new RequestBuilder(resilientAPI)
 *   .method('GET')
 *   .url('/api/users')
 *   .header('Accept', 'application/json')
 *   .param('role', 'admin')
 *   .timeout(5000)
 *   .execute<User[]>();
 * ```
 */
export class RequestBuilder {
    private _method = 'GET';
    private _url = '';
    private _options: RequestOptions = {};

    constructor(private readonly client: ResilientAPIClient) {}

    /** Set the HTTP method. */
    method(method: string): this {
        this._method = method.toUpperCase();
        return this;
    }

    /** Set the target URL. */
    url(url: string): this {
        this._url = url;
        return this;
    }

    /** Add or override a single request header. */
    header(name: string, value: string): this {
        this._options.headers = { ...this._options.headers, [name]: value };
        return this;
    }

    /** Add or override multiple request headers. */
    headers(headers: Record<string, string>): this {
        this._options.headers = { ...this._options.headers, ...headers };
        return this;
    }

    /** Add a query-string parameter. */
    param(name: string, value: unknown): this {
        this._options.params = { ...this._options.params, [name]: value };
        return this;
    }

    /** Set multiple query-string parameters at once. */
    params(params: Record<string, unknown>): this {
        this._options.params = { ...this._options.params, ...params };
        return this;
    }

    /** Set the request body. */
    body(body: unknown): this {
        this._options.body = body;
        return this;
    }

    /** Override the request timeout (ms). */
    timeout(ms: number): this {
        this._options.timeout = ms;
        return this;
    }

    /** Override the maximum number of retries. */
    retries(count: number): this {
        this._options.maxRetries = count;
        return this;
    }

    /** Skip the response cache for this request. */
    skipCache(): this {
        this._options.skipCache = true;
        return this;
    }

    /** Execute the built request. */
    execute<T = unknown>(): Promise<APIResponse<T>> {
        return this.client.request<T>(this._method, this._url, this._options);
    }
}

// ---------------------------------------------------------------------------
// Default singleton instance
// ---------------------------------------------------------------------------

/**
 * Pre-configured singleton {@link ResilientAPIClient} instance.
 * Import and use directly or configure via `resilientAPI.configure(...)`.
 *
 * @example
 * ```ts
 * import { resilientAPI } from '@/utils/resilientAPI';
 *
 * const { data } = await resilientAPI.get<Product[]>('/api/products');
 * ```
 */
export const resilientAPI = new ResilientAPIClient();

export default resilientAPI;
