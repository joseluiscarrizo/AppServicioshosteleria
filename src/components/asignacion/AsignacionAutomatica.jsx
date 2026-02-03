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

      // 1. Valoración (0-35 puntos) - INCREMENTADO para priorizar mejor
      const valoracionPromedio = camarero.valoracion_promedio || 0;
      score += valoracionPromedio * 7; // Aumentado de 6 a 7
      if (valoracionPromedio >= 4.5) {
        razones.push({ icon: Star, text: `Excelente valoración (${valoracionPromedio.toFixed(1)})`, color: 'text-amber-600' });
      } else if (valoracionPromedio >= 4.0) {
        razones.push({ icon: Star, text: `Buena valoración (${valoracionPromedio.toFixed(1)})`, color: 'text-amber-500' });
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

      // 5. Carga de trabajo del DÍA (0-30 puntos) - menos horas trabajadas = más puntos
      const asignacionesDia = asignaciones.filter(a => 
        a.camarero_id === camarero.id && 
        a.fecha_pedido === pedido.dia
      );
      
      // Calcular total de horas trabajadas ese día
      let horasTrabajadas = 0;
      for (const asig of asignacionesDia) {
        if (asig.hora_entrada && asig.hora_salida) {
          const [hE, mE] = asig.hora_entrada.split(':').map(Number);
          const [hS, mS] = asig.hora_salida.split(':').map(Number);
          const minutosEntrada = hE * 60 + mE;
          const minutosSalida = hS * 60 + mS;
          horasTrabajadas += (minutosSalida - minutosEntrada) / 60;
        }
      }
      
      // Bonus por baja carga: 30 puntos si 0 horas, -5 puntos por cada hora trabajada
      const cargaScore = Math.max(0, 30 - (horasTrabajadas * 5));
      score += cargaScore;
      
      if (horasTrabajadas === 0) {
        razones.push({ icon: TrendingUp, text: 'Disponible todo el día', color: 'text-emerald-600' });
      } else if (horasTrabajadas < 4) {
        razones.push({ icon: TrendingUp, text: `${horasTrabajadas.toFixed(1)}h trabajadas hoy`, color: 'text-blue-600' });
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

    // Ordenar por score, luego por valoración como desempate
    return scored
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.camarero.valoracion_promedio || 0) - (a.camarero.valoracion_promedio || 0);
      })
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Asignación Automática Inteligente
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  Powered by IA • Sistema de scoring avanzado
                </p>
              </div>
            </div>
            {pedido && faltantes > 0 && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Progreso</p>
                  <p className="text-lg font-bold text-slate-800">
                    {asignacionesActuales}/{cantidadNecesaria}
                  </p>
                </div>
                <div className="relative w-16 h-16">
                  <svg className="transform -rotate-90 w-16 h-16">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-slate-200"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - asignacionesActuales / cantidadNecesaria)}`}
                      className="text-purple-600 transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-purple-600">
                      {Math.round((asignacionesActuales / cantidadNecesaria) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {pedido && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{pedido.cliente}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {pedido.lugar_evento || 'Ubicación por confirmar'}
                  </p>
                </div>
              </div>
              {faltantes > 0 ? (
                <Badge className="bg-orange-500 text-white px-3 py-1">
                  Faltan {faltantes} camarero{faltantes !== 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge className="bg-emerald-500 text-white px-3 py-1">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completo
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        {sugerencias.length === 0 ? (
          <div className="text-center py-16 flex-1">
            <div className="inline-block p-4 rounded-full bg-slate-100 mb-4">
              <AlertCircle className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700">No hay camareros disponibles</p>
            <p className="text-sm text-slate-500 mt-2">Verifica disponibilidad, horarios y restricciones del evento</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Controles de modo */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl mb-4 border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={modoRevision} 
                    onCheckedChange={setModoRevision}
                    id="modo-revision"
                  />
                  <Label htmlFor="modo-revision" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">Modo Revisión</span>
                      <Badge variant="outline" className="text-xs">
                        {modoRevision ? 'Manual' : 'Auto'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {modoRevision ? 'Selecciona manualmente antes de asignar' : 'Asigna automáticamente los mejores candidatos'}
                    </p>
                  </Label>
                </div>
                <Badge className="bg-white border-purple-200 text-purple-700 px-3 py-1.5">
                  <Info className="w-3 h-3 mr-1.5" />
                  {sugerencias.length} candidato{sugerencias.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2">
                {modoRevision && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={seleccionarMejores}
                      disabled={faltantes <= 0}
                      className="bg-white border-purple-200 hover:bg-purple-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Seleccionar Top {Math.min(faltantes, sugerencias.length)}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSeleccionados(new Set())}
                      disabled={seleccionados.size === 0}
                      className="bg-white border-slate-200 hover:bg-slate-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpiar
                    </Button>
                  </div>
                )}
                <div className="ml-auto">
                  {modoRevision && seleccionados.size > 0 && (
                    <Badge className="bg-purple-600 text-white px-3 py-1.5">
                      {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Botón principal de asignación */}
            <div className="mb-4">
              <Button 
                onClick={handleAsignarTodos}
                disabled={
                  faltantes <= 0 || 
                  asignarMutation.isPending || 
                  (modoRevision && seleccionados.size === 0)
                }
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg"
                size="lg"
              >
                {asignarMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                {modoRevision 
                  ? `Confirmar y Asignar ${seleccionados.size} Camarero${seleccionados.size !== 1 ? 's' : ''}`
                  : `Asignar Automáticamente ${Math.min(faltantes, sugerencias.length)} Mejores`
                }
              </Button>
            </div>

            {/* Lista de candidatos */}
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-3 pb-2">
                {sugerencias.map(({ camarero, score, razones, asignacionesMes }, index) => {
                  const yaAsignado = sugerenciasAceptadas.has(camarero.id);
                  const maxScore = 100;
                  const porcentaje = Math.round((score / maxScore) * 100);
                  const estaSeleccionado = seleccionados.has(camarero.id);

                  return (
                    <Card 
                      key={camarero.id}
                      className={`p-5 transition-all duration-200 ${
                        yaAsignado ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-300 shadow-sm' : 
                        estaSeleccionado ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-400 border-2 shadow-md scale-[1.02]' : 
                        'hover:shadow-lg hover:border-slate-300 hover:scale-[1.01] bg-white cursor-pointer'
                      }`}
                      onClick={() => modoRevision && !yaAsignado && toggleSeleccion(camarero.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Ranking badge */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                            index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md' :
                            index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                            index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                            'bg-gradient-to-br from-purple-100 to-blue-100 text-purple-700'
                          }`}>
                            #{index + 1}
                          </div>
                        </div>

                        {/* Contenido principal */}
                        <div className="flex-1 min-w-0">
                          {/* Nombre y score */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-lg text-slate-900">{camarero.nombre}</h4>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">Código: {camarero.codigo}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <Badge className="bg-slate-800 text-white px-3 py-1 font-bold text-sm">
                                {score} pts
                              </Badge>
                              <Badge 
                                className={`px-3 py-1 font-semibold ${
                                  porcentaje >= 80 ? 'bg-emerald-500 text-white' :
                                  porcentaje >= 60 ? 'bg-blue-500 text-white' :
                                  porcentaje >= 40 ? 'bg-amber-500 text-white' :
                                  'bg-slate-400 text-white'
                                }`}
                              >
                                {porcentaje}% compatible
                              </Badge>
                            </div>
                          </div>

                          {/* Stats rápidas */}
                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-3 pb-3 border-b border-slate-200">
                            {camarero.valoracion_promedio > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="font-semibold">{camarero.valoracion_promedio.toFixed(1)}</span>
                              </div>
                            )}
                            <Badge variant="outline" className="font-medium">
                              {camarero.especialidad}
                            </Badge>
                            {(() => {
                              const asignsDia = asignaciones.filter(a => 
                                a.camarero_id === camarero.id && 
                                a.fecha_pedido === pedido.dia
                              );
                              let horas = 0;
                              asignsDia.forEach(a => {
                                if (a.hora_entrada && a.hora_salida) {
                                  const [hE, mE] = a.hora_entrada.split(':').map(Number);
                                  const [hS, mS] = a.hora_salida.split(':').map(Number);
                                  horas += ((hS * 60 + mS) - (hE * 60 + mE)) / 60;
                                }
                              });
                              return (
                                <span className={`text-xs font-medium ${horas === 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {horas === 0 ? '✓ Libre hoy' : `${horas.toFixed(1)}h trabajadas hoy`}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Razones destacadas */}
                          {razones.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {razones.map((razon, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className={`text-xs font-medium ${razon.color} bg-white`}
                                >
                                  <razon.icon className="w-3.5 h-3.5 mr-1.5" />
                                  {razon.text}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Controles de selección/asignación */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {modoRevision && !yaAsignado && (
                            <button
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                estaSeleccionado 
                                  ? 'bg-purple-600 border-purple-600 scale-110' 
                                  : 'border-slate-300 hover:border-purple-400'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSeleccion(camarero.id);
                              }}
                            >
                              {estaSeleccionado && (
                                <CheckCircle className="w-5 h-5 text-white" />
                              )}
                            </button>
                          )}
                          {yaAsignado ? (
                            <Badge className="bg-emerald-600 text-white px-3 py-2 shadow-sm">
                              <CheckCircle className="w-4 h-4 mr-1.5" />
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
                              className="bg-purple-600 hover:bg-purple-700"
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
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} size="lg">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}