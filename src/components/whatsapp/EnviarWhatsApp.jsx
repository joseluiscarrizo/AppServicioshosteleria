import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EnviarWhatsApp({ pedido, asignaciones, camareros }) {
  const [open, setOpen] = useState(false);
  const [selectedCamareros, setSelectedCamareros] = useState([]);
  const queryClient = useQueryClient();

  const calcularTiempoTransporte = (puntoEncuentro, destino) => {
    // Estimación simple: 30 minutos por defecto + 15 minutos
    return 45;
  };

  const generarMensajeWhatsApp = (camarero, incluirTransporte, asignacionId) => {
    const baseUrl = window.location.origin;
    const linkAceptar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacionId}`;
    
    let mensaje = `Hola ${camarero.nombre}! 👋\n\n`;
    mensaje += `📅 *Día:* ${pedido.dia}\n`;
    mensaje += `🏢 *Cliente:* ${pedido.cliente}\n`;
    mensaje += `📍 *Lugar:* ${pedido.lugar_evento || 'Por confirmar'}\n`;
    mensaje += `🕐 *Hora Entrada:* ${pedido.entrada}\n\n`;

    // Link de Google Maps si hay coordenadas
    if (pedido.latitud && pedido.longitud) {
      mensaje += `📍 *Ubicación:*\nhttps://www.google.com/maps?q=${pedido.latitud},${pedido.longitud}\n\n`;
    } else if (pedido.direccion_completa) {
      const direccionEncoded = encodeURIComponent(pedido.direccion_completa);
      mensaje += `📍 *Ubicación:*\nhttps://www.google.com/maps/search/?api=1&query=${direccionEncoded}\n\n`;
    }

    // Transporte si aplica
    if (incluirTransporte) {
      const tiempoAntes = calcularTiempoTransporte('', '');
      const horaEntrada = pedido.entrada || '00:00';
      const [horas, minutos] = horaEntrada.split(':').map(Number);
      const minutosAntes = tiempoAntes;
      const horaEncuentro = new Date(2000, 0, 1, horas, minutos - minutosAntes);
      const horaEncuentroStr = `${String(horaEncuentro.getHours()).padStart(2, '0')}:${String(horaEncuentro.getMinutes()).padStart(2, '0')}`;
      
      mensaje += `🚗 *TRANSPORTE*\n`;
      mensaje += `*HORA DE ENCUENTRO:* ${horaEncuentroStr}\n`;
      mensaje += `*PUNTO DE ENCUENTRO:* https://maps.app.goo.gl/Fi1WRtTHdF7iNXdR8\n\n`;
    }

    // Uniforme
    mensaje += `👔 *Uniforme:* Zapatos, pantalón y delantal. *TODO DE COLOR NEGRO*\n\n`;
    mensaje += `👕 *CAMISA:* ${pedido.camisa || 'Blanca'}\n\n`;
    mensaje += `✨ *UNIFORME IMPECABLE*\n\n`;
    mensaje += `⬇️ *CONFIRMA TU ASISTENCIA* ⬇️\n`;
    mensaje += `${linkAceptar}\n\n`;
    mensaje += `✅ Acepto Servicio\n`;
    mensaje += `❌ Rechazo Servicio`;

    return mensaje;
  };

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const camarerosSeleccionados = camareros.filter(c => 
        selectedCamareros.includes(c.id)
      );

      const asignacionesActualizadas = [];

      for (const camarero of camarerosSeleccionados) {
        if (!camarero.telefono) continue;

        // Buscar la asignación del camarero
        const asignacion = asignaciones.find(a => a.camarero_id === camarero.id);
        if (!asignacion) continue;

        const mensaje = generarMensajeWhatsApp(camarero, pedido.extra_transporte, asignacion.id);
        
        // Crear URL de WhatsApp
        const telefono = camarero.telefono.replace(/\D/g, '');
        const mensajeEncoded = encodeURIComponent(mensaje);
        const whatsappURL = `https://wa.me/${telefono}?text=${mensajeEncoded}`;
        
        // Abrir en nueva pestaña
        window.open(whatsappURL, '_blank');
        
        // Actualizar estado a "enviado"
        await base44.entities.AsignacionCamarero.update(asignacion.id, { estado: 'enviado' });
        asignacionesActualizadas.push(asignacion.id);
        
        // Pequeña pausa entre mensajes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return asignacionesActualizadas;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Mensajes enviados y estados actualizados');
      setOpen(false);
    }
  });

  const camarerosAsignados = asignaciones
    .map(a => camareros.find(c => c.id === a.camarero_id))
    .filter(Boolean);

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
        <Button className="bg-green-600 hover:bg-green-700">
          <MessageCircle className="w-4 h-4 mr-2" />
          Enviar WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Enviar Confirmación por WhatsApp</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
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

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Seleccionar Camareros</h4>
                <Button variant="outline" size="sm" onClick={seleccionarTodos}>
                  Seleccionar Todos
                </Button>
              </div>

              <div className="border rounded-lg p-3 max-h-80 overflow-y-auto">
                <div className="space-y-2">
                  {camarerosAsignados.map(camarero => (
                    <div 
                      key={camarero.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded"
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

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => enviarMutation.mutate()}
                disabled={selectedCamareros.length === 0 || enviarMutation.isPending}
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}