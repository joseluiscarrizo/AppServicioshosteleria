import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Award, TrendingUp, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecomendacionesCamareros({ pedido, camareros, asignaciones, onAsignar }) {
  if (!pedido) return null;

  // Sistema de scoring inteligente
  const calcularScore = (camarero) => {
    let score = 0;
    let razones = [];

    // 1. Valoración (hasta 30 puntos)
    if (camarero.valoracion_promedio) {
      score += camarero.valoracion_promedio * 6;
      if (camarero.valoracion_promedio >= 4.5) {
        razones.push('Excelente valoración');
      }
    }

    // 2. Especialidad coincidente (25 puntos)
    if (pedido.especialidad_requerida && camarero.especialidad === pedido.especialidad_requerida) {
      score += 25;
      razones.push(`Especialista en ${pedido.especialidad_requerida}`);
    } else if (camarero.especialidad === 'general') {
      score += 10;
    }

    // 3. Habilidades requeridas (hasta 20 puntos)
    if (pedido.habilidades_requeridas?.length > 0) {
      const habilidadesCoincidentes = pedido.habilidades_requeridas.filter(h => 
        camarero.habilidades?.includes(h)
      );
      const porcentaje = habilidadesCoincidentes.length / pedido.habilidades_requeridas.length;
      score += porcentaje * 20;
      if (porcentaje === 1) {
        razones.push('Todas las habilidades');
      } else if (porcentaje > 0) {
        razones.push(`${habilidadesCoincidentes.length}/${pedido.habilidades_requeridas.length} habilidades`);
      }
    }

    // 4. Idiomas requeridos (hasta 15 puntos)
    if (pedido.idiomas_requeridos?.length > 0) {
      const idiomasCoincidentes = pedido.idiomas_requeridos.filter(i => 
        camarero.idiomas?.includes(i)
      );
      const porcentaje = idiomasCoincidentes.length / pedido.idiomas_requeridos.length;
      score += porcentaje * 15;
      if (porcentaje === 1) {
        razones.push('Idiomas requeridos');
      }
    }

    // 5. Experiencia (hasta 10 puntos)
    if (camarero.experiencia_anios) {
      score += Math.min(camarero.experiencia_anios * 2, 10);
      if (camarero.experiencia_anios >= 5) {
        razones.push(`${camarero.experiencia_anios} años experiencia`);
      }
    }

    return { score: Math.round(score), razones };
  };

  // Filtrar camareros ya asignados
  const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
  const idsAsignados = asignacionesPedido.map(a => a.camarero_id);

  // Calcular scores y ordenar
  const camarerosConScore = camareros
    .filter(c => c.disponible && !idsAsignados.includes(c.id))
    .map(c => ({
      ...c,
      ...calcularScore(c)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5

  if (camarerosConScore.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-purple-600" />
        <h4 className="font-semibold text-slate-800">Recomendaciones Inteligentes</h4>
        <Badge className="bg-purple-100 text-purple-700 text-xs">Top 5</Badge>
      </div>

      <div className="space-y-2">
        {camarerosConScore.map((camarero, index) => (
          <motion.div
            key={camarero.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-lg p-3 border border-purple-200 hover:border-purple-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-800">{camarero.nombre}</span>
                  <Badge 
                    className={`text-xs ${
                      camarero.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      camarero.score >= 60 ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {camarero.score}% match
                  </Badge>
                  {camarero.valoracion_promedio > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {camarero.valoracion_promedio.toFixed(1)}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 text-xs">
                  {camarero.razones.map((razon, i) => (
                    <span key={i} className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      {razon}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => onAsignar(camarero)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Asignar
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}