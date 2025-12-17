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

export default function PedidoFormNuevo({ pedido, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    numero_cliente: 0,
    numero_pedido_cliente: 0,
    cliente: '',
    lugar_evento: '',
    dia: '',
    link_ubicacion: '',
    camisa: 'blanca',
    turnos: [{ cantidad_camareros: 1, entrada: '', salida: '', t_horas: 0 }],
    extra_transporte: false,
    notas: ''
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-numero_cliente', 1000)
  });

  useEffect(() => {
    if (pedido) {
      setFormData({
        ...pedido,
        dia: pedido.dia ? pedido.dia.split('T')[0] : '',
        turnos: pedido.turnos?.length > 0 ? pedido.turnos : [{ cantidad_camareros: 1, entrada: '', salida: '', t_horas: 0 }]
      });
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
  }, [pedido, pedidos]);

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
      className="bg-white rounded-2xl shadow-xl border border-slate-100 mb-8 max-h-[85vh] flex flex-col"
    >
      <div className="flex justify-between items-center p-8 pb-4 border-b">
        <h2 className="text-xl font-semibold text-slate-800">
          {pedido ? 'Editar Pedido' : 'Nuevo Pedido'}
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-8">
      <form id="pedido-form" onSubmit={handleSubmit} className="space-y-6 py-6">
        {/* Números automáticos */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="space-y-2">
            <Label>Número Cliente</Label>
            <Input
              value={formData.numero_cliente}
              readOnly
              className="bg-white font-mono font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label>Número Pedido</Label>
            <Input
              value={formData.numero_pedido_cliente}
              readOnly
              className="bg-white font-mono font-semibold"
            />
          </div>
        </div>

        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente *</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => handleChange('cliente', e.target.value)}
              placeholder="Nombre del cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lugar_evento">Lugar del Evento</Label>
            <Input
              id="lugar_evento"
              value={formData.lugar_evento}
              onChange={(e) => handleChange('lugar_evento', e.target.value)}
              placeholder="Ubicación del evento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dia">Día *</Label>
            <Input
              id="dia"
              type="date"
              value={formData.dia}
              onChange={(e) => handleChange('dia', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_ubicacion">Link Google Maps</Label>
            <Input
              id="link_ubicacion"
              value={formData.link_ubicacion}
              onChange={(e) => handleChange('link_ubicacion', e.target.value)}
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="camisa">Camisa</Label>
            <Select value={formData.camisa} onValueChange={(v) => handleChange('camisa', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blanca">Blanca</SelectItem>
                <SelectItem value="negra">Negra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex items-end">
            <div className="flex items-center gap-3 pb-2">
              <Switch
                id="extra_transporte"
                checked={formData.extra_transporte}
                onCheckedChange={(v) => handleChange('extra_transporte', v)}
              />
              <Label htmlFor="extra_transporte" className="cursor-pointer">
                Extra Transporte
              </Label>
            </div>
          </div>
        </div>

        {/* Turnos y Horarios */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Turnos y Horarios</Label>
            <Button type="button" onClick={agregarTurno} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Añadir Turno
            </Button>
          </div>

          <div className="space-y-3">
            {formData.turnos.map((turno, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-700">Turno {index + 1}</h4>
                  {formData.turnos.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarTurno(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Camareros</Label>
                    <Input
                      type="number"
                      min="1"
                      value={turno.cantidad_camareros}
                      onChange={(e) => handleTurnoChange(index, 'cantidad_camareros', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Entrada</Label>
                    <Input
                      type="time"
                      value={turno.entrada}
                      onChange={(e) => handleTurnoChange(index, 'entrada', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Salida</Label>
                    <Input
                      type="time"
                      value={turno.salida}
                      onChange={(e) => handleTurnoChange(index, 'salida', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Horas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={turno.t_horas}
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <Label htmlFor="notas">Notas</Label>
          <Textarea
            id="notas"
            value={formData.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            placeholder="Notas adicionales sobre el pedido..."
            rows={4}
          />
        </div>

      </form>
      </ScrollArea>

      {/* Botones fijos abajo */}
      <div className="flex justify-end gap-3 p-8 pt-4 border-t bg-white">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="pedido-form" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
          {pedido ? 'Guardar Cambios' : 'Crear Pedido'}
        </Button>
      </div>
    </motion.div>
  );
}