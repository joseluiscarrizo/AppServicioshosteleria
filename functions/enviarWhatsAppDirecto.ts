import { createClientFromRequest } from '@base44/sdk';
import Logger from '../utils/logger.ts';
import { validatePhoneNumber } from '../utils/validators.ts';
import {
  handleWebhookError
} from '../utils/webhookImprovements.ts';
import { executeResilientAPICall } from '../src/utils/resilientAPI.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { telefono, mensaje, camarero_id, camarero_nombre, pedido_id, asignacion_id, plantilla_usada, link_confirmar, link_rechazar } = await req.json();
    
    if (!telefono || !mensaje) {
      return Response.json({ error: 'Teléfono y mensaje son requeridos' }, { status: 400 });
    }

    if (!validatePhoneNumber(telefono)) {
      return Response.json({ error: 'Número de teléfono con formato inválido' }, { status: 400 });
    }
    
    // Limpiar el número de teléfono (solo dígitos)
    const telefonoLimpio = telefono.replace(/\D/g, '');
    
    // Validar formato del teléfono
    if (telefonoLimpio.length < 9) {
      return Response.json({ error: 'Número de teléfono inválido' }, { status: 400 });
    }
    
    // Formatear número para WhatsApp (añadir código de país si falta)
    let numeroWhatsApp = telefonoLimpio;
    if (!numeroWhatsApp.startsWith('34') && numeroWhatsApp.length === 9) {
      numeroWhatsApp = '34' + numeroWhatsApp; // España
    }
    
    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const whatsappPhone = Deno.env.get('WHATSAPP_PHONE_NUMBER');
    
    let enviadoPorAPI = false;
    let mensajeIdProveedor = null;
    let errorAPI = null;

    // Intentar enviar por API de WhatsApp Business con resiliencia
    if (whatsappToken && whatsappPhone) {
      // Separar el cuerpo del mensaje de los links de confirmar/rechazar
      // Los links se pasan aparte para construir botones interactivos
      const tieneLinks = link_confirmar && link_rechazar;

      try {
        const resultado = await executeResilientAPICall(
          'whatsapp-directo',
          async () => {
            let body;
            if (tieneLinks) {
              // Mensaje interactivo con reply buttons.
              // La Cloud API NO soporta botones tipo URL nativos — se usan reply buttons
              // con id que el webhook procesa. Los links reales quedan en el cuerpo del mensaje
              // y el coordinador los ve en el historial; el camarero usa los botones.
              body = {
                messaging_product: 'whatsapp',
                to: numeroWhatsApp,
                type: 'interactive',
                interactive: {
                  type: 'button',
                  body: { text: mensaje },
                  action: {
                    buttons: [
                      { type: 'reply', reply: { id: `confirmar::${asignacion_id}`, title: 'ACEPTO ✅' } },
                      { type: 'reply', reply: { id: `rechazar::${asignacion_id}`, title: 'RECHAZO ❌' } }
                    ]
                  }
                }
              };
            } else {
              body = {
                messaging_product: 'whatsapp',
                to: numeroWhatsApp,
                type: 'text',
                text: { body: mensaje }
              };
            }

            const apiResponse = await fetch(
              `https://graph.facebook.com/v21.0/${whatsappPhone}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${whatsappToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
              }
            );

            const data = await apiResponse.json();

            if (apiResponse.ok && data.messages?.[0]?.id) {
              return data;
            }

            // Si falla el interactivo (ej: cuenta no soporta), intentar como texto plano
            if (tieneLinks) {
              Logger.warn('Interactivo falló, intentando texto plano:', data.error?.message);
              const fallbackResponse = await fetch(
                `https://graph.facebook.com/v21.0/${whatsappPhone}/messages`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${whatsappToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: numeroWhatsApp,
                    type: 'text',
                    text: { body: mensaje }
                  })
                }
              );
              const fallbackData = await fallbackResponse.json();
              if (fallbackResponse.ok && fallbackData.messages?.[0]?.id) {
                return fallbackData;
              }
              throw new Error(fallbackData.error?.message || data.error?.message || 'Error desconocido');
            }

            throw new Error(data.error?.message || 'Error desconocido de la API');
          },
          {
            fallback: async () => {
              Logger.warn(`[FALLBACK] Guardando WhatsApp en queue: ${numeroWhatsApp}`);
              return { encolado: true, messages: [] };
            },
            onFailure: (error) => {
              Logger.error(`[ALERT] WhatsApp failed: ${error.message}`);
            }
          }
        );

        if (resultado.messages?.[0]?.id) {
          enviadoPorAPI = true;
          mensajeIdProveedor = resultado.messages[0].id;
          Logger.info(`✅ Mensaje enviado por API a ${numeroWhatsApp}: ${mensajeIdProveedor}`);
        } else if ((resultado as { encolado?: boolean }).encolado) {
          Logger.info(`📬 Mensaje encolado para reintento: ${numeroWhatsApp}`);
        }
      } catch (e) {
        errorAPI = (e as Error).message;
        Logger.error('Error llamando a la API de WhatsApp:', e);
      }
    }
    
    // Construir URL de WhatsApp Web como fallback
    const mensajeCodificado = encodeURIComponent(mensaje);
    const whatsappUrl = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
    
    // Registrar en historial de WhatsApp
    try {
      await base44.asServiceRole.entities.HistorialWhatsApp.create({
        destinatario_id: camarero_id || null,
        destinatario_nombre: camarero_nombre || 'Desconocido',
        telefono: numeroWhatsApp,
        mensaje: mensaje,
        plantilla_usada: plantilla_usada || null,
        pedido_id: pedido_id || null,
        asignacion_id: asignacion_id || null,
        estado: enviadoPorAPI ? 'enviado' : 'pendiente',
        proveedor: enviadoPorAPI ? 'whatsapp_api' : 'whatsapp_web',
        mensaje_id_proveedor: mensajeIdProveedor,
        error: errorAPI,
        coordinador_id: user.id
      });
    } catch (e) {
      Logger.error('Error registrando en historial:', e);
    }
    
    return Response.json({
      success: true,
      telefono: numeroWhatsApp,
      whatsapp_url: enviadoPorAPI ? null : whatsappUrl,
      enviado_por_api: enviadoPorAPI,
      mensaje_id: mensajeIdProveedor,
      mensaje_enviado: enviadoPorAPI,
      error_api: errorAPI,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    Logger.error(`Error en enviarWhatsAppDirecto: ${(error as Error).message}`);
    return handleWebhookError(error as Error, 500);
  }
});