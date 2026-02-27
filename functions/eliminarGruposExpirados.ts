import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from '../utils/logger.ts';
import { executeDbOperation, DatabaseError } from '../utils/webhookImprovements.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const ahora = new Date().toISOString();

    Logger.info(`Iniciando eliminación de grupos expirados. timestamp=${ahora}`);

    // Obtener grupos activos con fecha de eliminación programada en el pasado
    const gruposExpirados = await executeDbOperation(() =>
      base44.asServiceRole.entities.GrupoChat.filter({
        activo: true,
        fecha_eliminacion_programada: { $lte: ahora }
      })
    );

    if (gruposExpirados.length === 0) {
      Logger.info('No hay grupos expirados para eliminar.');
      return Response.json({ success: true, eliminados: 0 });
    }

    Logger.info(`Grupos expirados encontrados: ${gruposExpirados.length}`);

    const eliminados: string[] = [];
    const errores: string[] = [];

    for (const grupo of gruposExpirados) {
      try {
        await executeDbOperation(() =>
          base44.asServiceRole.entities.GrupoChat.update(grupo.id, { activo: false })
        );
        eliminados.push(grupo.id);
        Logger.info(`Grupo desactivado: ${grupo.nombre}. grupo_id=${grupo.id}`);
      } catch (err) {
        if (err instanceof DatabaseError) {
          Logger.error(`Error de BD al desactivar grupo. grupo_id=${grupo.id}: ${err.message}`);
        } else {
          Logger.error(`Error inesperado al desactivar grupo. grupo_id=${grupo.id}: ${err}`);
        }
        errores.push(grupo.id);
      }
    }

    Logger.info(`Eliminación completada. eliminados=${eliminados.length}, errores=${errores.length}`);

    return Response.json({
      success: true,
      eliminados: eliminados.length,
      errores: errores.length,
      grupos_eliminados: eliminados,
      grupos_con_error: errores
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof DatabaseError ? 'DB_ERROR' : 'INTERNAL_ERROR';
    Logger.error(`Error en eliminarGruposExpirados [${code}]: ${message}`);
    return Response.json(
      { success: false, error: { code, message }, metadata: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
});
