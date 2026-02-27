/**
 * advancedLogger.ts - Structured logger with context support.
 *
 * Provides consistent, timestamped log output with optional JSON context.
 * Stack traces are suppressed from log output in production by default.
 */

export interface LogContext {
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class AdvancedLogger {
  private static formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${level.toUpperCase()}] [${timestamp}] ${message}${contextStr}`;
  }

  static debug(message: string, context?: LogContext): void {
    console.log(this.formatMessage('debug', message, context));
  }

  static info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  /**
   * Log an error. If context contains an `error` key that is an Error instance,
   * only its message is logged (stack traces are not exposed).
   */
  static error(message: string, context?: LogContext): void {
    let safeContext = context;
    if (context?.error instanceof Error) {
      const { error, ...rest } = context;
      safeContext = { ...rest, errorMessage: (error as Error).message };
    }
    console.error(this.formatMessage('error', message, safeContext));
  }
}

export default AdvancedLogger;
