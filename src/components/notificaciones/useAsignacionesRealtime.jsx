import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Hook que escucha cambios en tiempo real sobre AsignacionCamarero y Pedido,
 * invalida las queries correspondientes y muestra toasts informativos.
 */
export function useAsignacionesRealtime() {
  const queryClient = useQueryClient();
  // Guardamos los IDs conocidos para detectar nuevas altas vs. reasignaciones
  const asignacionesRef = useRef(new Map()); // id -> { camarero_nombre, estado, pedido_id }

  useEffect(() => {
    // Inicializar el mapa con datos ya cacheados
    const cached = queryClient.getQueryData(['asignaciones']) || [];
    cached.forEach(a => {
      asignacionesRef.current.set(a.id, {
        camarero_nombre: a.camarero_nombre,
        estado: a.estado,
        pedido_id: a.pedido_id
      });
    });

    // -- Suscripción a cambios en AsignacionCamarero --
    const unsubAsignacion = base44.entities.AsignacionCamarero.subscribe((event) => {
      const { type, id, data } = event;

      if (type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
        if (data?.camarero_nombre) {
          toast.info(`📋 Nueva asignación`, {
            description: `${data.camarero_nombre} ha sido asignado a un evento.`,
            duration: 5000
          });
        }
        if (id && data) {
          asignacionesRef.current.set(id, {
            camarero_nombre: data.camarero_nombre,
            estado: data.estado,
            pedido_id: data.pedido_id
          });
        }
      }

      if (type === 'update') {
        const prev = asignacionesRef.current.get(id);
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });

        if (data && prev) {
          // Reasignación: cambió el camarero asignado
          if (prev.pedido_id && data.pedido_id && prev.pedido_id !== data.pedido_id) {
            toast.warning(`🔄 Reasignación`, {
              description: `${data.camarero_nombre || 'Un camarero'} ha sido reasignado a otro evento.`,
              duration: 6000
            });
          }
          // Cambio de estado relevante
          else if (prev.estado !== data.estado) {
            const mensajesEstado = {
              confirmado: `✅ ${data.camarero_nombre || 'Camarero'} confirmó su asistencia.`,
              alta: `🎉 ${data.camarero_nombre || 'Camarero'} ha dado de alta.`,
              enviado: `📤 Notificación enviada a ${data.camarero_nombre || 'camarero'}.`,
              pendiente: `⏳ ${data.camarero_nombre || 'Camarero'} vuelve a estado pendiente.`
            };
            const msg = mensajesEstado[data.estado];
            if (msg) {
              toast.info(msg, { duration: 5000 });
            }
          }

          // Actualizar referencia
          asignacionesRef.current.set(id, {
            camarero_nombre: data.camarero_nombre,
            estado: data.estado,
            pedido_id: data.pedido_id
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
        }
      }

      if (type === 'delete') {
        const prev = asignacionesRef.current.get(id);
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
        if (prev?.camarero_nombre) {
          toast.warning(`🗑️ Asignación eliminada`, {
            description: `${prev.camarero_nombre} fue desasignado del evento.`,
            duration: 5000
          });
        }
        asignacionesRef.current.delete(id);
      }
    });

    // -- Suscripción a cambios en Pedido (nuevos eventos) --
    const pedidosKnownRef = new Set(
      (queryClient.getQueryData(['pedidos']) || []).map(p => p.id)
    );

    const unsubPedido = base44.entities.Pedido.subscribe((event) => {
      const { type, id, data } = event;

      if (type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        if (!pedidosKnownRef.has(id)) {
          pedidosKnownRef.add(id);
          toast.info(`📅 Nuevo evento creado`, {
            description: data?.cliente
              ? `Se ha añadido el evento de "${data.cliente}" y requiere asignación.`
              : 'Se ha creado un nuevo evento que requiere asignación.',
            duration: 7000
          });
          // Crear notificación in-app para el coordinador
          base44.entities.Notificacion.create({
            tipo: 'estado_cambio',
            titulo: '📅 Nuevo Evento Requiere Asignación',
            mensaje: data?.cliente
              ? `El evento de "${data.cliente}" para el ${data?.dia || 'fecha pendiente'} necesita camareros asignados.`
              : 'Hay un nuevo evento que requiere asignación de camareros.',
            prioridad: 'alta',
            pedido_id: id,
            leida: false
          }).catch(() => {});
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