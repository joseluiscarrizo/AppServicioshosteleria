import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UserPlus, Users, ClipboardList, Search, MapPin, Clock, Calendar, RefreshCw, X, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const estadoColors = {
  pendiente: 'bg-slate-100 text-slate-700 border-slate-200',
  enviado: 'bg-orange-100 text-orange-700 border-orange-300',
  confirmado: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  alta: 'bg-blue-100 text-blue-700 border-blue-300'
};

const estadoBgColors = {
  pendiente: 'bg-slate-50',
  enviado: 'bg-orange-50',
  confirmado: 'bg-emerald-50',
  alta: 'bg-blue-50'
};

export default function Asignacion() {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200)
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000)
  });

  const createAsignacionMutation = useMutation({
    mutationFn: async (data) => {
      const asignacion = await base44.entities.AsignacionCamarero.create(data);
      return { asignacion, data };
    },
    onSuccess: async ({ asignacion, data }) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      
      // Enviar notificación al camarero
      const pedido = pedidos.find(p => p.id === data.pedido_id);
      const camarero = camareros.find(c => c.id === data.camarero_id);
      
      if (pedido && camarero) {
        try {
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
        } catch (e) {
          console.error('Error enviando notificación:', e);
        }
      }
      
      toast.success('Camarero asignado y notificado');
    }
  });

  const updateAsignacionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AsignacionCamarero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    }
  });

  const deleteAsignacionMutation = useMutation({
    mutationFn: (id) => base44.entities.AsignacionCamarero.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Asignación eliminada');
    }
  });

  // Obtener asignaciones de un pedido
  const getAsignacionesPedido = (pedidoId) => {
    return asignaciones.filter(a => a.pedido_id === pedidoId);
  };

  // Calcular estado del pedido
  const getEstadoPedido = (pedido) => {
    const asignacionesPedido = getAsignacionesPedido(pedido.id);
    const cantidadNecesaria = pedido.cantidad_camareros || 0;
    
    if (asignacionesPedido.length === 0 || asignacionesPedido.length < cantidadNecesaria) {
      return 'incompleto'; // Rojo - faltan camareros
    }
    
    const todosConfirmados = asignacionesPedido.every(a => a.estado === 'confirmado');
    const todosAlta = asignacionesPedido.every(a => a.estado === 'alta');
    
    if (todosAlta) return 'alta'; // Azul
    if (todosConfirmados) return 'completo'; // Verde
    return 'incompleto'; // Rojo
  };

  // Verificar si un camarero puede ser asignado (regla de 6 horas)
  const puedoAsignarCamarero = (camareroId, pedido) => {
    const asignacionesCamarero = asignaciones.filter(a => a.camarero_id === camareroId);
    
    for (const asig of asignacionesCamarero) {
      if (asig.fecha_pedido === pedido.dia) {
        // Mismo día, verificar horas
        const horaEntradaNueva = pedido.entrada ? parseInt(pedido.entrada.split(':')[0]) : 0;
        const horaSalidaExistente = asig.hora_salida ? parseInt(asig.hora_salida.split(':')[0]) : 0;
        const horaEntradaExistente = asig.hora_entrada ? parseInt(asig.hora_entrada.split(':')[0]) : 0;
        const horaSalidaNueva = pedido.salida ? parseInt(pedido.salida.split(':')[0]) : 24;
        
        // Verificar solapamiento o menos de 6 horas de diferencia
        const diff1 = Math.abs(horaEntradaNueva - horaSalidaExistente);
        const diff2 = Math.abs(horaEntradaExistente - horaSalidaNueva);
        
        if (diff1 < 6 && diff2 < 6) {
          return false;
        }
      }
    }
    return true;
  };

  // Obtener camareros disponibles para un pedido
  const getCamarerosDisponibles = (pedido) => {
    const asignacionesPedido = getAsignacionesPedido(pedido.id);
    const idsAsignados = asignacionesPedido.map(a => a.camarero_id);
    
    return camareros.filter(c => {
      if (idsAsignados.includes(c.id)) return false;
      if (!c.disponible) return false;
      return puedoAsignarCamarero(c.id, pedido);
    });
  };

  // Filtrar pedidos
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const matchBusqueda = !busqueda || 
        p.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.lugar_evento?.toLowerCase().includes(busqueda.toLowerCase());
      const matchFecha = !filtroFecha || p.dia === filtroFecha;
      return matchBusqueda && matchFecha;
    });
  }, [pedidos, busqueda, filtroFecha]);

  const handleAsignarCamarero = (pedido, camarero) => {
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

  const handleCambiarEstado = (asignacionId, nuevoEstado) => {
    updateAsignacionMutation.mutate({ id: asignacionId, data: { estado: nuevoEstado } });
  };

  const isLoading = loadingPedidos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-[#1e3a5f]" />
            Asignación de Camareros
          </h1>
          <p className="text-slate-500 mt-1">Asigna camareros a los pedidos</p>
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-sm text-slate-600">Incompleto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500"></div>
            <span className="text-sm text-slate-600">Completo (Confirmados)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-slate-600">Alta</span>
          </div>
          <div className="flex items-center gap-2 ml-4 border-l pl-4">
            <div className="w-4 h-4 rounded bg-orange-400"></div>
            <span className="text-sm text-slate-600">Enviado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-400"></div>
            <span className="text-sm text-slate-600">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-400"></div>
            <span className="text-sm text-slate-600">Alta</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1e3a5f]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel de Pedidos */}
            <div className="lg:col-span-5">
              <Card className="h-[calc(100vh-280px)] flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#1e3a5f]" />
                    Pedidos ({pedidosFiltrados.length})
                  </h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar cliente..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Input
                      type="date"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>

                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-2">
                    {pedidosFiltrados.map(pedido => {
                      const estado = getEstadoPedido(pedido);
                      const asignacionesPedido = getAsignacionesPedido(pedido.id);
                      const isSelected = selectedPedido?.id === pedido.id;
                      
                      const bgColor = estado === 'completo' ? 'bg-emerald-500' :
                                     estado === 'alta' ? 'bg-blue-500' : 'bg-red-500';

                      return (
                        <motion.div
                          key={pedido.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedPedido(pedido)}
                          className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                            isSelected ? 'border-[#1e3a5f] shadow-lg' : 'border-transparent'
                          } ${bgColor} text-white`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{pedido.cliente}</h4>
                              <div className="flex items-center gap-2 mt-1 text-white/80 text-sm">
                                <MapPin className="w-3 h-3" />
                                <span>{pedido.lugar_evento || 'Sin ubicación'}</span>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {pedido.dia ? format(new Date(pedido.dia), 'dd MMM', { locale: es }) : '-'}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {pedido.entrada || '-'} - {pedido.salida || '-'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
                                {asignacionesPedido.length}/{pedido.cantidad_camareros || 0}
                              </div>
                              {isSelected && <ChevronRight className="w-5 h-5 mt-2 ml-auto" />}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            </div>

            {/* Panel de Asignaciones */}
            <div className="lg:col-span-7">
              <Card className="h-[calc(100vh-280px)] flex flex-col">
                {selectedPedido ? (
                  <>
                    <div className="p-4 border-b bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-800">{selectedPedido.cliente}</h3>
                          <p className="text-sm text-slate-500">
                            {selectedPedido.lugar_evento} • {selectedPedido.dia ? format(new Date(selectedPedido.dia), 'dd MMM yyyy', { locale: es }) : ''} • {selectedPedido.entrada} - {selectedPedido.salida}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedPedido(null)}>
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                      <div className="flex flex-wrap gap-3">
                        {/* Slots de camareros */}
                        {Array.from({ length: selectedPedido.cantidad_camareros || 0 }).map((_, index) => {
                          const asignacion = getAsignacionesPedido(selectedPedido.id)[index];
                          
                          return (
                            <div 
                              key={index}
                              className={`w-56 rounded-xl border-2 p-4 transition-all ${
                                asignacion 
                                  ? `${estadoBgColors[asignacion.estado]} border-slate-200` 
                                  : 'bg-slate-50 border-dashed border-slate-300'
                              }`}
                            >
                              {asignacion ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-800">
                                      {asignacion.camarero_nombre}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-slate-400 hover:text-red-500"
                                      onClick={() => deleteAsignacionMutation.mutate(asignacion.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <span className="text-xs text-slate-500 font-mono">
                                    #{asignacion.camarero_codigo}
                                  </span>
                                  
                                  {/* Selector de estado */}
                                  <Select 
                                    value={asignacion.estado} 
                                    onValueChange={(v) => handleCambiarEstado(asignacion.id, v)}
                                  >
                                    <SelectTrigger className={`mt-3 h-8 text-sm ${estadoColors[asignacion.estado]}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pendiente">Pendiente</SelectItem>
                                      <SelectItem value="enviado">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                          Enviado
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="confirmado">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                          Confirmado
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="alta">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                          Alta
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-slate-400 mb-2">Slot {index + 1}</p>
                                  <Select onValueChange={(camareroId) => {
                                    const camarero = camareros.find(c => c.id === camareroId);
                                    if (camarero) handleAsignarCamarero(selectedPedido, camarero);
                                  }}>
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Asignar camarero" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getCamarerosDisponibles(selectedPedido).map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.nombre} (#{c.codigo})
                                        </SelectItem>
                                      ))}
                                      {getCamarerosDisponibles(selectedPedido).length === 0 && (
                                        <div className="px-2 py-1 text-sm text-slate-500">
                                          No hay camareros disponibles
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Selecciona un pedido para gestionar las asignaciones</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}