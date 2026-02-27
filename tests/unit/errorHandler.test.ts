import { describe, test, expect, vi } from 'vitest';
import {
  DatabaseError,
  WhatsAppApiError,
  handleWebhookError,
  executeDbOperation,
  executeWhatsAppOperation,
} from '../../utils/webhookImprovements';
import {
  RBACError,
  validateUserRole,
  validateUserRoleAny,
  validateUserAccess,
  validateOwnershipOrAdmin,
} from '../../utils/rbacValidator';

// ─── DatabaseError ────────────────────────────────────────────────────────────

describe('DatabaseError', () => {
  test('tiene nombre correcto', () => {
    const err = new DatabaseError('fallo de BD');
    expect(err.name).toBe('DatabaseError');
  });

  test('tiene mensaje correcto', () => {
    const err = new DatabaseError('conexión perdida');
    expect(err.message).toBe('conexión perdida');
  });

  test('es instancia de Error', () => {
    const err = new DatabaseError('test');
    expect(err instanceof Error).toBe(true);
  });

  test('almacena la causa original', () => {
    const cause = new Error('causa raíz');
    const err = new DatabaseError('error wrapper', cause);
    expect(err.cause).toBe(cause);
  });
});

// ─── WhatsAppApiError ─────────────────────────────────────────────────────────

describe('WhatsAppApiError', () => {
  test('tiene nombre correcto', () => {
    const err = new WhatsAppApiError('error de WhatsApp');
    expect(err.name).toBe('WhatsAppApiError');
  });

  test('tiene mensaje correcto', () => {
    const err = new WhatsAppApiError('token inválido');
    expect(err.message).toBe('token inválido');
  });

  test('es instancia de Error', () => {
    const err = new WhatsAppApiError('test');
    expect(err instanceof Error).toBe(true);
  });

  test('almacena la causa original', () => {
    const cause = new TypeError('network error');
    const err = new WhatsAppApiError('api error', cause);
    expect(err.cause).toBe(cause);
  });
});

// ─── handleWebhookError ───────────────────────────────────────────────────────

describe('handleWebhookError', () => {
  test('devuelve Response con status correcto', async () => {
    const err = new Error('algo salió mal');
    const response = handleWebhookError(err, 500);
    expect(response.status).toBe(500);
  });

  test('devuelve Response con status 400 si se especifica', async () => {
    const err = new Error('datos inválidos');
    const response = handleWebhookError(err, 400);
    expect(response.status).toBe(400);
  });

  test('el body contiene el mensaje de error', async () => {
    const err = new Error('mensaje de error específico');
    const response = handleWebhookError(err, 500);
    const body = await response.json();
    expect(body.error).toBe('mensaje de error específico');
  });

  test('NO expone stack trace en la respuesta', async () => {
    const err = new Error('error interno');
    const response = handleWebhookError(err, 500);
    const body = await response.json();
    expect(body.stack).toBeUndefined();
  });

  test('usa status 500 por defecto', async () => {
    const err = new Error('error');
    const response = handleWebhookError(err);
    expect(response.status).toBe(500);
  });
});

// ─── executeDbOperation ───────────────────────────────────────────────────────

describe('executeDbOperation', () => {
  test('devuelve el resultado de una operación exitosa', async () => {
    const result = await executeDbOperation(async () => ({ id: '1', name: 'test' }));
    expect(result).toEqual({ id: '1', name: 'test' });
  });

  test('convierte errores genéricos en DatabaseError', async () => {
    await expect(
      executeDbOperation(async () => { throw new Error('connection refused'); })
    ).rejects.toBeInstanceOf(DatabaseError);
  });

  test('preserva el mensaje del error original', async () => {
    await expect(
      executeDbOperation(async () => { throw new Error('timeout'); })
    ).rejects.toThrow('timeout');
  });

  test('re-lanza DatabaseError sin wrapping adicional', async () => {
    const originalError = new DatabaseError('ya es un DatabaseError');
    await expect(
      executeDbOperation(async () => { throw originalError; })
    ).rejects.toBe(originalError);
  });
});

// ─── executeWhatsAppOperation ─────────────────────────────────────────────────

describe('executeWhatsAppOperation', () => {
  test('devuelve el resultado de una operación exitosa', async () => {
    const result = await executeWhatsAppOperation(async () => ({ messageId: 'wamid.123' }));
    expect(result).toEqual({ messageId: 'wamid.123' });
  });

  test('convierte errores genéricos en WhatsAppApiError', async () => {
    await expect(
      executeWhatsAppOperation(async () => { throw new Error('API limit exceeded'); })
    ).rejects.toBeInstanceOf(WhatsAppApiError);
  });

  test('preserva el mensaje del error original', async () => {
    await expect(
      executeWhatsAppOperation(async () => { throw new Error('token expired'); })
    ).rejects.toThrow('token expired');
  });

  test('re-lanza WhatsAppApiError sin wrapping adicional', async () => {
    const originalError = new WhatsAppApiError('ya es un WhatsAppApiError');
    await expect(
      executeWhatsAppOperation(async () => { throw originalError; })
    ).rejects.toBe(originalError);
  });
});

