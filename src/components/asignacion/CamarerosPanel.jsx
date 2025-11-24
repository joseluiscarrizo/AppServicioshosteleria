import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Phone, Mail, Search, Check, X, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const especialidadColors = {
  general: 'bg-slate-100 text-slate-700',
  cocteleria: 'bg-purple-100 text-purple-700',
  banquetes: 'bg-blue-100 text-blue-700',
  eventos_vip: 'bg-amber-100 text-amber-700',
  buffet: 'bg-emerald-100 text-emerald-700'
};

export default function CamarerosPanel({ 
  camareros, 
  pedidosPorCamarero, 
  selectedCamarero, 
  onSelectCamarero,
  onDragStart 
}) {
  const [busqueda, setBusqueda] = useState('');

  const camarerosFiltrados = camareros.filter(c => 
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Card className="bg-white shadow-lg border-slate-100 h-full flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-[#1e3a5f]" />
          Camareros Disponibles
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar camarero..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 border-slate-200"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {camarerosFiltrados.map((camarero) => {
            const numPedidos = pedidosPorCamarero[camarero.nombre] || 0;
            const isSelected = selectedCamarero?.id === camarero.id;

            return (
              <motion.div
                key={camarero.id}
                draggable
                onDragStart={(e) => onDragStart(e, camarero)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectCamarero(isSelected ? null : camarero)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                } ${!camarero.disponible ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 cursor-grab">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 truncate">
                          {camarero.nombre}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          #{camarero.codigo}
                        </span>
                      </div>
                      {camarero.disponible ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={`text-xs ${especialidadColors[camarero.especialidad] || especialidadColors.general}`}>
                        {camarero.especialidad?.replace('_', ' ') || 'general'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {numPedidos} pedido{numPedidos !== 1 ? 's' : ''}
                      </Badge>
                      {camarero.tallas_camisa && (
                        <Badge variant="outline" className="text-xs">
                          Talla: {camarero.tallas_camisa}
                        </Badge>
                      )}
                    </div>

                    {(camarero.telefono || camarero.email) && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        {camarero.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {camarero.telefono}
                          </span>
                        )}
                        {camarero.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {camarero.email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {camarerosFiltrados.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se encontraron camareros</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Total: {camareros.length} camareros</span>
          <span className="text-emerald-600">
            {camareros.filter(c => c.disponible).length} disponibles
          </span>
        </div>
      </div>
    </Card>
  );
}