import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCheck, UserX, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

const estadoColors = {
  disponible: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  ocupado: 'bg-amber-100 text-amber-700 border-amber-300',
  no_disponible: 'bg-red-100 text-red-700 border-red-300'
};

const estadoLabels = {
  disponible: 'Disponible',
  ocupado: 'Ocupado',
  no_disponible: 'No Disponible'
};

export default function GestionDisponibilidad({ open, onClose }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  const queryClient = useQueryClient();

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const updateEstadoMutation = useMutation({
    mutationFn: ({ camareroId, nuevoEstado }) => 
      base44.entities.Camarero.update(camareroId, { estado_actual: nuevoEstado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Estado actualizado');
    }
  });

  const camarerosFiltrados = camareros.filter(c => {
    const matchBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                         c.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || c.estado_actual === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const cambiarEstado = (camareroId, nuevoEstado) => {
    updateEstadoMutation.mutate({ camareroId, nuevoEstado });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gestión de Disponibilidad</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="disponible">Disponibles</SelectItem>
                <SelectItem value="ocupado">Ocupados</SelectItem>
                <SelectItem value="no_disponible">No Disponibles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 bg-emerald-50">
              <p className="text-xs text-emerald-600">Disponibles</p>
              <p className="text-2xl font-bold text-emerald-700">
                {camareros.filter(c => c.estado_actual === 'disponible').length}
              </p>
            </Card>
            <Card className="p-3 bg-amber-50">
              <p className="text-xs text-amber-600">Ocupados</p>
              <p className="text-2xl font-bold text-amber-700">
                {camareros.filter(c => c.estado_actual === 'ocupado').length}
              </p>
            </Card>
            <Card className="p-3 bg-red-50">
              <p className="text-xs text-red-600">No Disponibles</p>
              <p className="text-2xl font-bold text-red-700">
                {camareros.filter(c => c.estado_actual === 'no_disponible').length}
              </p>
            </Card>
          </div>

          {/* Lista de Camareros */}
          <div className="overflow-auto max-h-[400px] space-y-2">
            {camarerosFiltrados.map(camarero => (
              <Card key={camarero.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{camarero.nombre}</p>
                      <p className="text-xs text-slate-500 font-mono">#{camarero.codigo}</p>
                    </div>
                    <Badge className={estadoColors[camarero.estado_actual || 'disponible']}>
                      {estadoLabels[camarero.estado_actual || 'disponible']}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cambiarEstado(camarero.id, 'disponible')}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      disabled={camarero.estado_actual === 'disponible'}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Disponible
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cambiarEstado(camarero.id, 'ocupado')}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      disabled={camarero.estado_actual === 'ocupado'}
                    >
                      Ocupado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cambiarEstado(camarero.id, 'no_disponible')}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={camarero.estado_actual === 'no_disponible'}
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      No Disponible
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}