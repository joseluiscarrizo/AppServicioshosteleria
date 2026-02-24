import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from '../utils/logger.ts';
import { validatePhoneNumber, ValidationError } from '../utils/validators.ts';
import { retryWithExponentialBackoff } from '../utils/retryHandler.ts';
import ErrorNotificationService from '../utils/errorNotificationService.ts';
import {
  executeWhatsAppOperation,
  WhatsAppApiError,
  handleWebhookError
} from '../utils/webhookImprovements.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { telefono, mensaje, camarero_id, camarero_nombre, pedido_id, asignacion_id, plantilla_usada, link_confirmar, link_rechazar } = await req.json();
    
    if (!telefono || !mensaje) {
      throw new ValidationError('Teléfono y mensaje son requeridos');
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

        const resultado = await executeWhatsAppOperation(() =>
          retryWithExponentialBackoff(async () => {
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

            const res = await apiResponse.json();

            if (!apiResponse.ok) {
              throw new WhatsAppApiError(
                res.error?.code ?? 'API_ERROR',
                res.error?.message ?? 'Error desconocido de la API'
              );
            }

            return res;
          })
        );

        if (resultado.messages?.[0]?.id) {
          enviadoPorAPI = true;
          mensajeIdProveedor = resultado.messages[0].id;
          Logger.info(`Mensaje enviado por API a ${numeroWhatsApp}: ${mensajeIdProveedor}`);
        } else if (tieneLinks) {
          // Si falla el interactivo (ej: cuenta no soporta), intentar como texto plano
          Logger.warn(`Interactivo falló, intentando texto plano: ${resultado.error?.message}`);
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
            Logger.info(`Mensaje texto plano enviado a ${numeroWhatsApp}`);
          } else {
            errorAPI = fallbackResult.error?.message || resultado.error?.message || 'Error desconocido';
            Logger.error(`Error en fallback texto plano: ${JSON.stringify(fallbackResult)}`);
          }
        } else {
          errorAPI = resultado.error?.message || 'Error desconocido de la API';
          Logger.error(`Error en API de WhatsApp: ${JSON.stringify(resultado)}`);
        }
      } catch (e) {
        if (e instanceof WhatsAppApiError) {
          Logger.error(`WhatsApp API error [${e.code}]: ${e.message}`);
        } else {
          Logger.error(`Error llamando a la API de WhatsApp: ${(e as Error).message}`);
        }
        errorAPI = (e as Error).message;
        const notificationService = new ErrorNotificationService(telefono);
        notificationService.notifyUser('No se pudo enviar el mensaje por WhatsApp API. Por favor, inténtelo de nuevo.');
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
      Logger.error(`Error registrando en historial: ${(e as Error).message}`);
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
    if (error instanceof ValidationError) {
      Logger.warn(`Error de validación en enviarWhatsAppDirecto: ${(error as Error).message}`);
      return handleWebhookError(error as Error, 400);
    }
    Logger.error(`Error en enviarWhatsAppDirecto: ${(error as Error).message}`);
    return handleWebhookError(error as Error, 500);
  }
});