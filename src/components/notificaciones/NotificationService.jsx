import { base44 } from '@/api/base44Client';
import Logger from '../../../utils/logger';
import { validateEmail, validatePhoneNumber } from '../../../utils/validators';
import ErrorNotificationService, { errorMessages } from '../../../utils/errorNotificationService';
import {
  ValidationError,
  DatabaseError,
  handleWebhookError
} from '../../../utils/webhookImprovements';
import { retryWithExponentialBackoff } from '../../../utils/retryHandler';

// Queue for failed notifications pending retry
const _notificationQueue = [];

// System notification service for database/server errors (uses env var or falls back to empty for dev)
const _systemNotifier = new ErrorNotificationService(import.meta.env.VITE_SYSTEM_NOTIFY_PHONE || '');

/**
 * Servicio centralizado para enviar notificaciones push a camareros
 */
export class NotificationService {
  
  /**
   * Verifica si un usuario tiene habilitadas las notificaciones push
   */
  static async verificarPreferencias(userId, tipoNotificacion) {
    try {
      if (!userId) {
        throw new ValidationError('El userId del destinatario no puede estar vacío');
      }
      Logger.info(`Verificando preferencias de notificación para usuario: ${userId}, tipo: ${tipoNotificacion}`);
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
      if (error instanceof ValidationError) {
        Logger.warn(`Validación fallida al verificar preferencias: ${error.message}`);
        handleWebhookError(error);
        return false;
      }
      Logger.error(`Error verificando preferencias para usuario ${userId}: ${error.message}`);
      return true;
    }
  }

