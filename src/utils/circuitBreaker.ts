import Logger from './logger.ts';

/**
 * Estados del Circuit Breaker
 */
enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, rejects requests
  HALF_OPEN = 'half_open' // Testing recovery
}

/**
 * Circuit Breaker para operaciones de API
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private name: string,
    private failureThreshold: number = 5,
    private successThreshold: number = 2,
    private timeout: number = 60000
  ) {}

  /**
   * Ejecuta función con protección de circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        Logger.info(`[CIRCUIT_BREAKER] ${this.name} → HALF_OPEN (testing recovery)`);
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker OPEN for ${this.name}. Service is unavailable.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        Logger.info(`[CIRCUIT_BREAKER] ${this.name} → CLOSED (recovered)`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      Logger.warn(`[CIRCUIT_BREAKER] ${this.name} → OPEN (too many failures)`);
    }
  }

  getState(): string {
    return this.state;
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}
