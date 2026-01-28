import { base44 } from '@/api/base44Client';

/**
 * Servicio centralizado para enviar notificaciones push a camareros
 */
export class NotificationService {
  
  /**
   * Verifica si un usuario tiene habilitadas las notificaciones push
   */
  static async verificarPreferencias(userId, tipoNotificacion) {
    try {
      const prefs = await base44.entities.PreferenciasNotificacion.filter({ user_id: userId });
      if (!prefs[0]) return true; // Por defecto, todas habilitadas
      
      const pref = prefs[0];
      if (!pref.push_habilitadas) return false;
      
      // Verificar tipo específico
      const mapaTipos = {
        'nueva_asignacion': 'nuevas_asignaciones',
        'cambio_horario': 'cambios_horario',
        'cancelacion': 'cancelaciones',
        'recordatorio': 'recordatorios',
        'mensaje_coordinador': 'mensajes_coordinador',
        'tarea_pendiente': 'tareas_pendientes'
      };
      
      const campo = mapaTipos[tipoNotificacion];
      return campo ? (pref[campo] ?? true) : true;
    } catch (error) {
      console.error('Error verificando preferencias:', error);
      return true;
    }
  }

  /**
   * Envía una notificación push usando la API de notificaciones del navegador
   */
  static async enviarPush(titulo, mensaje, icono = '/icon.png', data = {}) {
    if (!('Notification' in window)) {
      console.warn('Notificaciones push no soportadas');
      return false;
    }

    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(titulo, {
          body: mensaje,
          icon: icono,
          badge: icono,
          tag: data.tag || 'default',
          data: data,
          requireInteraction: data.importante || false,
          vibrate: data.vibrar ? [200, 100, 200] : undefined
        });

        notification.onclick = () => {
          window.focus();
          if (data.url) {
            window.location.hash = data.url;
          }
          notification.close();
        };

        // Reproducir sonido si está habilitado
        const config = JSON.parse(localStorage.getItem('notif_config') || '{}');
        if (config.sonido_habilitado !== false) {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWN2e/IdCQEKXbF8NaLOwsVXLDq7a1OFQpJnuLswm4fBDGK2PCxcCo=');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        }

        return true;
      } catch (error) {
        console.error('Error enviando notificación:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Notifica a un camarero sobre una nueva asignación
   */
  static async notificarNuevaAsignacion(camarero, pedido, asignacion) {
    try {
      // Verificar si el camarero tiene un user_id asociado
      if (!camarero.user_id) return false;

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'nueva_asignacion');
      if (!habilitado) return false;

      await this.enviarPush(
        `📋 Nueva Asignación: ${pedido.cliente}`,
        `${pedido.dia} • ${asignacion.hora_entrada} - ${asignacion.hora_salida}\n${pedido.lugar_evento || 'Ubicación por confirmar'}`,
        '/icon.png',
        {
          tag: `asignacion-${asignacion.id}`,
          url: `/ConfirmarServicio?asignacion=${asignacion.id}`,
          importante: true,
          vibrar: true
        }
      );

      return true;
    } catch (error) {
      console.error('Error notificando nueva asignación:', error);
      return false;
    }
  }

  /**
   * Notifica sobre un cambio de horario
   */
  static async notificarCambioHorario(camarero, pedido, cambios) {
    try {
      if (!camarero.user_id) return false;

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'cambio_horario');
      if (!habilitado) return false;

      await this.enviarPush(
        `⚠️ Cambio de Horario: ${pedido.cliente}`,
        `Se ha modificado el horario del evento.\n${cambios}`,
        '/icon.png',
        {
          tag: `cambio-${pedido.id}`,
          url: `/PerfilCamarero`,
          importante: true,
          vibrar: true
        }
      );

      return true;
    } catch (error) {
      console.error('Error notificando cambio:', error);
      return false;
    }
  }

  /**
   * Notifica sobre una cancelación
   */
  static async notificarCancelacion(camarero, pedido, motivo = '') {
    try {
      if (!camarero.user_id) return false;

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'cancelacion');
      if (!habilitado) return false;

      await this.enviarPush(
        `❌ Evento Cancelado: ${pedido.cliente}`,
        `El evento del ${pedido.dia} ha sido cancelado.\n${motivo}`,
        '/icon.png',
        {
          tag: `cancelacion-${pedido.id}`,
          url: `/PerfilCamarero`,
          importante: true,
          vibrar: true
        }
      );

      return true;
    } catch (error) {
      console.error('Error notificando cancelación:', error);
      return false;
    }
  }

  /**
   * Notifica un recordatorio
   */
  static async notificarRecordatorio(camarero, pedido, horasAntes) {
    try {
      if (!camarero.user_id) return false;

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'recordatorio');
      if (!habilitado) return false;

      await this.enviarPush(
        `⏰ Recordatorio: ${pedido.cliente}`,
        `Tu servicio es en ${horasAntes} horas\n${pedido.dia} • ${pedido.entrada}\n${pedido.lugar_evento}`,
        '/icon.png',
        {
          tag: `recordatorio-${pedido.id}`,
          url: `/PerfilCamarero`,
          importante: false,
          vibrar: true
        }
      );

      return true;
    } catch (error) {
      console.error('Error notificando recordatorio:', error);
      return false;
    }
  }
}

export default NotificationService;