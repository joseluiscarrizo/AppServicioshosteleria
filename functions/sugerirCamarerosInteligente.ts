import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'coordinador')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { pedido_id, limite = 10 } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id es requerido' }, { status: 400 });
    }

    // Obtener pedido
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);
    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Obtener todos los camareros activos
    const camareros = await base44.asServiceRole.entities.Camarero.filter({
      disponible: true,
      en_reserva: false
    });

    if (camareros.length === 0) {
      return Response.json({ 
        sugerencias: [],
        mensaje: 'No hay camareros disponibles'
      });
    }

    // Obtener disponibilidades
    const disponibilidades = await base44.asServiceRole.entities.Disponibilidad.filter({
      fecha: pedido.dia
    });

    // Obtener valoraciones
    const valoraciones = await base44.asServiceRole.entities.Valoracion.list();

    // Obtener asignaciones previas del mismo cliente
    const pedidosCliente = await base44.asServiceRole.entities.Pedido.filter({
      cliente: pedido.cliente
    });
    const pedidosClienteIds = pedidosCliente.map(p => p.id);
    
    const asignacionesPrevias = await base44.asServiceRole.entities.AsignacionCamarero.list();
    const asignacionesCliente = asignacionesPrevias.filter(a => 
      pedidosClienteIds.includes(a.pedido_id)
    );

    // Obtener asignaciones del día del evento
    const asignacionesDia = asignacionesPrevias.filter(a => a.fecha_pedido === pedido.dia);

    // Preparar datos para IA
    const datosPedido = {
      fecha: pedido.dia,
      hora_entrada: pedido.entrada || pedido.turnos?.[0]?.entrada,
      hora_salida: pedido.salida || pedido.turnos?.[0]?.salida,
      lugar: pedido.lugar_evento,
      ubicacion: {
        latitud: pedido.latitud,
        longitud: pedido.longitud,
        direccion: pedido.direccion_completa
      },
      cliente: pedido.cliente,
      especialidad_requerida: pedido.especialidad_requerida,
      habilidades_requeridas: pedido.habilidades_requeridas || [],
      idiomas_requeridos: pedido.idiomas_requeridos || [],
      cantidad_necesaria: pedido.cantidad_camareros || pedido.turnos?.[0]?.cantidad_camareros || 1,
      notas: pedido.notas
    };

    const datosCamareros = camareros.map(cam => {
      // Disponibilidad del día
      const dispDia = disponibilidades.find(d => d.camarero_id === cam.id);
      
      // Valoraciones del camarero
      const valorsCam = valoraciones.filter(v => v.camarero_id === cam.id);
      const valoracionPromedio = valorsCam.length > 0
        ? valorsCam.reduce((sum, v) => sum + (v.puntuacion || 0), 0) / valorsCam.length
        : cam.valoracion_promedio || 0;

      // Asignaciones previas con este cliente
      const trabajosCliente = asignacionesCliente.filter(a => a.camarero_id === cam.id);

      // Conflictos de horario
      const asigDia = asignacionesDia.filter(a => a.camarero_id === cam.id);

      // Calcular distancia si hay coordenadas
      let distanciaKm = null;
      if (pedido.latitud && pedido.longitud && cam.latitud && cam.longitud) {
        const R = 6371; // Radio tierra en km
        const dLat = (cam.latitud - pedido.latitud) * Math.PI / 180;
        const dLon = (cam.longitud - pedido.longitud) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pedido.latitud * Math.PI / 180) * Math.cos(cam.latitud * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanciaKm = R * c;
      }

      return {
        id: cam.id,
        nombre: cam.nombre,
        codigo: cam.codigo,
        especialidad: cam.especialidad,
        nivel_experiencia: cam.nivel_experiencia,
        experiencia_anios: cam.experiencia_anios,
        habilidades: cam.habilidades || [],
        idiomas: cam.idiomas || [],
        valoracion_promedio: valoracionPromedio,
        total_valoraciones: valorsCam.length,
        disponibilidad_dia: dispDia ? dispDia.tipo : 'disponible',
        motivo_no_disponible: dispDia?.motivo,
        preferencias_horarias: cam.preferencias_horarias,
        trabajos_previos_cliente: trabajosCliente.length,
        ultima_valoracion_cliente: trabajosCliente.length > 0 
          ? valoraciones.find(v => v.camarero_id === cam.id && v.pedido_id === trabajosCliente[0].pedido_id)?.puntuacion 
          : null,
        distancia_km: distanciaKm,
        radio_trabajo_km: cam.radio_trabajo_km,
        conflictos_horario: asigDia.map(a => ({
          hora_entrada: a.hora_entrada,
          hora_salida: a.hora_salida
        }))
      };
    });

    // Usar IA para analizar y rankear camareros
    const analisisIA = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Eres un sistema experto en asignación de personal de catering y eventos.

