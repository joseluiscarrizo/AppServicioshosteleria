/**
 * enviarWhatsAppMasivo
 *
 * Sends a WhatsApp message to multiple waiters in bulk. Optionally uses a stored
 * message template and personalises the body with order (`Pedido`) data.
 * Returns a per-recipient delivery report.
 *
 * Template variables supported in `mensaje`:
 * {{camarero}}, {{cliente}}, {{dia}}, {{lugar_evento}},
 * {{hora_entrada}}, {{hora_salida}}, {{camisa}}
 *
 * @method POST
 * @auth Bearer token required
 * @rbac admin, coordinador
 * @rateLimit 20 requests / 60 s
 *
 * @param {string[]} camareros_ids - List of waiter IDs to message (min 1)
 * @param {string}   [pedido_id]   - Order ID for template variable substitution
 * @param {string}   [mensaje]     - Message body (one of mensaje or plantilla_id is required)
 * @param {string}   [plantilla_id] - Stored PlantillaWhatsApp ID (overrides mensaje)
 * @param {string}   [coordinador_id] - Coordinator ID for history logging
 *
 * @returns {{ success: boolean, total: number, exitosos: number, fallidos: number,
 *             detalles: Array<{ camarero: string, telefono?: string, estado: string,
 *             proveedor?: string, mensaje_id?: string, enviado_por_api?: boolean, error?: string }>,
 *             mensaje: string }}
 *
 * @throws {400} Debe seleccionar al menos un camarero
 * @throws {400} Debe proporcionar un mensaje o plantilla
 * @throws {401} No autorizado - Token inválido o expirado
 * @throws {403} No autorizado - Rol insuficiente
 * @throws {500} Error al enviar mensajes
 *
 * @example
 * POST /functions/v1/enviarWhatsAppMasivo
 * Authorization: Bearer <token>
 * {
 *   "camareros_ids": ["cam1", "cam2"],
 *   "pedido_id": "ped456",
 *   "mensaje": "Hola {{camarero}}, tienes servicio el {{dia}} en {{cliente}}."
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    validateUserAccess(user, ['admin', 'coordinador']);

    const { 
      camareros_ids,
      pedido_id,
      mensaje,
      plantilla_id,
      coordinador_id 
    } = await req.json();

    if (!camareros_ids || camareros_ids.length === 0) {
      return Response.json({ error: 'Debe seleccionar al menos un camarero' }, { status: 400 });
    }

    if (!mensaje && !plantilla_id) {
      return Response.json({ error: 'Debe proporcionar un mensaje o plantilla' }, { status: 400 });
    }

    // Obtener camareros
    const camareros = await base44.asServiceRole.entities.Camarero.list();
    const camarerosSeleccionados = camareros.filter(c => camareros_ids.includes(c.id));

    // Obtener pedido si existe
    let pedido = null;
    if (pedido_id) {
      pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);
    }

    // Obtener plantilla si existe
    let plantilla = null;
    let mensajeFinal = mensaje;
    
    if (plantilla_id) {
      plantilla = await base44.asServiceRole.entities.PlantillaWhatsApp.get(plantilla_id);
      if (plantilla) {
        mensajeFinal = plantilla.contenido;
      }
    }

    const resultados = {
      exitosos: 0,
      fallidos: 0,
      detalles: []
    };

    // Obtener coordinador para el número de envío
    let _coordinador = null;
    if (coordinador_id) {
      _coordinador = await base44.asServiceRole.entities.Coordinador.get(coordinador_id);
    }

    // Enviar a cada camarero
    for (const camarero of camarerosSeleccionados) {
      try {
        if (!camarero.telefono) {
          resultados.fallidos++;
          resultados.detalles.push({
            camarero: camarero.nombre,
            estado: 'fallido',
            error: 'Sin teléfono'
          });
          
          // Registrar en historial
          await base44.asServiceRole.entities.HistorialWhatsApp.create({
            destinatario_id: camarero.id,
            destinatario_nombre: camarero.nombre,
            telefono: 'Sin teléfono',
            mensaje: mensajeFinal,
            plantilla_usada: plantilla?.nombre,
            pedido_id: pedido_id,
            estado: 'fallido',
            error: 'Camarero sin número de teléfono',
            proveedor: 'whatsapp_web',
            coordinador_id: coordinador_id
          });
          continue;
        }

        // Personalizar mensaje con datos del camarero y pedido
        let mensajePersonalizado = mensajeFinal;
        
        if (pedido) {
          mensajePersonalizado = mensajePersonalizado
            .replace(/\{\{cliente\}\}/g, pedido.cliente || '')
            .replace(/\{\{dia\}\}/g, pedido.dia || '')
            .replace(/\{\{lugar_evento\}\}/g, pedido.lugar_evento || '')
            .replace(/\{\{hora_entrada\}\}/g, pedido.entrada || '')
            .replace(/\{\{hora_salida\}\}/g, pedido.salida || '')
            .replace(/\{\{camisa\}\}/g, pedido.camisa || '');
        }
        
        mensajePersonalizado = mensajePersonalizado.replace(/\{\{camarero\}\}/g, camarero.nombre);

        // Limpiar el teléfono
        const telefonoLimpio = camarero.telefono.replace(/\D/g, '');
        let numeroWhatsApp = telefonoLimpio;
        if (!numeroWhatsApp.startsWith('34') && numeroWhatsApp.length === 9) {
          numeroWhatsApp = '34' + numeroWhatsApp;
        }

        // Intentar envío real con WhatsApp Business API
        const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
        const whatsappPhone = Deno.env.get('WHATSAPP_PHONE_NUMBER');
        
        let estadoEnvio = 'enviado';
        let mensajeIdProveedor = null;
        let proveedor = 'whatsapp_api'; // Por defecto intentar API
        let enviadoPorAPI = false;

        if (whatsappToken && whatsappPhone) {
          try {
            // Envío real con WhatsApp Business API
            const response = await fetch(
              `https://graph.facebook.com/v21.0/${whatsappPhone}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${whatsappToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: numeroWhatsApp,
                  type: 'text',
                  text: {
                    body: mensajePersonalizado
                  }
                })
              }
            );

            const data = await response.json();
            
            if (response.ok && data.messages) {
              mensajeIdProveedor = data.messages[0]?.id;
              proveedor = 'whatsapp_api';
              enviadoPorAPI = true;
              console.log(`✅ Mensaje enviado vía API a ${camarero.nombre}: ${mensajeIdProveedor}`);
            } else {
              throw new Error(data.error?.message || 'Error en WhatsApp API');
            }
          } catch (apiError) {
            console.error('WhatsApp API error:', apiError.message);
            proveedor = 'whatsapp_web'; // Fallback a WhatsApp Web
            estadoEnvio = 'pendiente';
          }
        } else {
          proveedor = 'whatsapp_web';
          estadoEnvio = 'pendiente';
        }

        // Registrar en historial
        await base44.asServiceRole.entities.HistorialWhatsApp.create({
          destinatario_id: camarero.id,
          destinatario_nombre: camarero.nombre,
          telefono: numeroWhatsApp,
          mensaje: mensajePersonalizado,
          plantilla_usada: plantilla?.nombre,
          pedido_id: pedido_id,
          estado: estadoEnvio,
          proveedor: proveedor,
          mensaje_id_proveedor: mensajeIdProveedor,
          coordinador_id: coordinador_id
        });

        resultados.detalles.push({
          camarero: camarero.nombre,
          telefono: numeroWhatsApp,
          estado: enviadoPorAPI ? 'enviado' : 'pendiente',
          proveedor: proveedor,
          mensaje_id: mensajeIdProveedor,
          enviado_por_api: enviadoPorAPI
        });

        resultados.exitosos++;

      } catch (error) {
        resultados.fallidos++;
        resultados.detalles.push({
          camarero: camarero.nombre,
          estado: 'fallido',
          error: error.message
        });
        
        // Registrar error en historial
        await base44.asServiceRole.entities.HistorialWhatsApp.create({
          destinatario_id: camarero.id,
          destinatario_nombre: camarero.nombre,
          telefono: camarero.telefono,
          mensaje: mensajePersonalizado || mensaje,
          plantilla_usada: plantilla?.nombre,
          pedido_id: pedido_id,
          estado: 'fallido',
          error: error.message,
          proveedor: 'whatsapp_web',
          coordinador_id: coordinador_id
        });
      }

      // Pequeño delay entre mensajes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return Response.json({
      success: true,
      total: camarerosSeleccionados.length,
      exitosos: resultados.exitosos,
      fallidos: resultados.fallidos,
      detalles: resultados.detalles,
      mensaje: `Mensajes procesados: ${resultados.exitosos} exitosos, ${resultados.fallidos} fallidos`
    });

  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en envío masivo:', error);
    return Response.json({ 
      error: error.message || 'Error al enviar mensajes' 
    }, { status: 500 });
  }
});