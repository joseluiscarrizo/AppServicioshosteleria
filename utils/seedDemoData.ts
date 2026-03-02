/**
 * seedDemoData
 * Genera datos de demostración realistas para presentaciones a inversores.
 * Solo ejecutable por admin. Crea: camareros, clientes, coordinadores y pedidos de muestra.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from './logger.ts';
import { validateUserAccess, RBACError } from './rbacValidator.ts';

const CAMAREROS_DEMO = [
  { nombre: 'Carlos Rodríguez', codigo: 'BCN001', email: 'carlos@demo.com', telefono: '6123456701', especialidad: 'coctelería', experiencia_anios: 5, valoracion_promedio: 4.8, disponible: true },
  { nombre: 'María García', codigo: 'BCN002', email: 'maria@demo.com', telefono: '6123456702', especialidad: 'alta_cocina', experiencia_anios: 8, valoracion_promedio: 4.9, disponible: true },
  { nombre: 'Jordi Puig', codigo: 'BCN003', email: 'jordi@demo.com', telefono: '6123456703', especialidad: 'general', experiencia_anios: 3, valoracion_promedio: 4.5, disponible: true },
  { nombre: 'Ana Martínez', codigo: 'BCN004', email: 'ana@demo.com', telefono: '6123456704', especialidad: 'banquetes', experiencia_anios: 6, valoracion_promedio: 4.7, disponible: true },
  { nombre: 'Pere Ferrer', codigo: 'BCN005', email: 'pere@demo.com', telefono: '6123456705', especialidad: 'coctelería', experiencia_anios: 4, valoracion_promedio: 4.6, disponible: true },
];

const CLIENTES_DEMO = [
  { nombre: 'Hotel Arts Barcelona', persona_contacto_1: 'Laura Vidal', telefono_1: '932123456', email_1: 'eventos@hotelartsbarcelona.com' },
  { nombre: 'Palau de Congressos', persona_contacto_1: 'Marc Soler', telefono_1: '932234567', email_1: 'reservas@palaucongressos.cat' },
  { nombre: 'Casa Batlló Eventos', persona_contacto_1: 'Montse Boix', telefono_1: '932345678', email_1: 'eventos@casabatllo.es' },
];

const hoy = new Date();
const mañana = new Date(hoy); mañana.setDate(hoy.getDate() + 1);
const enUnaSemana = new Date(hoy); enUnaSemana.setDate(hoy.getDate() + 7);
const enDosSemanas = new Date(hoy); enDosSemanas.setDate(hoy.getDate() + 14);

function formatFecha(d: Date): string {
  return d.toISOString().split('T')[0];
}

const PEDIDOS_DEMO = [
  {
    cliente: 'Hotel Arts Barcelona',
    lugar_evento: 'Hotel Arts Barcelona — Sala Gran',
    direccion_completa: 'Carrer de la Marina, 19-21, 08005 Barcelona',
    dia: formatFecha(mañana),
    entrada: '19:00',
    salida: '01:00',
    cantidad_camareros: 3,
    estado: 'confirmado',
    notas: 'Gala corporativa. Dress code formal. Servicio de mesa para 120 comensales.',
  },
  {
    cliente: 'Palau de Congressos',
    lugar_evento: 'Palau de Congressos — Sala Llotja',
    direccion_completa: 'Av. Reina Maria Cristina, s/n, 08004 Barcelona',
    dia: formatFecha(enUnaSemana),
    entrada: '12:00',
    salida: '17:00',
    cantidad_camareros: 2,
    estado: 'pendiente',
    notas: 'Congreso médico. Servicio de catering en pausa del mediodía.',
  },
  {
    cliente: 'Casa Batlló Eventos',
    lugar_evento: 'Casa Batlló — Terraza',
    direccion_completa: 'Passeig de Gràcia, 43, 08007 Barcelona',
    dia: formatFecha(enDosSemanas),
    entrada: '20:00',
    salida: '23:00',
    cantidad_camareros: 2,
    estado: 'confirmado',
    notas: 'Evento privado en terraza. Servicio de cócteles y finger food.',
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    validateUserAccess(user, ['admin']);

    Logger.info('Iniciando seed de datos demo', { user: user.email });

    const resultados: Record<string, number> = {
      camareros: 0,
      clientes: 0,
      pedidos: 0
    };

    // Crear camareros demo
    for (const camarero of CAMAREROS_DEMO) {
      try {
        await base44.asServiceRole.entities.Camarero.create({
          ...camarero,
          es_demo: true,
          en_reserva: false,
          estado_actual: 'disponible'
        });
        resultados.camareros++;
      } catch (e) {
        Logger.warn(`Camarero ${camarero.nombre} ya existe o error al crear`, { error: e.message });
      }
    }

    // Crear clientes demo
    for (const cliente of CLIENTES_DEMO) {
      try {
        await base44.asServiceRole.entities.Cliente.create({
          ...cliente,
          es_demo: true
        });
        resultados.clientes++;
      } catch (e) {
        Logger.warn(`Cliente ${cliente.nombre} ya existe o error al crear`, { error: e.message });
      }
    }

    // Crear pedidos demo
    for (const pedido of PEDIDOS_DEMO) {
      try {
        await base44.asServiceRole.entities.Pedido.create({
          ...pedido,
          es_demo: true
        });
        resultados.pedidos++;
      } catch (e) {
        Logger.warn(`Pedido de ${pedido.cliente} error al crear`, { error: e.message });
      }
    }

    Logger.info('Seed de datos demo completado', resultados);

    return Response.json({
      ok: true,
      mensaje: '✅ Datos de demo creados correctamente',
      resultados,
      nota: 'Los datos demo están marcados con es_demo: true para fácil identificación y limpieza posterior.'
    });

  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    Logger.error('Error en seedDemoData', { error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }
});
