import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const tiposCliente = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'catering', label: 'Catering' },
  { value: 'masia', label: 'Masía' }
];

export default function PedidoForm({ pedido, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    coordinador: '',
    dia: '',
    cliente: '',
    cliente_email: '',
    tipo_cliente: '',
    lugar_evento: '',
    camisa: '',
    cod_camarero: '',
    camarero: '',
    entrada: '',
    salida: '',
    t_horas: 0,
    enviado: false,
    confirmado: false,
    notas: ''
  });

  useEffect(() => {
    if (pedido) {
      setFormData({
        ...pedido,
        dia: pedido.dia ? pedido.dia.split('T')[0] : ''
      });
    }
  }, [pedido]);

  // Calcular horas automáticamente
  useEffect(() => {
    if (formData.entrada && formData.salida) {
      const [entH, entM] = formData.entrada.split(':').map(Number);
      const [salH, salM] = formData.salida.split(':').map(Number);
      let horas = (salH + salM/60) - (entH + entM/60);
      if (horas < 0) horas += 24;
      setFormData(prev => ({ ...prev, t_horas: Math.round(horas * 100) / 100 }));
    }
  }, [formData.entrada, formData.salida]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">
          {pedido ? 'Editar Pedido' : 'Nuevo Pedido'}
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="coordinador">Coordinador</Label>
            <Input
              id="coordinador"
              value={formData.coordinador}
              onChange={(e) => handleChange('coordinador', e.target.value)}
              placeholder="Nombre del coordinador"
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dia">Día</Label>
            <Input
              id="dia"
              type="date"
              value={formData.dia}
              onChange={(e) => handleChange('dia', e.target.value)}
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_cliente">Tipo de Cliente</Label>
            <Select value={formData.tipo_cliente} onValueChange={(v) => handleChange('tipo_cliente', v)}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposCliente.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => handleChange('cliente', e.target.value)}
              placeholder="Nombre del cliente"
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_email">Email del Cliente</Label>
            <Input
              id="cliente_email"
              type="email"
              value={formData.cliente_email}
              onChange={(e) => handleChange('cliente_email', e.target.value)}
              placeholder="email@cliente.com"
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lugar_evento">Lugar del Evento</Label>
            <Input
              id="lugar_evento"
              value={formData.lugar_evento}
              onChange={(e) => handleChange('lugar_evento', e.target.value)}
              placeholder="Ubicación"
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="camisa">Camisa</Label>
            <Input
              id="camisa"
              value={formData.camisa}
              onChange={(e) => handleChange('camisa', e.target.value)}
              placeholder="Tipo/color de camisa"
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cod_camarero">Cód. Camarero</Label>
            <Input
              id="cod_camarero"
              value={formData.cod_camarero}
              onChange={(e) => handleChange('cod_camarero', e.target.value)}
              placeholder="Código"
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="camarero">Camarero</Label>
            <Input
              id="camarero"
              value={formData.camarero}
              onChange={(e) => handleChange('camarero', e.target.value)}
              placeholder="Nombre del camarero"
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entrada">Entrada</Label>
            <Input
              id="entrada"
              type="time"
              value={formData.entrada}
              onChange={(e) => handleChange('entrada', e.target.value)}
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salida">Salida</Label>
            <Input
              id="salida"
              type="time"
              value={formData.salida}
              onChange={(e) => handleChange('salida', e.target.value)}
              className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t_horas">Total Horas</Label>
            <Input
              id="t_horas"
              type="number"
              step="0.5"
              value={formData.t_horas}
              onChange={(e) => handleChange('t_horas', parseFloat(e.target.value) || 0)}
              className="border-slate-200 bg-slate-50"
              readOnly
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enviado">Enviado</Label>
              <Switch
                id="enviado"
                checked={formData.enviado}
                onCheckedChange={(v) => handleChange('enviado', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="confirmado">Confirmado</Label>
              <Switch
                id="confirmado"
                checked={formData.confirmado}
                onCheckedChange={(v) => handleChange('confirmado', v)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notas">Notas</Label>
          <Textarea
            id="notas"
            value={formData.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            placeholder="Notas adicionales..."
            className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
            {pedido ? 'Guardar Cambios' : 'Crear Pedido'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}