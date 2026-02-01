import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();
    
    // Solo procesar actualizaciones donde el estado cambia a 'confirmado'
    if (event.type !== 'update' || data.estado !== 'confirmado' || old_data?.estado === 'confirmado') {
      return Response.json({ skipped: true, reason: 'No es cambio a confirmado' });
    }

    const asignacion = data;
    const pedidoId = asignacion.pedido_id;

    if (!pedidoId) {
      return Response.json({ error: 'Asignación sin pedido_id' }, { status: 400 });
    }

    // Obtener el pedido
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedidoId);
    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe un grupo activo para este pedido
    const gruposExistentes = await base44.asServiceRole.entities.GrupoChat.filter({
      pedido_id: pedidoId,
      activo: true
    });

    let grupo;
    if (gruposExistentes.length > 0) {
      grupo = gruposExistentes[0];
      console.log(`✅ Grupo existente encontrado: ${grupo.nombre}`);
    } else {
      // Crear nuevo grupo de chat
      const asignacionesConfirmadas = await base44.asServiceRole.entities.AsignacionCamarero.filter({
        pedido_id: pedidoId,
        estado: 'confirmado'
      });

      if (asignacionesConfirmadas.length === 0) {
        return Response.json({ 
          skipped: true, 
          reason: 'No hay asignaciones confirmadas aún' 
        });
      }

      // Obtener datos de camareros y coordinadores
      const camareros = await base44.asServiceRole.entities.Camarero.list();
      const coordinadores = await base44.asServiceRole.entities.Coordinador.list();
      const usuarios = await base44.asServiceRole.entities.User.list();

      const miembros = [];

      // Añadir camareros confirmados
      for (const asig of asignacionesConfirmadas) {
        const camarero = camareros.find(c => c.id === asig.camarero_id);
        if (camarero) {
          // Buscar usuario del camarero
          const usuarioCamarero = usuarios.find(u => u.camarero_id === camarero.id);
          
          miembros.push({
            user_id: usuarioCamarero?.id || camarero.id,
            nombre: camarero.nombre,
            rol: 'camarero'
          });
        }
      }

      // Añadir coordinador (usar el primero disponible o uno específico del pedido)
      if (coordinadores.length > 0) {
        const coordinador = coordinadores[0]; // Puedes mejorar esto según tu lógica
        const usuarioCoord = usuarios.find(u => u.coordinador_id === coordinador.id);
        
        miembros.push({
          user_id: usuarioCoord?.id || coordinador.id,
          nombre: coordinador.nombre,
          rol: 'coordinador'
        });
      }

      // Calcular fecha de eliminación (24h después del evento)
      let fechaEliminacion = null;
      if (pedido.dia) {
        const fechaEvento = new Date(pedido.dia);
        const horaSalida = pedido.salida || pedido.turnos?.[0]?.salida || '23:59';
        const [horas, minutos] = horaSalida.split(':').map(Number);
        fechaEvento.setHours(horas + 24, minutos, 0, 0);
        fechaEliminacion = fechaEvento.toISOString();
      }

      // Crear grupo
      grupo = await base44.asServiceRole.entities.GrupoChat.create({
        pedido_id: pedidoId,
        nombre: `${pedido.cliente} - ${pedido.dia}`,
        descripcion: `Evento en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
        fecha_evento: pedido.dia,
        hora_fin_evento: pedido.salida || pedido.turnos?.[0]?.salida,
        miembros: miembros,
        activo: true,
        fecha_eliminacion_programada: fechaEliminacion
      });

      console.log(`📱 Grupo de chat creado: ${grupo.nombre}`);

      // Crear mensaje inicial del sistema
      await base44.asServiceRole.entities.MensajeChat.create({
        grupo_id: grupo.id,
        user_id: 'sistema',
        nombre_usuario: 'Sistema',
        rol_usuario: 'admin',
        mensaje: `👋 Bienvenidos al grupo del evento "${pedido.cliente}"\n📅 Fecha: ${pedido.dia}\n📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}\n⏰ Horario: ${pedido.entrada || '-'} - ${pedido.salida || '-'}`,
        tipo: 'sistema'
      });
    }

    // Notificar a los camareros del grupo sobre la confirmación
    const camarero = await base44.asServiceRole.entities.Camarero.get(asignacion.camarero_id);
    
    if (camarero) {
      // Enviar mensaje al grupo notificando la confirmación
      await base44.asServiceRole.entities.MensajeChat.create({
        grupo_id: grupo.id,
        user_id: 'sistema',
        nombre_usuario: 'Sistema',
        rol_usuario: 'admin',
        mensaje: `✅ ${camarero.nombre} ha confirmado su asistencia al servicio`,
        tipo: 'sistema'
      });

      // Enviar WhatsApp al camarero con link al grupo
      const mensajeWhatsApp = `✅ *Confirmación Recibida*\n\n` +
        `Hola ${camarero.nombre}, tu asistencia al evento "${pedido.cliente}" ha sido confirmada.\n\n` +
        `📱 *Se ha creado un grupo de chat* para coordinar el servicio.\n` +
        `Accede desde la app en la sección "Chat" para comunicarte con el equipo.\n\n` +
        `📅 Fecha: ${pedido.dia}\n` +
        `📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}\n` +
        `⏰ Entrada: ${asignacion.hora_entrada || pedido.entrada || '-'}`;

      if (camarero.telefono) {
        try {
          await base44.asServiceRole.functions.invoke('enviarWhatsAppDirecto', {
            telefono: camarero.telefono,
            mensaje: mensajeWhatsApp,
            camarero_id: camarero.id,
            camarero_nombre: camarero.nombre,
            pedido_id: pedidoId,
            asignacion_id: asignacion.id,
            plantilla_usada: 'Notificación Grupo Chat'
          });
          
          console.log(`📲 WhatsApp enviado a ${camarero.nombre}`);
        } catch (e) {
          console.error('Error enviando WhatsApp:', e);
        }
      }

      // Crear notificación push
      await base44.asServiceRole.entities.NotificacionCamarero.create({
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        asignacion_id: asignacion.id,
        pedido_id: pedidoId,
        tipo: 'nueva_asignacion',
        titulo: `Grupo de Chat Creado`,
        mensaje: `Se ha creado un grupo de chat para el evento "${pedido.cliente}". Accede desde la sección Chat.`,
        cliente: pedido.cliente,
        lugar_evento: pedido.lugar_evento,
        fecha: pedido.dia,
        hora_entrada: asignacion.hora_entrada,
        leida: false,
        prioridad: 'importante'
      });
    }

    return Response.json({
      success: true,
      grupo_id: grupo.id,
      grupo_nombre: grupo.nombre,
      nuevo_grupo: gruposExistentes.length === 0,
      miembros_count: grupo.miembros?.length || 0
    });

  } catch (error) {
    console.error('Error en autoCrearGrupoChatConfirmado:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});