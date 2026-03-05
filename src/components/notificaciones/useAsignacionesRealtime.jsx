/**
 * useAsignacionesRealtime.js
 * Hook que escucha cambios en tiempo real sobre AsignacionCamarero y Pedido.
 * Invalida las queries correspondientes, muestra toasts y crea notificaciones
 * persistentes en BD para los coordinadores según el tipo de evento:
 *
 *  - Nueva asignación creada
 *  - Cambio de estado (pendiente → enviado → confirmado → alta)
 *  - Asignación eliminada / camarero desasignado
 *  - Nuevo pedido que requiere asignación
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ESTADO_LABELS = {
  pendiente:  { emoji: '⏳', texto: 'Pendiente',   color: 'info',    prioridad: 'baja' },
  enviado:    { emoji: '📤', texto: 'Enviado',      color: 'info',    prioridad: 'media' },
  confirmado: { emoji: '✅', texto: 'Confirmado',   color: 'success', prioridad: 'media' },
  alta:       { emoji: '🎉', texto: 'Alta',          color: 'success', prioridad: 'baja' }
};

/**
 * Crea una notificación in-app para el coordinador y opcionalmente
 * invalida queries adicionales.
 */
async function crearNotificacionCoordinador({ tipo, titulo, mensaje, prioridad, pedido_id }) {
  try {
    await base44.entities.Notificacion.create({
      tipo,
      titulo,
      mensaje,
      prioridad,
      pedido_id,
      leida: false
    });
  } catch {
    // No bloquear si falla la notificación
  }
}