Analiza el siguiente evento y la lista de camareros disponibles. Debes generar un ranking inteligente de los mejores camareros para este trabajo, considerando:

1. **Disponibilidad**: Prioritario - no asignar si no está disponible o tiene conflictos de horario
2. **Experiencia y valoraciones**: Camareros con mejor historial y puntuaciones
3. **Especialización**: Match con tipo de evento y habilidades requeridas
4. **Historial con el cliente**: Preferir camareros que ya trabajaron bien con este cliente
5. **Proximidad geográfica**: Considerar distancia y radio de trabajo
6. **Preferencias horarias**: Match con horarios preferidos del camarero

EVENTO:
${JSON.stringify(datosPedido, null, 2)}

CAMAREROS DISPONIBLES:
${JSON.stringify(datosCamareros, null, 2)}

Genera un ranking de los mejores ${limite} camareros ordenados por idoneidad. Para cada uno:
- Calcula un score de 0-100 (100 = perfecto)
- Identifica fortalezas específicas
- Señala cualquier consideración o limitación
- Proporciona una recomendación clara

Prioriza SIEMPRE la disponibilidad real - no sugieras camareros que estén explícitamente no disponibles o con conflictos graves de horario.`,
      response_json_schema: {
        type: "object",
        properties: {
          ranking: {
            type: "array",
            items: {
              type: "object",
              properties: {
                camarero_id: { type: "string" },
                nombre: { type: "string" },
                score: { type: "number" },
                nivel_recomendacion: { 
                  type: "string",
                  enum: ["excelente", "muy_bueno", "bueno", "aceptable", "no_recomendado"]
                },
                fortalezas: {
                  type: "array",
                  items: { type: "string" }
                },
                consideraciones: {
                  type: "array",
                  items: { type: "string" }
                },
                razon_principal: { type: "string" },
                disponible: { type: "boolean" }
              }
            }
          },
          resumen_analisis: { type: "string" },
          alertas: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Enriquecer con datos completos del camarero
    const sugerenciasEnriquecidas = analisisIA.ranking.map(sugerencia => {
      const camarero = camareros.find(c => c.id === sugerencia.camarero_id);
      const datosAnalisis = datosCamareros.find(d => d.id === sugerencia.camarero_id);
      
      return {
        ...sugerencia,
        camarero: {
          id: camarero.id,
          nombre: camarero.nombre,
          codigo: camarero.codigo,
          telefono: camarero.telefono,
          especialidad: camarero.especialidad,
          experiencia_anios: camarero.experiencia_anios,
          valoracion_promedio: datosAnalisis.valoracion_promedio,
          distancia_km: datosAnalisis.distancia_km
        }
      };
    });

    return Response.json({
      success: true,
      pedido_id: pedido_id,
      evento: {
        cliente: pedido.cliente,
        fecha: pedido.dia,
        lugar: pedido.lugar_evento
      },
      total_candidatos: camareros.length,
      sugerencias: sugerenciasEnriquecidas,
      resumen: analisisIA.resumen_analisis,
      alertas: analisisIA.alertas || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en sugerirCamarerosInteligente:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});