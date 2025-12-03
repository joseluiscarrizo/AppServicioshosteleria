import { base44 } from '@/api/base44Client';

export const enviarNotificacionAsignacion = async (pedido, camarero, asignacion) => {
  try {
    await base44.entities.NotificacionCamarero.create({
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      asignacion_id: asignacion.id,
      pedido_id: pedido.id,
      tipo: 'nueva_asignacion',
      titulo: `Nueva Asignación: ${pedido.cliente}`,
      mensaje: `Has sido asignado a un evento en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
      cliente: pedido.cliente,
      lugar_evento: pedido.lugar_evento,
      fecha: pedido.dia,
      hora_entrada: pedido.entrada,
      hora_salida: pedido.salida,
      leida: false,
      respondida: false,
      respuesta: 'pendiente'
    });

    // Enviar email si el camarero tiene email
    if (camarero.email) {
      await base44.integrations.Core.SendEmail({
        to: camarero.email,
        subject: `Nueva Asignación - ${pedido.cliente}`,
        body: `
          <h2>Nueva Asignación de Trabajo</h2>
          <p>Hola ${camarero.nombre},</p>
          <p>Has sido asignado a un nuevo evento:</p>
          <ul>
            <li><strong>Cliente:</strong> ${pedido.cliente}</li>
            <li><strong>Lugar:</strong> ${pedido.lugar_evento || 'Por confirmar'}</li>
            <li><strong>Fecha:</strong> ${pedido.dia}</li>
            <li><strong>Horario:</strong> ${pedido.entrada || '-'} - ${pedido.salida || '-'}</li>
            ${pedido.camisa ? `<li><strong>Camisa:</strong> ${pedido.camisa}</li>` : ''}
          </ul>
          <p>Por favor, accede a la aplicación para aceptar o rechazar esta asignación.</p>
          <p>Saludos,<br>Staff Coordinator</p>
        `
      });
    }

    return true;
  } catch (error) {
    console.error('Error enviando notificación:', error);
    return false;
  }
};

export const notificarRechazoCoordinador = async (pedido, camarero, motivo) => {
  try {
    await base44.entities.Notificacion.create({
      tipo: 'alerta',
      titulo: 'Asignación Rechazada',
      mensaje: `${camarero.nombre} ha rechazado el pedido de ${pedido.cliente}. Motivo: ${motivo || 'No especificado'}. El slot está disponible para reasignación.`,
      prioridad: 'alta',
      pedido_id: pedido.id
    });
    return true;
  } catch (error) {
    console.error('Error notificando rechazo:', error);
    return false;
  }
};