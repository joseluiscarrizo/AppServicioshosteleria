import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from './logger.ts';
import { validateUserAccess, RBACError } from './rbacValidator.ts';

const CAMAREROS_DEMO = [
  { nombre: 'Carlos Rodríguez', codigo: 'BCN-DEMO-001', email: 'carlos.demo@camarerosbcn.es', telefono: '612000001', especialidad: 'coctelería', experiencia_anios: 5, valoracion_promedio: 4.8, disponible: true, en_reserva: false },
  { nombre: 'María García', codigo: 'BCN-DEMO-002', email: 'maria.demo@camarerosbcn.es', telefono: '612000002', especialidad: 'alta_cocina', experiencia_anios: 8, valoracion_promedio: 4.9, disponible: true, en_reserva: false },
  { nombre: 'Jordi Puig', codigo: 'BCN-DEMO-003', email: 'jordi.demo@camarerosbcn.es', telefono: '612000003', especialidad: 'general', experiencia_anios: 3, valoracion_promedio: 4.5, disponible: true, en_reserva: false },
  { nombre: 'Ana Martínez', codigo: 'BCN-DEMO-004', email: 'ana.demo@camarerosbcn.es', telefono: '612000004', especialidad: 'banquetes', experiencia_anios: 6, valoracion_promedio: 4.7, disponible: true, en_reserva: false },
  { nombre: 'Pere Ferrer', codigo: 'BCN-DEMO-005', email: 'pere.demo@camarerosbcn.es', telefono: '612000005', especialidad: 'coctelería', experiencia_anios: 4, valoracion_promedio: 4.6, disponible: false, en_reserva: true },
];

const CLIENTES_DEMO = [
  { nombre: 'Hotel Arts Barcelona (DEMO)', persona_contacto_1: 'Laura Vidal', telefono_1: '932100001', email_1: 'eventos@hotelartsbarcelona-demo.com' },
  { nombre: 'Palau de Congressos (DEMO)', persona_contacto_1: 'Marc Soler', telefono_1: '932100002', email_1: 'reservas@palaucongressos-demo.cat' },
  { nombre: 'Casa Batlló Eventos (DEMO)', persona_contacto_1: 'Montse Boix', telefono_1: '932100003', email_1: 'eventos@casabatllo-demo.es' },
];

function offsetDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const PEDIDOS_DEMO = [
  { lugar_evento: 'Hotel Arts Barcelona — Sala Gran (DEMO)', direccion_completa: 'Carrer de la Marina, 19-21, 08005 Barcelona', dia: offsetDays(1), entrada: '19:00', salida: '01:00', cantidad_camareros: 3, estado: 'confirmado', notas: '[DEMO] Gala corporativa. 120 comensales.' },
  { lugar_evento: 'Palau de Congressos — Sala Llotja (DEMO)', direccion_completa: 'Av. Reina Maria Cristina, s/n, 08004 Barcelona', dia: offsetDays(7), entrada: '12:00', salida: '17:00', cantidad_camareros: 2, estado: 'pendiente', notas: '[DEMO] Congreso médico. Catering en pausa.' },
  { lugar_evento: 'Casa Batlló — Terraza (DEMO)', direccion_completa: 'Passeig de Gràcia, 43, 08007 Barcelona', dia: offsetDays(14), entrada: '20:00', salida: '23:00', cantidad_camareros: 2, estado: 'confirmado', notas: '[DEMO] Evento privado. Cócteles y finger food.' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    validateUserAccess(user, ['admin']);

    Logger.info('Iniciando seed de datos demo', { user: user.email });
    const resultados = { camareros: 0, clientes: 0, pedidos: 0, errores: 0 };

    for (const c of CAMAREROS_DEMO) {
      try { await base44.asServiceRole.entities.Camarero.create({ ...c, es_demo: true }); resultados.camareros++; }
      catch (e) { Logger.warn(`Error camarero ${c.nombre}`, { error: e.message }); resultados.errores++; }
    }
    for (const c of CLIENTES_DEMO) {
      try { await base44.asServiceRole.entities.Cliente.create({ ...c, es_demo: true }); resultados.clientes++; }
      catch (e) { Logger.warn(`Error cliente ${c.nombre}`, { error: e.message }); resultados.errores++; }
    }
    for (const p of PEDIDOS_DEMO) {
      try { await base44.asServiceRole.entities.Pedido.create({ ...p, es_demo: true }); resultados.pedidos++; }
      catch (e) { Logger.warn(`Error pedido ${p.lugar_evento}`, { error: e.message }); resultados.errores++; }
    }

    Logger.info('Seed completado', resultados);
    return Response.json({ ok: true, mensaje: 'Datos de demo creados correctamente', resultados });
  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json({ error: error.message }, { status: (error as any).statusCode || 403 });
    }
    Logger.error('Error en seedDemoData', { error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }
});
