import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ClipboardList, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Pedidos() {
  const [showForm, setShowForm] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [formData, setFormData] = useState({
    cliente: '',
    lugar_evento: '',
    cantidad_camareros: 1,
    dia: '',
    entrada: '',
    salida: '',
    t_horas: 0,
    camisa: '',
    extra_transporte: false,
    notas: ''
  });

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pedido.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      resetForm();
      toast.success('Pedido creado');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      resetForm();
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

  const resetForm = () => {
    setShowForm(false);
    setEditingPedido(null);
    setFormData({
      cliente: '',
      lugar_evento: '',
      cantidad_camareros: 1,
      dia: '',
      entrada: '',
      salida: '',
      t_horas: 0,
      camisa: '',
      extra_transporte: false,
      notas: ''
    });
  };

  const handleEdit = (pedido) => {
    setEditingPedido(pedido);
    setFormData({
      cliente: pedido.cliente || '',
      lugar_evento: pedido.lugar_evento || '',
      cantidad_camareros: pedido.cantidad_camareros || 1,
      dia: pedido.dia ? pedido.dia.split('T')[0] : '',
      entrada: pedido.entrada || '',
      salida: pedido.salida || '',
      t_horas: pedido.t_horas || 0,
      camisa: pedido.camisa || '',
      extra_transporte: pedido.extra_transporte || false,
      notas: pedido.notas || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPedido) {
      updateMutation.mutate({ id: editingPedido.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Calcular horas automáticamente
  React.useEffect(() => {
    if (formData.entrada && formData.salida) {
      const [entH, entM] = formData.entrada.split(':').map(Number);
      const [salH, salM] = formData.salida.split(':').map(Number);
      let horas = (salH + salM/60) - (entH + entM/60);
      if (horas < 0) horas += 24;
      setFormData(prev => ({ ...prev, t_horas: Math.round(horas * 100) / 100 }));
    }
  }, [formData.entrada, formData.salida]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-[#1e3a5f]" />
              Pedidos
            </h1>
            <p className="text-slate-500 mt-1">Gestiona los pedidos de clientes</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Pedido
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Pedidos</p>
            <p className="text-2xl font-bold text-slate-800">{pedidos.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Camareros Necesarios</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">
              {pedidos.reduce((acc, p) => acc + (p.cantidad_camareros || 0), 0)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Hoy</p>
            <p className="text-2xl font-bold text-emerald-600">
              {pedidos.filter(p => p.dia === format(new Date(), 'yyyy-MM-dd')).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Esta Semana</p>
            <p className="text-2xl font-bold text-blue-600">
              {pedidos.filter(p => {
                const fecha = new Date(p.dia);
                const hoy = new Date();
                const diff = (fecha - hoy) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 7;
              }).length}
            </p>
          </Card>
        </div>

        {/* Tabla de Pedidos */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Lugar</TableHead>
                  <TableHead className="font-semibold text-center">Camareros</TableHead>
                  <TableHead className="font-semibold">Día</TableHead>
                  <TableHead className="font-semibold">Horario</TableHead>
                  <TableHead className="font-semibold text-center">Horas</TableHead>
                  <TableHead className="font-semibold">Camisa</TableHead>
                  <TableHead className="font-semibold text-center">Transporte</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {pedidos.map((pedido) => (
                    <motion.tr
                      key={pedido.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b hover:bg-slate-50/50"
                    >
                      <TableCell className="font-medium">{pedido.cliente}</TableCell>
                      <TableCell className="text-slate-600">{pedido.lugar_evento || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold">
                          {pedido.cantidad_camareros || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {pedido.dia ? format(new Date(pedido.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {pedido.entrada || '-'} - {pedido.salida || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-sm font-medium">
                          {pedido.t_horas || 0}h
                        </span>
                      </TableCell>
                      <TableCell>{pedido.camisa || '-'}</TableCell>
                      <TableCell className="text-center">
                        {pedido.extra_transporte ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(pedido)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteMutation.mutate(pedido.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {pedidos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                      No hay pedidos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal Form */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPedido ? 'Editar Pedido' : 'Nuevo Pedido'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Input
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lugar del Evento</Label>
                  <Input
                    value={formData.lugar_evento}
                    onChange={(e) => setFormData({ ...formData, lugar_evento: e.target.value })}
                    placeholder="Ubicación"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad de Camareros *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.cantidad_camareros}
                    onChange={(e) => setFormData({ ...formData, cantidad_camareros: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Día *</Label>
                  <Input
                    type="date"
                    value={formData.dia}
                    onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Entrada</Label>
                  <Input
                    type="time"
                    value={formData.entrada}
                    onChange={(e) => setFormData({ ...formData, entrada: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Salida</Label>
                  <Input
                    type="time"
                    value={formData.salida}
                    onChange={(e) => setFormData({ ...formData, salida: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Horas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.t_horas}
                    readOnly
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Camisa</Label>
                  <Input
                    value={formData.camisa}
                    onChange={(e) => setFormData({ ...formData, camisa: e.target.value })}
                    placeholder="Tipo o color"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Switch
                  id="extra_transporte"
                  checked={formData.extra_transporte}
                  onCheckedChange={(v) => setFormData({ ...formData, extra_transporte: v })}
                />
                <Label htmlFor="extra_transporte" className="cursor-pointer">
                  Extra Transporte
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
                  {editingPedido ? 'Guardar Cambios' : 'Crear Pedido'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}