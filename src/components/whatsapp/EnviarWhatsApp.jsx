import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EnviarWhatsApp({ pedido, asignaciones, camareros, buttonVariant, buttonSize, buttonText }) {
  const [open, setOpen] = useState(false);
  const [selectedCamareros, setSelectedCamareros] = useState([]);
  const [coordinadorId, setCoordinadorId] = useState(null);
  const queryClient = useQueryClient();

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const { data: todosLosCamareros = [], isLoading: loadingCamareros } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre'),
    enabled: !camareros
  });

  const listaCamareros = camareros || todosLosCamareros;

  const generarMensajeWhatsApp = async (asignacion) => {
    const baseUrl = window.location.origin;
    const linkConfirmar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}`;
    const linkRechazar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}&action=rechazar`;

    let mensaje = `📅 *Día:* ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Por confirmar'}\n`;
    mensaje += `👤 *Cliente:* ${pedido.cliente}\n`;
    mensaje += `📍 *Lugar del Evento:* ${pedido.lugar_evento || 'Por confirmar'}\n`;
    mensaje += `🕐 *Hora de entrada:* ${asignacion.hora_entrada || pedido.entrada || '-'}\n\n`;

    if (pedido.extra_transporte) {
      // Con transporte - calcular hora de encuentro
      const puntoEncuentro = 'https://maps.app.goo.gl/hrR4eHSq4Q7dLcaV7';
      
      if (pedido.link_ubicacion) {
        try {
          const resultadoDistancia = await base44.integrations.Core.InvokeLLM({
            prompt: `Calcula el tiempo de viaje en transporte desde ${puntoEncuentro} hasta ${pedido.link_ubicacion}. Devuelve solo el tiempo estimado en minutos como número.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                minutos: { type: "number" }
              }
            }
          });
          
          const minutosViaje = resultadoDistancia?.minutos || 30;
          const horaEntrada = asignacion.hora_entrada || pedido.entrada;
          if (horaEntrada) {
            const [horas, minutos] = horaEntrada.split(':').map(Number);
            const horaEntradaDate = new Date();
            horaEntradaDate.setHours(horas, minutos, 0);
            horaEntradaDate.setMinutes(horaEntradaDate.getMinutes() - minutosViaje - 15);
            
            mensaje += `🚗 *Hora de encuentro:* ${horaEntradaDate.getHours().toString().padStart(2, '0')}:${horaEntradaDate.getMinutes().toString().padStart(2, '0')}\n`;
          }
        } catch (e) {
          console.error('Error calculando distancia:', e);
          mensaje += `🚗 *Hora de encuentro:* Por confirmar\n`;
        }
      }
      
      mensaje += `📌 *Punto de encuentro:* ${puntoEncuentro}\n\n`;
    } else {
      // Sin transporte - mostrar link de Google Maps
      if (pedido.link_ubicacion) {
        mensaje += `🗺️ *Ubicación:* ${pedido.link_ubicacion}\n\n`;
      }
    }

    mensaje += `👔 *Uniforme:* Zapatos, pantalón y delantal. Todo de color negro\n`;
    mensaje += `👕 *Camisa:* ${pedido.camisa || 'blanca'}\n`;
    mensaje += `✨ *Uniforme Impoluto.*\n\n`;
    mensaje += `⏰ *Presentarse 15 minutos antes para estar a la hora exacta en el puesto de trabajo.*\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━\n`;
    mensaje += `Por favor, confirma tu asistencia:\n\n`;
    mensaje += `✅ *CONFIRMO*\n${linkConfirmar}\n\n`;
    mensaje += `❌ *RECHAZO*\n${linkRechazar}`;

    return mensaje;
  };

  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (!coordinadorId) {
        throw new Error('Selecciona un coordinador');
      }

      const coordinador = coordinadores.find(c => c.id === coordinadorId);
      if (!coordinador?.telefono) {
        throw new Error('El coordinador seleccionado no tiene teléfono configurado');
      }

      const camarerosSeleccionados = listaCamareros.filter(c => 
        selectedCamareros.includes(c.id)
      );

      const asignacionesActualizadas = [];

      for (const camarero of camarerosSeleccionados) {
        if (!camarero.telefono) continue;

        // Buscar la asignación del camarero
        const asignacion = asignaciones.find(a => a.camarero_id === camarero.id);
        if (!asignacion) continue;

        const mensaje = await generarMensajeWhatsApp(asignacion);
        
        // Enviar mensaje directo por WhatsApp usando backend function
        try {
          await base44.functions.enviarWhatsAppDirecto({
            telefono: camarero.telefono,
            mensaje: mensaje
          });
        } catch (error) {
          console.error(`Error enviando WhatsApp a ${camarero.nombre}:`, error);
          throw new Error(`Error al enviar mensaje a ${camarero.nombre}`);
        }
        
        // Actualizar estado a "enviado" y crear notificación
        await base44.entities.AsignacionCamarero.update(asignacion.id, { estado: 'enviado' });
        
        await base44.entities.NotificacionCamarero.create({
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          asignacion_id: asignacion.id,
          pedido_id: pedido.id,
          tipo: 'nueva_asignacion',
          titulo: `Nueva Asignación: ${pedido.cliente}`,
          mensaje: mensaje,
          cliente: pedido.cliente,
          lugar_evento: pedido.lugar_evento,
          fecha: pedido.dia,
          hora_entrada: asignacion.hora_entrada,
          hora_salida: asignacion.hora_salida,
          leida: false,
          respondida: false,
          respuesta: 'pendiente'
        });

        // Enviar notificación push
        const config = JSON.parse(localStorage.getItem('notif_config') || '{}');
        if (config.habilitadas && config.nuevasAsignaciones !== false && Notification.permission === 'granted') {
          try {
            const { enviarNotificacionPush } = await import('../notificaciones/PushNotificationHelper');
            enviarNotificacionPush(
              'nuevasAsignaciones',
              `📋 Nueva Asignación: ${pedido.cliente}`,
              `${pedido.dia} • ${pedido.lugar_evento || 'Ubicación por confirmar'}`
            );
          } catch (e) {
            console.error('Error enviando push:', e);
          }
        }

        asignacionesActualizadas.push(asignacion.id);
        
        // Pequeña pausa entre mensajes
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      return asignacionesActualizadas;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      toast.success('Mensajes enviados correctamente');
      setOpen(false);
      setSelectedCamareros([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al enviar mensajes');
    }
  });

  const camarerosAsignados = asignaciones
    ?.map(a => listaCamareros.find(c => c.id === a.camarero_id))
    .filter(Boolean) || [];

  const toggleCamarero = (camareroId) => {
    setSelectedCamareros(prev => 
      prev.includes(camareroId) 
        ? prev.filter(id => id !== camareroId)
        : [...prev, camareroId]
    );
  };

  const seleccionarTodos = () => {
    setSelectedCamareros(camarerosAsignados.map(c => c.id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant || "default"}
          size={buttonSize || "default"}
          className={!buttonVariant ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {buttonText || "Enviar WhatsApp"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Enviar Confirmación por WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingCamareros && !camareros ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Cargando camareros...</span>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium mb-2">Evento: {pedido.cliente}</h4>
              <p className="text-sm text-slate-600">
                {pedido.dia} • {pedido.entrada} • {pedido.lugar_evento}
              </p>
              {pedido.extra_transporte && (
                <p className="text-sm text-green-600 mt-1">✓ Incluye transporte</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Enviar desde el número de:</Label>
              <Select value={coordinadorId || ''} onValueChange={setCoordinadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un coordinador" />
                </SelectTrigger>
                <SelectContent>
                  {coordinadores.map(coord => (
                    <SelectItem key={coord.id} value={coord.id}>
                      {coord.nombre} {coord.telefono ? `(${coord.telefono})` : '(Sin teléfono)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {coordinadorId && !coordinadores.find(c => c.id === coordinadorId)?.telefono && (
                <p className="text-xs text-red-500">⚠️ Este coordinador no tiene teléfono configurado</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Seleccionar Camareros ({camarerosAsignados.length})</h4>
                <Button variant="outline" size="sm" onClick={seleccionarTodos}>
                  Seleccionar Todos
                </Button>
              </div>

              <div className="space-y-2">
                {camarerosAsignados.map(camarero => (
                  <div 
                    key={camarero.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedCamareros.includes(camarero.id)}
                      onCheckedChange={() => toggleCamarero(camarero.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{camarero.nombre}</p>
                      <p className="text-sm text-slate-500">{camarero.telefono || 'Sin teléfono'}</p>
                    </div>
                    {!camarero.telefono && (
                      <span className="text-xs text-red-500">Sin teléfono</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => enviarMutation.mutate()}
            disabled={selectedCamareros.length === 0 || !coordinadorId || enviarMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {enviarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar a {selectedCamareros.length} camarero(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}