  /**
   * Envía una notificación push usando la API de notificaciones del navegador
   */
  static async enviarPush(titulo, mensaje, icono = '/icon.png', data = {}) {
    try {
      if (!titulo || titulo.trim() === '') {
        throw new ValidationError('El título de la notificación no puede estar vacío');
      }
      if (!mensaje || mensaje.trim() === '') {
        throw new ValidationError('El mensaje de la notificación no puede estar vacío');
      }

      if (!('Notification' in window)) {
        Logger.warn('Notificaciones push no soportadas en este navegador');
        return false;
      }

      if (Notification.permission === 'granted') {
        Logger.info(`Enviando notificación push: "${titulo}"`);
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

          Logger.info(`Notificación push enviada con éxito: "${titulo}" [tag: ${data.tag || 'default'}]`);
          return true;
        } catch (pushError) {
          Logger.error(`Error creando notificación del navegador "${titulo}": ${pushError.message}`);
          _notificationQueue.push({ titulo, mensaje, icono, data });
          Logger.info(`Notificación añadida a la cola para reintento: "${titulo}"`);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      if (error instanceof ValidationError) {
        Logger.warn(`Validación fallida al enviar push: ${error.message}`);
        handleWebhookError(error);
        return false;
      }
      Logger.error(`Error inesperado al enviar notificación push "${titulo}": ${error.message}`);
      return false;
    }
  }

  /**
   * Notifica a un camarero sobre una nueva asignación
   */
  static async notificarNuevaAsignacion(camarero, pedido, asignacion) {
    try {
      if (!camarero || !camarero.user_id) {
        throw new ValidationError('El camarero debe tener un user_id asociado para recibir notificaciones');
      }
      if (!pedido || !pedido.cliente) {
        throw new ValidationError('El pedido debe contener información del cliente');
      }

      Logger.info(`Notificando nueva asignación al camarero: ${camarero.user_id}, pedido: ${pedido.id}`);

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'nueva_asignacion');
      if (!habilitado) {
        Logger.info(`Notificaciones de nueva asignación deshabilitadas para usuario: ${camarero.user_id}`);
        return false;
      }

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

      Logger.info(`Nueva asignación notificada con éxito al camarero: ${camarero.user_id}`);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        Logger.warn(`Validación fallida al notificar nueva asignación: ${error.message}`);
        handleWebhookError(error);
        return false;
      }
      Logger.error(`Error notificando nueva asignación al camarero ${camarero?.user_id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Notifica sobre un cambio de horario
   */
  static async notificarCambioHorario(camarero, pedido, cambios) {
    try {
      if (!camarero || !camarero.user_id) {
        throw new ValidationError('El camarero debe tener un user_id asociado para recibir notificaciones');
      }
      if (!cambios || cambios.trim() === '') {
        throw new ValidationError('Los detalles del cambio de horario no pueden estar vacíos');
      }

      Logger.info(`Notificando cambio de horario al camarero: ${camarero.user_id}, pedido: ${pedido?.id}`);

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'cambio_horario');
      if (!habilitado) {
        Logger.info(`Notificaciones de cambio de horario deshabilitadas para usuario: ${camarero.user_id}`);
        return false;
      }

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

      Logger.info(`Cambio de horario notificado con éxito al camarero: ${camarero.user_id}`);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        Logger.warn(`Validación fallida al notificar cambio de horario: ${error.message}`);
        handleWebhookError(error);
        return false;
      }
      Logger.error(`Error notificando cambio de horario al camarero ${camarero?.user_id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Notifica sobre una cancelación
   */
  static async notificarCancelacion(camarero, pedido, motivo = '') {
    try {
      if (!camarero || !camarero.user_id) {
        throw new ValidationError('El camarero debe tener un user_id asociado para recibir notificaciones');
      }

      Logger.info(`Notificando cancelación al camarero: ${camarero.user_id}, pedido: ${pedido?.id}`);

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'cancelacion');
      if (!habilitado) {
        Logger.info(`Notificaciones de cancelación deshabilitadas para usuario: ${camarero.user_id}`);
        return false;
      }

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

      Logger.info(`Cancelación notificada con éxito al camarero: ${camarero.user_id}`);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        Logger.warn(`Validación fallida al notificar cancelación: ${error.message}`);
        handleWebhookError(error);
        return false;
      }
      Logger.error(`Error notificando cancelación al camarero ${camarero?.user_id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Notifica un recordatorio
   */
  static async notificarRecordatorio(camarero, pedido, horasAntes) {
    try {
      if (!camarero || !camarero.user_id) {
        throw new ValidationError('El camarero debe tener un user_id asociado para recibir notificaciones');
      }
      if (typeof horasAntes !== 'number' || isNaN(horasAntes)) {
        throw new ValidationError('Las horas antes del recordatorio deben ser un número válido');
      }

      Logger.info(`Notificando recordatorio al camarero: ${camarero.user_id}, horas antes: ${horasAntes}`);

      const habilitado = await this.verificarPreferencias(camarero.user_id, 'recordatorio');
      if (!habilitado) {
        Logger.info(`Notificaciones de recordatorio deshabilitadas para usuario: ${camarero.user_id}`);
        return false;
      }

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

      Logger.info(`Recordatorio notificado con éxito al camarero: ${camarero.user_id}`);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        Logger.warn(`Validación fallida al notificar recordatorio: ${error.message}`);
        handleWebhookError(error);
        return false;
      }
      Logger.error(`Error notificando recordatorio al camarero ${camarero?.user_id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Marca una notificación como leída
   */
  static async marcarComoLeida(notificacionId) {
    try {
      if (!notificacionId) {
        throw new ValidationError('El ID de la notificación no puede estar vacío');
      }
      Logger.info(`Marcando notificación como leída: ${notificacionId}`);
      await base44.entities.Notificacion.update(notificacionId, { leida: true });
      Logger.info(`Notificación marcada como leída: ${notificacionId}`);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        Logger.warn(`Validación fallida al marcar como leída: ${error.message}`);
        handleWebhookError(error);
        return false;
      }
      Logger.error(`Error marcando notificación ${notificacionId} como leída: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica eventos próximos y crea notificaciones si es necesario
   */
  static async verificarEventosProximos() {
    try {
      Logger.info('Verificando eventos próximos para crear notificaciones');
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      let pedidos;
      try {
        pedidos = await base44.entities.Pedido.list('-dia', 100);
      } catch (dbError) {
        throw new DatabaseError(`Error obteniendo pedidos de la base de datos: ${dbError.message}`);
      }

      const eventosProximos = pedidos.filter(p => {
        if (!p.dia) return false;
        const fechaEvento = new Date(p.dia);
        return fechaEvento >= hoy && fechaEvento <= manana;
      });

      Logger.info(`Eventos próximos encontrados: ${eventosProximos.length}`);

      // Crear notificaciones para coordinadores sobre eventos próximos
      for (const pedido of eventosProximos) {
        try {
          const notifExistente = await base44.entities.Notificacion.filter({
            pedido_id: pedido.id,
            tipo: 'evento_proximo'
          });

          if (notifExistente.length === 0) {
            await base44.entities.Notificacion.create({
              tipo: 'evento_proximo',
              titulo: `Evento Próximo: ${pedido.cliente}`,
              mensaje: `El evento está programado para ${pedido.dia} a las ${pedido.entrada || 'hora por confirmar'}`,
              pedido_id: pedido.id,
              prioridad: 'media'
            });
            Logger.info(`Notificación de evento próximo creada para pedido: ${pedido.id}`);
          }
        } catch (dbError) {
          Logger.error(`Error creando notificación para pedido ${pedido.id}: ${dbError.message}`);
        }
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) {
        Logger.error(`Error de base de datos en verificarEventosProximos: ${error.message}`);
        handleWebhookError(error);
        _systemNotifier.notifyUser(errorMessages.SERVER_ERROR);
        return false;
      }
      Logger.error(`Error verificando eventos próximos: ${error.message}`);
      return false;
    }
  }

  /**
   * Procesa la cola de notificaciones fallidas y reintenta enviarlas
   */
  static async procesarColaPendiente() {
    if (_notificationQueue.length === 0) return;
    Logger.info(`Procesando cola de notificaciones pendientes: ${_notificationQueue.length} elemento(s)`);

    const pendientes = _notificationQueue.splice(0);

    for (const notif of pendientes) {
      try {
        await retryWithExponentialBackoff(
          () => this.enviarPush(notif.titulo, notif.mensaje, notif.icono, notif.data),
          3,
          500
        );
        Logger.info(`Notificación reintentada con éxito: "${notif.titulo}"`);
      } catch (error) {
        Logger.error(`Error al reintentar notificación "${notif.titulo}": ${error.message}`);
      }
    }
  }

  /**
   * Valida un email antes de usarlo como destinatario de notificación
   */
  static validarEmail(email) {
    if (!validateEmail(email)) {
      throw new ValidationError(`El email del destinatario no es válido: ${email}`);
    }
    return true;
  }

  /**
   * Valida un número de teléfono antes de usarlo como destinatario de notificación
   */
  static validarTelefono(telefono) {
    if (!validatePhoneNumber(telefono)) {
      throw new ValidationError(`El número de teléfono del destinatario no es válido: ${telefono}`);
    }
    return true;
  }

  /**
   * Devuelve el número de notificaciones pendientes en la cola
   */
  static obtenerNotificacionesPendientes() {
    return _notificationQueue.length;
  }
}

export default NotificationService;