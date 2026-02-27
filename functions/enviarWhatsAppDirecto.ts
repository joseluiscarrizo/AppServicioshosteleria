/**
 * enviarWhatsAppDirecto
 *
 * Sends a WhatsApp message to a single phone number via the WhatsApp Business API.
 * Falls back to a `wa.me` link when the API credentials are unavailable.
 * Every attempt (success or failure) is recorded in the `HistorialWhatsApp` entity.
 *
 * @method POST
 * @auth Bearer token required
 * @rbac admin, coordinador
 * @rateLimit 100 requests / 60 s
 *
 * @param {string} telefono - Recipient phone number (Spanish format accepted)
 * @param {string} mensaje - Message body text
 * @param {string} [camarero_id] - Waiter ID for history logging
 * @param {string} [camarero_nombre] - Waiter display name for history logging
 * @param {string} [pedido_id] - Associated order ID
 * @param {string} [asignacion_id] - Assignment ID — required for interactive confirm/reject buttons
 * @param {string} [plantilla_usada] - Name of the WhatsApp template used
 * @param {string} [link_confirmar] - Confirm deep-link URL (triggers interactive buttons)
 * @param {string} [link_rechazar] - Reject deep-link URL (triggers interactive buttons)
 *
 * @returns {{ success: boolean, telefono: string, whatsapp_url: string|null,
 *             enviado_por_api: boolean, mensaje_id: string|null,
 *             mensaje_enviado: boolean, error_api: string|null, timestamp: string }}
 *
 * @throws {400} Teléfono y mensaje son requeridos
 * @throws {400} Número de teléfono con formato inválido
 * @throws {401} No autorizado - Token inválido o expirado
 * @throws {403} No autorizado - Rol insuficiente
 * @throws {500} Internal server error
 *
 * @example
 * // Simple text message
 * POST /functions/v1/enviarWhatsAppDirecto
 * Authorization: Bearer <token>
 * { "telefono": "612345678", "mensaje": "Hola, tienes servicio mañana." }
 *
 * @example
 * // Interactive message with confirm/reject buttons
 * POST /functions/v1/enviarWhatsAppDirecto
 * Authorization: Bearer <token>
 * {
 *   "telefono": "612345678",
 *   "mensaje": "Tienes un servicio asignado. ¿Lo aceptas?",
 *   "camarero_id": "cam1",
 *   "asignacion_id": "asig789",
 *   "link_confirmar": "https://app.example.com/confirmar/asig789",
 *   "link_rechazar": "https://app.example.com/rechazar/asig789"
 * }
 */
import { createClientFromRequest } from '@base44/sdk';
import Logger from '../utils/logger.ts';
import { validatePhoneNumber } from '../utils/validators.ts';
import {
  handleWebhookError
} from '../utils/webhookImprovements.ts';
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    validateUserAccess(user, ['admin', 'coordinador']);

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

    // Intentar enviar por API de WhatsApp Business
    if (whatsappToken && whatsappPhone) {
      try {
        // Separar el cuerpo del mensaje de los links de confirmar/rechazar
        // Los links se pasan aparte para construir botones interactivos
        const tieneLinks = link_confirmar && link_rechazar;

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

        const resultado = await apiResponse.json();
        
        if (apiResponse.ok && resultado.messages?.[0]?.id) {
          enviadoPorAPI = true;
          mensajeIdProveedor = resultado.messages[0].id;
          Logger.info(`✅ Mensaje enviado por API a ${numeroWhatsApp}: ${mensajeIdProveedor}`);
        } else {
          // Si falla el interactivo (ej: cuenta no soporta), intentar como texto plano
          if (tieneLinks) {
            Logger.warn('Interactivo falló, intentando texto plano:', resultado.error?.message);
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
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResponse.ok && fallbackResult.messages?.[0]?.id) {
              enviadoPorAPI = true;
              mensajeIdProveedor = fallbackResult.messages[0].id;
              Logger.info(`✅ Mensaje texto plano enviado a ${numeroWhatsApp}`);
            } else {
              errorAPI = fallbackResult.error?.message || resultado.error?.message || 'Error desconocido';
              Logger.error('Error en fallback texto plano:', fallbackResult);
            }
          } else {
            errorAPI = resultado.error?.message || 'Error desconocido de la API';
            Logger.error('Error en API de WhatsApp:', resultado);
          }
        }
      } catch (e) {
        errorAPI = e.message;
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
    if (error instanceof RBACError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    Logger.error(`Error en enviarWhatsAppDirecto: ${(error as Error).message}`);
    return handleWebhookError(error as Error, 500);
  }
});