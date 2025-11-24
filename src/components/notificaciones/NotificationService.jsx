import { base44 } from '@/api/base44Client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const NotificationService = {
  // Crear notificación por cambio de estado
  async notificarCambioEstado(pedido, campo, valorAnterior, valorNuevo) {
    const titulo = campo === 'enviado' 
      ? `Pedido ${valorNuevo ? 'Enviado' : 'Marcado como No Enviado'}`
      : `Pedido ${valorNuevo ? 'Confirmado' : 'Pendiente de Confirmación'}`;
    
    const mensaje = `El pedido para ${pedido.cliente} del ${format(new Date(pedido.dia), 'dd/MM/yyyy', { locale: es })} ha cambiado su estado de ${campo} de "${valorAnterior ? 'Sí' : 'No'}" a "${valorNuevo ? 'Sí' : 'No'}". Camarero: ${pedido.camarero}.`;

    const prioridad = campo === 'confirmado' && !valorNuevo ? 'alta' : 'media';

    // Crear notificación in-app
    const notificacion = await base44.entities.Notificacion.create({
      tipo: 'estado_cambio',
      titulo,
      mensaje,
      pedido_id: pedido.id,
      coordinador: pedido.coordinador,
      leida: false,
      email_enviado: false,
      prioridad
    });

    // Enviar email si el coordinador tiene email configurado
    await this.enviarEmailNotificacion(pedido.coordinador, titulo, mensaje);

    return notificacion;
  },

  // Verificar eventos próximos sin confirmar
  async verificarEventosProximos() {
    const pedidos = await base44.entities.Pedido.list();
    const hoy = new Date();
    const notificacionesCreadas = [];

    for (const pedido of pedidos) {
      if (!pedido.dia || pedido.confirmado) continue;

      const fechaEvento = parseISO(pedido.dia);
      const diasRestantes = differenceInDays(fechaEvento, hoy);

      // Notificar si el evento es en 3 días o menos y no está confirmado
      if (diasRestantes >= 0 && diasRestantes <= 3) {
        // Verificar si ya existe una notificación reciente para este pedido
        const notificacionesExistentes = await base44.entities.Notificacion.filter({
          pedido_id: pedido.id,
          tipo: 'evento_proximo'
        });

        const yaNotificadoHoy = notificacionesExistentes.some(n => {
          const fechaNotif = new Date(n.created_date);
          return differenceInDays(hoy, fechaNotif) < 1;
        });

        if (!yaNotificadoHoy) {
          const prioridad = diasRestantes === 0 ? 'urgente' : diasRestantes === 1 ? 'alta' : 'media';
          const titulo = diasRestantes === 0 
            ? '⚠️ ¡Evento HOY sin confirmar!' 
            : `⏰ Evento en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''} sin confirmar`;

          const mensaje = `El evento para ${pedido.cliente} en ${pedido.lugar_evento || 'ubicación no especificada'} del ${format(fechaEvento, 'dd/MM/yyyy', { locale: es })} aún no está confirmado. Camarero asignado: ${pedido.camarero}.`;

          const notificacion = await base44.entities.Notificacion.create({
            tipo: 'evento_proximo',
            titulo,
            mensaje,
            pedido_id: pedido.id,
            coordinador: pedido.coordinador,
            leida: false,
            email_enviado: false,
            prioridad
          });

          await this.enviarEmailNotificacion(pedido.coordinador, titulo, mensaje);
          notificacionesCreadas.push(notificacion);
        }
      }
    }

    return notificacionesCreadas;
  },

  // Enviar email de notificación
  async enviarEmailNotificacion(coordinadorNombre, titulo, mensaje) {
    try {
      // Buscar email del coordinador
      const coordinadores = await base44.entities.Coordinador.filter({
        nombre: coordinadorNombre
      });

      if (coordinadores.length > 0 && coordinadores[0].email && coordinadores[0].notificaciones_email) {
        await base44.integrations.Core.SendEmail({
          to: coordinadores[0].email,
          subject: `[Staff Coordinator] ${titulo}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Staff Coordinator</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1e3a5f; margin-top: 0;">${titulo}</h2>
                <p style="color: #475569; line-height: 1.6;">${mensaje}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px;">Este es un mensaje automático del sistema de gestión de camareros.</p>
              </div>
            </div>
          `
        });
        return true;
      }
    } catch (error) {
      console.error('Error enviando email:', error);
    }
    return false;
  },

  // Marcar notificación como leída
  async marcarComoLeida(notificacionId) {
    return await base44.entities.Notificacion.update(notificacionId, { leida: true });
  },

  // Marcar todas como leídas
  async marcarTodasComoLeidas(coordinador) {
    const notificaciones = await base44.entities.Notificacion.filter({
      coordinador,
      leida: false
    });

    for (const notif of notificaciones) {
      await base44.entities.Notificacion.update(notif.id, { leida: true });
    }
  }
};

export default NotificationService;