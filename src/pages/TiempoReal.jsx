import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const estadoColors = {
  pendiente: 'bg-slate-100',
  enviado: 'bg-orange-200',
  confirmado: 'bg-emerald-200',
  alta: 'bg-blue-200'
};

export default function TiempoReal() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200),
    refetchInterval: 10000 // Refrescar cada 10 segundos
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000),
    refetchInterval: 5000 // Refrescar cada 5 segundos
  });

  const createAsignacionMutation = useMutation({
    mutationFn: (data) => base44.entities.AsignacionCamarero.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    }
  });

  const updateAsignacionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AsignacionCamarero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    }
  });

  // Generar filas: una por cada slot de camarero de cada pedido
  const filas = useMemo(() => {
    const result = [];
    
    const pedidosFiltrados = pedidos.filter(p => {
      const matchBusqueda = !busqueda || 
        p.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.lugar_evento?.toLowerCase().includes(busqueda.toLowerCase());
      const matchFecha = !filtroFecha || p.dia === filtroFecha;
      return matchBusqueda && matchFecha;
    });

    pedidosFiltrados.forEach(pedido => {
      const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
      const cantidadSlots = pedido.cantidad_camareros || 1;

      for (let i = 0; i < cantidadSlots; i++) {
        const asignacion = asignacionesPedido[i];
        result.push({
          pedido,
          slot: i + 1,
          asignacion: asignacion || null
        });
      }
    });

    return result;
  }, [pedidos, asignaciones, busqueda, filtroFecha]);

  // Obtener camareros disponibles para un pedido
  const getCamarerosDisponibles = (pedido, asignacionActual) => {
    const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
    const idsAsignados = asignacionesPedido.map(a => a.camarero_id);
    
    return camareros.filter(c => {
      if (asignacionActual && c.id === asignacionActual.camarero_id) return true;
      if (idsAsignados.includes(c.id)) return false;
      return c.disponible;
    });
  };

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

  const isLoading = loadingPedidos || loadingAsignaciones;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <Clock className="w-8 h-8 text-[#1e3a5f]" />
              Tiempo Real
            </h1>
            <p className="text-slate-500 mt-1">Vista en tiempo real de todos los pedidos y asignaciones</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Actualizando automáticamente
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
          <span className="text-sm font-medium text-slate-700">Estados:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-300"></div>
            <span className="text-sm text-slate-600">Enviado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-300"></div>
            <span className="text-sm text-slate-600">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-300"></div>
            <span className="text-sm text-slate-600">Alta</span>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente o lugar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
        </Card>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1e3a5f]" />
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100">
                    <TableHead className="font-semibold w-28">Día</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Lugar Evento</TableHead>
                    <TableHead className="font-semibold w-56">Camarero</TableHead>
                    <TableHead className="font-semibold w-24 text-center">Entrada</TableHead>
                    <TableHead className="font-semibold w-24 text-center">Salida</TableHead>
                    <TableHead className="font-semibold w-36">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((fila, index) => {
                    const bgColor = fila.asignacion ? estadoColors[fila.asignacion.estado] : 'bg-white';
                    
                    return (
                      <TableRow key={`${fila.pedido.id}-${fila.slot}`} className={`${bgColor} border-b`}>
                        <TableCell className="font-medium">
                          {fila.pedido.dia ? format(new Date(fila.pedido.dia), 'dd MMM', { locale: es }) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{fila.pedido.cliente}</TableCell>
                        <TableCell>{fila.pedido.lugar_evento || '-'}</TableCell>
                        <TableCell>
                          {fila.asignacion ? (
                            <span className="font-medium">
                              {fila.asignacion.camarero_nombre}
                              <span className="text-xs text-slate-500 ml-1">
                                (#{fila.asignacion.camarero_codigo})
                              </span>
                            </span>
                          ) : (
                            <Select onValueChange={(camareroId) => {
                              const camarero = camareros.find(c => c.id === camareroId);
                              if (camarero) handleAsignarCamarero(fila.pedido, camarero);
                            }}>
                              <SelectTrigger className="h-8 text-sm bg-white">
                                <SelectValue placeholder="Seleccionar camarero..." />
                              </SelectTrigger>
                              <SelectContent>
                                {getCamarerosDisponibles(fila.pedido, null).map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombre} (#{c.codigo})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {fila.pedido.entrada || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {fila.pedido.salida || '-'}
                        </TableCell>
                        <TableCell>
                          {fila.asignacion ? (
                            <Select 
                              value={fila.asignacion.estado}
                              onValueChange={(v) => handleCambiarEstado(fila.asignacion.id, v)}
                            >
                              <SelectTrigger className={`h-8 text-sm ${
                                fila.asignacion.estado === 'enviado' ? 'bg-orange-300 border-orange-400' :
                                fila.asignacion.estado === 'confirmado' ? 'bg-emerald-300 border-emerald-400' :
                                fila.asignacion.estado === 'alta' ? 'bg-blue-300 border-blue-400' :
                                'bg-white'
                              }`}>
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
                          ) : (
                            <span className="text-sm text-slate-400">Sin asignar</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        No hay pedidos para mostrar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Resumen */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Filas</p>
            <p className="text-2xl font-bold text-slate-800">{filas.length}</p>
          </Card>
          <Card className="p-4 bg-orange-50">
            <p className="text-sm text-orange-600">Enviados</p>
            <p className="text-2xl font-bold text-orange-700">
              {filas.filter(f => f.asignacion?.estado === 'enviado').length}
            </p>
          </Card>
          <Card className="p-4 bg-emerald-50">
            <p className="text-sm text-emerald-600">Confirmados</p>
            <p className="text-2xl font-bold text-emerald-700">
              {filas.filter(f => f.asignacion?.estado === 'confirmado').length}
            </p>
          </Card>
          <Card className="p-4 bg-blue-50">
            <p className="text-sm text-blue-600">Alta</p>
            <p className="text-2xl font-bold text-blue-700">
              {filas.filter(f => f.asignacion?.estado === 'alta').length}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}