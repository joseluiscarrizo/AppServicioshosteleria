import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const StarDisplay = ({ value, label }) => (
  <div className="flex items-center gap-1">
    <span className="text-xs text-slate-500">{label}:</span>
    <div className="flex">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  </div>
);

export default function ValoracionesHistorial({ camareroId }) {
  const { data: valoraciones = [], isLoading } = useQuery({
    queryKey: ['valoraciones', camareroId],
    queryFn: () => base44.entities.Valoracion.filter({ camarero_id: camareroId }, '-created_date', 20),
    enabled: !!camareroId
  });

  if (isLoading) {
    return <div className="text-center py-4 text-slate-400">Cargando...</div>;
  }

  if (valoraciones.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-400">
        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Sin valoraciones aún</p>
      </Card>
    );
  }

  const promedio = valoraciones.reduce((acc, v) => acc + v.puntuacion, 0) / valoraciones.length;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-700">Valoración Promedio</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-amber-600">{promedio.toFixed(1)}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-5 h-5 ${s <= Math.round(promedio) ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
                ))}
              </div>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-700">{valoraciones.length} valoraciones</Badge>
        </div>
      </Card>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {valoraciones.map(v => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-800">{v.cliente}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {v.fecha_evento ? format(new Date(v.fecha_evento), 'dd MMM yyyy', { locale: es }) : '-'}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="font-bold text-amber-700">{v.puntuacion}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                <StarDisplay value={v.puntualidad} label="Puntualidad" />
                <StarDisplay value={v.profesionalidad} label="Profesionalidad" />
                <StarDisplay value={v.actitud} label="Actitud" />
              </div>
              
              {v.comentario && (
                <p className="text-sm text-slate-600 mt-3 bg-slate-50 p-2 rounded italic">
                  "{v.comentario}"
                </p>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}