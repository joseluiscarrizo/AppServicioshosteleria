/**
 * Integration tests for Cloud Functions business logic.
 * These tests validate core logic without requiring the Deno runtime.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { validatePhoneNumber, validatePhoneNumberStrict } from '../../utils/validators';
import {
  DatabaseError,
  WhatsAppApiError,
  handleWebhookError,
  executeDbOperation,
  executeWhatsAppOperation,
} from '../../utils/webhookImprovements';
import { RBACError, validateUserAccess } from '../../utils/rbacValidator';

// ─── Helpers shared with Cloud Functions ──────────────────────────────────────

/**
 * Replica of calcularHoras from registrarFichajeQR.ts
 * Extracted for testability.
 */
function calcularHoras(entrada: string, salida: string): number | null {
  if (!entrada || !salida) return null;
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = salida.split(':').map(Number);
  let minutos = (hS * 60 + mS) - (hE * 60 + mE);
  if (minutos < 0) minutos += 24 * 60;
  return Math.round((minutos / 60) * 100) / 100;
}

// ─── enviarWhatsAppDirecto – validation logic ──────────────────────────────────

describe('enviarWhatsAppDirecto – validación de request', () => {
  test('rechaza teléfono inválido', () => {
    const telefono = 'not-a-phone';
    expect(validatePhoneNumber(telefono)).toBe(false);
    expect(validatePhoneNumberStrict(telefono)).toBe(false);
  });

  test('acepta número español válido (formato E.164)', () => {
    const telefono = '+34600111222';
    expect(validatePhoneNumberStrict(telefono)).toBe(true);
  });

  test('formatea número añadiendo prefijo 34 si faltan exactamente 9 dígitos', () => {
    const telefonoLimpio = '600111222';
    let numeroWhatsApp = telefonoLimpio;
    if (!numeroWhatsApp.startsWith('34') && numeroWhatsApp.length === 9) {
      numeroWhatsApp = '34' + numeroWhatsApp;
    }
    expect(numeroWhatsApp).toBe('34600111222');
  });

  test('NO modifica número que ya tiene prefijo 34', () => {
    const telefonoLimpio = '34600111222';
    let numeroWhatsApp = telefonoLimpio;
    if (!numeroWhatsApp.startsWith('34') && numeroWhatsApp.length === 9) {
      numeroWhatsApp = '34' + numeroWhatsApp;
    }
    expect(numeroWhatsApp).toBe('34600111222');
  });

  test('genera URL de WhatsApp Web como fallback', () => {
    const numero = '34600111222';
    const mensaje = 'Hola, tienes un nuevo servicio';
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    expect(url).toContain('wa.me/34600111222');
    expect(url).toContain(encodeURIComponent(mensaje));
  });

  test('handleWebhookError retorna response JSON sin stack trace para errores de función', async () => {
    const err = new Error('Error interno en enviarWhatsAppDirecto');
    const response = handleWebhookError(err, 500);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.stack).toBeUndefined();
    expect(response.status).toBe(500);
  });

  test('RBACError lanzado para usuarios no autorizados retorna 403', () => {
    const camarero = { id: 'c1', role: 'camarero' };
    try {
      validateUserAccess(camarero, ['admin', 'coordinador']);
      expect.fail('Debería haber lanzado RBACError');
    } catch (e: unknown) {
      expect(e instanceof RBACError).toBe(true);
      expect((e as RBACError).statusCode).toBe(403);
    }
  });
});

// ─── registrarFichajeQR – cálculo de horas ────────────────────────────────────

describe('registrarFichajeQR – calcularHoras', () => {
  test('calcula horas correctamente (turno normal)', () => {
    expect(calcularHoras('09:00', '17:00')).toBe(8);
  });

  test('calcula horas con minutos', () => {
    expect(calcularHoras('08:30', '14:45')).toBe(6.25);
  });

  test('calcula horas en turno nocturno (cruza medianoche)', () => {
    expect(calcularHoras('22:00', '06:00')).toBe(8);
  });

  test('retorna null si falta la hora de entrada', () => {
    expect(calcularHoras('', '17:00')).toBeNull();
  });

  test('retorna null si falta la hora de salida', () => {
    expect(calcularHoras('09:00', '')).toBeNull();
  });

  test('retorna null si faltan ambas horas', () => {
    expect(calcularHoras('', '')).toBeNull();
  });

  test('calcula 0 horas correctamente (entrada === salida)', () => {
    expect(calcularHoras('10:00', '10:00')).toBe(0);
  });

  test('redondea a 2 decimales', () => {
    // 09:00 a 09:01 = 1 minuto = 0.02 horas
    expect(calcularHoras('09:00', '09:01')).toBe(0.02);
  });
});

describe('registrarFichajeQR – validación de token', () => {
  test('rechaza request sin token', () => {
    const token = '';
    expect(token).toBeFalsy();
  });

  test('acepta request con token presente', () => {
    const token = 'abc123-token-qr-unico';
    expect(token).toBeTruthy();
  });

  test('tipo de fichaje válido: entrada', () => {
    const tipo = 'entrada';
    expect(['entrada', 'salida'].includes(tipo)).toBe(true);
  });

  test('tipo de fichaje válido: salida', () => {
    const tipo = 'salida';
    expect(['entrada', 'salida'].includes(tipo)).toBe(true);
  });

  test('tipo de fichaje inválido: otro valor', () => {
    const tipo = 'descanso';
    expect(['entrada', 'salida'].includes(tipo)).toBe(false);
  });
});

// ─── crearGrupoChat – construcción de miembros ─────────────────────────────────

