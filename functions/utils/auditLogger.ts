// auditLogger.ts
// Records every data-mutating operation for compliance and debugging

import Logger from '../../utils/logger.ts';
import type { AuditAction, AuditLogEntry } from './auditLogTypes.ts';

interface ServiceRoleEntities {
  AuditLog: {
    create: (data: Record<string, unknown>) => Promise<{ id: string }>;
  };
}

/**
 * Writes structured audit log entries to the AuditLog entity.
 * Each entry captures who did what, when, and the before/after state.
 */
export class AuditLogger {
  constructor(private readonly entities: ServiceRoleEntities) {}

  /**
   * Records an audit event. Failures are caught and logged to console so they
   * never interrupt the main execution path.
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const record: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    try {
      await this.entities.AuditLog.create(record as unknown as Record<string, unknown>);
      Logger.info(`AuditLogger: [${record.accion}] ${record.entidad}${record.entidad_id ? `#${record.entidad_id}` : ''} by ${record.usuario_id ?? 'sistema'}`);
    } catch (e) {
      Logger.error(`AuditLogger: failed to persist audit entry – ${e}. Entry: ${JSON.stringify(record)}`);
    }
  }

  /**
   * Convenience wrapper for successful create operations.
   */
  async logCreate(params: {
    entidad: string;
    entidad_id?: string;
    usuario_id?: string;
    usuario_nombre?: string;
    datos_despues?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({ ...params, accion: 'create' as AuditAction, exito: true });
  }

  /**
   * Convenience wrapper for successful update operations.
   */
  async logUpdate(params: {
    entidad: string;
    entidad_id?: string;
    usuario_id?: string;
    usuario_nombre?: string;
    datos_antes?: Record<string, unknown>;
    datos_despues?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({ ...params, accion: 'update' as AuditAction, exito: true });
  }

  /**
   * Convenience wrapper for send/dispatch operations.
   */
  async logSend(params: {
    entidad: string;
    entidad_id?: string;
    usuario_id?: string;
    usuario_nombre?: string;
    metadata?: Record<string, unknown>;
    exito: boolean;
    error_mensaje?: string;
  }): Promise<void> {
    await this.log({ ...params, accion: 'send' as AuditAction });
  }
}