// ─── RBACError ────────────────────────────────────────────────────────────────

describe('RBACError', () => {
  test('tiene nombre correcto', () => {
    const err = new RBACError('no autorizado');
    expect(err.name).toBe('RBACError');
  });

  test('tiene statusCode 403 por defecto', () => {
    const err = new RBACError('no autorizado');
    expect(err.statusCode).toBe(403);
  });

  test('acepta statusCode personalizado', () => {
    const err = new RBACError('no autenticado', 401);
    expect(err.statusCode).toBe(401);
  });

  test('es instancia de Error', () => {
    const err = new RBACError('error');
    expect(err instanceof Error).toBe(true);
  });

  test('tiene mensaje correcto', () => {
    const err = new RBACError('acceso denegado');
    expect(err.message).toBe('acceso denegado');
  });
});

// ─── validateUserRole ─────────────────────────────────────────────────────────

describe('validateUserRole', () => {
  test('no lanza error si el rol coincide', () => {
    const user = { id: 'u1', role: 'admin' };
    expect(() => validateUserRole(user, 'admin')).not.toThrow();
  });

  test('lanza RBACError 401 si el usuario es null', () => {
    expect(() => validateUserRole(null, 'admin')).toThrow(RBACError);
    try { validateUserRole(null, 'admin'); } catch (e: unknown) {
      expect((e as RBACError).statusCode).toBe(401);
    }
  });

  test('lanza RBACError 403 si el rol no coincide', () => {
    const user = { id: 'u1', role: 'camarero' };
    expect(() => validateUserRole(user, 'admin')).toThrow(RBACError);
    try { validateUserRole(user, 'admin'); } catch (e: unknown) {
      expect((e as RBACError).statusCode).toBe(403);
    }
  });
});

// ─── validateUserRoleAny ──────────────────────────────────────────────────────

describe('validateUserRoleAny', () => {
  test('no lanza error si el rol está en la lista', () => {
    const user = { id: 'u1', role: 'coordinador' };
    expect(() => validateUserRoleAny(user, ['admin', 'coordinador'])).not.toThrow();
  });

  test('lanza RBACError si ningún rol coincide', () => {
    const user = { id: 'u1', role: 'camarero' };
    expect(() => validateUserRoleAny(user, ['admin', 'coordinador'])).toThrow(RBACError);
  });

  test('lanza RBACError 401 si el usuario es null', () => {
    expect(() => validateUserRoleAny(null, ['admin'])).toThrow(RBACError);
  });
});

// ─── validateUserAccess ───────────────────────────────────────────────────────

describe('validateUserAccess', () => {
  test('devuelve el usuario si el rol es correcto (string)', () => {
    const user = { id: 'u1', role: 'admin' };
    const result = validateUserAccess(user, 'admin');
    expect(result).toBe(user);
  });

  test('devuelve el usuario si el rol está en el array', () => {
    const user = { id: 'u1', role: 'coordinador' };
    const result = validateUserAccess(user, ['admin', 'coordinador']);
    expect(result).toBe(user);
  });

  test('lanza RBACError si el usuario es null', () => {
    expect(() => validateUserAccess(null, 'admin')).toThrow(RBACError);
  });

  test('lanza RBACError si el rol no coincide', () => {
    const user = { id: 'u1', role: 'camarero' };
    expect(() => validateUserAccess(user, ['admin', 'coordinador'])).toThrow(RBACError);
  });
});

// ─── validateOwnershipOrAdmin ─────────────────────────────────────────────────

describe('validateOwnershipOrAdmin', () => {
  test('permite acceso al propietario del recurso', () => {
    const user = { id: 'u1', role: 'camarero' };
    const result = validateOwnershipOrAdmin(user, 'u1');
    expect(result).toBe(user);
  });

  test('permite acceso al admin aunque no sea propietario', () => {
    const user = { id: 'admin1', role: 'admin' };
    const result = validateOwnershipOrAdmin(user, 'otro-usuario');
    expect(result).toBe(user);
  });

  test('lanza RBACError si no es propietario ni admin', () => {
    const user = { id: 'u2', role: 'coordinador' };
    expect(() => validateOwnershipOrAdmin(user, 'u1')).toThrow(RBACError);
  });

  test('lanza RBACError si el usuario es null', () => {
    expect(() => validateOwnershipOrAdmin(null, 'u1')).toThrow(RBACError);
  });
});
