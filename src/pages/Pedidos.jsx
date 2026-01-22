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
import { Plus, Pencil, Trash2, ClipboardList, X, Sparkles, Calendar, MapPin, Users, Ban, Copy, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import AIExtractor from '../components/pedidos/AIExtractor';
import TurnosEditor from '../components/pedidos/TurnosEditor';
import EntradaAutomatica from '../components/pedidos/EntradaAutomatica';
import EdicionRapida from '../components/pedidos/EdicionRapida';
import DuplicarEvento from '../components/pedidos/DuplicarEvento';
import EventoRecurrente from '../components/pedidos/EventoRecurrente';
import PedidoFormNuevo from '../components/pedidos/PedidoFormNuevo';

export default function Pedidos() {
  const [showForm, setShowForm] = useState(false);
  const [showAIExtractor, setShowAIExtractor] = useState(false);
  const [showEntradaAuto, setShowEntradaAuto] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [edicionRapida, setEdicionRapida] = useState({ open: false, pedido: null, campo: null });
  const [duplicarDialog, setDuplicarDialog] = useState({ open: false, pedido: null });
  const [recurrenteDialog, setRecurrenteDialog] = useState({ open: false, pedido: null });
  const [formData, setFormData] = useState({
    codigo_pedido: '',
    cliente_id: '',
    cliente: '',
    cliente_email_1: '',
    cliente_email_2: '',
    cliente_telefono_1: '',
    cliente_telefono_2: '',
    cliente_persona_contacto_1: '',
    cliente_persona_contacto_2: '',
    lugar_evento: '',
    dia: '',
    turnos: [],
    camisa: '',
    extra_transporte: false,
    notas: ''
  });

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      try {
        return await base44.entities.Pedido.list('-created_date', 200);
      } catch (error) {
        console.error('Error cargando pedidos:', error);
        return [];
      }
    }
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pedido.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      resetForm();
      toast.success('Pedido creado');
    },
    onError: (error) => {
      console.error('Error al crear pedido:', error);
      toast.error('Error al crear pedido: ' + (error.message || 'Error desconocido'));
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
      codigo_pedido: '',
      numero_cliente: 0,
      numero_pedido_cliente: 0,
      cliente_id: '',
      cliente: '',
      cliente_email_1: '',
      cliente_email_2: '',
      cliente_telefono_1: '',
      cliente_telefono_2: '',
      cliente_persona_contacto_1: '',
      cliente_persona_contacto_2: '',
      lugar_evento: '',
      link_ubicacion: '',
      dia: '',
      turnos: [],
      camisa: 'blanca',
      extra_transporte: false,
      notas: ''
    });
  };

  const handleEdit = (pedido) => {
    setEditingPedido(pedido);
    setFormData({
      codigo_pedido: pedido.codigo_pedido || '',
      numero_cliente: pedido.numero_cliente || 0,
      numero_pedido_cliente: pedido.numero_pedido_cliente || 0,
      cliente_id: pedido.cliente_id || '',
      cliente: pedido.cliente || '',
      cliente_email_1: pedido.cliente_email_1 || '',
      cliente_email_2: pedido.cliente_email_2 || '',
      cliente_telefono_1: pedido.cliente_telefono_1 || '',
      cliente_telefono_2: pedido.cliente_telefono_2 || '',
      cliente_persona_contacto_1: pedido.cliente_persona_contacto_1 || '',
      cliente_persona_contacto_2: pedido.cliente_persona_contacto_2 || '',
      lugar_evento: pedido.lugar_evento || '',
      link_ubicacion: pedido.link_ubicacion || '',
      dia: pedido.dia ? pedido.dia.split('T')[0] : '',
      turnos: pedido.turnos || [],
      camisa: pedido.camisa || 'blanca',
      extra_transporte: pedido.extra_transporte || false,
      notas: pedido.notas || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (dataFromForm) => {
    if (editingPedido) {
      updateMutation.mutate({ id: editingPedido.id, data: dataFromForm });
    } else {
      createMutation.mutate(dataFromForm);
    }
  };



  const handleAIExtraction = (extractedData) => {
    setFormData({
      cliente: extractedData.cliente || '',
      lugar_evento: extractedData.lugar_evento || '',
      direccion_completa: extractedData.direccion_completa || '',
      cantidad_camareros: extractedData.cantidad_camareros || 1,
      dia: extractedData.dia || '',
      entrada: extractedData.entrada || '',
      salida: extractedData.salida || '',
      t_horas: extractedData.t_horas || 0,
      camisa: extractedData.camisa || '',
      extra_transporte: extractedData.extra_transporte || false,
      notas: extractedData.notas || ''
    });
    setShowForm(true);
  };

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
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowEntradaAuto(true)}
              variant="outline"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Entrada Automatizada
            </Button>
            <Button 
              onClick={() => setShowAIExtractor(true)}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Crear con IA
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Pedido
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Pedidos</p>
            <p className="text-2xl font-bold text-slate-800">{pedidos.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Clientes Únicos</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(pedidos.map(p => p.cliente).filter(Boolean)).size}
            </p>
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
                  <TableHead className="font-semibold">Nº</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Lugar</TableHead>
                  <TableHead className="font-semibold text-center">Camareros</TableHead>
                  <TableHead className="font-semibold">Día</TableHead>
                  <TableHead className="font-semibold">Entrada</TableHead>
                  <TableHead className="font-semibold">Salida</TableHead>
                  <TableHead className="font-semibold text-center">Horas</TableHead>
                  <TableHead className="font-semibold">Camisa</TableHead>
                  <TableHead className="font-semibold text-center">Transporte</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {pedidos.flatMap((pedido) => {
                    const turnos = pedido.turnos && pedido.turnos.length > 0 
                      ? pedido.turnos 
                      : [{ cantidad_camareros: pedido.cantidad_camareros || 0, entrada: pedido.entrada || '-', salida: pedido.salida || '-', t_horas: pedido.t_horas || 0 }];
                    
                    return turnos.map((turno, index) => (
                      <motion.tr
                        key={`${pedido.id}-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b hover:bg-slate-50/50"
                      >
                        {index === 0 ? (
                          <>
                            <TableCell className="font-mono text-sm font-semibold text-[#1e3a5f]" rowSpan={turnos.length}>
                              {pedido.codigo_pedido || '-'}
                            </TableCell>
                            <TableCell rowSpan={turnos.length}>
                              <Badge
                                className={`cursor-pointer ${
                                  pedido.estado_evento === 'cancelado' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                  pedido.estado_evento === 'finalizado' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' :
                                  pedido.estado_evento === 'en_curso' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                                onClick={() => setEdicionRapida({ open: true, pedido, campo: 'estado' })}
                              >
                                {pedido.estado_evento === 'cancelado' && <Ban className="w-3 h-3 mr-1" />}
                                {pedido.estado_evento === 'cancelado' ? 'Cancelado' :
                                 pedido.estado_evento === 'finalizado' ? 'Finalizado' :
                                 pedido.estado_evento === 'en_curso' ? 'En Curso' : 'Planificado'}
                              </Badge>
                            </TableCell>
                            <TableCell 
                              className="font-medium cursor-pointer hover:text-[#1e3a5f] hover:underline"
                              onClick={() => setEdicionRapida({ open: true, pedido, campo: 'cliente' })}
                              rowSpan={turnos.length}
                            >
                              {pedido.cliente}
                            </TableCell>
                            <TableCell 
                              className="text-slate-600 cursor-pointer hover:text-[#1e3a5f] hover:underline"
                              onClick={() => setEdicionRapida({ open: true, pedido, campo: 'lugar' })}
                              rowSpan={turnos.length}
                            >
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {pedido.lugar_evento || 'Añadir lugar'}
                              </div>
                            </TableCell>
                          </>
                        ) : null}
                        <TableCell className="text-center">
                          <span 
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold"
                          >
                            {turno.cantidad_camareros || 0}
                          </span>
                        </TableCell>
                        {index === 0 ? (
                          <TableCell
                            className="cursor-pointer hover:text-[#1e3a5f] hover:underline"
                            onClick={() => setEdicionRapida({ open: true, pedido, campo: 'fecha' })}
                            rowSpan={turnos.length}
                          >
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {pedido.dia ? format(new Date(pedido.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                            </div>
                          </TableCell>
                        ) : null}
                        <TableCell className="font-mono text-sm">
                          {turno.entrada || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {turno.salida || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-sm font-medium">
                            {turno.t_horas || 0}h
                          </span>
                        </TableCell>
                        {index === 0 ? (
                          <>
                            <TableCell rowSpan={turnos.length}>{pedido.camisa || '-'}</TableCell>
                            <TableCell className="text-center" rowSpan={turnos.length}>
                              {pedido.extra_transporte ? (
                                <span className="text-emerald-600">✓</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right" rowSpan={turnos.length}>
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setDuplicarDialog({ open: true, pedido })}
                                  className="h-8 w-8"
                                  title="Duplicar evento"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setRecurrenteDialog({ open: true, pedido })}
                                  className="h-8 w-8"
                                  title="Crear eventos recurrentes"
                                >
                                  <Repeat className="w-4 h-4" />
                                </Button>
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
                          </>
                        ) : null}
                      </motion.tr>
                    ));
                  })}
                </AnimatePresence>
                {pedidos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-slate-500">
                      No hay pedidos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal Form */}
        <AnimatePresence>
          {showForm && (
            <PedidoFormNuevo
              pedido={editingPedido}
              onSubmit={handleSubmit}
              onCancel={resetForm}
            />
          )}
        </AnimatePresence>

        {/* Entrada Automatizada */}
        <Dialog open={showEntradaAuto} onOpenChange={setShowEntradaAuto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Entrada Automatizada de Pedidos</DialogTitle>
            </DialogHeader>
            <EntradaAutomatica />
          </DialogContent>
        </Dialog>

        {/* AI Extractor Modal */}
        <AIExtractor 
          open={showAIExtractor}
          onClose={() => setShowAIExtractor(false)}
          onPedidoExtraido={handleAIExtraction}
        />

        {/* Edición Rápida */}
        <EdicionRapida
          pedido={edicionRapida.pedido}
          open={edicionRapida.open}
          onOpenChange={(open) => setEdicionRapida({ ...edicionRapida, open })}
          campo={edicionRapida.campo}
        />

        {/* Duplicar Evento */}
        <DuplicarEvento
          open={duplicarDialog.open}
          onOpenChange={(open) => setDuplicarDialog({ ...duplicarDialog, open })}
          pedidoOriginal={duplicarDialog.pedido}
        />

        {/* Evento Recurrente */}
        <EventoRecurrente
          open={recurrenteDialog.open}
          onOpenChange={(open) => setRecurrenteDialog({ ...recurrenteDialog, open })}
          pedidoBase={recurrenteDialog.pedido}
        />
        </div>
        </div>
        );
        }