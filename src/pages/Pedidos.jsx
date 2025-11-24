import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, Users } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PedidoForm from '../components/pedidos/PedidoForm';
import PedidosTable from '../components/pedidos/PedidosTable';
import ExcelHandler from '../components/pedidos/ExcelHandler';
import NotificationService from '../components/notificaciones/NotificationService';
import { showNotificationToast } from '../components/notificaciones/NotificationToast';

export default function Pedidos() {
  const [showForm, setShowForm] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pedido.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setShowForm(false);
      toast.success('Pedido creado correctamente');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, originalPedido }) => {
      const result = await base44.entities.Pedido.update(id, data);
      
      // Verificar cambios de estado y enviar notificaciones
      if (originalPedido) {
        if (originalPedido.enviado !== data.enviado) {
          await NotificationService.notificarCambioEstado(
            { ...data, id }, 
            'enviado', 
            originalPedido.enviado, 
            data.enviado
          );
          showNotificationToast(
            'estado_cambio',
            data.enviado ? 'Pedido Enviado' : 'Pedido Desmarcado',
            `El pedido de ${data.camarero} para ${data.cliente} ha sido actualizado.`
          );
        }
        if (originalPedido.confirmado !== data.confirmado) {
          await NotificationService.notificarCambioEstado(
            { ...data, id }, 
            'confirmado', 
            originalPedido.confirmado, 
            data.confirmado
          );
          showNotificationToast(
            data.confirmado ? 'exito' : 'alerta',
            data.confirmado ? 'Pedido Confirmado' : 'Pedido Pendiente',
            `El pedido de ${data.camarero} para ${data.cliente} ha sido actualizado.`
          );
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      setShowForm(false);
      setEditingPedido(null);
      toast.success('Pedido actualizado');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pedido.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido eliminado');
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Pedido.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Datos importados correctamente');
    }
  });

  const handleSubmit = (data) => {
    if (editingPedido) {
      updateMutation.mutate({ 
        id: editingPedido.id, 
        data, 
        originalPedido: editingPedido 
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pedido) => {
    setEditingPedido(pedido);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este pedido?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectChange = (id, checked) => {
    setSelectedIds(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? pedidos.map(p => p.id) : []);
  };

  const handleImport = (data) => {
    bulkCreateMutation.mutate(data);
  };

  const totalHoras = pedidos.reduce((sum, p) => sum + (p.t_horas || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Gestión de Pedidos
              </h1>
              <p className="text-slate-500 mt-1">
                Coordina los servicios de camareros para tus eventos
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ExcelHandler pedidos={pedidos} onImport={handleImport} />
              <Button 
                onClick={() => { setEditingPedido(null); setShowForm(true); }}
                className="bg-[#1e3a5f] hover:bg-[#152a45] text-white shadow-lg shadow-[#1e3a5f]/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Alta
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Pedidos</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{pedidos.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Horas</p>
            <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{totalHoras}h</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Confirmados</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {pedidos.filter(p => p.confirmado).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {pedidos.filter(p => !p.confirmado).length}
            </p>
          </div>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <PedidoForm
              pedido={editingPedido}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingPedido(null); }}
            />
          )}
        </AnimatePresence>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
          </div>
        ) : (
          <PedidosTable
            pedidos={pedidos}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelectChange={handleSelectChange}
            onSelectAll={handleSelectAll}
          />
        )}
      </div>
    </div>
  );
}