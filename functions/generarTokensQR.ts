/**
 * generarTokensQR
 * Genera tokens QR únicos para todas las asignaciones confirmadas de un pedido
 * y devuelve la URL de la página de fichaje del evento.
 * Solo accesible por admin/coordinador.
 */
import { createClientFromRequest } from '@base44/sdk';
import Logger from '../utils/logger.ts';

function generarToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'coordinador')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id requerido' }, { status: 400 });
    }

    // Obtener asignaciones confirmadas del pedido
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
      pedido_id
    });

    const confirmadas = asignaciones.filter(a =>
      a.estado === 'confirmado' || a.estado === 'alta'
    );

    // Generar token a las que no tienen
    const resultados = [];
    for (const asig of confirmadas) {
      let token = asig.qr_token;
      if (!token) {
        token = generarToken();
        await base44.asServiceRole.entities.AsignacionCamarero.update(asig.id, { qr_token: token });
      }
      resultados.push({
        asignacion_id: asig.id,
        camarero_nombre: asig.camarero_nombre,
        camarero_codigo: asig.camarero_codigo,
        token,
        qr_url: `/FichajeQR?token=${token}`
      });
    }

    return Response.json({
      ok: true,
      pedido_id,
      total: resultados.length,
      asignaciones: resultados,
      // Link general del evento (para mostrar en el chat)
      evento_fichaje_url: `/FichajeQR?pedido_id=${pedido_id}`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Error en generarTokensQR: ${message}`);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, metadata: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
});