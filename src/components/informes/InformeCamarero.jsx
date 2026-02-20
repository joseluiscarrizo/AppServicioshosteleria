import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExportadorExcel } from './ExportadorExcel';

export default function InformeCamarero() {
  const [selectedCamarero, setSelectedCamarero] = useState('');

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  const camarero = camareros.find(c => c.id === selectedCamarero);

  // Asignaciones del camarero seleccionado
  const asignacionesCamarero = asignaciones
    .filter(a => a.camarero_id === selectedCamarero)
    .map(a => {
      const pedido = pedidos.find(p => p.id === a.pedido_id);
      if (!pedido) return null;

      // Calcular horas: si hay turnos, sumar todas las horas; si no, usar t_horas del pedido
      let horas = 0;
      if (pedido.turnos?.length > 0) {
        horas = pedido.turnos.reduce((sum, t) => sum + (t.t_horas || 0), 0);
      } else {
        horas = pedido.t_horas || 0;
      }

      return {
        dia: pedido.dia,
        cliente: pedido.cliente,
        lugar_evento: pedido.lugar_evento,
        horas
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.dia || '').localeCompare(a.dia || ''));

  // Calcular totales
  const totalHoras = asignacionesCamarero.reduce((sum, a) => sum + a.horas, 0);
  const totalEventos = asignacionesCamarero.length;

  const exportarExcel = () => {
    if (!camarero || asignacionesCamarero.length === 0) return;
    ExportadorExcel.exportarInformeCamarero(camarero, asignacionesCamarero, totalEventos, totalHoras);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Seleccionar Camarero</label>
        <Select value={selectedCamarero} onValueChange={setSelectedCamarero}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir camarero..." />
          </SelectTrigger>
          <SelectContent>
            {camareros.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre} {c.codigo ? `(#${c.codigo})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {camarero && asignacionesCamarero.length > 0 ? (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{camarero.nombre}</h3>
                <p className="text-sm text-slate-500">Código: {camarero.codigo || 'Sin código'}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportarExcel} variant="outline" size="sm">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Eventos</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{totalEventos}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Horas Trabajadas</p>
                <p className="text-xl font-bold text-emerald-600">{totalHoras.toFixed(2)}h</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-slate-800 mb-4">Historial de Eventos</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Lugar del Evento</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asignacionesCamarero.map((asig, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {asig.dia ? format(new Date(asig.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                      </TableCell>
                      <TableCell>{asig.cliente || '-'}</TableCell>
                      <TableCell className="text-slate-600">{asig.lugar_evento || 'Sin ubicación'}</TableCell>
                      <TableCell className="text-right font-semibold">{asig.horas.toFixed(2)}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      ) : camarero ? (
        <Card className="p-12 text-center text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Este camarero no tiene eventos asignados</p>
        </Card>
      ) : (
        <Card className="p-12 text-center text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Selecciona un camarero para ver el informe</p>
        </Card>
      )}
    </div>
  );
}