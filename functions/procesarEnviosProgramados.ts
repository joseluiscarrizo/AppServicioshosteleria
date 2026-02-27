import { createClientFromRequest } from '@base44/sdk';
import Logger from '../utils/logger.ts';
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    validateUserAccess(user, 'admin');

    // Obtener envíos programados activos
    const envios = await base44.asServiceRole.entities.EnvioProgramado.filter({
      estado: 'activo'
    });

    const ahora = new Date();
    let procesados = 0;
    let errores = 0;

    for (const envio of envios) {
      try {
        let debeEnviar = false;

        // Verificar si debe enviarse
        if (envio.tipo_envio === 'unico') {
          const fechaEnvio = new Date(envio.fecha_envio);
          if (fechaEnvio <= ahora && !envio.ultimo_envio) {
            debeEnviar = true;
          }
        } else if (envio.tipo_envio === 'recurrente') {
          const fechaInicio = new Date(envio.fecha_inicio);
          const fechaFin = envio.fecha_fin ? new Date(envio.fecha_fin) : null;

          if (ahora >= fechaInicio && (!fechaFin || ahora <= fechaFin)) {
            // Verificar si ya pasó el tiempo desde el último envío
            const ultimoEnvio = envio.ultimo_envio ? new Date(envio.ultimo_envio) : null;
            
            if (!ultimoEnvio || debeEnviarRecurrente(envio.recurrencia, ahora, ultimoEnvio)) {
              debeEnviar = true;
            }
          }
        }

        if (debeEnviar) {
          // Obtener plantilla o usar mensaje personalizado
          let mensaje = envio.mensaje_personalizado;
          
          if (envio.plantilla_id) {
            const plantilla = await base44.asServiceRole.entities.PlantillaWhatsApp.get(envio.plantilla_id);
            mensaje = plantilla.contenido;
          }

          // Enviar a cada destinatario
          for (const destinatario of envio.destinatarios) {
            if (!destinatario.telefono) continue;

            try {
              // Llamar a la función de envío directo
              await base44.asServiceRole.functions.invoke('enviarWhatsAppDirecto', {
                telefono: destinatario.telefono,
                mensaje: mensaje,
                camarero_id: destinatario.camarero_id,
                camarero_nombre: destinatario.camarero_nombre
              });
            } catch (err) {
              Logger.error(`Error enviando a ${destinatario.camarero_nombre}: ${err instanceof Error ? err.message : String(err)}`);
              errores++;
            }
          }

          // Actualizar envío programado
          const actualizacion = {
            ultimo_envio: ahora.toISOString(),
            total_enviados: (envio.total_enviados || 0) + envio.destinatarios.length
          };

          // Calcular próximo envío si es recurrente
          if (envio.tipo_envio === 'recurrente') {
            actualizacion.proximo_envio = calcularProximoEnvio(envio.recurrencia, ahora).toISOString();
          } else {
            // Si es único, marcar como completado
            actualizacion.estado = 'completado';
          }

          await base44.asServiceRole.entities.EnvioProgramado.update(envio.id, actualizacion);
          procesados++;
        }
      } catch (error) {
        Logger.error(`Error procesando envío ${envio.nombre}: ${error instanceof Error ? error.message : String(error)}`);
        errores++;
      }
    }

    return Response.json({
      success: true,
      procesados,
      errores,
      mensaje: `Procesados ${procesados} envíos, ${errores} errores`
    });

  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json(
        { success: false, error: { code: 'RBAC_ERROR', message: error.message }, metadata: { timestamp: new Date().toISOString() } },
        { status: error.statusCode }
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Error en procesarEnviosProgramados: ${message}`);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, metadata: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
});

function debeEnviarRecurrente(recurrencia, ahora, ultimoEnvio) {
  const hora = recurrencia.hora || '09:00';
  const [horaEnvio, minutoEnvio] = hora.split(':').map(Number);
  
  const horaActual = ahora.getHours();
  const minutoActual = ahora.getMinutes();

  // Solo enviar si estamos en la hora programada (con margen de 5 minutos)
  const dentroHorario = 
    horaActual === horaEnvio && 
    Math.abs(minutoActual - minutoEnvio) <= 5;

  if (!dentroHorario) return false;

  // Verificar si ya se envió hoy
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const fechaUltimoEnvio = new Date(ultimoEnvio.getFullYear(), ultimoEnvio.getMonth(), ultimoEnvio.getDate());
  
  if (hoy.getTime() === fechaUltimoEnvio.getTime()) {
    return false; // Ya se envió hoy
  }

  if (recurrencia.tipo === 'diario') {
    return true;
  }

  if (recurrencia.tipo === 'semanal') {
    const diaActual = ahora.getDay();
    return (recurrencia.dias_semana || []).includes(diaActual);
  }

  if (recurrencia.tipo === 'mensual') {
    return ahora.getDate() === recurrencia.dia_mes;
  }

  return false;
}

function calcularProximoEnvio(recurrencia, desde) {
  const hora = recurrencia.hora || '09:00';
  const [horaEnvio, minutoEnvio] = hora.split(':').map(Number);

  const proximo = new Date(desde);
  proximo.setHours(horaEnvio, minutoEnvio, 0, 0);

  if (recurrencia.tipo === 'diario') {
    proximo.setDate(proximo.getDate() + 1);
  } else if (recurrencia.tipo === 'semanal') {
    const dias = recurrencia.dias_semana || [];
    if (dias.length === 0) return proximo;

    const diaActual = proximo.getDay();
    const siguientesDias = dias.filter(d => d > diaActual);
    
    if (siguientesDias.length > 0) {
      const diasHasta = siguientesDias[0] - diaActual;
      proximo.setDate(proximo.getDate() + diasHasta);
    } else {
      const diasHasta = 7 - diaActual + dias[0];
      proximo.setDate(proximo.getDate() + diasHasta);
    }
  } else if (recurrencia.tipo === 'mensual') {
    proximo.setMonth(proximo.getMonth() + 1);
    proximo.setDate(recurrencia.dia_mes || 1);
  }

  return proximo;
}