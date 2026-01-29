import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistorialWhatsApp() {
  const [filtro, setFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  const { data: historial = [], isLoading } = useQuery({
    queryKey: ['historial-whatsapp'],
    queryFn: () => base44.entities.HistorialWhatsApp.list('-created_date', 100),
    refetchInterval: 10000
  });

  const historialFiltrado = historial.filter(item => {
    const coincideFiltro = 
      item.destinatario_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
      item.telefono?.includes(filtro) ||
      item.mensaje?.toLowerCase().includes(filtro.toLowerCase());
    
    const coincideEstado = estadoFiltro === 'todos' || item.estado === estadoFiltro;
    
    return coincideFiltro && coincideEstado;
  });

  const estadisticas = {
    total: historial.length,
    enviados: historial.filter(h => h.estado === 'enviado').length,
    fallidos: historial.filter(h => h.estado === 'fallido').length,
    pendientes: historial.filter(h => h.estado === 'pendiente').length
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'enviado':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case 'fallido':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Fallido</Badge>;
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-800">{estadisticas.total}</p>
              <p className="text-sm text-slate-500">Total Mensajes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{estadisticas.enviados}</p>
              <p className="text-sm text-slate-500">Enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{estadisticas.fallidos}</p>
              <p className="text-sm text-slate-500">Fallidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{estadisticas.pendientes}</p>
              <p className="text-sm text-slate-500">Pendientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#1e3a5f]" />
            Historial de Mensajes WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o mensaje..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={estadoFiltro === 'todos' ? 'default' : 'outline'}
                onClick={() => setEstadoFiltro('todos')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={estadoFiltro === 'enviado' ? 'default' : 'outline'}
                onClick={() => setEstadoFiltro('enviado')}
                size="sm"
              >
                Enviados
              </Button>
              <Button
                variant={estadoFiltro === 'fallido' ? 'default' : 'outline'}
                onClick={() => setEstadoFiltro('fallido')}
                size="sm"
              >
                Fallidos
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-center text-slate-400 py-8">Cargando...</p>
              ) : historialFiltrado.length === 0 ? (
                <p className="text-center text-slate-400 py-8">
                  No se encontraron mensajes
                </p>
              ) : (
                historialFiltrado.map(item => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-800">
                            {item.destinatario_nombre}
                          </h4>
                          {getEstadoBadge(item.estado)}
                          {item.proveedor && (
                            <Badge variant="outline" className="text-xs">
                              {item.proveedor}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-2">
                          📱 {item.telefono}
                        </p>
                        
                        <div className="bg-slate-50 rounded-lg p-3 mb-2">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {item.mensaje}
                          </p>
                        </div>
                        
                        {item.plantilla_usada && (
                          <p className="text-xs text-slate-500">
                            Plantilla: {item.plantilla_usada}
                          </p>
                        )}
                        
                        {item.error && (
                          <p className="text-xs text-red-600 mt-1">
                            Error: {item.error}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right text-xs text-slate-400">
                        {format(new Date(item.created_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}