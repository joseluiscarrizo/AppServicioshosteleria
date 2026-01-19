import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import SelectorCliente from '../crm/SelectorCliente';
import InfoCliente from '../crm/InfoCliente';

export default function PedidoFormNuevo({ pedido, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    numero_cliente: 0,
    numero_pedido_cliente: 0,
    cliente: '',
    cliente_id: null,
    cliente_email_1: '',
    cliente_email_2: '',
    cliente_telefono_1: '',
    cliente_telefono_2: '',
    cliente_persona_contacto_1: '',
    cliente_persona_contacto_2: '',
    lugar_evento: '',
    dia: '',
    link_ubicacion: '',
    camisa: 'blanca',
    turnos: [{ cantidad_camareros: 1, entrada: '', salida: '', t_horas: 0 }],
    extra_transporte: false,
    notas: ''
  });

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-numero_cliente', 1000)
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  useEffect(() => {
    if (pedido) {
      setFormData({
        ...pedido,
        dia: pedido.dia ? pedido.dia.split('T')[0] : '',
        turnos: pedido.turnos?.length > 0 ? pedido.turnos : [{ cantidad_camareros: 1, entrada: '', salida: '', t_horas: 0 }]
      });
      
      // Buscar cliente asociado
      if (pedido.cliente_id) {
        const cliente = clientes.find(c => c.id === pedido.cliente_id);
        if (cliente) setClienteSeleccionado(cliente);
      }
    } else {
      // Generar números automáticos para nuevo pedido
      const maxNumeroCliente = pedidos.reduce((max, p) => Math.max(max, p.numero_cliente || 0), 0);
      const maxNumeroPedido = pedidos.reduce((max, p) => Math.max(max, p.numero_pedido_cliente || 0), 0);
      
      setFormData(prev => ({
        ...prev,
        numero_cliente: maxNumeroCliente + 1,
        numero_pedido_cliente: maxNumeroPedido + 1
      }));
    }
  }, [pedido, pedidos, clientes]);

  const handleSelectCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente.id,
      cliente: cliente.nombre,
      cliente_email_1: cliente.email_1 || '',
      cliente_email_2: cliente.email_2 || '',
      cliente_telefono_1: cliente.telefono_1 || '',
      cliente_telefono_2: cliente.telefono_2 || '',
      cliente_persona_contacto_1: cliente.persona_contacto_1 || '',
      cliente_persona_contacto_2: cliente.persona_contacto_2 || ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calcular cantidad total de camareros y horas totales para retrocompatibilidad
    const cantidadTotal = formData.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0);
    const horasTotal = formData.turnos.reduce((sum, t) => sum + (t.t_horas || 0), 0);
    const primerTurno = formData.turnos[0] || {};
    
    onSubmit({
      ...formData,
      cantidad_camareros: cantidadTotal,
      entrada: primerTurno.entrada,
      salida: primerTurno.salida,
      t_horas: horasTotal
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTurnoChange = (index, field, value) => {
    const newTurnos = [...formData.turnos];
    newTurnos[index] = { ...newTurnos[index], [field]: value };
    
    // Calcular horas automáticamente
    if (field === 'entrada' || field === 'salida') {
      const turno = newTurnos[index];
      if (turno.entrada && turno.salida) {
        const [entH, entM] = turno.entrada.split(':').map(Number);
        const [salH, salM] = turno.salida.split(':').map(Number);
        let horas = (salH + salM/60) - (entH + entM/60);
        if (horas < 0) horas += 24;
        newTurnos[index].t_horas = Math.round(horas * 100) / 100;
      }
    }
    
    setFormData(prev => ({ ...prev, turnos: newTurnos }));
  };

  const agregarTurno = () => {
    setFormData(prev => ({
      ...prev,
      turnos: [...prev.turnos, { cantidad_camareros: 1, entrada: '', salida: '', t_horas: 0 }]
    }));
  };

  const eliminarTurno = (index) => {
    if (formData.turnos.length > 1) {
      setFormData(prev => ({
        ...prev,
        turnos: prev.turnos.filter((_, i) => i !== index)
      }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">
            {pedido ? '✏️ Editar Pedido' : '✨ Nuevo Pedido'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 bg-slate-50" type="always" style={{ height: 'calc(95vh - 200px)' }}>
          <div className="px-6 py-5 pr-4">
      <form id="pedido-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Números automáticos */}
        <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-sm font-semibold text-indigo-900">Identificadores</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-indigo-700">Número Cliente</Label>
              <Input
                value={formData.numero_cliente}
                readOnly
                className="bg-white font-mono font-bold text-indigo-900 border-indigo-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-indigo-700">Número Pedido</Label>
              <Input
                value={formData.numero_pedido_cliente}
                readOnly
                className="bg-white font-mono font-bold text-indigo-900 border-indigo-200"
              />
            </div>
          </div>
        </Card>

        {/* CRM - Selector de Cliente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5 bg-white border-slate-200">
              <SelectorCliente 
                onSelectCliente={handleSelectCliente}
                clienteActual={clienteSeleccionado}
              />
            </Card>

            {/* Información básica */}
            <Card className="p-5 bg-white border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#1e3a5f]"></div>
                <span className="text-sm font-semibold text-slate-800">Información del Evento</span>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="space-y-2">
            <Label htmlFor="lugar_evento" className="text-slate-700 font-medium">Lugar del Evento</Label>
            <Input
              id="lugar_evento"
              value={formData.lugar_evento}
              onChange={(e) => handleChange('lugar_evento', e.target.value)}
              placeholder="Ubicación del evento"
              className="border-slate-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dia" className="text-slate-700 font-medium">Día *</Label>
            <Input
              id="dia"
              type="date"
              value={formData.dia}
              onChange={(e) => handleChange('dia', e.target.value)}
              required
              className="border-slate-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_ubicacion" className="text-slate-700 font-medium">Link Google Maps</Label>
            <Input
              id="link_ubicacion"
              value={formData.link_ubicacion}
              onChange={(e) => handleChange('link_ubicacion', e.target.value)}
              placeholder="https://maps.google.com/..."
              className="border-slate-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="camisa" className="text-slate-700 font-medium">Camisa</Label>
            <Select value={formData.camisa} onValueChange={(v) => handleChange('camisa', v)}>
              <SelectTrigger className="border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blanca">👕 Blanca</SelectItem>
                <SelectItem value="negra">👔 Negra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex items-end">
            <div className="flex items-center gap-3 pb-2 p-3 bg-blue-50 rounded-lg border border-blue-200 w-full">
              <Switch
                id="extra_transporte"
                checked={formData.extra_transporte}
                onCheckedChange={(v) => handleChange('extra_transporte', v)}
              />
              <Label htmlFor="extra_transporte" className="cursor-pointer text-blue-900 font-medium">
                🚗 Extra Transporte
              </Label>
            </div>
          </div>
        </div>
        </Card>

        {/* Turnos y Horarios */}
        <Card className="p-5 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1e3a5f]"></div>
              <Label className="text-lg font-semibold text-slate-800">⏰ Turnos y Horarios</Label>
            </div>
            <Button type="button" onClick={agregarTurno} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Añadir Turno
            </Button>
          </div>

          <div className="space-y-3">
            {formData.turnos.map((turno, index) => (
              <Card key={index} className="p-4 bg-gradient-to-br from-slate-50 to-white border-slate-300 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs">
                      {index + 1}
                    </span>
                    Turno {index + 1}
                  </h4>
                  {formData.turnos.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarTurno(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">👥 Camareros</Label>
                    <Input
                      type="number"
                      min="1"
                      value={turno.cantidad_camareros}
                      onChange={(e) => handleTurnoChange(index, 'cantidad_camareros', parseInt(e.target.value) || 1)}
                      className="border-slate-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f] font-semibold"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">🕐 Entrada</Label>
                    <Input
                      type="time"
                      value={turno.entrada}
                      onChange={(e) => handleTurnoChange(index, 'entrada', e.target.value)}
                      className="border-slate-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">🕐 Salida</Label>
                    <Input
                      type="time"
                      value={turno.salida}
                      onChange={(e) => handleTurnoChange(index, 'salida', e.target.value)}
                      className="border-slate-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">⏱️ Horas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={turno.t_horas}
                      readOnly
                      className="bg-blue-50 border-blue-200 font-bold text-blue-900"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
          </div>

          {/* Info Cliente */}
          <div className="lg:col-span-1">
            <InfoCliente cliente={clienteSeleccionado} />
          </div>
        </div>

        {/* Notas */}
        <Card className="p-5 bg-white border-slate-200 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#1e3a5f]"></div>
            <Label htmlFor="notas" className="text-lg font-semibold text-slate-800">📝 Notas Adicionales</Label>
          </div>
          <Textarea
            id="notas"
            value={formData.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            placeholder="Añade cualquier información relevante sobre el pedido..."
            rows={4}
            className="border-slate-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f] resize-none"
          />
        </Card>

        </form>
          </div>
        </ScrollArea>

        {/* Botones fijos abajo */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-white shadow-lg flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel} className="px-6">
          Cancelar
        </Button>
        <Button type="submit" form="pedido-form" className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] hover:from-[#152a45] hover:to-[#1e3a5f] text-white px-8 shadow-md">
          {pedido ? '💾 Guardar Cambios' : '✨ Crear Pedido'}
        </Button>
        </div>
      </div>
    </motion.div>
  );
}