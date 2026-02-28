import { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  BarChart3, Clock, CheckCircle2, AlertTriangle, TrendingUp,
  Target, Activity, Shield, Calendar
} from 'lucide-react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

const INICIO_SESION = new Date('2026-02-28T14:45:00');

const TAREAS_INICIALES = [
  {
    id: 'pr1',
    nombre: 'PR #1: Error Boundaries',
    descripcion: 'Implementación de Error Boundaries en la aplicación',
    progreso: 85,
    duracionEstimada: 45,
    riesgo: 'BAJO',
    color: '#10b981',
  },
  {
    id: 'pr2',
    nombre: 'PR #2: Fix Infinite Loading',
    descripcion: 'Corrección del bug de carga infinita',
    progreso: 60,
    duracionEstimada: 30,
    riesgo: 'MEDIO',
    color: '#f59e0b',
  },
  {
    id: 'pr3',
    nombre: 'PR #3: Update Dependencies',
    descripcion: 'Actualización de dependencias del proyecto',
    progreso: 40,
    duracionEstimada: 25,
    riesgo: 'MEDIO',
    color: '#f59e0b',
  },
  {
    id: 'docs',
    nombre: 'Documentación',
    descripcion: 'Actualización de documentación técnica',
    progreso: 70,
    duracionEstimada: 20,
    riesgo: 'BAJO',
    color: '#10b981',
  },
  {
    id: 'roadmap',
    nombre: 'Roadmap',
    descripcion: 'Definición y revisión del roadmap del producto',
    progreso: 20,
    duracionEstimada: 35,
    riesgo: 'ALTO',
    color: '#ef4444',
  },
];

