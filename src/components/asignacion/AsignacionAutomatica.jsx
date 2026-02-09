import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AsignacionAutomatica({ pedido, onAsignacionComplete }) {
  const [open, setOpen] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const queryClient = useQueryClient();

  const asignarAutomaticamente = async () => {
    setAsignando(true);
    setResultado(null);

    try {
      // Llamar a la función de sugerencias inteligentes
      const response = await base44.functions.invoke('sugerirCamarerosInteligente', {
        pedido_id: pedido.id
      });

      const sugerencias = response.data.sugerencias || [];

      if (sugerencias.length === 0) {
        toast.error('No se encontraron camareros disponibles para este evento');
        setAsignando(false);
        return;
      }

      // Tomar los mejores candidatos según la cantidad necesaria
      const cantidadNecesaria = pedido.cantidad_camareros || 1;
      const mejoresCandidatos = sugerencias.slice(0, cantidadNecesaria);

      // Crear asignaciones para cada candidato
      const asignacionesCreadas = [];
      for (const candidato of mejoresCandidatos) {
        const asignacion = await base44.entities.AsignacionCamarero.create({
          pedido_id: pedido.id,
          camarero_id: candidato.camarero.id,
          camarero_nombre: candidato.camarero.nombre,
          camarero_codigo: candidato.camarero.codigo,
          estado: 'pendiente',
          fecha_pedido: pedido.dia,
          hora_entrada: pedido.entrada,
          hora_salida: pedido.salida
        });

        asignacionesCreadas.push(asignacion);

        // Crear notificación para el camarero
        await base44.entities.NotificacionCamarero.create({
          camarero_id: candidato.camarero.id,
          camarero_nombre: candidato.camarero.nombre,
          asignacion_id: asignacion.id,
          pedido_id: pedido.id,
          tipo: 'nueva_asignacion',
          titulo: 'Nueva asignación de servicio',
          mensaje: `Has sido asignado al evento de ${pedido.cliente} el ${new Date(pedido.dia).toLocaleDateString()}`,
          cliente: pedido.cliente,
          lugar_evento: pedido.lugar_evento,
          fecha: pedido.dia,
          hora_entrada: pedido.entrada,
          hora_salida: pedido.salida,
          leida: false,
          respondida: false,
          respuesta: 'pendiente'
        });
      }

      setResultado({
        exito: true,
        cantidad: asignacionesCreadas.length,
        camareros: mejoresCandidatos.map(c => c.camarero.nombre)
      });

      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });

      toast.success(`${asignacionesCreadas.length} camarero(s) asignado(s) automáticamente`);

      if (onAsignacionComplete) {
        onAsignacionComplete();
      }

      setTimeout(() => {
        setOpen(false);
        setResultado(null);
      }, 2000);

    } catch (error) {
      toast.error('Error al asignar automáticamente: ' + error.message);
      setResultado({
        exito: false,
        error: error.message
      });
    } finally {
      setAsignando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wand2 className="w-4 h-4" />
          Asignar Automáticamente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignación Automática</DialogTitle>
          <DialogDescription>
            El sistema seleccionará los mejores camareros para este evento basándose en disponibilidad, 
            valoraciones, distancia y preferencias.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!resultado && !asignando && (
            <div className="text-sm text-slate-600">
              <p className="mb-2">Se asignarán automáticamente:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{pedido.cantidad_camareros || 1} camarero(s)</li>
                <li>Para el evento: {pedido.cliente}</li>
                <li>Fecha: {new Date(pedido.dia).toLocaleDateString()}</li>
                <li>Horario: {pedido.entrada} - {pedido.salida}</li>
              </ul>
            </div>
          )}

          {asignando && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mb-4" />
              <p className="text-slate-600">Analizando disponibilidad y seleccionando camareros...</p>
            </div>
          )}

          {resultado && resultado.exito && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">
                ¡Asignación completada!
              </p>
              <p className="text-sm text-slate-600 mb-4">
                Se han asignado {resultado.cantidad} camarero(s):
              </p>
              <ul className="text-sm text-slate-600 space-y-1">
                {resultado.camareros.map((nombre, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    {nombre}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado && !resultado.exito && (
            <div className="text-center py-4 text-red-600">
              Error: {resultado.error}
            </div>
          )}
        </div>

        <DialogFooter>
          {!resultado && !asignando && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={asignarAutomaticamente} className="bg-[#1e3a5f]">
                Asignar Ahora
              </Button>
            </>
          )}
          {resultado && (
            <Button onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}