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

export default function CalendarioAsignacionRapida() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAsignacionPanel, setShowAsignacionPanel] = useState(false);
  const [selectedPedidoAsignacion, setSelectedPedidoAsignacion] = useState(null);
  const [busquedaCamarero, setBusquedaCamarero] = useState('');
  const [showTodosCamareros, setShowTodosCamareros] = useState(false);
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
    <div className="space-y-4">
      <Card className="p-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 h-[75vh]">
            {/* Lista de Eventos */}
            <div className="flex flex-col h-full">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#1e3a5f]" />
                Eventos del Día
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
                      className={`p-4 cursor-pointer transition-all ${
                        selectedPedidoAsignacion?.id === pedido.id 
                          ? 'border-[#1e3a5f] border-2 shadow-md' 
                          : 'hover:border-slate-400'
                      }`}
                      onClick={() => setSelectedPedidoAsignacion(pedido)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{pedido.cliente}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            {pedido.lugar_evento || 'Sin ubicación'}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3" />
                            {pedido.entrada} - {pedido.salida}
                          </div>
                        </div>
                        <Badge className={`${
                          porcentaje === 100 ? 'bg-emerald-100 text-emerald-700' :
                          porcentaje > 0 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {asigsPedido.length}/{totalNeeded}
                        </Badge>
                      </div>

                      {asigsPedido.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {asigsPedido.map(asig => (
                            <Badge key={asig.id} variant="outline" className="text-xs">
                              {asig.camarero_nombre}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
                </div>
              </ScrollArea>
            </div>

            {/* Panel de Camareros Disponibles */}
            <div className="border-l border-slate-200 pl-6 flex flex-col h-full">
              {selectedPedidoAsignacion ? (
                <>
                  {/* Info del evento seleccionado */}
                  <div className="mb-4">
                    <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-lg p-3">
                      <h3 className="font-semibold text-slate-800 mb-1">{selectedPedidoAsignacion.cliente}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
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
                  </div>

                  {/* Asignaciones Actuales */}
                  {asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).length > 0 && (
                    <div className="mb-3 flex-shrink-0">
                      <h5 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                        ✓ Asignados ({asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).length})
                      </h5>
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1.5 pr-2">
                          {asignaciones.filter(a => a.pedido_id === selectedPedidoAsignacion.id).map(asig => (
                            <div key={asig.id} className="flex items-center justify-between text-sm p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <span className="text-slate-800 font-medium text-xs truncate">{asig.camarero_nombre}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAsignacionMutation.mutate(asig);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Camareros Disponibles */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="mb-2 flex-shrink-0">
                      <h4 
                        className="font-semibold text-slate-800 mb-2 flex items-center gap-1 cursor-pointer hover:text-[#1e3a5f] transition-colors text-sm"
                        onClick={() => setShowTodosCamareros(true)}
                      >
                        <Users className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
                        <span className="truncate">Disponibles ({getCamarerosDisponibles(selectedPedidoAsignacion).filter(c => 
                          !busquedaCamarero || 
                          c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                          c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                        ).length})</span>
                      </h4>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <Input
                          placeholder="Buscar..."
                          value={busquedaCamarero}
                          onChange={(e) => setBusquedaCamarero(e.target.value)}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <ScrollArea className="flex-1 -mr-2 pr-2">
                      <div className="space-y-1.5">
                        {getCamarerosDisponibles(selectedPedidoAsignacion)
                          .filter(c => 
                            !busquedaCamarero || 
                            c.nombre.toLowerCase().includes(busquedaCamarero.toLowerCase()) ||
                            c.codigo.toLowerCase().includes(busquedaCamarero.toLowerCase())
                          )
                          .map(camarero => (
                          <div
                            key={camarero.id}
                            className="p-2 border-2 border-slate-200 rounded-lg hover:border-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-all cursor-pointer"
                            onClick={() => handleAsignarCamarero(selectedPedidoAsignacion, camarero)}
                          >
                            <div className="flex items-start gap-1.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="font-medium text-slate-800 text-xs truncate">{camarero.nombre}</span>
                                  {camarero.valoracion_promedio > 0 && (
                                    <span className="flex items-center gap-0.5 text-amber-500 text-xs flex-shrink-0">
                                      <Star className="w-3 h-3 fill-amber-400" />
                                      {camarero.valoracion_promedio.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-mono">#{camarero.codigo}</p>
                                {camarero.especialidad && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {camarero.especialidad}
                                  </Badge>
                                )}
                              </div>
                              <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white flex-shrink-0 h-7 w-7 p-0">
                                <Plus className="w-3 h-3" />
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
                          <div className="text-center py-6 text-slate-400">
                            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">
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
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Selecciona un evento para asignar camareros</p>
                  </div>
                </div>
              )}
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
        </div>
        );
        }