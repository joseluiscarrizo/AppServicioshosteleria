import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Calendar, MapPin, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ConfirmarServicio() {
  const [estado, setEstado] = useState('cargando'); // cargando, confirmar, rechazar, procesado, error
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [asignacionId, setAsignacionId] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('asignacion');
    const action = params.get('action');
    
    if (id) {
      setAsignacionId(id);
      if (action === 'rechazar') {
        setEstado('rechazar');
      } else {
        setEstado('confirmar');
      }
    } else {
      setEstado('error');
    }
  }, []);

  const { data: asignacion, isLoading: loadingAsignacion } = useQuery({
    queryKey: ['asignacion', asignacionId],
    queryFn: async () => {
      const asignaciones = await base44.entities.AsignacionCamarero.list();
      return asignaciones.find(a => a.id === asignacionId);
    },
    enabled: !!asignacionId
  });

  const { data: pedido } = useQuery({
    queryKey: ['pedido', asignacion?.pedido_id],
    queryFn: async () => {
      const pedidos = await base44.entities.Pedido.list();
      return pedidos.find(p => p.id === asignacion.pedido_id);
    },
    enabled: !!asignacion?.pedido_id
  });

  const aceptarMutation = useMutation({
    mutationFn: async () => {
      // Actualizar asignación a confirmado
      await base44.entities.AsignacionCamarero.update(asignacionId, {
        estado: 'confirmado'
      });

      // Actualizar notificación si existe
      const notificaciones = await base44.entities.NotificacionCamarero.filter({
        asignacion_id: asignacionId
      });
      
      if (notificaciones[0]) {
        await base44.entities.NotificacionCamarero.update(notificaciones[0].id, {
          respondida: true,
          respuesta: 'aceptado',
          leida: true
        });
      }

      // Actualizar estado del camarero
      const camareroData = await base44.entities.Camarero.filter({ id: asignacion.camarero_id });
      if (camareroData[0]) {
        await base44.entities.Camarero.update(asignacion.camarero_id, {
          estado_actual: 'ocupado'
        });
      }

      // Obtener coordinador y notificar
      const coordinadorId = camareroData[0]?.coordinador_id;
      
      if (coordinadorId) {
        const coords = await base44.entities.Coordinador.filter({ id: coordinadorId });
        const coordinador = coords[0];
        
        if (coordinador) {
          const mensajeNotif = `${asignacion.camarero_nombre} ha CONFIRMADO el servicio de ${pedido.cliente} para el ${pedido.dia ? format(new Date(pedido.dia), 'dd/MM/yyyy', { locale: es }) : 'fecha pendiente'}`;
          
          await base44.entities.Notificacion.create({
            tipo: 'estado_cambio',
            titulo: '✅ Asignación Confirmada',
            mensaje: mensajeNotif,
            prioridad: 'media',
            pedido_id: pedido.id,
            coordinador: coordinador.nombre,
            email_enviado: false
          });
          
          if (coordinador.email && coordinador.notificaciones_email) {
            try {
              await base44.integrations.Core.SendEmail({
                to: coordinador.email,
                subject: `✅ Asignación Confirmada - ${pedido.cliente}`,
                body: `
Hola ${coordinador.nombre},

✅ El camarero ${asignacion.camarero_nombre} ha CONFIRMADO el servicio:

📋 Cliente: ${pedido.cliente}
📅 Fecha: ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Pendiente'}
🕐 Horario: ${asignacion.hora_entrada || pedido.entrada || '-'} - ${asignacion.hora_salida || pedido.salida || '-'}
📍 Ubicación: ${pedido.lugar_evento || 'Por confirmar'}

El camarero ya está confirmado y aparecerá en verde en el sistema.

Saludos,
Sistema de Gestión de Camareros
                `
              });
            } catch (e) {
              console.error('Error enviando email:', e);
            }
          }
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      setEstado('procesado');
      toast.success('¡Servicio confirmado correctamente!');
    },
    onError: (error) => {
      console.error('Error en aceptar:', error);
      toast.error('Error al procesar la confirmación');
      setEstado('error');
    }
  });

  const rechazarMutation = useMutation({
    mutationFn: async () => {
      // Actualizar notificación si existe
      const notificaciones = await base44.entities.NotificacionCamarero.filter({
        asignacion_id: asignacionId
      });
      
      if (notificaciones[0]) {
        await base44.entities.NotificacionCamarero.update(notificaciones[0].id, {
          respondida: true,
          respuesta: 'rechazado',
          motivo_rechazo: motivoRechazo || null,
          leida: true
        });
      }

      // PRIMERO: Eliminar asignación
      await base44.entities.AsignacionCamarero.delete(asignacionId);
      
      // Actualizar estado del camarero
      const camareroData = await base44.entities.Camarero.filter({ id: asignacion.camarero_id });
      if (camareroData[0]) {
        await base44.entities.Camarero.update(asignacion.camarero_id, {
          estado_actual: 'disponible'
        });
      }

      // Obtener coordinador y notificar
      const coordinadorId = camareroData[0]?.coordinador_id;
      
      if (coordinadorId) {
        const coords = await base44.entities.Coordinador.filter({ id: coordinadorId });
        const coordinador = coords[0];
        
        if (coordinador) {
          const mensajeNotif = `❌ ${asignacion.camarero_nombre} ha RECHAZADO el servicio de ${pedido.cliente}${motivoRechazo ? `. Motivo: ${motivoRechazo}` : ' (sin motivo especificado)'}`;
          
          await base44.entities.Notificacion.create({
            tipo: 'alerta',
            titulo: '❌ Asignación Rechazada - Acción Requerida',
            mensaje: mensajeNotif,
            prioridad: 'alta',
            pedido_id: pedido.id,
            coordinador: coordinador.nombre,
            email_enviado: false
          });
          
          if (coordinador.email && coordinador.notificaciones_email) {
            try {
              await base44.integrations.Core.SendEmail({
                to: coordinador.email,
                subject: `❌ URGENTE: Asignación Rechazada - ${pedido.cliente}`,
                body: `
Hola ${coordinador.nombre},

⚠️ ATENCIÓN URGENTE: El camarero ${asignacion.camarero_nombre} ha RECHAZADO el servicio:

📋 Cliente: ${pedido.cliente}
📅 Fecha: ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Pendiente'}
🕐 Horario: ${asignacion.hora_entrada || pedido.entrada || '-'} - ${asignacion.hora_salida || pedido.salida || '-'}
📍 Ubicación: ${pedido.lugar_evento || 'Por confirmar'}

${motivoRechazo ? `💬 Motivo del rechazo: "${motivoRechazo}"` : '💬 No se proporcionó motivo del rechazo'}

La asignación ha sido eliminada automáticamente del sistema. El camarero está ahora disponible.

⚠️ SE REQUIERE BUSCAR UN REEMPLAZO URGENTEMENTE.

Saludos,
Sistema de Gestión de Camareros
                `
              });
            } catch (e) {
              console.error('Error enviando email:', e);
            }
          }
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      setEstado('procesado');
      toast.success('Servicio rechazado. La asignación ha sido eliminada.');
    },
    onError: (error) => {
      console.error('Error en rechazo:', error);
      toast.error('Error al procesar el rechazo');
      setEstado('error');
    }
  });

  if (estado === 'cargando' || loadingAsignacion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (estado === 'error' || !asignacion || !pedido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600">No se pudo cargar la información del servicio</p>
        </Card>
      </div>
    );
  }

  if (estado === 'procesado') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Procesado!</h2>
          <p className="text-slate-600">Tu respuesta ha sido registrada correctamente</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-slate-800 mb-6 text-center">
          Confirmación de Servicio
        </h1>

        {/* Detalles del servicio */}
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-lg text-slate-800 mb-4">{pedido.cliente}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-5 h-5 text-[#1e3a5f]" />
              <span>{format(new Date(pedido.dia), 'EEEE, dd MMMM yyyy', { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-5 h-5 text-[#1e3a5f]" />
              <span>{pedido.entrada} - {pedido.salida}</span>
            </div>
            {pedido.lugar_evento && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-5 h-5 text-[#1e3a5f]" />
                <span>{pedido.lugar_evento}</span>
              </div>
            )}
          </div>
        </div>

        {estado === 'confirmar' && (
          <div className="space-y-4">
            <p className="text-center text-slate-600 mb-6">
              ¿Confirmas tu asistencia a este servicio?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => aceptarMutation.mutate()}
                disabled={aceptarMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg"
              >
                {aceptarMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Acepto Servicio
              </Button>
              <Button
                onClick={() => setEstado('rechazar')}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 h-14 text-lg"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Rechazo Servicio
              </Button>
            </div>
          </div>
        )}

        {estado === 'rechazar' && (
          <div className="space-y-4">
            <p className="text-slate-600 mb-4">
              Lamentamos que no puedas asistir. ¿Puedes indicarnos el motivo? (opcional)
            </p>
            <Textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo..."
              className="h-24"
            />
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setEstado('confirmar')}
                variant="outline"
              >
                Volver
              </Button>
              <Button
                onClick={() => rechazarMutation.mutate()}
                disabled={rechazarMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {rechazarMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}