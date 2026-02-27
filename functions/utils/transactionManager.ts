// transactionManager.ts
// Saga pattern for multi-step operations with automatic rollback on failure

import Logger from '../../utils/logger.ts';

/**
 * Manages a sequence of operations with compensation (rollback) support.
 * Follows the Saga pattern: each step registers a compensating action that
 * runs if any subsequent step fails, restoring a consistent state.
 */
export class TransactionManager {
  private rollbacks: Array<() => Promise<void>> = [];

  /**
   * Executes an operation and registers a compensating rollback.
   * If the operation succeeds, `rollbackFn` is stored for potential later use.
   * If the operation throws, all previously registered rollbacks run before
   * the error is re-thrown.
   */
  async execute<T>(
    operation: () => Promise<T>,
    rollbackFn?: () => Promise<void>
  ): Promise<T> {
    let result: T;
    try {
      result = await operation();
    } catch (error) {
      Logger.error(`TransactionManager: operation failed – rolling back ${this.rollbacks.length} step(s). Error: ${error}`);
      await this.rollbackAll();
      throw error;
    }

    if (rollbackFn) {
      this.rollbacks.push(rollbackFn);
    }

    return result;
  }

  /**
   * Registers a compensating function to be invoked if a later step fails.
   */
  addRollback(fn: () => Promise<void>): void {
    this.rollbacks.push(fn);
  }

  /**
   * Runs all registered rollbacks in reverse order (LIFO).
   * Errors during rollback are logged but do not interrupt the process.
   */
  private async rollbackAll(): Promise<void> {
    const toRun = [...this.rollbacks].reverse();
    this.rollbacks = [];
    for (const rollbackFn of toRun) {
      try {
        await rollbackFn();
      } catch (rollbackError) {
        Logger.error(`TransactionManager: rollback step failed: ${rollbackError}`);
      }
    }
  }
}