const RIESGO_CONFIG = {
  BAJO: { label: 'BAJO', color: 'bg-emerald-100 text-emerald-700', icon: '🟢' },
  MEDIO: { label: 'MEDIO', color: 'bg-amber-100 text-amber-700', icon: '🟡' },
  ALTO: { label: 'ALTO', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

function calcularTiempos(tarea, ahora) {
  const totalTranscurrido = differenceInMinutes(ahora, INICIO_SESION);
  const tiempoInvertido = Math.round((tarea.progreso / 100) * tarea.duracionEstimada);
  const tiempoRestante = tarea.duracionEstimada - tiempoInvertido;
  const eta = addMinutes(ahora, tiempoRestante);
  return { tiempoInvertido, tiempoRestante, eta, totalTranscurrido };
}

function BarraProgreso({ valor, color }) {
  const lleno = Math.round(valor / 10);
  const vacio = 10 - lleno;
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <span className="text-slate-400">[</span>
      <span style={{ color }}>{Array(lleno).fill('█').join('')}</span>
      <span className="text-slate-300">{Array(vacio).fill('░').join('')}</span>
      <span className="text-slate-400">]</span>
      <span className="ml-1 font-semibold text-slate-700">{valor}%</span>
    </div>
  );
}

function TarjetaTarea({ tarea, ahora, onProgresoChange }) {
  const { tiempoInvertido, tiempoRestante, eta } = calcularTiempos(tarea, ahora);
  const riesgo = RIESGO_CONFIG[tarea.riesgo];

  return (
    <Card className="p-4 border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{tarea.nombre}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{tarea.descripcion}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riesgo.color}`}>
          {riesgo.icon} {riesgo.label}
        </span>
      </div>

      <div className="mb-3">
        <BarraProgreso valor={tarea.progreso} color={tarea.color} />
        <Progress value={tarea.progreso} className="h-2 mt-2" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mb-3">
        <div className="flex flex-col items-center p-2 bg-slate-50 rounded">
          <Clock className="w-3 h-3 mb-1 text-slate-400" />
          <span className="font-semibold text-slate-700">{tiempoInvertido} min</span>
          <span className="text-slate-400">Invertido</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-slate-50 rounded">
          <TrendingUp className="w-3 h-3 mb-1 text-slate-400" />
          <span className="font-semibold text-slate-700">{tiempoRestante} min</span>
          <span className="text-slate-400">Restante</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-slate-50 rounded">
          <Target className="w-3 h-3 mb-1 text-slate-400" />
          <span className="font-semibold text-slate-700">{format(eta, 'HH:mm')}</span>
          <span className="text-slate-400">ETA</span>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Actualizar progreso</span>
          <span className="font-medium">{tarea.progreso}%</span>
        </div>
        <Slider
          value={[tarea.progreso]}
          min={0}
          max={100}
          step={5}
          onValueChange={(val) => onProgresoChange(tarea.id, val[0])}
          className="w-full"
        />
      </div>
    </Card>
  );
}

export default function MetricasProgreso() {
  const [tareas, setTareas] = useState(TAREAS_INICIALES);
  const [ahora, setAhora] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const progresoGlobal = useMemo(
    () => Math.round(tareas.reduce((sum, t) => sum + t.progreso, 0) / tareas.length),
    [tareas]
  );

  const tiempoTotal = useMemo(
    () => tareas.reduce((sum, t) => sum + t.duracionEstimada, 0),
    [tareas]
  );

  const tiempoInvertidoTotal = useMemo(
    () => tareas.reduce((sum, t) => sum + Math.round((t.progreso / 100) * t.duracionEstimada), 0),
    [tareas]
  );

  const tiempoRestanteTotal = tiempoTotal - tiempoInvertidoTotal;
  const etaFinal = addMinutes(ahora, tiempoRestanteTotal);
  const tiempoTranscurrido = differenceInMinutes(ahora, INICIO_SESION);

  const confianza = useMemo(() => {
    const tareasEnRiesgo = tareas.filter(t => t.riesgo === 'ALTO').length;
    const tareasMedioRiesgo = tareas.filter(t => t.riesgo === 'MEDIO').length;
    return Math.max(60, 95 - tareasEnRiesgo * 15 - tareasMedioRiesgo * 5);
  }, [tareas]);

  const tareasEnRiesgo = tareas.filter(t => t.riesgo === 'ALTO').length;
  const holgura = Math.max(0, Math.round(tiempoRestanteTotal * 0.15));

  const etaOptimista = addMinutes(etaFinal, -holgura);
  const etaPesimista = addMinutes(etaFinal, Math.round(holgura * 2));

  const handleProgresoChange = (id, valor) => {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, progreso: valor } : t));
  };

  return (
    <div className="space-y-6">
      {/* Header global */}
      <Card className="p-6 bg-gradient-to-r from-slate-800 to-[#1e3a5f] text-white">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6" />
          <h2 className="text-xl font-bold">📊 Métrica de Progreso + Tiempo Estimado</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{progresoGlobal}%</div>
            <div className="text-xs text-slate-300">Progreso Global</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{tiempoTranscurrido} min</div>
            <div className="text-xs text-slate-300">Tiempo Transcurrido</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{tiempoRestanteTotal} min</div>
            <div className="text-xs text-slate-300">Tiempo Restante</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{confianza}%</div>
            <div className="text-xs text-slate-300">Confianza</div>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span>Progreso global</span>
            <span>{progresoGlobal}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-emerald-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progresoGlobal}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-slate-300">
            ETA Finalización:{' '}
            <span className="font-bold text-white">{format(etaFinal, 'HH:mm')}</span>
          </span>
          {tareasEnRiesgo > 0 && (
            <span className="flex items-center gap-1 text-red-300">
              <AlertTriangle className="w-4 h-4" />
              {tareasEnRiesgo} tarea(s) en riesgo alto
            </span>
          )}
        </div>
      </Card>

      {/* Desglose por tarea */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#1e3a5f]" />
          Desglose por Tarea
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tareas.map(tarea => (
            <TarjetaTarea
              key={tarea.id}
              tarea={tarea}
              ahora={ahora}
              onProgresoChange={handleProgresoChange}
            />
          ))}
        </div>
      </div>

      {/* Timeline total */}
      <Card className="p-5 border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#1e3a5f]" />
          Timeline Total
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">├─ Inicio</span>
              <span className="font-semibold text-slate-700">{format(INICIO_SESION, 'HH:mm')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">├─ Ahora</span>
              <span className="font-semibold text-slate-700">{format(ahora, 'HH:mm')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">├─ Finalización estimada</span>
              <span className="font-bold text-[#1e3a5f]">{format(etaFinal, 'HH:mm')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">├─ Duración total</span>
              <span className="font-semibold text-slate-700">{Math.ceil((tiempoTotal / 60) * 10) / 10} h</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500">└─ Holgura de tiempo</span>
              <span className="font-semibold text-emerald-600">{holgura} min</span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Optimista
              </div>
              <div className="text-2xl font-bold text-emerald-600">{format(etaOptimista, 'HH:mm')}</div>
              <div className="text-xs text-emerald-600 mt-1">Todo avanza sin incidencias</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 font-semibold mb-1">
                <Shield className="w-4 h-4" />
                Estimado
              </div>
              <div className="text-2xl font-bold text-amber-600">{format(etaFinal, 'HH:mm')}</div>
              <div className="text-xs text-amber-600 mt-1">Ritmo actual de progreso</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" />
                Pesimista
              </div>
              <div className="text-2xl font-bold text-red-600">{format(etaPesimista, 'HH:mm')}</div>
              <div className="text-xs text-red-600 mt-1">Con posibles imprevistos</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Resumen de riesgos */}
      <Card className="p-5 border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#1e3a5f]" />
          Resumen de Riesgos
        </h3>
        <div className="space-y-2">
          {tareas.map(tarea => {
            const riesgo = RIESGO_CONFIG[tarea.riesgo];
            const { tiempoRestante } = calcularTiempos(tarea, ahora);
            return (
              <div key={tarea.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="text-base">{riesgo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 truncate">{tarea.nombre}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 ${riesgo.color}`}>
                      {riesgo.label}
                    </span>
                  </div>
                  <Progress value={tarea.progreso} className="h-1.5 mt-1" />
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0 ml-2">
                  <div className="font-semibold text-slate-700">{tarea.progreso}%</div>
                  <div>{tiempoRestante} min restantes</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
