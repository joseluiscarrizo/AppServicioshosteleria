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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200/50 w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-8 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-[#1e3a5f] via-[#2d5a8f] to-[#1e3a5f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {pedido ? '✏️' : '✨'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {pedido ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h2>
              <p className="text-white/70 text-sm">Complete la información del evento</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20 rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 bg-slate-50 overflow-y-auto" type="always">
          <div className="px-6 py-5 pr-4">
      <form id="pedido-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Números automáticos */}
        <Card className="p-5 bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-50 border-2 border-indigo-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-lg">🔢</span>
            </div>
            <span className="text-base font-bold text-indigo-900">Identificadores del Sistema</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-indigo-800 font-semibold text-sm">Número Cliente</Label>
              <Input
                value={formData.numero_cliente}
                readOnly
                className="bg-white/80 font-mono font-bold text-indigo-900 border-2 border-indigo-200 h-11 text-lg shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-indigo-800 font-semibold text-sm">Número Pedido</Label>
              <Input
                value={formData.numero_pedido_cliente}
                readOnly
                className="bg-white/80 font-mono font-bold text-indigo-900 border-2 border-indigo-200 h-11 text-lg shadow-sm"
              />
            </div>
          </div>
        </Card>

        {/* CRM - Selector de Cliente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-6 bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg">👤</span>
                </div>
                <span className="text-base font-bold text-slate-800">Selección de Cliente</span>
              </div>
              <SelectorCliente 
                onSelectCliente={handleSelectCliente}
                clienteActual={clienteSeleccionado}
              />
            </Card>

            {/* Información básica */}
            <Card className="p-6 bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg">📋</span>
                </div>
                <span className="text-base font-bold text-slate-800">Información del Evento</span>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div className="space-y-2">
            <Label htmlFor="lugar_evento" className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              📍 Lugar del Evento
            </Label>
            <Input
              id="lugar_evento"
              value={formData.lugar_evento}
              onChange={(e) => handleChange('lugar_evento', e.target.value)}
              placeholder="Ej: Hotel Marriott, Salón de Eventos..."
              className="border-2 border-slate-300 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dia" className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              📅 Fecha del Evento *
            </Label>
            <Input
              id="dia"
              type="date"
              value={formData.dia}
              onChange={(e) => handleChange('dia', e.target.value)}
              required
              className="border-2 border-slate-300 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_ubicacion" className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              🗺️ Link Google Maps
            </Label>
            <Input
              id="link_ubicacion"
              value={formData.link_ubicacion}
              onChange={(e) => handleChange('link_ubicacion', e.target.value)}
              placeholder="https://maps.google.com/..."
              className="border-2 border-slate-300 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="camisa" className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              👔 Tipo de Camisa
            </Label>
            <Select value={formData.camisa} onValueChange={(v) => handleChange('camisa', v)}>
              <SelectTrigger className="border-2 border-slate-300 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blanca">👕 Blanca</SelectItem>
                <SelectItem value="negra">👔 Negra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex items-end">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 w-full shadow-sm hover:shadow-md transition-shadow">
              <Switch
                id="extra_transporte"
                checked={formData.extra_transporte}
                onCheckedChange={(v) => handleChange('extra_transporte', v)}
              />
              <Label htmlFor="extra_transporte" className="cursor-pointer text-blue-900 font-semibold text-sm flex items-center gap-2">
                🚗 Incluir Extra de Transporte
              </Label>
            </div>
          </div>
        </div>
        </Card>

        {/* Turnos y Horarios */}
        <Card className="p-6 bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
                <span className="text-white text-lg">⏰</span>
              </div>
              <Label className="text-base font-bold text-slate-800">Turnos y Horarios</Label>
            </div>
            <Button type="button" onClick={agregarTurno} size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Añadir Turno
            </Button>
          </div>

          <div className="space-y-3">
            {formData.turnos.map((turno, index) => (
              <Card key={index} className="p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50 border-2 border-slate-300 hover:shadow-lg hover:border-[#1e3a5f]/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] text-white text-sm font-bold shadow-md">
                      {index + 1}
                    </span>
                    <span className="text-base">Turno {index + 1}</span>
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
                    <Label className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
                      👥 Camareros
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={turno.cantidad_camareros}
                      onChange={(e) => handleTurnoChange(index, 'cantidad_camareros', parseInt(e.target.value) || 1)}
                      className="border-2 border-slate-300 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 font-bold text-lg h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
                      🕐 Entrada
                    </Label>
                    <Input
                      type="time"
                      value={turno.entrada}
                      onChange={(e) => handleTurnoChange(index, 'entrada', e.target.value)}
                      className="border-2 border-slate-300 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
                      🕐 Salida
                    </Label>
                    <Input
                      type="time"
                      value={turno.salida}
                      onChange={(e) => handleTurnoChange(index, 'salida', e.target.value)}
                      className="border-2 border-slate-300 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
                      ⏱️ Total Horas
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={turno.t_horas}
                      readOnly
                      className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 font-bold text-blue-900 text-lg h-11 shadow-sm"
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
        <Card className="p-6 bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-lg">📝</span>
            </div>
            <Label htmlFor="notas" className="text-base font-bold text-slate-800">Notas Adicionales</Label>
          </div>
          <Textarea
            id="notas"
            value={formData.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            placeholder="Añade cualquier información relevante sobre el pedido: requisitos especiales, observaciones, instrucciones particulares..."
            rows={4}
            className="border-2 border-slate-300 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 resize-none"
          />
        </Card>

        </form>
          </div>
        </ScrollArea>

        {/* Botones fijos abajo */}
        <div className="flex justify-end gap-4 px-8 py-5 border-t-2 border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-xl flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel} className="px-8 h-11 text-base font-semibold border-2 hover:bg-slate-50">
          Cancelar
        </Button>
        <Button type="submit" form="pedido-form" className="bg-gradient-to-r from-[#1e3a5f] via-[#2d5a8f] to-[#1e3a5f] hover:from-[#152a45] hover:via-[#1e3a5f] hover:to-[#152a45] text-white px-10 h-11 text-base font-bold shadow-lg hover:shadow-xl transition-all">
          {pedido ? '💾 Guardar Cambios' : '✨ Crear Pedido'}
        </Button>
        </div>
      </div>
    </motion.div>
  );
}