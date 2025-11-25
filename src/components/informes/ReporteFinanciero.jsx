import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, DollarSign, Clock, Car, TrendingUp, Users, Calculator } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#1e3a5f', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function ReporteFinanciero() {
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [precioHora, setPrecioHora] = useState(15);
  const [precioTransporte, setPrecioTransporte] = useState(10);

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 2000)
  });

  // Filtrar pedidos por período
  const pedidosFiltrados = useMemo(() => {
    const inicio = parseISO(fechaInicio);
    const fin = parseISO(fechaFin);
    
    return pedidos.filter(p => {
      if (!p.dia) return false;
      const fecha = parseISO(p.dia);
      return fecha >= inicio && fecha <= fin;
    });
  }, [pedidos, fechaInicio, fechaFin]);

  // Cálculos financieros
  const financiero = useMemo(() => {
    let totalHoras = 0;
    let totalTransportes = 0;
    let horasPorCliente = {};
    let horasPorMes = {};

    pedidosFiltrados.forEach(p => {
      const horas = (p.t_horas || 0) * (p.cantidad_camareros || 1);
      totalHoras += horas;
      
      if (p.extra_transporte) {
        totalTransportes += p.cantidad_camareros || 1;
      }

      // Por cliente
      const cliente = p.cliente || 'Sin nombre';
      if (!horasPorCliente[cliente]) {
        horasPorCliente[cliente] = { cliente, horas: 0, transportes: 0, pedidos: 0 };
      }
      horasPorCliente[cliente].horas += horas;
      horasPorCliente[cliente].pedidos += 1;
      if (p.extra_transporte) {
        horasPorCliente[cliente].transportes += p.cantidad_camareros || 1;
      }

      // Por mes
      const mes = p.dia ? format(parseISO(p.dia), 'yyyy-MM') : 'Sin fecha';
      if (!horasPorMes[mes]) {
        horasPorMes[mes] = { mes, horas: 0, transportes: 0, pedidos: 0 };
      }
      horasPorMes[mes].horas += horas;
      horasPorMes[mes].pedidos += 1;
      if (p.extra_transporte) {
        horasPorMes[mes].transportes += p.cantidad_camareros || 1;
      }
    });

    const totalFacturacionHoras = totalHoras * precioHora;
    const totalFacturacionTransporte = totalTransportes * precioTransporte;
    const totalFacturacion = totalFacturacionHoras + totalFacturacionTransporte;

    // Preparar datos para gráficos
    const clientesData = Object.values(horasPorCliente)
      .map(c => ({
        ...c,
        facturacion: (c.horas * precioHora) + (c.transportes * precioTransporte)
      }))
      .sort((a, b) => b.facturacion - a.facturacion);

    const mesesData = Object.values(horasPorMes)
      .map(m => ({
        ...m,
        mesLabel: format(parseISO(m.mes + '-01'), 'MMM yyyy', { locale: es }),
        facturacion: (m.horas * precioHora) + (m.transportes * precioTransporte)
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return {
      totalHoras,
      totalTransportes,
      totalFacturacionHoras,
      totalFacturacionTransporte,
      totalFacturacion,
      clientesData,
      mesesData,
      totalPedidos: pedidosFiltrados.length
    };
  }, [pedidosFiltrados, precioHora, precioTransporte]);

  // Distribución de facturación
  const distribucionFacturacion = [
    { name: 'Horas', value: financiero.totalFacturacionHoras, color: '#1e3a5f' },
    { name: 'Transporte', value: financiero.totalFacturacionTransporte, color: '#10b981' }
  ].filter(d => d.value > 0);

  const exportarCSV = () => {
    const headers = ['Cliente', 'Pedidos', 'Horas', 'Transportes', 'Facturación Horas', 'Facturación Transporte', 'Total'];
    const rows = financiero.clientesData.map(c => [
      c.cliente, c.pedidos, c.horas.toFixed(1), c.transportes,
      (c.horas * precioHora).toFixed(2), (c.transportes * precioTransporte).toFixed(2),
      c.facturacion.toFixed(2)
    ]);
    
    // Añadir totales
    rows.push([
      'TOTAL', financiero.totalPedidos, financiero.totalHoras.toFixed(1), financiero.totalTransportes,
      financiero.totalFacturacionHoras.toFixed(2), financiero.totalFacturacionTransporte.toFixed(2),
      financiero.totalFacturacion.toFixed(2)
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_financiero_${fechaInicio}_${fechaFin}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Filtros y configuración */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-sm text-slate-600 mb-1 block">Desde</Label>
            <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1 block">Hasta</Label>
            <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1 block">Precio/Hora (€)</Label>
            <Input type="number" value={precioHora} onChange={e => setPrecioHora(parseFloat(e.target.value) || 0)} className="w-28" />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1 block">Precio Transporte (€)</Label>
            <Input type="number" value={precioTransporte} onChange={e => setPrecioTransporte(parseFloat(e.target.value) || 0)} className="w-28" />
          </div>
          <Button variant="outline" onClick={exportarCSV} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Horas Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{financiero.totalHoras.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Car className="w-4 h-4" />
            <span className="text-xs">Transportes</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{financiero.totalTransportes}</p>
        </Card>
        <Card className="p-4 bg-blue-50">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Facturación Horas</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{financiero.totalFacturacionHoras.toFixed(2)}€</p>
        </Card>
        <Card className="p-4 bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Car className="w-4 h-4" />
            <span className="text-xs">Facturación Transporte</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{financiero.totalFacturacionTransporte.toFixed(2)}€</p>
        </Card>
        <Card className="p-4 bg-[#1e3a5f]/10 col-span-2">
          <div className="flex items-center gap-2 text-[#1e3a5f] mb-1">
            <Calculator className="w-4 h-4" />
            <span className="text-xs">TOTAL FACTURACIÓN</span>
          </div>
          <p className="text-3xl font-bold text-[#1e3a5f]">{financiero.totalFacturacion.toFixed(2)}€</p>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Facturación por Mes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financiero.mesesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mesLabel" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                <Bar dataKey="facturacion" fill="#1e3a5f" name="Facturación" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Distribución de Facturación</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribucionFacturacion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(2)}€`}
                >
                  {distribucionFacturacion.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top clientes */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Top 10 Clientes por Facturación</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financiero.clientesData.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="cliente" type="category" fontSize={12} width={120} />
              <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
              <Bar dataKey="facturacion" fill="#1e3a5f" name="Facturación" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tabla detallada por cliente */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-800">Detalle por Cliente</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-center">Horas</TableHead>
                <TableHead className="text-center">Transportes</TableHead>
                <TableHead className="text-right">Fact. Horas</TableHead>
                <TableHead className="text-right">Fact. Transporte</TableHead>
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financiero.clientesData.map(c => (
                <TableRow key={c.cliente}>
                  <TableCell className="font-medium">{c.cliente}</TableCell>
                  <TableCell className="text-center">{c.pedidos}</TableCell>
                  <TableCell className="text-center">{c.horas.toFixed(1)}h</TableCell>
                  <TableCell className="text-center">{c.transportes}</TableCell>
                  <TableCell className="text-right">{(c.horas * precioHora).toFixed(2)}€</TableCell>
                  <TableCell className="text-right">{(c.transportes * precioTransporte).toFixed(2)}€</TableCell>
                  <TableCell className="text-right font-semibold text-[#1e3a5f]">{c.facturacion.toFixed(2)}€</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-100 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">{financiero.totalPedidos}</TableCell>
                <TableCell className="text-center">{financiero.totalHoras.toFixed(1)}h</TableCell>
                <TableCell className="text-center">{financiero.totalTransportes}</TableCell>
                <TableCell className="text-right">{financiero.totalFacturacionHoras.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{financiero.totalFacturacionTransporte.toFixed(2)}€</TableCell>
                <TableCell className="text-right text-[#1e3a5f]">{financiero.totalFacturacion.toFixed(2)}€</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}