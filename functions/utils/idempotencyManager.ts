// idempotencyManager.ts
// Prevents duplicate execution of critical operations using persisted keys

import Logger from '../../utils/logger.ts';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ServiceRoleEntities {
  IdempotencyKey: {
    filter: (params: Record<string, unknown>) => Promise<Array<{ id: string; clave: string; resultado: string; creado_en: string }>>;
    create: (data: Record<string, unknown>) => Promise<{ id: string }>;
    delete: (id: string) => Promise<void>;
  };
}

/**
 * Manages idempotency keys to prevent duplicate execution of critical operations.
 * Keys are persisted in the IdempotencyKey entity and expire after 24 hours.
 */
export class IdempotencyManager {
  constructor(private readonly entities: ServiceRoleEntities) {}

  /**
   * Checks whether an operation identified by `key` has already been executed.
   * If a valid (non-expired) record exists, returns the cached result.
   * Otherwise returns null, indicating the operation should proceed.
   */
  async checkKey(key: string): Promise<unknown | null> {
    const existing = await this.entities.IdempotencyKey.filter({ clave: key });

    if (existing.length === 0) return null;

    const record = existing[0];
    const age = Date.now() - new Date(record.creado_en).getTime();

    if (age > IDEMPOTENCY_TTL_MS) {
      // Expired – clean up and treat as new
      try {
        await this.entities.IdempotencyKey.delete(record.id);
      } catch (e) {
        Logger.warn(`IdempotencyManager: failed to delete expired key "${key}": ${e}`);
      }
      return null;
    }

    Logger.info(`IdempotencyManager: duplicate request detected for key "${key}"`);
    return JSON.parse(record.resultado);
  }

  /**
   * Persists the result of a completed operation under the given key.
   */
  async saveKey(key: string, result: unknown): Promise<void> {
    try {
      await this.entities.IdempotencyKey.create({
        clave: key,
        resultado: JSON.stringify(result),
        creado_en: new Date().toISOString()
      });
      Logger.info(`IdempotencyManager: saved key "${key}"`);
    } catch (e) {
      Logger.warn(`IdempotencyManager: could not persist key "${key}": ${e}`);
    }
  }

  /**
   * Removes all idempotency keys older than 24 hours.
   */
  async cleanExpiredKeys(): Promise<number> {
    const all = await this.entities.IdempotencyKey.filter({});
    const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
    let removed = 0;

    for (const record of all) {
      if (new Date(record.creado_en).getTime() < cutoff) {
        try {
          await this.entities.IdempotencyKey.delete(record.id);
          removed++;
        } catch (e) {
          Logger.warn(`IdempotencyManager: error deleting expired key "${record.clave}": ${e}`);
        }
      }
    }

    Logger.info(`IdempotencyManager: removed ${removed} expired key(s)`);
    return removed;
  }
}
