import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText as FileIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExportadorExcel } from './ExportadorExcel';

export default function InformeCliente() {
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedPedido, setSelectedPedido] = useState('');

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 2000)
  });

  // Obtener lista de clientes únicos
  const clientes = [...new Set(pedidos.map(p => p.cliente).filter(Boolean))].sort();

  // Pedidos del cliente seleccionado
  const pedidosCliente = pedidos.filter(p => p.cliente === selectedCliente);

  // Pedido seleccionado
  const pedido = pedidos.find(p => p.id === selectedPedido);

  // Calcular datos del informe
  const datosInforme = pedido ? {
    dia: pedido.dia,
    cantidad_camareros: pedido.turnos?.length > 0 
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0),
    total_horas: pedido.turnos?.length > 0
      ? pedido.turnos.reduce((sum, t) => sum + ((t.t_horas || 0) * (t.cantidad_camareros || 0)), 0)
      : ((pedido.t_horas || 0) * (pedido.cantidad_camareros || 0)),
    turnos: pedido.turnos || []
  } : null;

  const exportarCSV = () => {
    if (!datosInforme || !pedido) return;

    const rows = [
      ['Informe por Cliente'],
      ['Cliente:', pedido.cliente],
      ['Lugar:', pedido.lugar_evento || '-'],
      ['Día:', datosInforme.dia ? format(new Date(datosInforme.dia), 'dd/MM/yyyy', { locale: es }) : '-'],
      [],
      ['Detalle de Turnos'],
      ['Turno', 'Camareros', 'Entrada', 'Salida', 'Horas', 'Total Horas']
    ];

    if (datosInforme.turnos.length > 0) {
      datosInforme.turnos.forEach((turno, i) => {
        rows.push([
          `Turno ${i + 1}`,
          turno.cantidad_camareros || 0,
          turno.entrada || '-',
          turno.salida || '-',
          turno.t_horas || 0,
          (turno.t_horas || 0) * (turno.cantidad_camareros || 0)
        ]);
      });
    } else {
      rows.push([
        'Único',
        pedido.cantidad_camareros || 0,
        pedido.entrada || '-',
        pedido.salida || '-',
        pedido.t_horas || 0,
        datosInforme.total_horas
      ]);
    }

    rows.push([]);
    rows.push(['Total Camareros:', datosInforme.cantidad_camareros]);
    rows.push(['Total Horas Trabajadas:', datosInforme.total_horas.toFixed(2)]);

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_cliente_${selectedCliente}_${datosInforme.dia}.csv`;
    a.click();
  };

  const exportarPDF = () => {
    if (!datosInforme || !pedido) return;
    
    ExportadorPDF.generarInformeCliente({
      cliente: pedido.cliente,
      lugar: pedido.lugar_evento || '-',
      fecha: datosInforme.dia ? format(new Date(datosInforme.dia), 'dd/MM/yyyy', { locale: es }) : '-',
      totalCamareros: datosInforme.cantidad_camareros,
      totalHoras: datosInforme.total_horas.toFixed(2),
      turnos: datosInforme.turnos.length > 0 ? datosInforme.turnos.map(t => ({
        cantidad: t.cantidad_camareros || 0,
        entrada: t.entrada || '-',
        salida: t.salida || '-',
        horas: t.t_horas || 0,
        total: ((t.t_horas || 0) * (t.cantidad_camareros || 0)).toFixed(2)
      })) : [{
        cantidad: pedido.cantidad_camareros || 0,
        entrada: pedido.entrada || '-',
        salida: pedido.salida || '-',
        horas: pedido.t_horas || 0,
        total: datosInforme.total_horas.toFixed(2)
      }]
    }, `informe_cliente_${selectedCliente}_${datosInforme.dia}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Seleccionar Cliente</label>
          <Select value={selectedCliente} onValueChange={(v) => { setSelectedCliente(v); setSelectedPedido(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Elegir cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(cliente => (
                <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCliente && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Seleccionar Evento</label>
            <Select value={selectedPedido} onValueChange={setSelectedPedido}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir evento..." />
              </SelectTrigger>
              <SelectContent>
                {pedidosCliente.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.lugar_evento || 'Sin ubicación'} - {p.dia ? format(new Date(p.dia), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {datosInforme && pedido ? (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{pedido.cliente}</h3>
                <p className="text-sm text-slate-500">{pedido.lugar_evento || 'Sin ubicación'}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportarCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={exportarPDF} variant="outline" size="sm">
                  <FileIcon className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Día del Evento</p>
                <p className="text-xl font-bold text-slate-800">
                  {datosInforme.dia ? format(new Date(datosInforme.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Camareros</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{datosInforme.cantidad_camareros}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Horas Trabajadas</p>
                <p className="text-xl font-bold text-emerald-600">{datosInforme.total_horas.toFixed(2)}h</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-slate-800 mb-4">Detalle de Turnos</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turno</TableHead>
                    <TableHead className="text-center">Camareros</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead className="text-center">Horas</TableHead>
                    <TableHead className="text-right">Total Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datosInforme.turnos.length > 0 ? (
                    datosInforme.turnos.map((turno, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">Turno {index + 1}</TableCell>
                        <TableCell className="text-center">{turno.cantidad_camareros || 0}</TableCell>
                        <TableCell className="font-mono text-sm">{turno.entrada || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{turno.salida || '-'}</TableCell>
                        <TableCell className="text-center">{turno.t_horas || 0}h</TableCell>
                        <TableCell className="text-right font-semibold">
                          {((turno.t_horas || 0) * (turno.cantidad_camareros || 0)).toFixed(2)}h
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="font-medium">Turno Único</TableCell>
                      <TableCell className="text-center">{pedido.cantidad_camareros || 0}</TableCell>
                      <TableCell className="font-mono text-sm">{pedido.entrada || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{pedido.salida || '-'}</TableCell>
                      <TableCell className="text-center">{pedido.t_horas || 0}h</TableCell>
                      <TableCell className="text-right font-semibold">
                        {datosInforme.total_horas.toFixed(2)}h
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center text-slate-400">
          <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Selecciona un cliente y un evento para ver el informe</p>
        </Card>
      )}
    </div>
  );
}