import React, { useState } from 'react';
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

export default function NotificacionesCamarero({ camareroId, camareroNombre }) {
  const [showRechazoDialog, setShowRechazoDialog] = useState(false);
  const [notificacionActual, setNotificacionActual] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const queryClient = useQueryClient();

  const { data: notificaciones = [], isLoading } = useQuery({
    queryKey: ['notificaciones-camarero', camareroId],
    queryFn: () => base44.entities.NotificacionCamarero.filter({ camarero_id: camareroId }, '-created_date', 50),
    enabled: !!camareroId,
    refetchInterval: 10000
  });

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
      
      if (respuesta === 'aceptado') {
        // Actualizar asignación a confirmado
        if (notif?.asignacion_id) {
          await base44.entities.AsignacionCamarero.update(notif.asignacion_id, {
            estado: 'confirmado'
          });
        }
        
        // Notificar al coordinador
        await base44.entities.Notificacion.create({
          tipo: 'estado_cambio',
          titulo: 'Asignación Aceptada',
          mensaje: `${camareroNombre} ha aceptado el pedido de ${notif?.cliente} para el ${notif?.fecha}`,
          prioridad: 'media',
          pedido_id: notif?.pedido_id
        });
      } else if (respuesta === 'rechazado') {
        // Eliminar asignación
        if (notif?.asignacion_id) {
          await base44.entities.AsignacionCamarero.delete(notif.asignacion_id);
        }
        
        // Notificar al coordinador
        await base44.entities.Notificacion.create({
          tipo: 'alerta',
          titulo: 'Asignación Rechazada',
          mensaje: `${camareroNombre} ha rechazado el pedido de ${notif?.cliente}. Motivo: ${motivo || 'No especificado'}`,
          prioridad: 'alta',
          pedido_id: notif?.pedido_id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
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
                  <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{notif.titulo}</h4>
                        <p className="text-sm text-slate-600 mt-1">{notif.mensaje}</p>
                        
                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {notif.fecha ? format(new Date(notif.fecha), 'dd MMM yyyy', { locale: es }) : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {notif.hora_entrada} - {notif.hora_salida}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {notif.lugar_evento || 'Sin ubicación'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAceptar(notif)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={responderMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aceptar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRechazar(notif)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          disabled={responderMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
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
                <Card key={notif.id} className={`p-3 ${notif.leida ? 'bg-slate-50' : 'bg-white'}`}>
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