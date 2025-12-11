import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, X, MapPin, Clock, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function NotificacionesCamarero({ camareroId, camareroNombre }) {
  const [showRechazoDialog, setShowRechazoDialog] = useState(false);
  const [notificacionActual, setNotificacionActual] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const queryClient = useQueryClient();

  const { data: notificaciones = [], isLoading } = useQuery({
    queryKey: ['notificaciones-camarero', camareroId],
    queryFn: () => base44.entities.NotificacionCamarero.filter({ camarero_id: camareroId }, '-created_date', 50),
    enabled: !!camareroId
  });

  // Marcar como leídas automáticamente después de 3 segundos
  useEffect(() => {
    const noLeidas = notificaciones.filter(n => !n.leida && n.tipo !== 'nueva_asignacion');
    if (noLeidas.length > 0) {
      const timer = setTimeout(async () => {
        for (const notif of noLeidas) {
          try {
            await base44.entities.NotificacionCamarero.update(notif.id, { leida: true });
          } catch (error) {
            console.error('Error marking as read:', error);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero', camareroId] });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notificaciones, camareroId, queryClient]);

  const pendientes = notificaciones.filter(n => !n.respondida && n.tipo === 'nueva_asignacion');
  const historial = notificaciones.filter(n => n.respondida || n.tipo !== 'nueva_asignacion');

  const responderMutation = useMutation({
    mutationFn: async ({ notificacionId, respuesta, motivo }) => {
      // Actualizar notificación
      await base44.entities.NotificacionCamarero.update(notificacionId, {
        respondida: true,
        respuesta,
        motivo_rechazo: motivo || null,
        leida: true
      });

      const notif = notificaciones.find(n => n.id === notificacionId);
      
      // Obtener información del camarero y coordinador
      const camarero = await base44.entities.Camarero.filter({ id: camareroId });
      const coordinadorId = camarero[0]?.coordinador_id;
      let coordinador = null;
      
      if (coordinadorId) {
        const coords = await base44.entities.Coordinador.filter({ id: coordinadorId });
        coordinador = coords[0];
      }
      
      if (respuesta === 'aceptado') {
        // Actualizar asignación a confirmado
        if (notif?.asignacion_id) {
          await base44.entities.AsignacionCamarero.update(notif.asignacion_id, {
            estado: 'confirmado'
          });
        }
        
        // Cambiar estado del camarero a ocupado
        await base44.entities.Camarero.update(camareroId, {
          estado_actual: 'ocupado'
        });
        
        const mensajeNotif = `${camareroNombre} ha aceptado el servicio de ${notif?.cliente} para el ${notif?.fecha ? format(new Date(notif.fecha), 'dd/MM/yyyy', { locale: es }) : 'fecha pendiente'}`;
        
        // Notificar al coordinador in-app
        await base44.entities.Notificacion.create({
          tipo: 'estado_cambio',
          titulo: '✅ Asignación Aceptada',
          mensaje: mensajeNotif,
          prioridad: 'media',
          pedido_id: notif?.pedido_id,
          coordinador: coordinador?.nombre,
          email_enviado: false
        });
        
        // Enviar email al coordinador si tiene email configurado
        if (coordinador?.email && coordinador?.notificaciones_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: coordinador.email,
              subject: `✅ Asignación Aceptada - ${notif?.cliente}`,
              body: `
Hola ${coordinador.nombre},

El camarero ${camareroNombre} ha ACEPTADO el servicio:

📋 Cliente: ${notif?.cliente}
📅 Fecha: ${notif?.fecha ? format(new Date(notif.fecha), "dd 'de' MMMM yyyy", { locale: es }) : 'Pendiente'}
🕐 Horario: ${notif?.hora_entrada || '-'} - ${notif?.hora_salida || '-'}
📍 Ubicación: ${notif?.lugar_evento || 'Por confirmar'}

El camarero ya está confirmado y su estado ha cambiado a "Ocupado".

Saludos,
Sistema de Gestión de Camareros
              `
            });
            
            // Marcar email como enviado
            const notifCreada = await base44.entities.Notificacion.filter({ 
              mensaje: mensajeNotif 
            });
            if (notifCreada[0]) {
              await base44.entities.Notificacion.update(notifCreada[0].id, { 
                email_enviado: true 
              });
            }
          } catch (emailError) {
            console.error('Error enviando email:', emailError);
          }
        }
      } else if (respuesta === 'rechazado') {
        // Eliminar asignación
        if (notif?.asignacion_id) {
          await base44.entities.AsignacionCamarero.delete(notif.asignacion_id);
        }
        
        // Cambiar estado del camarero a disponible
        await base44.entities.Camarero.update(camareroId, {
          estado_actual: 'disponible'
        });
        
        const mensajeNotif = `${camareroNombre} ha rechazado el servicio de ${notif?.cliente}${motivo ? `. Motivo: ${motivo}` : ' (sin motivo especificado)'}`;
        
        // Notificar al coordinador in-app
        await base44.entities.Notificacion.create({
          tipo: 'alerta',
          titulo: '❌ Asignación Rechazada',
          mensaje: mensajeNotif,
          prioridad: 'alta',
          pedido_id: notif?.pedido_id,
          coordinador: coordinador?.nombre,
          email_enviado: false
        });
        
        // Enviar email al coordinador si tiene email configurado
        if (coordinador?.email && coordinador?.notificaciones_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: coordinador.email,
              subject: `❌ URGENTE: Asignación Rechazada - ${notif?.cliente}`,
              body: `
Hola ${coordinador.nombre},

⚠️ ATENCIÓN: El camarero ${camareroNombre} ha RECHAZADO el servicio:

📋 Cliente: ${notif?.cliente}
📅 Fecha: ${notif?.fecha ? format(new Date(notif.fecha), "dd 'de' MMMM yyyy", { locale: es }) : 'Pendiente'}
🕐 Horario: ${notif?.hora_entrada || '-'} - ${notif?.hora_salida || '-'}
📍 Ubicación: ${notif?.lugar_evento || 'Por confirmar'}

${motivo ? `💬 Motivo del rechazo: "${motivo}"` : '💬 No se proporcionó motivo del rechazo'}

El camarero está ahora disponible para otras asignaciones. Se recomienda buscar un reemplazo lo antes posible.

Saludos,
Sistema de Gestión de Camareros
              `
            });
            
            // Marcar email como enviado
            const notifCreada = await base44.entities.Notificacion.filter({ 
              mensaje: mensajeNotif 
            });
            if (notifCreada[0]) {
              await base44.entities.Notificacion.update(notifCreada[0].id, { 
                email_enviado: true 
              });
            }
          } catch (emailError) {
            console.error('Error enviando email:', emailError);
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      
      if (variables.respuesta === 'aceptado') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      
      setShowRechazoDialog(false);
      setMotivoRechazo('');
    }
  });

  const handleAceptar = (notificacion) => {
    responderMutation.mutate({ 
      notificacionId: notificacion.id, 
      respuesta: 'aceptado' 
    });
    toast.success('Pedido aceptado');
  };

  const handleRechazar = (notificacion) => {
    setNotificacionActual(notificacion);
    setShowRechazoDialog(true);
  };

  const confirmarRechazo = () => {
    if (notificacionActual) {
      responderMutation.mutate({
        notificacionId: notificacionActual.id,
        respuesta: 'rechazado',
        motivo: motivoRechazo
      });
      toast.info('Pedido rechazado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notificaciones Pendientes */}
      {pendientes.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Pendientes de Respuesta ({pendientes.length})
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {pendientes.map(notif => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card className="p-5 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white shadow-lg">
                    <div className="space-y-4">
                      {/* Título Principal */}
                      <div className="text-center pb-3 border-b border-slate-200">
                        <h4 className="text-xl font-bold text-slate-800 mb-1">
                          🔔 Nueva Asignación de Servicio
                        </h4>
                        <p className="text-sm text-slate-600">
                          Has sido seleccionado para el siguiente evento
                        </p>
                      </div>

                      {/* Información del Evento */}
                      <div className="bg-white rounded-lg p-4 space-y-3 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500">Cliente</p>
                            <p className="font-semibold text-slate-800">{notif.cliente}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500">Fecha</p>
                            <p className="font-semibold text-slate-800">
                              {notif.fecha ? format(new Date(notif.fecha), "EEEE, dd 'de' MMMM yyyy", { locale: es }) : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500">Horario</p>
                            <p className="font-semibold text-slate-800">
                              {notif.hora_entrada} - {notif.hora_salida}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500">Ubicación</p>
                            <p className="font-semibold text-slate-800">
                              {notif.lugar_evento || 'Por confirmar'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mensaje de Confirmación */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="font-semibold text-amber-900 mb-1">
                          ⚠️ Confirma tu asistencia
                        </p>
                        <p className="text-xs text-amber-700">
                          Por favor, confirma si puedes asistir a este servicio
                        </p>
                      </div>

                      {/* Botones de Acción */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                          onClick={() => handleAceptar(notif)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold shadow-md"
                          disabled={responderMutation.isPending}
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Confirmar
                        </Button>
                        <Button
                          onClick={() => handleRechazar(notif)}
                          className="bg-red-600 hover:bg-red-700 text-white h-12 text-base font-semibold shadow-md"
                          disabled={responderMutation.isPending}
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Historial */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-500" />
          Historial de Notificaciones
        </h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {historial.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No hay notificaciones</p>
            ) : (
              historial.map(notif => (
                <Card key={notif.id} className={`p-3 ${notif.leida ? 'bg-slate-50' : 'bg-white border-l-2 border-l-blue-500'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notif.respuesta === 'aceptado' ? 'bg-emerald-100' :
                      notif.respuesta === 'rechazado' ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      {notif.respuesta === 'aceptado' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> :
                       notif.respuesta === 'rechazado' ? <XCircle className="w-4 h-4 text-red-600" /> :
                       <Bell className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notif.leida && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        )}
                        <span className="font-medium text-sm text-slate-800">{notif.titulo}</span>
                        {notif.respuesta && notif.respuesta !== 'pendiente' && (
                          <Badge className={
                            notif.respuesta === 'aceptado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }>
                            {notif.respuesta}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{notif.mensaje}</p>
                      {notif.motivo_rechazo && (
                        <p className="text-xs text-red-500 mt-1">Motivo: {notif.motivo_rechazo}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Dialog de Rechazo */}
      <Dialog open={showRechazoDialog} onOpenChange={setShowRechazoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Estás seguro de rechazar este pedido? El coordinador será notificado.
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700">Motivo del rechazo (opcional)</label>
              <Textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Indica el motivo..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRechazoDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmarRechazo}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={responderMutation.isPending}
              >
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}