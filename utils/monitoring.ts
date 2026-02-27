/**
 * monitoring.ts
 *
 * Unified monitoring and observability utility.
 * Provides error tracking, performance monitoring, custom metrics,
 * and health check endpoints for the hospitality services application.
 *
 * Designed as a lightweight adapter so Sentry (or any other provider)
 * can be plugged in without changing call sites.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Severity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface MonitoringContext {
  userId?: string;
  userRole?: string;
  requestId?: string;
  function?: string;
  [key: string]: unknown;
}

export interface Metric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, { status: 'ok' | 'fail'; latencyMs?: number; error?: string }>;
}

// ─── In-memory metric store (replace with real provider in production) ─────────

const _metrics: Metric[] = [];

// ─── Error Tracking ────────────────────────────────────────────────────────────

/**
 * Capture and track an error with optional context.
 * In production, forward to Sentry via SENTRY_DSN environment variable.
 */
export function captureError(error: Error, context?: MonitoringContext): void {
  const sentryDsn = typeof Deno !== 'undefined'
    ? Deno.env.get('SENTRY_DSN')
    : (typeof process !== 'undefined' ? process.env.SENTRY_DSN : undefined);

  if (sentryDsn) {
    // Sentry integration placeholder – replace with actual @sentry/node import
    // when deploying to production:
    //   import * as Sentry from '@sentry/node';
    //   Sentry.captureException(error, { extra: context });
    console.error('[Monitoring] Error captured (Sentry ready):', error.message, context);
  } else {
    console.error('[Monitoring] Error:', error.message, context ?? '');
  }
}

/**
 * Capture a non-fatal message (warning or info).
 */
export function captureMessage(message: string, severity: Severity = 'info', context?: MonitoringContext): void {
  const level = severity.toUpperCase();
  console.log(`[Monitoring] [${level}] ${message}`, context ?? '');
}

// ─── Performance Monitoring ────────────────────────────────────────────────────

/**
 * Start a performance transaction. Returns a function to finish it.
 * @example
 *   const finish = startTransaction('enviarWhatsApp');
 *   await enviarWhatsApp(...);
 *   const duration = finish(); // returns ms
 */
export function startTransaction(name: string, context?: MonitoringContext): () => number {
  const start = Date.now();
  return () => {
    const duration = Date.now() - start;
    recordMetric(`transaction.${name}.duration`, duration, 'ms', {
      ...(context?.function ? { function: context.function } : {}),
    });
    return duration;
  };
}

/**
 * Wrap an async function with performance monitoring.
 */
export async function withMonitoring<T>(
  name: string,
  fn: () => Promise<T>,
  context?: MonitoringContext,
): Promise<T> {
  const finish = startTransaction(name, context);
  try {
    const result = await fn();
    finish();
    return result;
  } catch (error) {
    finish();
    captureError(error as Error, { ...context, function: name });
    throw error;
  }
}

// ─── Custom Metrics ────────────────────────────────────────────────────────────

/**
 * Record a custom numeric metric.
 */
export function recordMetric(
  name: string,
  value: number,
  unit = 'count',
  tags: Record<string, string> = {},
): void {
  const metric: Metric = { name, value, unit, tags, timestamp: Date.now() };
  _metrics.push(metric);

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    console.debug(`[Metric] ${name}=${value}${unit}`, tags);
  }
}

/**
 * Increment a counter metric by 1 (or a given amount).
 */
export function incrementCounter(name: string, amount = 1, tags: Record<string, string> = {}): void {
  recordMetric(name, amount, 'count', tags);
}

/**
 * Get all recorded metrics (useful for testing or exporting).
 */
export function getMetrics(): Readonly<Metric[]> {
  return _metrics;
}

/**
 * Clear all recorded metrics (useful for testing).
 */
export function clearMetrics(): void {
  _metrics.length = 0;
}

// ─── Health Check ──────────────────────────────────────────────────────────────

type HealthCheck = () => Promise<{ status: 'ok' | 'fail'; latencyMs?: number; error?: string }>;

const _healthChecks = new Map<string, HealthCheck>();

/**
 * Register a named health check.
 * @example
 *   registerHealthCheck('database', async () => {
 *     const start = Date.now();
 *     await db.ping();
 *     return { status: 'ok', latencyMs: Date.now() - start };
 *   });
 */
export function registerHealthCheck(name: string, check: HealthCheck): void {
  _healthChecks.set(name, check);
}

/**
 * Run all registered health checks and return aggregated status.
 */
export async function runHealthChecks(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {};
  let overallStatus: HealthStatus['status'] = 'healthy';

  for (const [name, check] of _healthChecks) {
    try {
      checks[name] = await check();
      if (checks[name].status === 'fail') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      }
    } catch (error) {
      checks[name] = {
        status: 'fail',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      overallStatus = 'unhealthy';
    }
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  };
}

/**
 * Create a simple HTTP health check Response (for use in Cloud Functions).
 */
export async function healthCheckResponse(): Promise<Response> {
  const health = await runHealthChecks();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  return Response.json(health, { status: statusCode });
}

// ─── API Metrics Helpers ───────────────────────────────────────────────────────

/** Record an API call result. */
export function recordApiCall(
  endpoint: string,
  statusCode: number,
  durationMs: number,
): void {
  const success = statusCode >= 200 && statusCode < 400;
  recordMetric('api.call', 1, 'count', { endpoint, status: String(statusCode) });
  recordMetric('api.latency', durationMs, 'ms', { endpoint });
  if (!success) {
    incrementCounter('api.error', 1, { endpoint, status: String(statusCode) });
  }
}

/** Record a WhatsApp message send event. */
export function recordWhatsAppSend(
  provider: 'whatsapp_api' | 'whatsapp_web',
  success: boolean,
): void {
  incrementCounter('whatsapp.send', 1, {
    provider,
    result: success ? 'success' : 'failure',
  });
}

/** Record a QR fichaje event. */
export function recordFichaje(tipo: 'entrada' | 'salida', success: boolean): void {
  incrementCounter('fichaje.qr', 1, {
    tipo,
    result: success ? 'success' : 'failure',
  });
}
