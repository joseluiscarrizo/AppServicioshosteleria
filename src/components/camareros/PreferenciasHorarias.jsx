import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

const diasSemana = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

const turnosPosibles = [
  { value: 'mañana', label: 'Mañana (6:00-14:00)' },
  { value: 'tarde', label: 'Tarde (14:00-22:00)' },
  { value: 'noche', label: 'Noche (22:00-6:00)' },
  { value: 'madrugada', label: 'Madrugada (0:00-8:00)' }
];

export default function PreferenciasHorarias({ open, onClose, camarero }) {
  const [horaInicio, setHoraInicio] = useState(camarero?.preferencias_horarias?.hora_inicio_preferida || '');
  const [horaFin, setHoraFin] = useState(camarero?.preferencias_horarias?.hora_fin_preferida || '');
  const [turnosSeleccionados, setTurnosSeleccionados] = useState(camarero?.preferencias_horarias?.turnos_preferidos || []);
  const [diasSeleccionados, setDiasSeleccionados] = useState(camarero?.preferencias_horarias?.dias_preferidos || []);

  const queryClient = useQueryClient();

  const guardarMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Camarero.update(camarero.id, {
        preferencias_horarias: {
          hora_inicio_preferida: horaInicio,
          hora_fin_preferida: horaFin,
          turnos_preferidos: turnosSeleccionados,
          dias_preferidos: diasSeleccionados
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Preferencias guardadas');
      onClose();
    }
  });

  const toggleTurno = (turno) => {
    setTurnosSeleccionados(prev =>
      prev.includes(turno) ? prev.filter(t => t !== turno) : [...prev, turno]
    );
  };

  const toggleDia = (dia) => {
    setDiasSeleccionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#1e3a5f]" />
            Preferencias Horarias - {camarero?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            💡 Estas preferencias ayudan a optimizar las asignaciones automáticas
          </div>

          {/* Horario Preferido */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Horario de Trabajo Preferido</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Hora Inicio</Label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Hora Fin</Label>
                <Input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Turnos Preferidos */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Turnos Preferidos</Label>
            <div className="space-y-2">
              {turnosPosibles.map(turno => (
                <div key={turno.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`turno-${turno.value}`}
                    checked={turnosSeleccionados.includes(turno.value)}
                    onCheckedChange={() => toggleTurno(turno.value)}
                  />
                  <Label htmlFor={`turno-${turno.value}`} className="cursor-pointer text-sm">
                    {turno.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Días Preferidos */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Días de la Semana Preferidos</Label>
            <div className="grid grid-cols-2 gap-2">
              {diasSemana.map(dia => (
                <div key={dia.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`dia-${dia.value}`}
                    checked={diasSeleccionados.includes(dia.value)}
                    onCheckedChange={() => toggleDia(dia.value)}
                  />
                  <Label htmlFor={`dia-${dia.value}`} className="cursor-pointer text-sm">
                    {dia.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => guardarMutation.mutate()}
              disabled={guardarMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              Guardar Preferencias
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}