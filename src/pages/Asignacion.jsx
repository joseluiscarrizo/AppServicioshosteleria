import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CamarerosPanel from '../components/asignacion/CamarerosPanel';
import PedidosAsignacion from '../components/asignacion/PedidosAsignacion';
import GestionCamareros from '../components/asignacion/GestionCamareros';
import NotificationService from '../components/notificaciones/NotificationService';
import { showNotificationToast } from '../components/notificaciones/NotificationToast';

export default function Asignacion() {
  const [selectedCamarero, setSelectedCamarero] = useState(null);
  const [filtroAsignacion, setFiltroAsignacion] = useState('todos');
  const [draggedCamarero, setDraggedCamarero] = useState(null);
  const [showCamareroForm, setShowCamareroForm] = useState(false);
  const [editingCamarero, setEditingCamarero] = useState(null);

  const queryClient = useQueryClient();

  const { data: camareros = [], isLoading: loadingCamareros } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200)
  });

  const { data: disponibilidades = [] } = useQuery({
    queryKey: ['disponibilidades'],
    queryFn: () => base44.entities.Disponibilidad.list('-fecha', 500)
  });

  const { data: festivos = [] } = useQuery({
    queryKey: ['festivos'],
    queryFn: () => base44.entities.Festivo.list('fecha')
  });

  // Contar pedidos por camarero
  const pedidosPorCamarero = useMemo(() => {
    const conteo = {};
    pedidos.forEach(p => {
      if (p.camarero) {
        conteo[p.camarero] = (conteo[p.camarero] || 0) + 1;
      }
    });
    return conteo;
  }, [pedidos]);

  const asignarMutation = useMutation({
    mutationFn: async ({ pedido, camarero }) => {
      const anteriorCamarero = pedido.camarero;
      
      await base44.entities.Pedido.update(pedido.id, {
        camarero: camarero.nombre,
        cod_camarero: camarero.codigo
      });

      // Crear notificación
      await base44.entities.Notificacion.create({
        tipo: 'estado_cambio',
        titulo: 'Camarero Asignado',
        mensaje: `${camarero.nombre} ha sido asignado al pedido de ${pedido.cliente} para el ${pedido.dia}. ${anteriorCamarero ? `Anterior: ${anteriorCamarero}` : ''}`,
        pedido_id: pedido.id,
        coordinador: pedido.coordinador,
        leida: false,
        prioridad: 'media'
      });

      return { pedido, camarero, anteriorCamarero };
    },
    onSuccess: ({ camarero, anteriorCamarero }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      
      showNotificationToast(
        'exito',
        'Camarero Asignado',
        `${camarero.nombre} asignado correctamente${anteriorCamarero ? ` (anterior: ${anteriorCamarero})` : ''}`
      );
      toast.success(`${camarero.nombre} asignado al pedido`);
    }
  });

  const desasignarMutation = useMutation({
    mutationFn: async (pedido) => {
      const anteriorCamarero = pedido.camarero;
      
      await base44.entities.Pedido.update(pedido.id, {
        camarero: '',
        cod_camarero: ''
      });

      // Crear notificación
      await base44.entities.Notificacion.create({
        tipo: 'alerta',
        titulo: 'Camarero Desasignado',
        mensaje: `${anteriorCamarero} ha sido desasignado del pedido de ${pedido.cliente} para el ${pedido.dia}. El pedido está pendiente de nueva asignación.`,
        pedido_id: pedido.id,
        coordinador: pedido.coordinador,
        leida: false,
        prioridad: 'alta'
      });

      return { pedido, anteriorCamarero };
    },
    onSuccess: ({ anteriorCamarero }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      
      showNotificationToast(
        'alerta',
        'Camarero Desasignado',
        `${anteriorCamarero} ya no está asignado al pedido`
      );
      toast.success('Camarero desasignado');
    }
  });

  const handleDragStart = (e, camarero) => {
    setDraggedCamarero(camarero);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, pedido) => {
    e.preventDefault();
    if (draggedCamarero && draggedCamarero.disponible) {
      asignarMutation.mutate({ pedido, camarero: draggedCamarero });
    }
    setDraggedCamarero(null);
  };

  const handleAsignar = (pedido, camarero) => {
    asignarMutation.mutate({ pedido, camarero });
  };

  const handleDesasignar = (pedido) => {
    desasignarMutation.mutate(pedido);
  };

  const isLoading = loadingCamareros || loadingPedidos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-[#1e3a5f]" />
                Asignación de Camareros
              </h1>
              <p className="text-slate-500 mt-1">
                Arrastra camareros a los pedidos o usa el selector para asignarlos
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Tabs value={filtroAsignacion} onValueChange={setFiltroAsignacion}>
                <TabsList className="bg-white border border-slate-200">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="sin_asignar">Sin Asignar</TabsTrigger>
                  <TabsTrigger value="asignados">Asignados</TabsTrigger>
                  {selectedCamarero && (
                    <TabsTrigger value="seleccionado">
                      {selectedCamarero.nombre}
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
              
              <Button 
                onClick={() => {
                  setEditingCamarero(null);
                  setShowCamareroForm(true);
                }}
                className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Camarero
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Camareros</p>
            <p className="text-2xl font-bold text-slate-800">{camareros.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Disponibles</p>
            <p className="text-2xl font-bold text-emerald-600">
              {camareros.filter(c => c.disponible).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Pedidos Asignados</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">
              {pedidos.filter(p => p.camarero).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Pedidos Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">
              {pedidos.filter(p => !p.camarero).length}
            </p>
          </div>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[#1e3a5f] mx-auto mb-3" />
              <p className="text-slate-500">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 350px)', minHeight: '500px' }}>
            {/* Panel de Camareros */}
            <div className="lg:col-span-1">
              <CamarerosPanel
                camareros={camareros}
                pedidosPorCamarero={pedidosPorCamarero}
                selectedCamarero={selectedCamarero}
                onSelectCamarero={setSelectedCamarero}
                onDragStart={handleDragStart}
                disponibilidades={disponibilidades}
                festivos={festivos}
              />
            </div>

            {/* Panel de Pedidos */}
            <div className="lg:col-span-2">
              <PedidosAsignacion
                pedidos={pedidos}
                camareros={camareros}
                onAsignar={handleAsignar}
                onDesasignar={handleDesasignar}
                onDrop={handleDrop}
                selectedCamarero={selectedCamarero}
                filtroAsignacion={filtroAsignacion}
                disponibilidades={disponibilidades}
                festivos={festivos}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal para añadir/editar camarero */}
      <GestionCamareros
        open={showCamareroForm}
        onOpenChange={setShowCamareroForm}
        editingCamarero={editingCamarero}
      />
    </div>
  );
}