export function useAsignacionesRealtime() {
  const queryClient = useQueryClient();

  // Guardamos snapshot local de asignaciones para detectar transiciones
  // id → { camarero_nombre, estado, pedido_id, hora_entrada, hora_salida, fecha_pedido }
  const asignacionesRef = useRef(new Map());

  useEffect(() => {
    // Inicializar desde caché
    const cached = queryClient.getQueryData(['asignaciones']) || [];
    cached.forEach(a => {
      asignacionesRef.current.set(a.id, {
        camarero_nombre: a.camarero_nombre,
        estado: a.estado,
        pedido_id: a.pedido_id,
        hora_entrada: a.hora_entrada,
        hora_salida: a.hora_salida,
        fecha_pedido: a.fecha_pedido
      });
    });

    // ── Suscripción a AsignacionCamarero ──────────────────────────────────
    const unsubAsignacion = base44.entities.AsignacionCamarero.subscribe(async (event) => {
      const { type, id, data } = event;

      if (type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });

        if (data?.camarero_nombre) {
          toast.info('📋 Nueva asignación', {
            description: `${data.camarero_nombre} ha sido asignado a un evento.`,
            duration: 5000
          });

          // Notificación coordinador
          await crearNotificacionCoordinador({
            tipo: 'estado_cambio',
            titulo: `📋 Nueva asignación: ${data.camarero_nombre}`,
            mensaje: `${data.camarero_nombre} ha sido asignado al evento del ${data.fecha_pedido || 'fecha pendiente'} (${data.hora_entrada || '?'} - ${data.hora_salida || '?'}).`,
            prioridad: 'media',
            pedido_id: data.pedido_id
          });
        }

        if (id && data) {
          asignacionesRef.current.set(id, {
            camarero_nombre: data.camarero_nombre,
            estado: data.estado,
            pedido_id: data.pedido_id,
            hora_entrada: data.hora_entrada,
            hora_salida: data.hora_salida,
            fecha_pedido: data.fecha_pedido
          });
        }
      }

      if (type === 'update') {
        const prev = asignacionesRef.current.get(id);
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });

        if (data && prev) {
          // 1. Reasignación a otro pedido
          if (prev.pedido_id && data.pedido_id && prev.pedido_id !== data.pedido_id) {
            toast.warning('🔄 Reasignación detectada', {
              description: `${data.camarero_nombre || 'Un camarero'} ha sido reasignado a otro evento.`,
              duration: 6000
            });
            await crearNotificacionCoordinador({
              tipo: 'alerta',
              titulo: `🔄 Reasignación: ${data.camarero_nombre || 'Camarero'}`,
              mensaje: `${data.camarero_nombre || 'Un camarero'} ha sido reasignado a un evento diferente.`,
              prioridad: 'media',
              pedido_id: data.pedido_id
            });
          }

          // 2. Cambio de estado
          else if (prev.estado && data.estado && prev.estado !== data.estado) {
            const cfg = ESTADO_LABELS[data.estado] || { emoji: '🔔', texto: data.estado, prioridad: 'media' };
            const nombre = data.camarero_nombre || 'Camarero';
            const toastFn = ['confirmado', 'alta'].includes(data.estado) ? toast.success : toast.info;

            toastFn(`${cfg.emoji} ${nombre} → ${cfg.texto}`, {
              description: prev.estado
                ? `Estado cambiado de "${prev.estado}" a "${data.estado}".`
                : `Nuevo estado: "${data.estado}".`,
              duration: 5000
            });

            await crearNotificacionCoordinador({
              tipo: 'estado_cambio',
              titulo: `${cfg.emoji} Cambio de estado: ${nombre}`,
              mensaje: `${nombre} cambió de estado "${prev.estado}" → "${data.estado}" en el evento del ${data.fecha_pedido || prev.fecha_pedido || 'fecha pendiente'}.`,
              prioridad: cfg.prioridad,
              pedido_id: data.pedido_id || prev.pedido_id
            });
          }

          // Actualizar snapshot
          asignacionesRef.current.set(id, {
            camarero_nombre: data.camarero_nombre ?? prev.camarero_nombre,
            estado: data.estado ?? prev.estado,
            pedido_id: data.pedido_id ?? prev.pedido_id,
            hora_entrada: data.hora_entrada ?? prev.hora_entrada,
            hora_salida: data.hora_salida ?? prev.hora_salida,
            fecha_pedido: data.fecha_pedido ?? prev.fecha_pedido
          });
        }
      }

      if (type === 'delete') {
        const prev = asignacionesRef.current.get(id);
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });

        if (prev?.camarero_nombre) {
          toast.warning('🗑️ Asignación eliminada', {
            description: `${prev.camarero_nombre} fue desasignado del evento.`,
            duration: 5000
          });

          await crearNotificacionCoordinador({
            tipo: 'alerta',
            titulo: `🗑️ Asignación eliminada: ${prev.camarero_nombre}`,
            mensaje: `${prev.camarero_nombre} fue desasignado del evento del ${prev.fecha_pedido || 'fecha pendiente'}. Es posible que el slot quede sin cubrir.`,
            prioridad: 'alta',
            pedido_id: prev.pedido_id
          });
        }

        asignacionesRef.current.delete(id);
      }
    });

    // ── Suscripción a Pedido ──────────────────────────────────────────────
    const pedidosKnownRef = new Set(
      (queryClient.getQueryData(['pedidos']) || []).map(p => p.id)
    );

    const unsubPedido = base44.entities.Pedido.subscribe(async (event) => {
      const { type, id, data } = event;

      if (type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        if (!pedidosKnownRef.has(id)) {
          pedidosKnownRef.add(id);
          const clienteLabel = data?.cliente ? `"${data.cliente}"` : 'un nuevo evento';
          toast.info('📅 Nuevo evento creado', {
            description: `Se ha añadido ${clienteLabel} y requiere asignación.`,
            duration: 7000
          });
          await crearNotificacionCoordinador({
            tipo: 'estado_cambio',
            titulo: '📅 Nuevo evento requiere asignación',
            mensaje: data?.cliente
              ? `El evento de "${data.cliente}" para el ${data?.dia || 'fecha pendiente'} necesita camareros asignados.`
              : 'Hay un nuevo evento que requiere asignación de camareros.',
            prioridad: 'alta',
            pedido_id: id
          });
        }
      }

      if (type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      }

      if (type === 'delete') {
        pedidosKnownRef.delete(id);
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      }
    });

    return () => {
      unsubAsignacion();
      unsubPedido();
    };
  }, [queryClient]);
}