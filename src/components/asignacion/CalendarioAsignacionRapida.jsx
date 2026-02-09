import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, AlertTriangle, X, Plus, Clock, MapPin, Star, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import TareasService from '../camareros/TareasService';
import EnviarWhatsApp from '../whatsapp/EnviarWhatsApp';

export default function CalendarioAsignacionRapida() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAsignacionPanel, setShowAsignacionPanel] = useState(false);
  const [selectedPedidoAsignacion, setSelectedPedidoAsignacion] = useState(null);
  const [busquedaCamarero, setBusquedaCamarero] = useState('');
  const [showTodosCamareros, setShowTodosCamareros] = useState(false);
  const [showAsignados, setShowAsignados] = useState(false);
  const queryClient = useQueryClient();

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const createAsignacionMutation = useMutation({
    mutationFn: async (data) => {
      const asignacion = await base44.entities.AsignacionCamarero.create(data);
      const pedido = pedidos.find(p => p.id === data.pedido_id);
      const camarero = camareros.find(c => c.id === data.camarero_id);
      
      if (pedido && camarero) {
        await base44.entities.NotificacionCamarero.create({
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          asignacion_id: asignacion.id,
          pedido_id: pedido.id,
          tipo: 'nueva_asignacion',
          titulo: `Nueva Asignación: ${pedido.cliente}`,
          mensaje: `Has sido asignado a un evento en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
          cliente: pedido.cliente,
          lugar_evento: pedido.lugar_evento,
          fecha: pedido.dia,
          hora_entrada: pedido.entrada,
          hora_salida: pedido.salida,
          leida: false,
          respondida: false,
          respuesta: 'pendiente'
        });

        await TareasService.crearTareasIniciales(asignacion, pedido, camarero);
      }
      
      return asignacion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Camarero asignado');
    }
  });

  const deleteAsignacionMutation = useMutation({
    mutationFn: async (asignacion) => {
      await TareasService.eliminarTareasAsignacion(asignacion.id);
      await base44.entities.AsignacionCamarero.delete(asignacion.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Asignación eliminada');
    }
  });

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.AsignacionCamarero.update(id, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Estado actualizado');
    }
  });

  const dias = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDatosDia = (dia) => {
    const fechaStr = format(dia, 'yyyy-MM-dd');
    const pedidosDia = pedidos.filter(p => p.dia === fechaStr);
    const asignacionesDia = asignaciones.filter(a => a.fecha_pedido === fechaStr);
    
    const totalCamareros = pedidosDia.reduce((sum, p) => {
      if (p.turnos?.length > 0) {
        return sum + p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0);
      }
      return sum + (p.cantidad_camareros || 0);
    }, 0);

    const asignados = asignacionesDia.length;
    const pendientes = totalCamareros - asignados;

    return { pedidos: pedidosDia, asignaciones: asignacionesDia, totalCamareros, asignados, pendientes };
  };

  const pedidosDelDia = selectedDate ? getDatosDia(selectedDate).pedidos : [];

  const getCamarerosDisponibles = (pedido) => {
    if (!pedido) return [];
    
    const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
    const idsAsignados = asignacionesPedido.map(a => a.camarero_id);
    
    return camareros.filter(c => {
      if (!c.disponible || c.en_reserva) return false;
      if (idsAsignados.includes(c.id)) return false;
      
      // Verificar conflictos de horario
      const asignacionesCamarero = asignaciones.filter(a => a.camarero_id === c.id && a.fecha_pedido === pedido.dia);
      for (const asig of asignacionesCamarero) {
        const horaEntradaNueva = pedido.entrada ? parseInt(pedido.entrada.split(':')[0]) : 0;
        const horaSalidaExistente = asig.hora_salida ? parseInt(asig.hora_salida.split(':')[0]) : 0;
        const diff = Math.abs(horaEntradaNueva - horaSalidaExistente);
        if (diff < 6) return false;
      }
      
      return true;
    }).sort((a, b) => (b.valoracion_promedio || 0) - (a.valoracion_promedio || 0));
  };

  const handleAsignarCamarero = (pedido, camarero) => {
    const asignacionesActuales = asignaciones.filter(a => a.pedido_id === pedido.id);
    const cantidadNecesaria = pedido.turnos?.length > 0 
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0);
    
    if (asignacionesActuales.length >= cantidadNecesaria) {
      toast.error('Ya se alcanzó el número máximo de camareros');
      return;
    }

    createAsignacionMutation.mutate({
      pedido_id: pedido.id,
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      camarero_codigo: camarero.codigo,
      estado: 'pendiente',
      fecha_pedido: pedido.dia,
      hora_entrada: pedido.entrada,
      hora_salida: pedido.salida
    });
  };

  const handleClickDia = (dia) => {
    setSelectedDate(dia);
    setBusquedaCamarero('');
    const datos = getDatosDia(dia);
    if (datos.pedidos.length > 0) {
      setShowAsignacionPanel(true);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="p-6 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
            Calendario de Asignación Rápida
          </h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-slate-600">Completo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-slate-600">Parcial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-slate-600">Sin asignar</span>
          </div>
        </div>

        {/* Calendario */}
        <div className="grid grid-cols-7 gap-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
            <div key={dia} className="text-center text-sm font-semibold text-slate-500 pb-2">
              {dia}
            </div>
          ))}

          {dias.map(dia => {
            const esHoy = isSameDay(dia, new Date());
            const esMesActual = dia.getMonth() === currentMonth.getMonth();
            const datos = getDatosDia(dia);
            const tieneEventos = datos.pedidos.length > 0;
            const esSeleccionado = selectedDate && isSameDay(dia, selectedDate);
            
            let colorFondo = 'bg-slate-50';
            let colorBorde = 'border-slate-200';
            
            if (tieneEventos) {
              if (datos.pendientes === 0) {
                colorFondo = 'bg-emerald-50';
                colorBorde = 'border-emerald-300';
              } else if (datos.asignados > 0) {
                colorFondo = 'bg-amber-50';
                colorBorde = 'border-amber-300';
              } else {
                colorFondo = 'bg-red-50';
                colorBorde = 'border-red-300';
              }
            }

            return (
              <div
                key={dia.toString()}
                onClick={() => handleClickDia(dia)}
                className={`
                  min-h-[90px] p-2 rounded-lg border transition-all cursor-pointer
                  ${esSeleccionado ? 'border-[#1e3a5f] border-2 shadow-lg ring-2 ring-[#1e3a5f]/20' : 
                    esHoy ? 'border-[#1e3a5f] border-2' : colorBorde}
                  ${!esMesActual ? 'opacity-40' : ''}
                  ${colorFondo}
                  hover:shadow-md hover:scale-105
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${esHoy || esSeleccionado ? 'text-[#1e3a5f]' : 'text-slate-700'}`}>
                    {format(dia, 'd')}
                  </span>
                  {tieneEventos && (
                    <Badge variant="outline" className="text-xs px-1 h-5">
                      {datos.pedidos.length}
                    </Badge>
                  )}
                </div>

                {tieneEventos && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-600 flex items-center justify-center gap-1 bg-white/50 rounded py-1">
                      <Users className="w-3 h-3" />
                      <span className="font-semibold">{datos.asignados}/{datos.totalCamareros}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Panel Inferior de Camareros Disponibles */}
      {selectedDate && pedidosDelDia.length > 0 && (
        <Card className="p-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1e3a5f]" />
              Camareros Disponibles - {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAsignacionPanel(true)}
            >
              Ver Panel Completo
            </Button>
          </div>

          {selectedPedidoAsignacion ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Evento seleccionado */}
              <div className="bg-gradient-to-r from-[#1e3a5f]/5 to-blue-50 border border-[#1e3a5f]/20 rounded-lg p-3 mb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{selectedPedidoAsignacion.cliente}</h4>
                    <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedPedidoAsignacion.lugar_evento || 'Sin ubicación'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedPedidoAsignacion.entrada} - {selectedPedidoAsignacion.salida}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedPedidoAsignacion(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Búsqueda */}
              <div className="relative mb-3 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar camarero por nombre o código..."
                  value={busquedaCamarero}
                  onChange={(e) => setBusquedaCamarero(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* Lista de camareros disponibles */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {getCamarerosDisponibles(selectedPedidoAsignacion)
                    .filter(c => 
                      !busquedaCamarero || 
                      c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                      c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                    )
                    .map(camarero => (
                      <div
                        key={camarero.id}
                        className="p-3 border-2 border-slate-200 rounded-lg hover:border-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-all cursor-pointer group"
                        onClick={() => handleAsignarCamarero(selectedPedidoAsignacion, camarero)}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-slate-800 text-sm truncate flex-1">
                              {camarero.nombre}
                            </span>
                            <Plus className="w-4 h-4 text-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>
                          <p className="text-xs text-slate-500 font-mono mb-2">#{camarero.codigo}</p>
                          
                          {camarero.valoracion_promedio > 0 && (
                            <div className="flex items-center gap-1 text-amber-500 text-xs mb-2">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{camarero.valoracion_promedio.toFixed(1)}</span>
                            </div>
                          )}
                          
                          {camarero.especialidad && (
                            <Badge variant="outline" className="text-xs mt-auto">
                              {camarero.especialidad}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {getCamarerosDisponibles(selectedPedidoAsignacion)
                  .filter(c => 
                    !busquedaCamarero || 
                    c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                    c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                  ).length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {busquedaCamarero ? 'No se encontraron camareros' : 'No hay camareros disponibles'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona un evento del día para ver camareros disponibles</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {pedidosDelDia.map(pedido => (
                    <Button
                      key={pedido.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPedidoAsignacion(pedido)}
                      className="hover:bg-[#1e3a5f] hover:text-white"
                    >
                      {pedido.cliente}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Panel de Asignación Rápida */}
      <Dialog open={showAsignacionPanel} onOpenChange={setShowAsignacionPanel}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
                Eventos del {selectedDate && format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-[75vh]">
            {/* Panel de Camareros Disponibles - IZQUIERDA */}
            <div className="border-r border-slate-200 pr-6 flex flex-col h-full">
              {selectedPedidoAsignacion ? (
                <>
                  {/* Info del evento seleccionado */}
                  <div className="mb-4 flex-shrink-0">
                    <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] text-white rounded-lg p-4 shadow-lg">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg">{selectedPedidoAsignacion.cliente}</h3>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedPedidoAsignacion(null)}
                          className="text-white hover:bg-white/20 h-7 w-7"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0 opacity-80" />
                          <span className="truncate">{selectedPedidoAsignacion.lugar_evento || 'Sin ubicación'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0 opacity-80" />
                          <span>{selectedPedidoAsignacion.entrada} - {selectedPedidoAsignacion.salida}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asignaciones Actuales */}
                  {asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).length > 0 && (
                    <div className="mb-4 flex-shrink-0">
                      <div 
                        className="flex items-center justify-between mb-2 cursor-pointer hover:text-emerald-700 transition-colors"
                        onClick={() => setShowAsignados(true)}
                      >
                        <h5 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Asignados ({asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).length})
                        </h5>
                        <span className="text-xs text-emerald-600">Ver todos →</span>
                      </div>
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1.5 pr-2">
                          {asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).slice(0, 3).map(asig => (
                            <div key={asig.id} className="flex items-center justify-between text-sm p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <span className="text-slate-800 font-medium text-xs truncate flex-1">{asig.camarero_nombre}</span>
                              <Badge className={`text-xs ml-2 ${
                                asig.estado === 'confirmado' ? 'bg-green-500' :
                                asig.estado === 'enviado' ? 'bg-orange-500' :
                                'bg-slate-400'
                              }`}>
                                {asig.estado === 'confirmado' ? '✓' : 
                                 asig.estado === 'enviado' ? '→' : '·'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Búsqueda de Camareros */}
                  <div className="mb-3 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#1e3a5f]" />
                        Disponibles ({getCamarerosDisponibles(selectedPedidoAsignacion).filter(c => 
                          !busquedaCamarero || 
                          c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                          c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                        ).length})
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTodosCamareros(true)}
                        className="text-xs h-7"
                      >
                        Ver todos
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar camarero..."
                        value={busquedaCamarero}
                        onChange={(e) => setBusquedaCamarero(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>

                  {/* Lista de Camareros Disponibles */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full pr-2">
                      <div className="space-y-2">
                        {getCamarerosDisponibles(selectedPedidoAsignacion)
                          .filter(c => 
                            !busquedaCamarero || 
                            c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                            c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                          )
                          .map(camarero => (
                          <div
                            key={camarero.id}
                            className="group p-3 border-2 border-slate-200 rounded-lg hover:border-[#1e3a5f] hover:bg-[#1e3a5f]/5 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => handleAsignarCamarero(selectedPedidoAsignacion, camarero)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-slate-800 text-sm truncate">{camarero.nombre}</span>
                                  {camarero.valoracion_promedio > 0 && (
                                    <span className="flex items-center gap-0.5 text-amber-500 text-xs flex-shrink-0">
                                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                                      <span className="font-semibold">{camarero.valoracion_promedio.toFixed(1)}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-mono mb-1.5">#{camarero.codigo}</p>
                                {camarero.especialidad && (
                                  <Badge variant="outline" className="text-xs">
                                    {camarero.especialidad}
                                  </Badge>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                className="bg-[#1e3a5f] hover:bg-[#152a45] text-white flex-shrink-0 h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {getCamarerosDisponibles(selectedPedidoAsignacion)
                          .filter(c => 
                            !busquedaCamarero || 
                            c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                            c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                          ).length === 0 && (
                          <div className="text-center py-8 text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">
                              {busquedaCamarero ? 'No se encontraron camareros' : 'No hay camareros disponibles'}
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Users className="w-16 h-16 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Selecciona un evento</p>
                    <p className="text-xs mt-1">para ver camareros disponibles</p>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Eventos - DERECHA */}
            <div className="flex flex-col h-full">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
                Eventos del Día ({pedidosDelDia.length})
              </h4>
              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-3">
                {pedidosDelDia.map(pedido => {
                  const asigsPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
                  const totalNeeded = pedido.turnos?.length > 0 
                    ? pedido.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
                    : (pedido.cantidad_camareros || 0);
                  const porcentaje = totalNeeded > 0 ? Math.round((asigsPedido.length / totalNeeded) * 100) : 0;

                  return (
                    <Card 
                      key={pedido.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedPedidoAsignacion?.id === pedido.id 
                          ? 'border-[#1e3a5f] border-2 shadow-lg bg-[#1e3a5f]/5' 
                          : 'hover:border-[#1e3a5f]/50'
                      }`}
                      onClick={() => setSelectedPedidoAsignacion(pedido)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-base mb-1 truncate">{pedido.cliente}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#1e3a5f]" />
                              <span className="truncate">{pedido.lugar_evento || 'Sin ubicación'}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#1e3a5f]" />
                              {pedido.entrada} - {pedido.salida}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge className={`text-sm font-semibold px-3 py-1 ${
                            porcentaje === 100 ? 'bg-emerald-500 text-white' :
                            porcentaje > 0 ? 'bg-amber-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {asigsPedido.length}/{totalNeeded}
                          </Badge>
                          {porcentaje > 0 && porcentaje < 100 && (
                            <span className="text-xs text-amber-600 font-medium">
                              {porcentaje}% completo
                            </span>
                          )}
                        </div>
                      </div>

                      {asigsPedido.length > 0 && (
                        <div className="pt-3 border-t border-slate-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-700">Asignados:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {asigsPedido.map(asig => (
                              <Badge 
                                key={asig.id} 
                                variant="outline" 
                                className={`text-xs ${
                                  asig.estado === 'confirmado' ? 'border-green-500 text-green-700 bg-green-50' :
                                  asig.estado === 'enviado' ? 'border-orange-500 text-orange-700 bg-orange-50' :
                                  'border-slate-400 text-slate-700 bg-slate-50'
                                }`}
                              >
                                {asig.camarero_nombre}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
        </Dialog>

        {/* Modal de Todos los Camareros Disponibles */}
        <Dialog open={showTodosCamareros} onOpenChange={setShowTodosCamareros}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1e3a5f]" />
              Todos los Camareros Disponibles
              {selectedPedidoAsignacion && (
                <span className="text-sm font-normal text-slate-500">
                  para {selectedPedidoAsignacion.cliente}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar camarero por nombre o código..."
                value={busquedaCamarero}
                onChange={(e) => setBusquedaCamarero(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Lista de Camareros */}
            <ScrollArea className="h-[60vh] pr-3">
              <div className="space-y-2">
                {selectedPedidoAsignacion && getCamarerosDisponibles(selectedPedidoAsignacion)
                  .filter(c => 
                    !busquedaCamarero || 
                    c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                    c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                  )
                  .map(camarero => (
                    <div
                      key={camarero.id}
                      className="p-4 border-2 border-slate-200 rounded-lg hover:border-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-all cursor-pointer"
                      onClick={() => {
                        handleAsignarCamarero(selectedPedidoAsignacion, camarero);
                        setShowTodosCamareros(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-800">{camarero.nombre}</span>
                            {camarero.valoracion_promedio > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-500 text-sm">
                                <Star className="w-4 h-4 fill-amber-400" />
                                {camarero.valoracion_promedio.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 font-mono mb-2">#{camarero.codigo}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {camarero.especialidad && (
                              <Badge variant="outline" className="text-xs">
                                {camarero.especialidad}
                              </Badge>
                            )}
                            {camarero.habilidades?.slice(0, 3).map(hab => (
                              <Badge key={hab} variant="outline" className="text-xs bg-slate-50">
                                {hab}
                              </Badge>
                            ))}
                            {camarero.habilidades?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{camarero.habilidades.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Asignar
                        </Button>
                      </div>
                    </div>
                  ))}

                {selectedPedidoAsignacion && getCamarerosDisponibles(selectedPedidoAsignacion)
                  .filter(c => 
                    !busquedaCamarero || 
                    c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                    c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                  ).length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-base">
                      {busquedaCamarero ? 'No se encontraron camareros' : 'No hay camareros disponibles'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
        </Dialog>

        {/* Modal de Camareros Asignados */}
        <Dialog open={showAsignados} onOpenChange={setShowAsignados}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Camareros Asignados
            {selectedPedidoAsignacion && (
              <span className="text-sm font-normal text-slate-500">
                - {selectedPedidoAsignacion.cliente}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-3">
          <div className="space-y-2">
            {selectedPedidoAsignacion && asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).map(asig => {
              const camarero = camareros.find(c => c.id === asig.camarero_id);

              return (
                <div key={asig.id} className="p-4 border-2 border-emerald-200 bg-emerald-50 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">{asig.camarero_nombre}</span>
                        {camarero?.valoracion_promedio > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500 text-sm">
                            <Star className="w-4 h-4 fill-amber-400" />
                            {camarero.valoracion_promedio.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 font-mono mb-2">#{asig.camarero_codigo}</p>

                      <div className="flex items-center gap-3">
                        <Select 
                          value={asig.estado} 
                          onValueChange={(estado) => updateEstadoMutation.mutate({ id: asig.id, estado })}
                        >
                          <SelectTrigger className={`w-36 h-8 text-sm ${
                            asig.estado === 'confirmado' ? 'bg-green-500 text-white border-green-600' :
                            asig.estado === 'enviado' ? 'bg-orange-500 text-white border-orange-600' :
                            'bg-slate-400 text-white border-slate-500'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                Sin enviar
                              </span>
                            </SelectItem>
                            <SelectItem value="enviado">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                Enviado
                              </span>
                            </SelectItem>
                            <SelectItem value="confirmado">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                Confirmado
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <EnviarWhatsApp
                          pedido={selectedPedidoAsignacion}
                          asignaciones={[asig]}
                          buttonVariant="outline"
                          buttonSize="sm"
                          buttonText="Enviar WhatsApp"
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteAsignacionMutation.mutate(asig)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {selectedPedidoAsignacion && asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-base">No hay camareros asignados a este evento</p>
              </div>
            )}
          </div>
        </ScrollArea>
        </DialogContent>
        </Dialog>
        </div>
        );
        }