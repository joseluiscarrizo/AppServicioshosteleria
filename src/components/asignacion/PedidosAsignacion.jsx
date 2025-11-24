import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Search, Calendar, MapPin, User, UserMinus, ArrowRight, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const tipoClienteColors = {
  restaurante: 'bg-emerald-100 text-emerald-700',
  hotel: 'bg-blue-100 text-blue-700',
  catering: 'bg-purple-100 text-purple-700',
  masia: 'bg-amber-100 text-amber-700'
};

export default function PedidosAsignacion({ 
  pedidos, 
  camareros,
  onAsignar, 
  onDesasignar,
  onDrop,
  selectedCamarero,
  filtroAsignacion 
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [dragOver, setDragOver] = useState(null);

  const pedidosFiltrados = pedidos.filter(p => {
    const matchBusqueda = 
      p.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.lugar_evento?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.camarero?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchFecha = !filtroFecha || p.dia === filtroFecha;
    
    const matchAsignacion = 
      filtroAsignacion === 'todos' ||
      (filtroAsignacion === 'asignados' && p.camarero) ||
      (filtroAsignacion === 'sin_asignar' && !p.camarero) ||
      (filtroAsignacion === 'seleccionado' && selectedCamarero && p.camarero === selectedCamarero.nombre);

    return matchBusqueda && matchFecha && matchAsignacion;
  });

  const handleDragOver = (e, pedidoId) => {
    e.preventDefault();
    setDragOver(pedidoId);
  };

  const handleDrop = (e, pedido) => {
    e.preventDefault();
    setDragOver(null);
    onDrop(e, pedido);
  };

  return (
    <Card className="bg-white shadow-lg border-slate-100 h-full flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#1e3a5f]" />
          Pedidos
          {selectedCamarero && (
            <Badge className="bg-[#1e3a5f] text-white ml-2">
              Filtrado: {selectedCamarero.nombre}
            </Badge>
          )}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar pedido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 border-slate-200"
            />
          </div>
          <Input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="border-slate-200"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          <AnimatePresence>
            {pedidosFiltrados.map((pedido) => (
              <motion.div
                key={pedido.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onDragOver={(e) => handleDragOver(e, pedido.id)}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, pedido)}
                className={`p-4 rounded-xl border transition-all ${
                  dragOver === pedido.id 
                    ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 border-dashed border-2' 
                    : 'border-slate-200 hover:border-slate-300'
                } ${!pedido.camarero ? 'bg-amber-50/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">
                        {pedido.cliente}
                      </span>
                      {pedido.tipo_cliente && (
                        <Badge className={`text-xs ${tipoClienteColors[pedido.tipo_cliente]}`}>
                          {pedido.tipo_cliente}
                        </Badge>
                      )}
                      {pedido.confirmado ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                      {pedido.dia && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(pedido.dia), 'dd MMM yyyy', { locale: es })}
                        </span>
                      )}
                      {pedido.lugar_evento && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {pedido.lugar_evento}
                        </span>
                      )}
                      {pedido.entrada && pedido.salida && (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {pedido.entrada} - {pedido.salida}
                        </span>
                      )}
                    </div>

                    {/* Camarero asignado */}
                    <div className="mt-3 flex items-center gap-2">
                      {pedido.camarero ? (
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {pedido.camarero}
                          </span>
                          {pedido.cod_camarero && (
                            <span className="text-xs text-slate-400 font-mono">
                              #{pedido.cod_camarero}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => onDesasignar(pedido)}
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-amber-600 font-medium">
                            Sin asignar
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          <Select onValueChange={(camareroId) => {
                            const camarero = camareros.find(c => c.id === camareroId);
                            if (camarero) onAsignar(pedido, camarero);
                          }}>
                            <SelectTrigger className="w-[180px] h-8 text-sm">
                              <SelectValue placeholder="Asignar camarero" />
                            </SelectTrigger>
                            <SelectContent>
                              {camareros.filter(c => c.disponible).map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nombre} (#{c.codigo})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {pedidosFiltrados.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No se encontraron pedidos</p>
              <p className="text-xs mt-1">Prueba cambiando los filtros</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{pedidosFiltrados.length} pedidos</span>
          <div className="flex gap-3">
            <span className="text-emerald-600">
              {pedidosFiltrados.filter(p => p.camarero).length} asignados
            </span>
            <span className="text-amber-600">
              {pedidosFiltrados.filter(p => !p.camarero).length} pendientes
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}