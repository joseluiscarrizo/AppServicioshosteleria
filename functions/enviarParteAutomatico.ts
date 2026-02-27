import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from '../utils/logger.ts';
import { format, parseISO } from 'npm:date-fns@3.6.0';
import { es } from 'npm:date-fns@3.6.0/locale';
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    validateUserAccess(user, ['admin', 'coordinador']);

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id requerido' }, { status: 400 });
    }

    // Obtener pedido
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({ id: pedido_id });
    const pedido = pedidos[0];

    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Obtener todas las asignaciones del pedido
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({ 
      pedido_id: pedido_id 
    });

    // Calcular cantidad necesaria
    const cantidadNecesaria = pedido.turnos?.length > 0 
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0);

    // Verificar que todos los camareros necesarios estén confirmados
    if (asignaciones.length < cantidadNecesaria) {
      return Response.json({ 
        error: 'No se puede enviar el parte. Faltan camareros por asignar.',
        asignados: asignaciones.length,
        necesarios: cantidadNecesaria
      }, { status: 400 });
    }

    const todosConfirmados = asignaciones.every(a => a.estado === 'confirmado');
    if (!todosConfirmados) {
      return Response.json({ 
        error: 'No se puede enviar el parte. No todos los camareros están confirmados.',
        confirmados: asignaciones.filter(a => a.estado === 'confirmado').length,
        total: asignaciones.length
      }, { status: 400 });
    }

    // Obtener información de camareros
    const camareroIds = asignaciones.map(a => a.camarero_id);
    const camareros = await base44.asServiceRole.entities.Camarero.list();
    const camarerosAsignados = camareros.filter(c => camareroIds.includes(c.id));

    // Construir parte de servicio
    const fechaFormateada = pedido.dia 
      ? format(parseISO(pedido.dia), "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })
      : 'Fecha por confirmar';

    let parteMensaje = `PARTE DE SERVICIO - ${pedido.codigo_pedido || 'S/N'}

📋 DATOS DEL EVENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliente: ${pedido.cliente}
Fecha: ${fechaFormateada}
Lugar: ${pedido.lugar_evento || 'Por confirmar'}
${pedido.direccion_completa ? `Dirección: ${pedido.direccion_completa}` : ''}
${pedido.link_ubicacion ? `Ubicación: ${pedido.link_ubicacion}` : ''}

👥 CAMAREROS ASIGNADOS (${asignaciones.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (pedido.turnos && pedido.turnos.length > 0) {
      // Agrupar por turnos
      pedido.turnos.forEach((turno, idx) => {
        const asignacionesTurno = asignaciones.filter(a => a.turno_index === idx);
        parteMensaje += `\n🕐 TURNO ${idx + 1}: ${turno.entrada} - ${turno.salida} (${turno.t_horas?.toFixed(1) || 0}h)\n`;
        
        asignacionesTurno.forEach((asig, i) => {
          const camarero = camarerosAsignados.find(c => c.id === asig.camarero_id);
          parteMensaje += `   ${i + 1}. ${asig.camarero_nombre}${camarero?.codigo ? ` (#${camarero.codigo})` : ''}\n`;
          if (camarero?.telefono) {
            parteMensaje += `      📞 ${camarero.telefono}\n`;
          }
        });
      });
    } else {
      // Sin turnos diferenciados
      parteMensaje += `\n🕐 Horario: ${pedido.entrada || '-'} - ${pedido.salida || '-'} (${pedido.t_horas?.toFixed(1) || 0}h)\n\n`;
      asignaciones.forEach((asig, i) => {
        const camarero = camarerosAsignados.find(c => c.id === asig.camarero_id);
        parteMensaje += `${i + 1}. ${asig.camarero_nombre}${camarero?.codigo ? ` (#${camarero.codigo})` : ''}\n`;
        if (camarero?.telefono) {
          parteMensaje += `   📞 ${camarero.telefono}\n`;
        }
      });
    }

    parteMensaje += `\n📋 DETALLES ADICIONALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uniforme - Camisa: ${pedido.camisa || 'Blanca'}
Transporte: ${pedido.extra_transporte ? 'SÍ - Incluido' : 'NO - Cada camarero por su cuenta'}
${pedido.notas ? `\nNotas: ${pedido.notas}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Este parte ha sido generado automáticamente.
Todos los camareros han confirmado su asistencia.

Saludos,
Sistema de Gestión de Camareros`;

    // Lista de destinatarios
    const emailsCliente = [];
    if (pedido.cliente_email_1) emailsCliente.push(pedido.cliente_email_1);
    if (pedido.cliente_email_2) emailsCliente.push(pedido.cliente_email_2);

    if (emailsCliente.length === 0) {
      return Response.json({ 
        error: 'El cliente no tiene emails registrados' 
      }, { status: 400 });
    }

    // Obtener coordinador para copia
    let emailCoordinador = null;
    if (camarerosAsignados.length > 0 && camarerosAsignados[0].coordinador_id) {
      const coords = await base44.asServiceRole.entities.Coordinador.filter({ 
        id: camarerosAsignados[0].coordinador_id 
      });
      if (coords[0]?.email) {
        emailCoordinador = coords[0].email;
      }
    }

    // Enviar email al cliente
    for (const emailCliente of emailsCliente) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: emailCliente,
          subject: `Parte de Servicio - ${pedido.cliente} - ${fechaFormateada}`,
          body: parteMensaje
        });
      } catch (e) {
        Logger.error(`Error enviando email a ${emailCliente}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Enviar copia al coordinador
    if (emailCoordinador) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: emailCoordinador,
          subject: `[COPIA] Parte de Servicio - ${pedido.cliente} - ${fechaFormateada}`,
          body: `COPIA DEL PARTE ENVIADO AL CLIENTE\n\n${parteMensaje}`
        });
      } catch (e) {
        Logger.error(`Error enviando copia a coordinador: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Registrar en historial o notificaciones
    await base44.asServiceRole.entities.Notificacion.create({
      tipo: 'estado_cambio',
      titulo: '📧 Parte de Servicio Enviado',
      mensaje: `Se ha enviado automáticamente el parte de servicio para ${pedido.cliente} a ${emailsCliente.join(', ')}${emailCoordinador ? ` con copia a ${emailCoordinador}` : ''}`,
      prioridad: 'media',
      pedido_id: pedido.id,
      coordinador: user.full_name,
      email_enviado: true
    });

    return Response.json({ 
      success: true,
      mensaje: 'Parte de servicio enviado',
      destinatarios: emailsCliente,
      copia_coordinador: emailCoordinador,
      camareros_confirmados: asignaciones.length
    });

  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json(
        { success: false, error: { code: 'RBAC_ERROR', message: error.message }, metadata: { timestamp: new Date().toISOString() } },
        { status: error.statusCode }
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Error en enviarParteAutomatico: ${message}`);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, metadata: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
});