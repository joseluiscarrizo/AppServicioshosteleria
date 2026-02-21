import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Eye, Send, RefreshCw, CheckCircle, Clock, Calendar, MapPin, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PartesTrabajos({ user }) {
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-partes'],
    queryFn: async () => {
      const hoy = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0);
      return base44.entities.Pedido.filter({
        dia: { $gte: format(desde, 'yyyy-MM-dd'), $lte: format(hasta, 'yyyy-MM-dd') }
      }, 'dia', 200);
    }
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-partes'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 500)
  });

  const { data: historialesEmail = [] } = useQuery({
    queryKey: ['historial-email-partes'],
    queryFn: () => base44.entities.HistorialWhatsApp.filter({ tipo: 'parte_trabajo' }, '-created_date', 200)
  });

  const pedidosEnriquecidos = pedidos.map(p => {
    const asPedido = asignaciones.filter(a => a.pedido_id === p.id && a.estado === 'confirmado');
    const historialParte = historialesEmail.find(h => h.pedido_id === p.id);
    return {
      ...p,
      confirmados: asPedido.length,
      parte_enviado: !!historialParte,
      fecha_envio_parte: historialParte?.created_date
    };
  });

  const formatDia = (dia) => {
    if (!dia) return '-';
    const d = parseISO(dia);
    return format(d, "EEE, dd MMM yyyy", { locale: es });
  };

  const getHoraResumen = (p) => {
    if (p.turnos?.length > 0) {
      const entrada = p.turnos[0].entrada || '-';
      const salida = p.turnos[p.turnos.length - 1].salida || '-';
      return `${entrada} - ${salida}`;
    }
    return `${p.entrada || '-'} - ${p.salida || '-'}`;
  };


  const handleEnviarParte = async (pedido) => {
    setEnviando(pedido.id);
    try {
      await base44.functions.invoke('enviarParteAutomatico', { pedido_id: pedido.id });
      toast.success(`Parte enviado para ${pedido.cliente}`);
      queryClient.invalidateQueries({ queryKey: ['historial-email-partes'] });
    } catch {
      toast.error('Error al enviar el parte');
    } finally {
      setEnviando(null);
    }
  };

  const asCamareros = (pedidoId) =>
    asignaciones.filter(a => a.pedido_id === pedidoId && a.estado === 'confirmado');

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Partes de Trabajo</h3>
          <p className="text-sm text-slate-500">Gestión de envío de partes a clientes y equipo</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Enviado
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Pendiente
          </span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Día</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Evento / Lugar</TableHead>
                <TableHead className="font-semibold text-center">Hora</TableHead>
                <TableHead className="font-semibold text-center">Confirmados</TableHead>
                <TableHead className="font-semibold text-center">Vista Previa</TableHead>
                <TableHead className="font-semibold text-center">Estado</TableHead>
                <TableHead className="font-semibold text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosEnriquecidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400 py-10">
                    No hay pedidos en el período
                  </TableCell>
                </TableRow>
              ) : pedidosEnriquecidos.map(p => (
                <TableRow key={p.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-sm text-slate-700">
                    {p.dia ? format(parseISO(p.dia), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 capitalize">
                    {p.dia ? format(parseISO(p.dia), 'EEEE', { locale: es }) : '-'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">{p.cliente}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{p.lugar_evento || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {getHoraResumen(p)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className={`font-semibold ${p.confirmados > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {p.confirmados}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                      onClick={() => setVistaPrevia(p)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.parte_enviado ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Enviado
                        </Badge>
                        {p.fecha_envio_parte && (
                          <span className="text-xs text-slate-400">
                            {format(new Date(p.fecha_envio_parte), 'dd/MM HH:mm', { locale: es })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant={p.parte_enviado ? "outline" : "default"}
                      className={`h-7 px-2 text-xs ${!p.parte_enviado ? 'bg-[#1e3a5f] hover:bg-[#152a45] text-white' : ''}`}
                      onClick={() => handleEnviarParte(p)}
                      disabled={enviando === p.id}
                    >
                      {enviando === p.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : p.parte_enviado ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reenviar
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Enviar
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog Vista Previa */}
      <Dialog open={!!vistaPrevia} onOpenChange={() => setVistaPrevia(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Vista Previa del Parte
            </DialogTitle>
          </DialogHeader>
          {vistaPrevia && (
            <div className="space-y-4">
              <div className="bg-[#1e3a5f] text-white p-4 rounded-lg">
                <h3 className="font-bold text-lg">{vistaPrevia.cliente}</h3>
                <p className="text-blue-200 text-sm">{vistaPrevia.codigo_pedido}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs mb-0.5">Fecha</p>
                  <p className="font-semibold">{vistaPrevia.dia ? format(parseISO(vistaPrevia.dia), 'dd/MM/yyyy', { locale: es }) : '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs mb-0.5">Día</p>
                  <p className="font-semibold capitalize">{vistaPrevia.dia ? format(parseISO(vistaPrevia.dia), 'EEEE', { locale: es }) : '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg col-span-2">
                  <p className="text-slate-500 text-xs mb-0.5">Lugar</p>
                  <p className="font-semibold">{vistaPrevia.lugar_evento || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs mb-0.5">Hora</p>
                  <p className="font-semibold font-mono">{getHoraResumen(vistaPrevia)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs mb-0.5">Camareros confirmados</p>
                  <p className="font-semibold text-emerald-600">{vistaPrevia.confirmados}</p>
                </div>
              </div>
              {/* Camareros confirmados */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Equipo Asignado</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {asCamareros(vistaPrevia.id).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">Sin camareros confirmados</p>
                  ) : asCamareros(vistaPrevia.id).map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg text-sm">
                      <span className="font-medium">{a.camarero_nombre}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{a.hora_entrada} - {a.hora_salida}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5">Confirmado</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]"
                  onClick={() => { handleEnviarParte(vistaPrevia); setVistaPrevia(null); }}
                  disabled={enviando === vistaPrevia.id}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {vistaPrevia.parte_enviado ? 'Reenviar Parte' : 'Enviar Parte'}
                </Button>
                <Button variant="outline" onClick={() => setVistaPrevia(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

}