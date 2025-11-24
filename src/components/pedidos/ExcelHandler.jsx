import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ExcelHandler({ pedidos, onImport }) {
  const fileInputRef = useRef(null);

  const exportToCSV = () => {
    const headers = [
      'Coordinador', 'Día', 'Cliente', 'Tipo Cliente', 'Lugar Evento', 
      'Camisa', 'Cód. Camarero', 'Camarero', 'Entrada', 'Salida', 
      'Total Horas', 'Enviado', 'Confirmado', 'Notas'
    ];
    
    const rows = pedidos.map(p => [
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
      p.confirmado ? 'Sí' : 'No',
      p.notas || ''
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
    link.download = `pedidos_camareros_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            coordinador: { type: "string" },
            dia: { type: "string" },
            cliente: { type: "string" },
            tipo_cliente: { type: "string" },
            lugar_evento: { type: "string" },
            camisa: { type: "string" },
            cod_camarero: { type: "string" },
            camarero: { type: "string" },
            entrada: { type: "string" },
            salida: { type: "string" },
            t_horas: { type: "number" },
            enviado: { type: "boolean" },
            confirmado: { type: "boolean" },
            notas: { type: "string" }
          }
        }
      }
    });

    if (result.status === 'success' && result.output) {
      onImport(result.output);
    }
    
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        className="border-slate-200 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
      >
        <Upload className="w-4 h-4 mr-2" />
        Importar
      </Button>
      <Button 
        variant="outline" 
        onClick={exportToCSV}
        className="border-slate-200 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
      >
        <Download className="w-4 h-4 mr-2" />
        Exportar
      </Button>
    </div>
  );
}