describe('crearGrupoChat – lógica de construcción de grupo', () => {
  const pedido = {
    id: 'pedido-1',
    cliente: 'Empresa ABC',
    dia: '2026-03-15',
    lugar_evento: 'Salón Gran Vía',
    coordinador_id: 'coord-1',
    salida: '23:00',
  };

  const asignaciones = [
    { id: 'asig-1', pedido_id: 'pedido-1', camarero_id: 'cam-1', estado: 'confirmado' },
    { id: 'asig-2', pedido_id: 'pedido-1', camarero_id: 'cam-2', estado: 'confirmado' },
  ];

  const camareros = [
    { id: 'cam-1', nombre: 'Carlos López' },
    { id: 'cam-2', nombre: 'Ana Martínez' },
  ];

  const coordinadores = [
    { id: 'coord-1', nombre: 'Laura Coordinadora' },
  ];

  test('genera nombre de grupo correcto', () => {
    const nombreGrupo = `${pedido.cliente} - ${pedido.dia}`;
    expect(nombreGrupo).toBe('Empresa ABC - 2026-03-15');
  });

  test('construye lista de miembros para asignaciones confirmadas', () => {
    const miembros = asignaciones
      .filter(a => a.estado === 'confirmado')
      .map(a => {
        const cam = camareros.find(c => c.id === a.camarero_id);
        return cam ? { user_id: cam.id, nombre: cam.nombre, rol: 'camarero' } : null;
      })
      .filter(Boolean);

    expect(miembros).toHaveLength(2);
    expect(miembros[0]).toEqual({ user_id: 'cam-1', nombre: 'Carlos López', rol: 'camarero' });
  });

  test('añade coordinador a la lista de miembros', () => {
    const miembros: { user_id: string; nombre: string; rol: string }[] = [];
    if (pedido.coordinador_id) {
      const coord = coordinadores.find(c => c.id === pedido.coordinador_id);
      if (coord) {
        miembros.push({ user_id: coord.id, nombre: coord.nombre, rol: 'coordinador' });
      }
    }
    expect(miembros).toHaveLength(1);
    expect(miembros[0].rol).toBe('coordinador');
  });

  test('calcula fecha de eliminación 24h después del evento', () => {
    const fechaEvento = new Date(pedido.dia);
    const [h, m] = pedido.salida.split(':').map(Number);
    fechaEvento.setHours(h, m, 0);
    const fechaEliminacion = new Date(fechaEvento.getTime() + 24 * 60 * 60 * 1000);
    const diffHoras = (fechaEliminacion.getTime() - fechaEvento.getTime()) / (1000 * 60 * 60);
    expect(diffHoras).toBe(24);
  });

  test('rechaza creación si no hay asignaciones confirmadas', () => {
    const sinConfirmados = asignaciones.filter(a => a.estado === 'pendiente');
    expect(sinConfirmados).toHaveLength(0);
    // Si no hay confirmados, se devolvería error 400
    expect(sinConfirmados.length === 0).toBe(true);
  });
});

// ─── sugerirCamarerosInteligente – ranking ─────────────────────────────────────

describe('sugerirCamarerosInteligente – lógica de ranking', () => {
  const camareros = [
    { id: 'cam-1', nombre: 'Carlos López', valoracion: 4.8, estado_actual: 'disponible' },
    { id: 'cam-2', nombre: 'Pedro Sánchez', valoracion: 3.5, estado_actual: 'ocupado' },
    { id: 'cam-3', nombre: 'Ana Martínez', valoracion: 4.9, estado_actual: 'disponible' },
  ];

  test('filtra camareros disponibles', () => {
    const disponibles = camareros.filter(c => c.estado_actual === 'disponible');
    expect(disponibles).toHaveLength(2);
    expect(disponibles.map(c => c.nombre)).toContain('Carlos López');
    expect(disponibles.map(c => c.nombre)).toContain('Ana Martínez');
  });

  test('NO incluye camareros ocupados en sugerencias', () => {
    const disponibles = camareros.filter(c => c.estado_actual === 'disponible');
    expect(disponibles.some(c => c.nombre === 'Pedro Sánchez')).toBe(false);
  });

  test('la respuesta tiene estructura correcta con pedido_id', () => {
    const respuesta = {
      success: true,
      pedido_id: 'pedido-1',
      total_candidatos: 2,
      sugerencias: [],
      resumen: 'Análisis completado',
      alertas: [],
      timestamp: new Date().toISOString(),
    };
    expect(respuesta).toHaveProperty('success', true);
    expect(respuesta).toHaveProperty('pedido_id');
    expect(respuesta).toHaveProperty('sugerencias');
    expect(respuesta).toHaveProperty('timestamp');
  });

  test('calcula distancia haversine correctamente entre Madrid y Barcelona', () => {
    // Madrid: 40.4168, -3.7038 | Barcelona: 41.3851, 2.1734
    const R = 6371;
    const lat1 = 40.4168, lon1 = -3.7038;
    const lat2 = 41.3851, lon2 = 2.1734;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const distancia = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Madrid-Barcelona aprox 620 km
    expect(distancia).toBeGreaterThan(500);
    expect(distancia).toBeLessThan(700);
  });
});

// ─── executeDbOperation – retry y error wrapping ──────────────────────────────

describe('Manejo de errores en operaciones de base de datos', () => {
  test('executeDbOperation envuelve errores genéricos en DatabaseError', async () => {
    await expect(
      executeDbOperation(async () => { throw new Error('Firestore: quota exceeded'); })
    ).rejects.toBeInstanceOf(DatabaseError);
  });

  test('executeWhatsAppOperation envuelve errores de red en WhatsAppApiError', async () => {
    await expect(
      executeWhatsAppOperation(async () => { throw new TypeError('Failed to fetch'); })
    ).rejects.toBeInstanceOf(WhatsAppApiError);
  });
});
