import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Download, ClipboardList, CheckCircle, UserCheck, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function exportarExcel(filas) {
  const cabecera = ['Fecha', 'Día', 'Cliente', 'Evento', 'Cod.Camarero', 'Camarero', 'HoraEntrada', 'Estado'];
  const rows = [cabecera, ...filas.map(f => [
    f.fecha,
    f.dia,
    f.cliente,
    f.evento,
    f.codCamarero,
    f.camarero,
    f.horaEntrada,
    f.alta ? 'ALTA' : 'Pendiente'
  ])];

  const csvContent = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `altas_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Altas() {
  const queryClient = useQueryClient();

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-altas'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200)
  });

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ['asignaciones-altas'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 500)
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros-altas'],
    queryFn: () => base44.entities.Camarero.list('nombre', 200)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.AsignacionCamarero.update(id, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-altas'] });
      toast.success('Estado actualizado');
    }
  });

  // Build rows
  const pedidoMap = Object.fromEntries(pedidos.map(p => [p.id, p]));
  const camareroMap = Object.fromEntries(camareros.map(c => [c.id, c]));

  const filas = asignaciones.map(asig => {
    const pedido = pedidoMap[asig.pedido_id] || {};
    const camarero = camareroMap[asig.camarero_id] || {};
    const fechaStr = asig.fecha_pedido || pedido.dia || '';
    const fechaObj = fechaStr ? new Date(fechaStr + 'T00:00:00') : null;
    return {
      id: asig.id,
      fecha: fechaStr,
      dia: fechaObj ? DIAS_SEMANA[fechaObj.getDay()] : '',
      cliente: pedido.cliente || asig.camarero_nombre || '',
      evento: pedido.lugar_evento || '',
      codCamarero: camarero.codigo || asig.camarero_codigo || '',
      camarero: camarero.nombre || asig.camarero_nombre || '',
      horaEntrada: asig.hora_entrada || '',
      estado: asig.estado,
      alta: asig.estado === 'alta',
      confirmado: asig.estado === 'confirmado'
    };
  }).sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

  const handleDarAlta = (fila) => {
    updateMutation.mutate({ id: fila.id, estado: 'alta' });
  };

  const handleDarBaja = (fila) => {
    updateMutation.mutate({ id: fila.id, estado: 'pendiente' });
  };

  const estadoBadge = (estado) => {
    const map = {
      alta: { label: 'Alta', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      confirmado: { label: 'Confirmado', className: 'bg-green-100 text-green-700 border-green-200' },
      enviado: { label: 'Enviado', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      pendiente: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    };
    const cfg = map[estado] || map.pendiente;
    return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-[#1e3a5f]" />
              Altas
            </h1>
            <p className="text-slate-500 mt-1">
              Listado de asignaciones y gestión de altas de camareros
            </p>
          </div>
          <Button
            onClick={() => exportarExcel(filas)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-white shadow-sm border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-slate-200">
                  <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Día</TableHead>
                  <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Cliente</TableHead>
                  <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Evento</TableHead>
                  <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Cod.Camarero</TableHead>
                  <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Camarero</TableHead>
                  <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Hora Entrada</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-center whitespace-nowrap">Dar Alta</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-center whitespace-nowrap">Alta</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-center whitespace-nowrap">Baja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                      No hay asignaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  filas.map((fila) => (
                    <TableRow key={fila.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="whitespace-nowrap text-sm font-medium text-slate-700">
                        {fila.fecha}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-600">
                        {fila.dia}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-700 max-w-[140px] truncate">
                        {fila.cliente}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-600 max-w-[150px] truncate">
                        {fila.evento}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-mono text-slate-600">
                        {fila.codCamarero}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-700">
                        {fila.camarero}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-600">
                        {fila.horaEntrada || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          onClick={() => handleDarAlta(fila)}
                          disabled={fila.alta || updateMutation.isPending}
                          className={fila.alta
                            ? 'bg-green-200 text-green-800 cursor-not-allowed hover:bg-green-200'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                          }
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          {fila.alta ? 'Dado' : 'Dar Alta'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        {fila.alta ? (
                          <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Alta
                          </Badge>
                        ) : (
                          estadoBadge(fila.estado)
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          onClick={() => handleDarBaja(fila)}
                          disabled={!fila.alta || updateMutation.isPending}
                          className={!fila.alta
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-100'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                          }
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" />
                          Baja
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filas.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500 flex items-center justify-between">
              <span>{filas.length} asignaciones</span>
              <span className="text-xs">{filas.filter(f => f.alta).length} con alta · {filas.filter(f => !f.alta).length} pendientes</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}