import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Send, Sparkles, MessageSquare, Loader2, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ChatClientes({ user }) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [generandoIA, setGenerandoIA] = useState(false);
  const [plantillaDialog, setPlantillaDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.filter({ activo: true }, 'nombre')
  });

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-whatsapp'],
    queryFn: () => base44.entities.PlantillaWhatsApp.filter({ activa: true }, 'nombre')
  });

  const { data: pedidosCliente = [] } = useQuery({
    queryKey: ['pedidos-cliente', clienteSeleccionado?.id],
    queryFn: () => base44.entities.Pedido.filter({ cliente_id: clienteSeleccionado.id }, '-dia', 10),
    enabled: !!clienteSeleccionado?.id
  });

  const { data: historial = [] } = useQuery({
    queryKey: ['historial-wa-cliente', clienteSeleccionado?.id],
    queryFn: () => base44.entities.HistorialWhatsApp.filter(
      { destinatario: clienteSeleccionado.telefono_1 }, '-created_date', 20
    ),
    enabled: !!clienteSeleccionado?.telefono_1,
    refetchInterval: 10000
  });

  const generarConIA = async () => {
    if (!clienteSeleccionado) return;
    setGenerandoIA(true);
    const proximoPedido = pedidosCliente[0];
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un coordinador de eventos profesional y amable. 
        Redacta un mensaje breve y cordial para el cliente "${clienteSeleccionado.nombre}".
        ${proximoPedido ? `Tienen un próximo evento el ${proximoPedido.dia} en ${proximoPedido.lugar_evento || 'por confirmar'}.` : ''}
        El mensaje debe ser de seguimiento, profesional, en español, máximo 3 frases, sin emojis excesivos.`,
      });
      setMensaje(res);
    } catch {
      toast.error('Error generando mensaje con IA');
    } finally {
      setGenerandoIA(false);
    }
  };

  const aplicarPlantilla = (plantilla) => {
    let contenido = plantilla.contenido;
    if (clienteSeleccionado) {
      contenido = contenido.replace('{{cliente}}', clienteSeleccionado.nombre);
      const p = pedidosCliente[0];
      if (p) {
        contenido = contenido.replace('{{dia}}', p.dia ? format(new Date(p.dia), 'dd/MM/yyyy', { locale: es }) : '');
        contenido = contenido.replace('{{lugar_evento}}', p.lugar_evento || '');
        contenido = contenido.replace('{{hora_entrada}}', p.turnos?.[0]?.entrada || p.entrada || '');
        contenido = contenido.replace('{{hora_salida}}', p.turnos?.[0]?.salida || p.salida || '');
        contenido = contenido.replace('{{camisa}}', p.camisa || '');
      }
    }
    setMensaje(contenido);
    setPlantillaDialog(false);
  };

  const enviarMensaje = useMutation({
    mutationFn: async () => {
      if (!clienteSeleccionado?.telefono_1) throw new Error('Sin teléfono');
      await base44.functions.invoke('enviarWhatsAppDirecto', {
        telefono: clienteSeleccionado.telefono_1,
        mensaje
      });
    },
    onSuccess: () => {
      toast.success('Mensaje enviado al cliente');
      setMensaje('');
      queryClient.invalidateQueries({ queryKey: ['historial-wa-cliente'] });
    },
    onError: () => toast.error('Error enviando mensaje')
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
      {/* Lista de clientes */}
      <div className="md:col-span-1 overflow-y-auto space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-1">
          Seleccionar cliente
        </div>
        {clientes.map(c => (
          <Card
            key={c.id}
            className={`p-3 cursor-pointer transition-all hover:shadow-md ${clienteSeleccionado?.id === c.id ? 'border-[#1e3a5f] border-2 bg-blue-50' : 'hover:border-slate-300'}`}
            onClick={() => setClienteSeleccionado(c)}
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate">{c.nombre}</h3>
                {c.coordinador_nombre && (
                  <p className="text-xs text-slate-500">Coord: {c.coordinador_nombre}</p>
                )}
                {c.telefono_1 && (
                  <p className="text-xs text-slate-400">{c.telefono_1}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </Card>
        ))}
      </div>

      {/* Panel de chat con cliente */}
      <div className="md:col-span-2 h-full">
        {!clienteSeleccionado ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Selecciona un cliente para comunicarte</p>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{clienteSeleccionado.nombre}</h3>
                  <p className="text-xs text-slate-500">
                    {clienteSeleccionado.telefono_1 || 'Sin teléfono'} 
                    {clienteSeleccionado.persona_contacto_1 && ` · ${clienteSeleccionado.persona_contacto_1}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPlantillaDialog(true)}>
                    <Copy className="w-3 h-3 mr-1" />
                    Plantilla
                  </Button>
                  <Button variant="outline" size="sm" onClick={generarConIA} disabled={generandoIA}>
                    {generandoIA ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    IA
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {/* Historial */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {historial.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay mensajes previos</p>
                  </div>
                ) : historial.map(h => (
                  <div key={h.id} className="flex justify-end">
                    <div className="max-w-[75%]">
                      <div className="bg-[#1e3a5f] text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm">
                        {h.mensaje}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {h.created_date ? format(new Date(h.created_date), 'dd/MM HH:mm', { locale: es }) : ''}
                        </span>
                        <Badge className={`text-xs px-1.5 py-0 ${h.estado === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {h.estado === 'enviado' ? 'Enviado' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Input */}
              <div className="border-t p-3">
                {!clienteSeleccionado.telefono_1 && (
                  <p className="text-xs text-amber-600 mb-2">⚠ El cliente no tiene teléfono registrado</p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                    placeholder="Escribe un mensaje para el cliente..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <Button
                    onClick={() => enviarMensaje.mutate()}
                    disabled={!mensaje.trim() || !clienteSeleccionado.telefono_1 || enviarMensaje.isPending}
                    className="bg-[#1e3a5f] hover:bg-[#152a45]"
                  >
                    {enviarMensaje.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog plantillas */}
      <Dialog open={plantillaDialog} onOpenChange={setPlantillaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Seleccionar Plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {plantillas.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No hay plantillas disponibles</p>
            ) : plantillas.map(p => (
              <Card key={p.id} className="p-3 cursor-pointer hover:bg-slate-50" onClick={() => aplicarPlantilla(p)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm">{p.nombre}</h4>
                    {p.descripcion && <p className="text-xs text-slate-500">{p.descripcion}</p>}
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.contenido}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">{p.tipo}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}