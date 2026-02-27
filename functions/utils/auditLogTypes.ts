// Types for audit logging

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'send'
  | 'execute';

export interface AuditLogEntry {
  entidad: string;
  accion: AuditAction;
  entidad_id?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  datos_antes?: Record<string, unknown>;
  datos_despues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
  exito: boolean;
  error_mensaje?: string;
}
