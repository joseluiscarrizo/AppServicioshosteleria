import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CalendarioAsignaciones() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  // Generar días del calendario
  const dias = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Obtener datos por día
  const getDatosDia = (dia) => {
    const fechaStr = format(dia, 'yyyy-MM-dd');
    const pedidosDia = pedidos.filter(p => p.dia === fechaStr);
    const asignacionesDia = asignaciones.filter(a => a.fecha_pedido === fechaStr);
    
    const totalCamareros = pedidosDia.reduce((sum, p) => {
      if (p.turnos?.length > 0) {
        return sum + p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0);
      }
      return sum + (p.cantidad_camareros || 0);
    }, 0);

    const asignados = asignacionesDia.length;
    const pendientes = totalCamareros - asignados;

    return {
      pedidos: pedidosDia,
      asignaciones: asignacionesDia,
      totalCamareros,
      asignados,
      pendientes
    };
  };

  const mesAnterior = () => setCurrentMonth(subMonths(currentMonth, 1));
  const mesSiguiente = () => setCurrentMonth(addMonths(currentMonth, 1));
  const hoy = () => setCurrentMonth(new Date());

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
          Calendario de Asignaciones
        </h3>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={hoy}>
            Hoy
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={mesAnterior}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={mesSiguiente}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span className="text-slate-600">Completo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-slate-600">Parcial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-300"></div>
          <span className="text-slate-600">Sin eventos</span>
        </div>
      </div>

      {/* Calendario */}
      <div className="grid grid-cols-7 gap-2">
        {/* Headers */}
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
          <div key={dia} className="text-center text-sm font-semibold text-slate-500 pb-2">
            {dia}
          </div>
        ))}

        {/* Días */}
        {dias.map(dia => {
          const esHoy = isSameDay(dia, new Date());
          const esMesActual = dia.getMonth() === currentMonth.getMonth();
          const datos = getDatosDia(dia);
          const tieneEventos = datos.pedidos.length > 0;
          
          let colorFondo = 'bg-slate-50';
          if (tieneEventos) {
            if (datos.pendientes === 0) {
              colorFondo = 'bg-emerald-50';
            } else if (datos.asignados > 0) {
              colorFondo = 'bg-amber-50';
            }
          }

          return (
            <div
              key={dia.toString()}
              className={`
                min-h-[100px] p-2 rounded-lg border transition-all
                ${esHoy ? 'border-[#1e3a5f] border-2 shadow-md' : 'border-slate-200'}
                ${!esMesActual ? 'opacity-40' : ''}
                ${colorFondo}
                hover:shadow-sm cursor-pointer
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${esHoy ? 'text-[#1e3a5f]' : 'text-slate-700'}`}>
                  {format(dia, 'd')}
                </span>
                {tieneEventos && (
                  <Badge variant="outline" className="text-xs px-1 h-5">
                    {datos.pedidos.length}
                  </Badge>
                )}
              </div>

              {tieneEventos && (
                <div className="space-y-1">
                  {datos.pedidos.slice(0, 2).map(pedido => (
                    <div key={pedido.id} className="text-xs bg-white rounded p-1 border border-slate-200">
                      <p className="font-medium text-slate-700 truncate">{pedido.cliente}</p>
                      <div className="flex items-center justify-between text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {asignaciones.filter(a => a.pedido_id === pedido.id).length}
                          /{pedido.turnos?.length > 0 
                            ? pedido.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
                            : (pedido.cantidad_camareros || 0)
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                  {datos.pedidos.length > 2 && (
                    <p className="text-xs text-slate-500 text-center">
                      +{datos.pedidos.length - 2} más
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}