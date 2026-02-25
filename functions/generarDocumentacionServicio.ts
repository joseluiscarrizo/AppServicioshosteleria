import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'coordinador')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id es requerido' }, { status: 400 });
    }

    // Obtener datos del pedido
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);
    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Obtener asignaciones
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
      pedido_id: pedido_id
    });

    // Obtener camareros
    const camareros = await base44.asServiceRole.entities.Camarero.list();
    const camareriosAsignados = asignaciones.map(a => {
      const camarero = camareros.find(c => c.id === a.camarero_id);
      return {
        nombre: camarero?.nombre || 'Desconocido',
        codigo: camarero?.codigo,
        telefono: camarero?.telefono,
        estado: a.estado,
        hora_entrada: a.hora_entrada || pedido.entrada,
        hora_salida: a.hora_salida || pedido.salida,
        especialidad: camarero?.especialidad,
        experiencia_anios: camarero?.experiencia_anios,
        valoracion_promedio: camarero?.valoracion_promedio
      };
    });

    // Obtener valoraciones previas del evento si existe
    const valoraciones = await base44.asServiceRole.entities.Valoracion.filter({
      pedido_id: pedido_id
    });

    // Obtener historial de mensajes
    const historialWhatsApp = await base44.asServiceRole.entities.HistorialWhatsApp.filter({
      pedido_id: pedido_id
    });

    // Obtener cliente
    let clienteInfo = null;
    if (pedido.cliente_id) {
      try {
        clienteInfo = await base44.asServiceRole.entities.Cliente.get(pedido.cliente_id);
      } catch (_e) {
        console.log('Cliente no encontrado');
      }
    }

    // Preparar datos para la IA
    const datosEvento = {
      pedido: {
        codigo: pedido.codigo_pedido,
        cliente: pedido.cliente,
        fecha: pedido.dia,
        lugar: pedido.lugar_evento,
        direccion: pedido.direccion_completa,
        link_ubicacion: pedido.link_ubicacion,
        camisa: pedido.camisa,
        turnos: pedido.turnos || [{
          entrada: pedido.entrada,
          salida: pedido.salida,
          cantidad_camareros: pedido.cantidad_camareros
        }],
        extra_transporte: pedido.extra_transporte,
        notas: pedido.notas,
        habilidades_requeridas: pedido.habilidades_requeridas,
        especialidad_requerida: pedido.especialidad_requerida
      },
      camareros: camareriosAsignados,
      cliente_info: clienteInfo ? {
        nombre: clienteInfo.nombre,
        contacto: clienteInfo.persona_contacto_1,
        telefono: clienteInfo.telefono_1,
        email: clienteInfo.email_1
      } : null,
      estadisticas: {
        total_asignados: asignaciones.length,
        confirmados: asignaciones.filter(a => a.estado === 'confirmado').length,
        pendientes: asignaciones.filter(a => a.estado === 'pendiente').length,
        mensajes_enviados: historialWhatsApp.length,
        valoraciones_previas: valoraciones.length
      }
    };

    // Usar IA para generar documentación estructurada e inteligente
    const documentacion = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Eres un asistente experto en documentación de eventos de catering y servicios. 
      
Genera una documentación profesional y completa para el siguiente servicio de camareros. 
Debes analizar los datos proporcionados y crear un documento estructurado que incluya:

1. **RESUMEN EJECUTIVO DEL EVENTO**
   - Visión general del evento
   - Puntos clave y destacados
   - Nivel de complejidad y requerimientos especiales

2. **INFORMACIÓN DEL CLIENTE**
   - Datos de contacto
   - Historial de servicios (si aplica)
   - Preferencias o requisitos especiales

3. **DETALLES DEL SERVICIO**
   - Fecha, hora y ubicación completa
   - Descripción del tipo de evento
   - Requerimientos específicos (uniforme, habilidades, etc.)
   - Información logística (transporte, acceso, etc.)

4. **EQUIPO ASIGNADO**
   - Lista detallada de camareros con sus roles
   - Análisis de experiencia y especialidades del equipo
   - Estado de confirmación de cada miembro
   - Distribución de turnos

5. **COORDINACIÓN Y COMUNICACIÓN**
   - Resumen de mensajes y confirmaciones
   - Puntos de contacto clave
   - Instrucciones especiales

6. **CONSIDERACIONES OPERATIVAS**
   - Checklist de preparación
   - Puntos críticos a tener en cuenta
   - Recomendaciones basadas en el tipo de evento
   - Riesgos potenciales y mitigaciones

7. **NOTAS ADICIONALES**
   - Cualquier información relevante extraída de las notas
   - Observaciones sobre el equipo o logística

Datos del evento:
${JSON.stringify(datosEvento, null, 2)}

Genera una documentación profesional, clara y bien estructurada. Usa un tono formal pero accesible.
Incluye análisis inteligentes cuando sea relevante (ej: "El equipo cuenta con alta experiencia promedio de X años" o "Se recomienda salida anticipada por ubicación alejada").
`,
      response_json_schema: {
        type: "object",
        properties: {
          resumen_ejecutivo: {
            type: "object",
            properties: {
              vision_general: { type: "string" },
              puntos_clave: { type: "array", items: { type: "string" } },
              nivel_complejidad: { type: "string" },
              destacados: { type: "string" }
            }
          },
          informacion_cliente: {
            type: "object",
            properties: {
              nombre: { type: "string" },
              contacto_principal: { type: "string" },
              telefono: { type: "string" },
              email: { type: "string" },
              observaciones: { type: "string" }
            }
          },
          detalles_servicio: {
            type: "object",
            properties: {
              fecha_completa: { type: "string" },
              ubicacion_completa: { type: "string" },
              tipo_evento: { type: "string" },
              horarios: { type: "string" },
              uniforme_requerido: { type: "string" },
              transporte_incluido: { type: "boolean" },
              instrucciones_acceso: { type: "string" },
              requerimientos_especiales: { type: "array", items: { type: "string" } }
            }
          },
          equipo_asignado: {
            type: "object",
            properties: {
              resumen_equipo: { type: "string" },
              total_camareros: { type: "number" },
              experiencia_promedio: { type: "string" },
              distribucion_turnos: { type: "string" },
              listado_detallado: { 
                type: "array", 
                items: {
                  type: "object",
                  properties: {
                    nombre: { type: "string" },
                    rol: { type: "string" },
                    horario: { type: "string" },
                    estado: { type: "string" },
                    observaciones: { type: "string" }
                  }
                }
              }
            }
          },
          coordinacion: {
            type: "object",
            properties: {
              estado_confirmaciones: { type: "string" },
              mensajes_enviados: { type: "number" },
              puntos_contacto: { type: "array", items: { type: "string" } },
              instrucciones_especiales: { type: "string" }
            }
          },
          consideraciones_operativas: {
            type: "object",
            properties: {
              checklist_preparacion: { type: "array", items: { type: "string" } },
              puntos_criticos: { type: "array", items: { type: "string" } },
              recomendaciones: { type: "array", items: { type: "string" } },
              riesgos_mitigaciones: { type: "array", items: { type: "string" } }
            }
          },
          notas_adicionales: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      pedido_id: pedido_id,
      codigo_pedido: pedido.codigo_pedido,
      cliente: pedido.cliente,
      fecha_generacion: new Date().toISOString(),
      documentacion: documentacion,
      datos_raw: datosEvento
    });

  } catch (error) {
    console.error('Error generando documentación:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});