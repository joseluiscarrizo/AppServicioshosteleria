import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obtener todos los grupos activos
    const grupos = await base44.asServiceRole.entities.GrupoChat.filter({ activo: true });

    const ahora = new Date();
    const gruposEliminados = [];

    for (const grupo of grupos) {
      if (grupo.fecha_eliminacion_programada) {
        const fechaEliminacion = new Date(grupo.fecha_eliminacion_programada);
        
        if (ahora >= fechaEliminacion) {
          // Desactivar el grupo
          await base44.asServiceRole.entities.GrupoChat.update(grupo.id, { 
            activo: false 
          });

          // Opcional: Eliminar mensajes del grupo
          const mensajes = await base44.asServiceRole.entities.MensajeChat.filter({ 
            grupo_id: grupo.id 
          });
          
          for (const mensaje of mensajes) {
            await base44.asServiceRole.entities.MensajeChat.delete(mensaje.id);
          }

          gruposEliminados.push({
            id: grupo.id,
            nombre: grupo.nombre
          });
        }
      }
    }

    return Response.json({
      success: true,
      eliminados: gruposEliminados.length,
      grupos: gruposEliminados
    });

  } catch (error) {
    console.error('Error eliminando grupos:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});