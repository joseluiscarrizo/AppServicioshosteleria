import { createClientFromRequest } from '@base44/sdk';
import Logger from '../utils/logger.ts';
import { validatePhoneNumber, ValidationError } from '../utils/validators.ts';
import { retryWithExponentialBackoff } from '../utils/retryHandler.ts';
import { ErrorNotificationService } from '../utils/errorNotificationService.ts';
import {
  executeWhatsAppOperation,
  WhatsAppApiError,
  handleWebhookError
} from '../utils/webhookImprovements.ts';
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';

/**
 * Envía un mensaje de WhatsApp directamente a un camarero o contacto.
 *
 * @param req - Petición HTTP con body JSON:
 *   - telefono: string - Número de teléfono del destinatario
 *   - mensaje: string - Contenido del mensaje
 *   - camarero_id?: string - ID del camarero destinatario
 *   - camarero_nombre?: string - Nombre del camarero
 *   - pedido_id?: string - ID del pedido asociado
 *   - asignacion_id?: string - ID de la asignación (para botones interactivos)
 *   - plantilla_usada?: string - Nombre de la plantilla utilizada
 *   - link_confirmar?: string - Link de confirmación (activa botones interactivos)
 *   - link_rechazar?: string - Link de rechazo (activa botones interactivos)
 *
 * @returns JSON con resultado del envío y URL de WhatsApp Web como fallback
 *
 * @example
 * await base44.functions.invoke('enviarWhatsAppDirecto', {
 *   telefono: '+34600000000',
 *   mensaje: 'Hola, tienes un nuevo servicio asignado.',
 *   camarero_id: 'abc123',
 *   pedido_id: 'ped456'
 * });
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    validateUserAccess(user, ['admin', 'coordinador']);

    const { telefono, mensaje, camarero_id, camarero_nombre, pedido_id, asignacion_id, plantilla_usada, link_confirmar, link_rechazar } = await req.json();

    // Validate required parameters
    if (!telefono || !mensaje) {
      throw new ValidationError('Teléfono y mensaje son requeridos');
    }

    if (typeof mensaje !== 'string' || !mensaje.trim()) {
      throw new ValidationError('El mensaje no puede estar vacío');
    }

    if (!validatePhoneNumber(telefono)) {
      throw new ValidationError('Número de teléfono con formato inválido');
    }

    // Limpiar el número de teléfono (solo dígitos)
    const telefonoLimpio = telefono.replace(/\D/g, '');

    // Validar formato del teléfono
    if (telefonoLimpio.length < 9) {
      throw new ValidationError('Número de teléfono inválido');
    }

    // Formatear número para WhatsApp (añadir código de país si falta)
    let numeroWhatsApp = telefonoLimpio;
    if (!numeroWhatsApp.startsWith('34') && numeroWhatsApp.length === 9) {
      numeroWhatsApp = '34' + numeroWhatsApp; // España
    }

    Logger.info(`[enviarWhatsAppDirecto] Iniciando envío a ${numeroWhatsApp} | pedido=${pedido_id} | camarero=${camarero_id}`);

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

        const resultado = await executeWhatsAppOperation(() =>
          retryWithExponentialBackoff(async () => {
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
            return { apiResponse, data: await apiResponse.json() };
          }, 3)
        );

        if (resultado.apiResponse.ok && resultado.data.messages?.[0]?.id) {
          enviadoPorAPI = true;
          mensajeIdProveedor = resultado.data.messages[0].id;
          Logger.info(`[enviarWhatsAppDirecto] ✅ Mensaje enviado por API a ${numeroWhatsApp}: ${mensajeIdProveedor}`);
        } else {
          // Si falla el interactivo (ej: cuenta no soporta), intentar como texto plano
          if (tieneLinks) {
            Logger.warn(`[enviarWhatsAppDirecto] Interactivo falló, intentando texto plano: ${resultado.data.error?.message}`);
            const fallbackResultado = await executeWhatsAppOperation(() =>
              retryWithExponentialBackoff(async () => {
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
                return { fallbackResponse, data: await fallbackResponse.json() };
              }, 3)
            );
            if (fallbackResultado.fallbackResponse.ok && fallbackResultado.data.messages?.[0]?.id) {
              enviadoPorAPI = true;
              mensajeIdProveedor = fallbackResultado.data.messages[0].id;
              Logger.info(`[enviarWhatsAppDirecto] ✅ Mensaje texto plano enviado a ${numeroWhatsApp}`);
            } else {
              errorAPI = fallbackResultado.data.error?.message || resultado.data.error?.message || 'Error desconocido';
              Logger.error(`[enviarWhatsAppDirecto] Error en fallback texto plano: ${errorAPI}`);
            }
          } else {
            errorAPI = resultado.data.error?.message || 'Error desconocido de la API';
            Logger.error(`[enviarWhatsAppDirecto] Error en API de WhatsApp: ${errorAPI}`);
          }
        }
      } catch (e) {
        if (e instanceof WhatsAppApiError) {
          errorAPI = e.message;
          Logger.error(`[enviarWhatsAppDirecto] WhatsApp API error para ${numeroWhatsApp}: ${e.message}`);
        } else {
          errorAPI = (e as Error).message;
          Logger.error(`[enviarWhatsAppDirecto] Error llamando a la API de WhatsApp: ${(e as Error).message}`);
        }
        // Notify the coordinator of the sending failure
        const notificationService = new ErrorNotificationService(user.id);
        notificationService.notifyUser(`Error al enviar mensaje de WhatsApp a ${numeroWhatsApp}: ${errorAPI}`);
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
      Logger.error(`[enviarWhatsAppDirecto] Error registrando en historial: ${(e as Error).message}`);
    }

    Logger.info(`[enviarWhatsAppDirecto] Completado | enviado_por_api=${enviadoPorAPI} | destino=${numeroWhatsApp}`);

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
    if (error instanceof ValidationError) {
      Logger.warn(`[enviarWhatsAppDirecto] Validación fallida: ${error.message}`);
      return handleWebhookError(error, 400);
    }
    Logger.error(`[enviarWhatsAppDirecto] Error inesperado: ${(error as Error).message}`);
    return handleWebhookError(error as Error, 500);
  }
});