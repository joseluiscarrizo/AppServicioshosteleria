import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, MapPin, Star, Award, Languages, TrendingUp, CheckCircle, X, AlertCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import TareasService from '../camareros/TareasService';

// Función para calcular distancia aproximada (simplificada)
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function AsignacionAutomatica({ open, onClose, pedido }) {
  const [sugerenciasAceptadas, setSugerenciasAceptadas] = useState(new Set());
  const [modoRevision, setModoRevision] = useState(true);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  const { data: disponibilidades = [] } = useQuery({
    queryKey: ['disponibilidades'],
    queryFn: () => base44.entities.Disponibilidad.list('-fecha', 500)
  });

  const { data: valoraciones = [] } = useQuery({
    queryKey: ['valoraciones'],
    queryFn: () => base44.entities.Valoracion.list('-created_date', 500)
  });

  const { data: reglas = [] } = useQuery({
    queryKey: ['reglas-asignacion'],
    queryFn: () => base44.entities.ReglaAsignacion.list('-prioridad')
  });

  const asignarMutation = useMutation({
    mutationFn: async (data) => {
      const asignacion = await base44.entities.AsignacionCamarero.create(data);
      
      // Enviar notificación
      const camarero = camareros.find(c => c.id === data.camarero_id);
      if (camarero && pedido) {
        await base44.entities.NotificacionCamarero.create({
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          asignacion_id: asignacion.id,
          pedido_id: pedido.id,
          tipo: 'nueva_asignacion',
          titulo: `Nueva Asignación: ${pedido.cliente}`,
          mensaje: `Has sido asignado automáticamente a un evento en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
          cliente: pedido.cliente,
          lugar_evento: pedido.lugar_evento,
          fecha: pedido.dia,
          hora_entrada: pedido.entrada,
          hora_salida: pedido.salida,
          leida: false,
          respondida: false,
          respuesta: 'pendiente'
        });

        // Crear tareas
        await TareasService.crearTareasIniciales(asignacion, pedido, camarero);
      }
      
      return asignacion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    }
  });

  // Calcular score para cada camarero
  const sugerencias = useMemo(() => {
    if (!pedido || !camareros.length) return [];

    const fechaPedido = pedido.dia;
    const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
    const idsAsignados = asignacionesPedido.map(a => a.camarero_id);

    const candidatos = camareros.filter(c => {
      if (idsAsignados.includes(c.id)) return false;
      if (!c.disponible) return false;

      // Verificar disponibilidad específica
      const noDisponible = disponibilidades.find(d => 
        d.camarero_id === c.id && 
        d.fecha === fechaPedido &&
        (d.tipo === 'no_disponible' || d.tipo === 'vacaciones' || d.tipo === 'baja')
      );
      if (noDisponible) return false;

      // Verificar regla de 6 horas
      const asignacionesCamarero = asignaciones.filter(a => a.camarero_id === c.id);
      for (const asig of asignacionesCamarero) {
        if (asig.fecha_pedido === fechaPedido) {
          const horaEntradaNueva = pedido.entrada ? parseInt(pedido.entrada.split(':')[0]) : 0;
          const horaSalidaExistente = asig.hora_salida ? parseInt(asig.hora_salida.split(':')[0]) : 0;
          const horaEntradaExistente = asig.hora_entrada ? parseInt(asig.hora_entrada.split(':')[0]) : 0;
          const horaSalidaNueva = pedido.salida ? parseInt(pedido.salida.split(':')[0]) : 24;
          
          const diff1 = Math.abs(horaEntradaNueva - horaSalidaExistente);
          const diff2 = Math.abs(horaEntradaExistente - horaSalidaNueva);
          
          if (diff1 < 6 && diff2 < 6) {
            return false;
          }
        }
      }

      return true;
    });

    // Calcular score para cada candidato
    const scored = candidatos.map(camarero => {
      let score = 0;
      const razones = [];

      // 1. Valoración (0-30 puntos)
      const valoracionPromedio = camarero.valoracion_promedio || 0;
      score += valoracionPromedio * 6;
      if (valoracionPromedio >= 4.5) {
        razones.push({ icon: Star, text: `Excelente valoración (${valoracionPromedio.toFixed(1)})`, color: 'text-amber-600' });
      }

      // 2. Especialidad (0-25 puntos)
      if (pedido.especialidad_requerida) {
        if (camarero.especialidad === pedido.especialidad_requerida) {
          score += 25;
          razones.push({ icon: Award, text: 'Especialidad exacta', color: 'text-purple-600' });
        } else if (camarero.especialidad === 'general' && pedido.especialidad_requerida !== 'eventos_vip') {
          score += 10;
        }
      }

      // 3. Habilidades requeridas (0-20 puntos)
      if (pedido.habilidades_requeridas?.length > 0) {
        const habilidadesCumplidas = pedido.habilidades_requeridas.filter(h => 
          camarero.habilidades?.includes(h)
        ).length;
        const porcentajeHabilidades = habilidadesCumplidas / pedido.habilidades_requeridas.length;
        score += porcentajeHabilidades * 20;
        if (porcentajeHabilidades === 1) {
          razones.push({ icon: Award, text: 'Todas las habilidades requeridas', color: 'text-blue-600' });
        }
      }

      // 4. Idiomas (0-15 puntos)
      if (pedido.idiomas_requeridos?.length > 0) {
        const idiomasCumplidos = pedido.idiomas_requeridos.filter(i => 
          camarero.idiomas?.includes(i)
        ).length;
        const porcentajeIdiomas = idiomasCumplidos / pedido.idiomas_requeridos.length;
        score += porcentajeIdiomas * 15;
        if (porcentajeIdiomas === 1) {
          razones.push({ icon: Languages, text: 'Idiomas requeridos', color: 'text-green-600' });
        }
      }

      // 5. Carga de trabajo (0-20 puntos) - menos carga = más puntos
      const asignacionesMes = asignaciones.filter(a => 
        a.camarero_id === camarero.id && 
        a.fecha_pedido?.startsWith(pedido.dia?.substring(0, 7)) // mismo mes
      ).length;
      const cargaScore = Math.max(0, 20 - (asignacionesMes * 2));
      score += cargaScore;
      if (asignacionesMes < 3) {
        razones.push({ icon: TrendingUp, text: 'Baja carga de trabajo', color: 'text-emerald-600' });
      }

      // 6. Proximidad (0-10 puntos) - si hay coordenadas
      if (pedido.latitud && pedido.longitud && camarero.latitud && camarero.longitud) {
        const distancia = calcularDistancia(
          pedido.latitud, pedido.longitud,
          camarero.latitud, camarero.longitud
        );
        if (distancia !== null) {
          const proximidadScore = Math.max(0, 10 - (distancia / 5)); // pierde puntos cada 5km
          score += proximidadScore;
          if (distancia < 10) {
            razones.push({ icon: MapPin, text: `Cerca (${distancia.toFixed(1)} km)`, color: 'text-indigo-600' });
          }
        }
      }

      // 7. Experiencia (0-10 puntos)
      const experiencia = camarero.experiencia_anios || 0;
      score += Math.min(10, experiencia);
      if (experiencia >= 5) {
        razones.push({ icon: Award, text: `${experiencia} años experiencia`, color: 'text-slate-600' });
      }

      // 8. Aplicar reglas personalizadas
      const reglasActivas = reglas.filter(r => r.activa);
      for (const regla of reglasActivas) {
        let cumpleRegla = false;

        if (regla.tipo_regla === 'cliente_preferido' && regla.cliente_id === pedido.cliente_id) {
          if (regla.camareros_preferidos?.includes(camarero.id)) {
            cumpleRegla = true;
            razones.push({ icon: Star, text: 'Camarero preferido', color: 'text-purple-600' });
          }
        } else if (regla.tipo_regla === 'valoracion_minima') {
          if (valoracionPromedio >= (regla.valoracion_minima || 4.0)) {
            cumpleRegla = true;
          } else if (regla.es_obligatoria) {
            return null; // Descarta este camarero
          }
        } else if (regla.tipo_regla === 'distancia_maxima' && pedido.latitud && pedido.longitud && camarero.latitud && camarero.longitud) {
          const distancia = calcularDistancia(pedido.latitud, pedido.longitud, camarero.latitud, camarero.longitud);
          if (distancia && distancia <= (regla.distancia_maxima_km || 20)) {
            cumpleRegla = true;
          } else if (regla.es_obligatoria && distancia) {
            return null;
          }
        } else if (regla.tipo_regla === 'especialidad_obligatoria') {
          if (regla.especialidades_requeridas?.includes(camarero.especialidad)) {
            cumpleRegla = true;
          } else if (regla.es_obligatoria) {
            return null;
          }
        } else if (regla.tipo_regla === 'experiencia_minima') {
          if (experiencia >= (regla.experiencia_minima_anios || 2)) {
            cumpleRegla = true;
          } else if (regla.es_obligatoria) {
            return null;
          }
        }

        if (cumpleRegla && regla.bonus_puntos) {
          score += regla.bonus_puntos;
        }
      }

      return {
        camarero,
        score: Math.round(score),
        razones,
        asignacionesMes
      };
    }).filter(Boolean); // Eliminar nulos (descartados por reglas obligatorias)

    // Ordenar por score y tomar top candidatos
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [pedido, camareros, asignaciones, disponibilidades, reglas]);

  const handleAsignarTodos = async () => {
    const cantidadNecesaria = pedido.turnos?.length > 0 
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0);
    
    const asignacionesActuales = asignaciones.filter(a => a.pedido_id === pedido.id).length;
    const faltantes = cantidadNecesaria - asignacionesActuales;
    
    if (faltantes <= 0) {
      toast.info('Ya está completo el pedido');
      return;
    }

    const candidatos = modoRevision && seleccionados.size > 0
      ? sugerencias.filter(s => seleccionados.has(s.camarero.id))
      : sugerencias.slice(0, faltantes);
    
    if (candidatos.length === 0) {
      toast.error('No hay camareros seleccionados');
      return;
    }

    try {
      let asignados = 0;
      for (const { camarero } of candidatos) {
        if (asignados >= faltantes) break;
        
        await asignarMutation.mutateAsync({
          pedido_id: pedido.id,
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          camarero_codigo: camarero.codigo,
          estado: 'pendiente',
          fecha_pedido: pedido.dia,
          hora_entrada: pedido.entrada,
          hora_salida: pedido.salida
        });
        setSugerenciasAceptadas(prev => new Set([...prev, camarero.id]));
        asignados++;
      }
      toast.success(`${asignados} camareros asignados automáticamente`);
      setSeleccionados(new Set());
    } catch (error) {
      toast.error('Error en asignación automática');
    }
  };

  const toggleSeleccion = (camareroId) => {
    setSeleccionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(camareroId)) {
        newSet.delete(camareroId);
      } else {
        newSet.add(camareroId);
      }
      return newSet;
    });
  };

  const seleccionarMejores = () => {
    const cantidadNecesaria = pedido.turnos?.length > 0 
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0);
    
    const asignacionesActuales = asignaciones.filter(a => a.pedido_id === pedido.id).length;
    const faltantes = cantidadNecesaria - asignacionesActuales;
    
    const mejores = sugerencias.slice(0, faltantes).map(s => s.camarero.id);
    setSeleccionados(new Set(mejores));
    toast.info(`${mejores.length} mejores candidatos seleccionados`);
  };

  const handleAsignarUno = async (camarero) => {
    try {
      await asignarMutation.mutateAsync({
        pedido_id: pedido.id,
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        camarero_codigo: camarero.codigo,
        estado: 'pendiente',
        fecha_pedido: pedido.dia,
        hora_entrada: pedido.entrada,
        hora_salida: pedido.salida
      });
      setSugerenciasAceptadas(prev => new Set([...prev, camarero.id]));
      toast.success(`${camarero.nombre} asignado`);
    } catch (error) {
      toast.error('Error al asignar');
    }
  };

  const cantidadNecesaria = pedido?.turnos?.length > 0 
    ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
    : (pedido?.cantidad_camareros || 0);
  
  const asignacionesActuales = asignaciones.filter(a => a.pedido_id === pedido?.id).length;
  const faltantes = cantidadNecesaria - asignacionesActuales;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Asignación Automática Inteligente
          </DialogTitle>
          {pedido && (
            <div className="text-sm text-slate-600 mt-2">
              <p><strong>{pedido.cliente}</strong> • {pedido.lugar_evento}</p>
              <p className="text-xs flex items-center gap-2 mt-1">
                <span>Faltan: <strong className="text-orange-600">{faltantes}</strong> camareros</span>
                {faltantes > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {asignacionesActuales}/{cantidadNecesaria}
                  </Badge>
                )}
              </p>
            </div>
          )}
        </DialogHeader>

        {sugerencias.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay camareros disponibles para este evento</p>
            <p className="text-xs text-slate-400 mt-2">Verifica disponibilidad y restricciones</p>
          </div>
        ) : (
          <>
            {/* Controles de modo */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={modoRevision} 
                    onCheckedChange={setModoRevision}
                    id="modo-revision"
                  />
                  <Label htmlFor="modo-revision" className="cursor-pointer">
                    <span className="font-medium">Modo Revisión</span>
                    <p className="text-xs text-slate-500">
                      {modoRevision ? 'Selecciona manualmente antes de asignar' : 'Asigna automáticamente los mejores'}
                    </p>
                  </Label>
                </div>
                <Badge className="bg-slate-200 text-slate-700">
                  <Info className="w-3 h-3 mr-1" />
                  {sugerencias.length} candidatos
                </Badge>
              </div>

              {modoRevision && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={seleccionarMejores}
                    disabled={faltantes <= 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Seleccionar Top {Math.min(faltantes, sugerencias.length)}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSeleccionados(new Set())}
                    disabled={seleccionados.size === 0}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpiar selección
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-slate-600">
                {modoRevision && seleccionados.size > 0 && (
                  <span className="font-medium text-purple-600">
                    {seleccionados.size} seleccionado(s)
                  </span>
                )}
              </div>
              <Button 
                onClick={handleAsignarTodos}
                disabled={
                  faltantes <= 0 || 
                  asignarMutation.isPending || 
                  (modoRevision && seleccionados.size === 0)
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {asignarMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {modoRevision 
                  ? `Confirmar y Asignar (${seleccionados.size})`
                  : `Asignar Mejores ${Math.min(faltantes, sugerencias.length)}`
                }
              </Button>
            </div>

            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {sugerencias.map(({ camarero, score, razones, asignacionesMes }, index) => {
                  const yaAsignado = sugerenciasAceptadas.has(camarero.id);
                  const maxScore = 100;
                  const porcentaje = Math.round((score / maxScore) * 100);

                  const estaSeleccionado = seleccionados.has(camarero.id);

                  return (
                    <Card 
                      key={camarero.id}
                      className={`p-4 transition-all cursor-pointer ${
                        yaAsignado ? 'bg-emerald-50 border-emerald-300' : 
                        estaSeleccionado ? 'bg-purple-50 border-purple-300 border-2' : 
                        'hover:shadow-md hover:border-slate-300'
                      }`}
                      onClick={() => modoRevision && !yaAsignado && toggleSeleccion(camarero.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                              #{index + 1}
                            </Badge>
                            <div>
                              <p className="font-semibold text-slate-800">{camarero.nombre}</p>
                              <p className="text-xs text-slate-500 font-mono">#{camarero.codigo}</p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant="outline" className="font-semibold">
                                {score} pts
                              </Badge>
                              <Badge 
                                className={`${
                                  porcentaje >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                  porcentaje >= 60 ? 'bg-blue-100 text-blue-700' :
                                  porcentaje >= 40 ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {porcentaje}% match
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-600 mb-3">
                            {camarero.valoracion_promedio > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {camarero.valoracion_promedio.toFixed(1)}
                              </span>
                            )}
                            <span>{camarero.especialidad}</span>
                            <span>{asignacionesMes} asign. este mes</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {razones.map((razon, idx) => (
                              <Badge key={idx} variant="outline" className={`text-xs ${razon.color}`}>
                                <razon.icon className="w-3 h-3 mr-1" />
                                {razon.text}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="ml-4 flex items-center gap-2">
                          {modoRevision && !yaAsignado && (
                            <div 
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                estaSeleccionado 
                                  ? 'bg-purple-600 border-purple-600' 
                                  : 'border-slate-300'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSeleccion(camarero.id);
                              }}
                            >
                              {estaSeleccionado && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                          )}
                          {yaAsignado ? (
                            <Badge className="bg-emerald-600 text-white">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Asignado
                            </Badge>
                          ) : !modoRevision && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAsignarUno(camarero);
                              }}
                              disabled={asignarMutation.isPending || faltantes <= 0}
                            >
                              Asignar
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}