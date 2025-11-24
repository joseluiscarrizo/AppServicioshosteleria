import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Download, FileText } from 'lucide-react';
import FiltrosInforme from '../components/informes/FiltrosInforme';
import ResumenInforme from '../components/informes/ResumenInforme';
import PedidosTable from '../components/pedidos/PedidosTable';

const initialFiltros = {
  fechaDesde: '',
  fechaHasta: '',
  tipoCliente: 'all',
  cliente: '',
  coordinador: '',
  camarero: '',
  enviado: 'all',
  confirmado: 'all'
};

export default function Informes() {
  const [filtros, setFiltros] = useState(initialFiltros);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (filtros.fechaDesde && p.dia < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && p.dia > filtros.fechaHasta) return false;
      if (filtros.tipoCliente !== 'all' && p.tipo_cliente !== filtros.tipoCliente) return false;
      if (filtros.cliente && !p.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())) return false;
      if (filtros.coordinador && !p.coordinador?.toLowerCase().includes(filtros.coordinador.toLowerCase())) return false;
      if (filtros.camarero && !p.camarero?.toLowerCase().includes(filtros.camarero.toLowerCase())) return false;
      if (filtros.enviado !== 'all' && String(p.enviado) !== filtros.enviado) return false;
      if (filtros.confirmado !== 'all' && String(p.confirmado) !== filtros.confirmado) return false;
      return true;
    });
  }, [pedidos, filtros]);

  const exportarInforme = () => {
    const headers = [
      'Coordinador', 'Día', 'Cliente', 'Tipo Cliente', 'Lugar Evento', 
      'Camisa', 'Cód. Camarero', 'Camarero', 'Entrada', 'Salida', 
      'Total Horas', 'Enviado', 'Confirmado'
    ];
    
    const rows = pedidosFiltrados.map(p => [
      p.coordinador || '',
      p.dia || '',
      p.cliente || '',
      p.tipo_cliente || '',
      p.lugar_evento || '',
      p.camisa || '',
      p.cod_camarero || '',
      p.camarero || '',
      p.entrada || '',
      p.salida || '',
      p.t_horas || 0,
      p.enviado ? 'Sí' : 'No',
      p.confirmado ? 'Sí' : 'No'
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `informe_camareros_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <FileText className="w-8 h-8 text-[#1e3a5f]" />
                Informes
              </h1>
              <p className="text-slate-500 mt-1">
                Filtra y genera reportes de los servicios
              </p>
            </div>
            <Button 
              onClick={exportarInforme}
              className="bg-[#1e3a5f] hover:bg-[#152a45] text-white shadow-lg shadow-[#1e3a5f]/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Informe
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <FiltrosInforme 
            filtros={filtros} 
            onFiltrosChange={setFiltros}
            onReset={() => setFiltros(initialFiltros)}
          />
        </div>

        {/* Resumen */}
        <div className="mb-6">
          <ResumenInforme pedidos={pedidosFiltrados} />
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
          </div>
        ) : (
          <PedidosTable
            pedidos={pedidosFiltrados}
            onEdit={() => {}}
            onDelete={() => {}}
            selectedIds={selectedIds}
            onSelectChange={(id, checked) => setSelectedIds(prev => 
              checked ? [...prev, id] : prev.filter(i => i !== id)
            )}
            onSelectAll={(checked) => setSelectedIds(checked ? pedidosFiltrados.map(p => p.id) : [])}
          />
        )}
      </div>
    </div>
  );
}