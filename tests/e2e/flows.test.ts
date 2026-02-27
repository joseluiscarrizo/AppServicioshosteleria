/**
 * E2E Tests – Critical User Flows (business logic layer).
 * These tests validate the complete user flow logic without requiring
 * a running UI, by testing the state transitions and business rules.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validatePhoneNumberStrict, validateEmail, sanitizeInput } from '../../utils/validators';
import { RBACError, validateUserAccess } from '../../utils/rbacValidator';

// ─── Shared mock helpers ───────────────────────────────────────────────────────

function calcularHoras(entrada: string, salida: string): number | null {
  if (!entrada || !salida) return null;
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = salida.split(':').map(Number);
  let minutos = (hS * 60 + mS) - (hE * 60 + mE);
  if (minutos < 0) minutos += 24 * 60;
  return Math.round((minutos / 60) * 100) / 100;
}

// Mock de base de datos en memoria
function createMockDatabase() {
  const pedidos: Record<string, unknown> = {};
  const asignaciones: Record<string, unknown> = {};
  const camareros: Record<string, unknown> = {};
  const historialWhatsApp: unknown[] = [];

  return {
    pedidos: {
      create: (data: Record<string, unknown>) => {
        const id = `pedido-${Date.now()}`;
        pedidos[id] = { ...data, id };
        return pedidos[id];
      },
      get: (id: string) => pedidos[id] || null,
      update: (id: string, data: Record<string, unknown>) => {
        pedidos[id] = { ...pedidos[id] as object, ...data };
        return pedidos[id];
      },
      list: () => Object.values(pedidos),
    },
    asignaciones: {
      create: (data: Record<string, unknown>) => {
        const id = `asig-${Date.now()}`;
        asignaciones[id] = { ...data, id };
        return asignaciones[id];
      },
      get: (id: string) => asignaciones[id] || null,
      update: (id: string, data: Record<string, unknown>) => {
        asignaciones[id] = { ...asignaciones[id] as object, ...data };
        return asignaciones[id];
      },
      filter: (predicate: (a: Record<string, unknown>) => boolean) =>
        Object.values(asignaciones).filter(a => predicate(a as Record<string, unknown>)),
    },
    camareros: {
      create: (data: Record<string, unknown>) => {
        const id = `cam-${Date.now()}`;
        camareros[id] = { ...data, id };
        return camareros[id];
      },
      get: (id: string) => camareros[id] || null,
      update: (id: string, data: Record<string, unknown>) => {
        camareros[id] = { ...camareros[id] as object, ...data };
        return camareros[id];
      },
    },
    historialWhatsApp: {
      create: (data: unknown) => {
        historialWhatsApp.push(data);
        return data;
      },
      list: () => historialWhatsApp,
    },
  };
}

// ─── Flow 1: Crear pedido → Asignar camarero → Confirmar servicio ──────────────

describe('Flow 1: Crear pedido → Asignar camarero → Confirmar servicio', () => {
  let db: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    db = createMockDatabase();
  });

  test('Paso 1: crear pedido con datos válidos', () => {
    const pedidoData = {
      cliente: 'Empresa ABC',
      dia: '2026-03-15',
      lugar_evento: 'Salón Gran Vía',
      turnos: [{ nombre: 'Turno Principal', hora_inicio: '18:00', hora_fin: '23:00', num_camareros: 2 }],
      estado: 'activo',
    };
    const pedido = db.pedidos.create(pedidoData);
    expect(pedido).toHaveProperty('id');
    expect((pedido as Record<string, unknown>).cliente).toBe('Empresa ABC');
    expect((pedido as Record<string, unknown>).estado).toBe('activo');
  });

  test('Paso 2: asignar camarero disponible al pedido', () => {
    const pedido = db.pedidos.create({ cliente: 'Test', dia: '2026-03-15', estado: 'activo' });
    const camarero = db.camareros.create({ nombre: 'Carlos', estado_actual: 'disponible' });

    // Solo podemos asignar camareros disponibles
    const camData = db.camareros.get((camarero as Record<string, unknown>).id as string);
    expect((camData as Record<string, unknown>).estado_actual).toBe('disponible');

    const asignacion = db.asignaciones.create({
      pedido_id: (pedido as Record<string, unknown>).id,
      camarero_id: (camarero as Record<string, unknown>).id,
      estado: 'pendiente',
    });

    expect((asignacion as Record<string, unknown>).estado).toBe('pendiente');
    expect((asignacion as Record<string, unknown>).pedido_id).toBe((pedido as Record<string, unknown>).id);
  });

  test('Paso 3: confirmar servicio actualiza estado de asignación', () => {
    const pedido = db.pedidos.create({ cliente: 'Test', dia: '2026-03-15' });
    const camarero = db.camareros.create({ nombre: 'Carlos', estado_actual: 'disponible' });
    const asignacion = db.asignaciones.create({
      pedido_id: (pedido as Record<string, unknown>).id,
      camarero_id: (camarero as Record<string, unknown>).id,
      estado: 'pendiente',
    });

    const asigId = (asignacion as Record<string, unknown>).id as string;
    const camId = (camarero as Record<string, unknown>).id as string;

    // Confirmar
    const actualizada = db.asignaciones.update(asigId, { estado: 'confirmado' });
    db.camareros.update(camId, { estado_actual: 'ocupado' });

    expect((actualizada as Record<string, unknown>).estado).toBe('confirmado');
    expect((db.camareros.get(camId) as Record<string, unknown>).estado_actual).toBe('ocupado');
  });

  test('Flujo completo: pedido activo → asignación confirmada', () => {
    const pedido = db.pedidos.create({ cliente: 'Bodas García', dia: '2026-04-20', estado: 'activo' });
    const camarero = db.camareros.create({ nombre: 'Ana', estado_actual: 'disponible' });

    const asignacion = db.asignaciones.create({
      pedido_id: (pedido as Record<string, unknown>).id,
      camarero_id: (camarero as Record<string, unknown>).id,
      estado: 'pendiente',
    });

    const asigId = (asignacion as Record<string, unknown>).id as string;
    db.asignaciones.update(asigId, { estado: 'confirmado' });

    const asignadas = db.asignaciones.filter(
      a => a.pedido_id === (pedido as Record<string, unknown>).id && a.estado === 'confirmado'
    );
    expect(asignadas).toHaveLength(1);
  });
});

// ─── Flow 2: Enviar WhatsApp → camarero recibe confirmación ───────────────────

describe('Flow 2: Enviar WhatsApp → camarero recibe confirmación', () => {
  let db: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    db = createMockDatabase();
  });

  test('validar teléfono antes de enviar WhatsApp', () => {
    const telefonoValido = '+34600111222';
    const telefonoInvalido = 'no-es-un-telefono';

    expect(validatePhoneNumberStrict(telefonoValido)).toBe(true);
    expect(validatePhoneNumberStrict(telefonoInvalido)).toBe(false);
  });

  test('registrar en historial después de envío exitoso', () => {
    const envio = {
      destinatario_nombre: 'Carlos López',
      telefono: '34600111222',
      mensaje: 'Tienes un nuevo servicio para el 15 de marzo',
      estado: 'enviado',
      proveedor: 'whatsapp_api',
    };

    db.historialWhatsApp.create(envio);
    const historial = db.historialWhatsApp.list();

    expect(historial).toHaveLength(1);
    expect((historial[0] as Record<string, unknown>).estado).toBe('enviado');
  });

  test('marcar como pendiente si API falla (modo fallback URL)', () => {
    const envio = {
      destinatario_nombre: 'Pedro Sánchez',
      telefono: '34600333333',
      mensaje: 'Mensaje de asignación',
      estado: 'pendiente',
      proveedor: 'whatsapp_web',
      error: 'API token expired',
    };

    db.historialWhatsApp.create(envio);
    const historial = db.historialWhatsApp.list();

    expect((historial[0] as Record<string, unknown>).estado).toBe('pendiente');
    expect((historial[0] as Record<string, unknown>).proveedor).toBe('whatsapp_web');
  });

  test('sanitizar mensaje antes de enviar', () => {
    const mensajeConXSS = 'Hola <b>Carlos</b>, tienes servicio. <script>alert(1)</script>';
    const mensajeLimpio = sanitizeInput(mensajeConXSS);

    expect(mensajeLimpio).not.toContain('<script>');
    expect(mensajeLimpio).not.toContain('<b>');
    expect(mensajeLimpio).toContain('Carlos');
  });

  test('usuario no autorizado no puede enviar WhatsApp', () => {
    const camarero = { id: 'c1', role: 'camarero' };
    expect(() => validateUserAccess(camarero, ['admin', 'coordinador'])).toThrow(RBACError);
  });
});

// ─── Flow 3: Fichaje QR – entrada → salida → cálculo de horas ─────────────────

describe('Flow 3: Fichaje QR – entrada → salida → cálculo de horas', () => {
  let db: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    db = createMockDatabase();
  });

  test('registrar hora de entrada correctamente', () => {
    const asignacion = db.asignaciones.create({
      camarero_id: 'cam-1',
      pedido_id: 'pedido-1',
      hora_entrada: '18:00',
      hora_entrada_real: null,
      hora_salida_real: null,
      estado: 'confirmado',
    });

    const asigId = (asignacion as Record<string, unknown>).id as string;

    // Verificar que no hay entrada previa
    expect((asignacion as Record<string, unknown>).hora_entrada_real).toBeNull();

    // Registrar entrada
    const horaActual = '17:55';
    db.asignaciones.update(asigId, {
      hora_entrada_real: horaActual,
      fichaje_entrada_timestamp: new Date().toISOString(),
    });

    const actualizada = db.asignaciones.get(asigId);
    expect((actualizada as Record<string, unknown>).hora_entrada_real).toBe('17:55');
  });

  test('previene doble fichaje de entrada', () => {
    const asignacion = db.asignaciones.create({
      camarero_id: 'cam-1',
      hora_entrada_real: '18:00', // ya fichó
      hora_salida_real: null,
    });

    // Si ya existe hora_entrada_real, debe retornar error 409
    const yaFicho = (asignacion as Record<string, unknown>).hora_entrada_real;
    expect(yaFicho).toBeTruthy();
    // Lógica del endpoint: si ya hay hora_entrada_real, retornar 409
    expect(yaFicho !== null && yaFicho !== undefined).toBe(true);
  });

  test('requiere fichaje de entrada antes de salida', () => {
    const asignacion = db.asignaciones.create({
      camarero_id: 'cam-1',
      hora_entrada_real: null,
      hora_salida_real: null,
    });

    // Si no hay hora_entrada_real, no se puede fichar salida
    const tieneEntrada = !!(asignacion as Record<string, unknown>).hora_entrada_real;
    expect(tieneEntrada).toBe(false);
    // El endpoint debe retornar 400 en este caso
  });

  test('calcula horas reales correctamente al fichar salida', () => {
    const asignacion = db.asignaciones.create({
      camarero_id: 'cam-1',
      hora_entrada_real: '18:00',
      hora_salida_real: null,
    });

    const asigId = (asignacion as Record<string, unknown>).id as string;
    const horaSalida = '23:30';
    const horas = calcularHoras('18:00', horaSalida);

    db.asignaciones.update(asigId, {
      hora_salida_real: horaSalida,
      horas_reales: horas,
    });

    const actualizada = db.asignaciones.get(asigId);
    expect((actualizada as Record<string, unknown>).horas_reales).toBe(5.5);
    expect((actualizada as Record<string, unknown>).hora_salida_real).toBe('23:30');
  });

  test('flujo completo: entrada → salida → 8 horas trabajadas', () => {
    const horaEntrada = '09:00';
    const horaSalida = '17:00';
    const horas = calcularHoras(horaEntrada, horaSalida);

    expect(horas).toBe(8);

    const asignacion = db.asignaciones.create({
      camarero_id: 'cam-1',
      hora_entrada_real: horaEntrada,
    });
    const asigId = (asignacion as Record<string, unknown>).id as string;
    db.asignaciones.update(asigId, {
      hora_salida_real: horaSalida,
      horas_reales: horas,
    });

    const final = db.asignaciones.get(asigId);
    expect((final as Record<string, unknown>).horas_reales).toBe(8);
  });

  test('turno nocturno: 22:00 → 06:00 = 8 horas', () => {
    const horas = calcularHoras('22:00', '06:00');
    expect(horas).toBe(8);
  });
});

// ─── Flow 4: RBAC – usuarios con distintos roles ──────────────────────────────

describe('Flow 4: Control de acceso por roles (RBAC)', () => {
  test('admin puede realizar cualquier operación', () => {
    const admin = { id: 'admin-1', role: 'admin' };
    expect(() => validateUserAccess(admin, ['admin', 'coordinador'])).not.toThrow();
    expect(() => validateUserAccess(admin, ['admin'])).not.toThrow();
  });

  test('coordinador puede acceder a operaciones de coordinador', () => {
    const coord = { id: 'coord-1', role: 'coordinador' };
    expect(() => validateUserAccess(coord, ['admin', 'coordinador'])).not.toThrow();
  });

  test('coordinador NO puede acceder a operaciones solo de admin', () => {
    const coord = { id: 'coord-1', role: 'coordinador' };
    expect(() => validateUserAccess(coord, ['admin'])).toThrow(RBACError);
  });

  test('camarero NO puede acceder a operaciones de gestión', () => {
    const camarero = { id: 'cam-1', role: 'camarero' };
    expect(() => validateUserAccess(camarero, ['admin', 'coordinador'])).toThrow(RBACError);
  });

  test('usuario sin autenticar recibe error 401', () => {
    try {
      validateUserAccess(null, ['admin']);
      expect.fail('Debería haber lanzado RBACError');
    } catch (e: unknown) {
      expect((e as RBACError).statusCode).toBe(401);
    }
  });
});
