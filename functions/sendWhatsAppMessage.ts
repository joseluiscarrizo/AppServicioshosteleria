import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Logger from "../utils/logger.ts";
import {
  retryWithExponentialBackoff,
} from "../utils/retryHandler.ts";
import {
  ErrorNotificationService,
  errorMessages,
} from "../utils/errorNotificationService.ts";
import {
  executeWhatsAppOperation,
  handleWebhookError,
  ValidationError,
  WhatsAppApiError,
} from "../utils/webhookImprovements.ts";
import { RBACError, validateUserAccess } from "../utils/rbacValidator.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // RBAC validation
    validateUserAccess(user, ["admin", "coordinador"]);

    const {
      telefono,
      mensaje,
      camarero_id,
      camarero_nombre,
      pedido_id,
      asignacion_id,
      plantilla_usada,
      link_confirmar,
      link_rechazar,
    } = await req.json();

    // Input validation with ValidationError
    if (!telefono) {
      throw new ValidationError("El teléfono es requerido", "telefono");
    }
    if (!mensaje) {
      throw new ValidationError("El mensaje es requerido", "mensaje");
    }

    // Limpiar el número de teléfono (solo dígitos)
    const telefonoLimpio = telefono.replace(/\D/g, "");

    if (telefonoLimpio.length < 9) {
      throw new ValidationError("Número de teléfono inválido", "telefono");
    }

    // Formatear número para WhatsApp (añadir código de país si falta)
    let numeroWhatsApp = telefonoLimpio;
    if (!numeroWhatsApp.startsWith("34") && numeroWhatsApp.length === 9) {
      numeroWhatsApp = "34" + numeroWhatsApp; // España
    }

    const whatsappToken = Deno.env.get("WHATSAPP_API_TOKEN");
    const whatsappPhone = Deno.env.get("WHATSAPP_PHONE_NUMBER");

    let enviadoPorAPI = false;
    let mensajeIdProveedor = null;
    let errorAPI = null;

    // Intentar enviar por API de WhatsApp Business
    if (whatsappToken && whatsappPhone) {
      const tieneLinks = link_confirmar && link_rechazar;

      try {
        await executeWhatsAppOperation(async () => {
          let body;
          if (tieneLinks) {
            // Mensaje interactivo con reply buttons
            body = {
              messaging_product: "whatsapp",
              to: numeroWhatsApp,
              type: "interactive",
              interactive: {
                type: "button",
                body: { text: mensaje },
                action: {
                  buttons: [
                    {
                      type: "reply",
                      reply: {
                        id: `confirmar::${asignacion_id}`,
                        title: "ACEPTO ✅",
                      },
                    },
                    {
                      type: "reply",
                      reply: {
                        id: `rechazar::${asignacion_id}`,
                        title: "RECHAZO ❌",
                      },
                    },
                  ],
                },
              },
            };
          } else {
            body = {
              messaging_product: "whatsapp",
              to: numeroWhatsApp,
              type: "text",
              text: { body: mensaje },
            };
          }

          const apiResponse = await retryWithExponentialBackoff(async () => {
            return await fetch(
              `https://graph.facebook.com/v21.0/${whatsappPhone}/messages`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${whatsappToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
              },
            );
          });

          const resultado = await apiResponse.json();

          if (apiResponse.ok && resultado.messages?.[0]?.id) {
            enviadoPorAPI = true;
            mensajeIdProveedor = resultado.messages[0].id;
            Logger.info(
              `✅ Mensaje enviado por API a ${numeroWhatsApp}: ${mensajeIdProveedor}`,
            );
          } else if (tieneLinks) {
            // Fallback to plain text if interactive message fails
            Logger.warn(
              "Interactivo falló, intentando texto plano: " +
                (resultado.error?.message || ""),
            );
            const fallbackResponse = await retryWithExponentialBackoff(
              async () => {
                return await fetch(
                  `https://graph.facebook.com/v21.0/${whatsappPhone}/messages`,
                  {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${whatsappToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      messaging_product: "whatsapp",
                      to: numeroWhatsApp,
                      type: "text",
                      text: { body: mensaje },
                    }),
                  },
                );
              },
            );
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResponse.ok && fallbackResult.messages?.[0]?.id) {
              enviadoPorAPI = true;
              mensajeIdProveedor = fallbackResult.messages[0].id;
              Logger.info(`✅ Mensaje texto plano enviado a ${numeroWhatsApp}`);
            } else {
              errorAPI = fallbackResult.error?.message ||
                resultado.error?.message || "Error desconocido";
              Logger.error(
                "Error en fallback texto plano: " + JSON.stringify(fallbackResult),
              );
            }
          } else {
            errorAPI = resultado.error?.message ||
              "Error desconocido de la API";
            Logger.error(
              "Error en API de WhatsApp: " + JSON.stringify(resultado),
            );
          }
        });
      } catch (e) {
        if (e instanceof WhatsAppApiError) {
          Logger.error(`WhatsApp API error: ${e.message}`);
        } else {
          Logger.error(`Error llamando a la API de WhatsApp: ${e}`);
        }
        errorAPI = e instanceof Error ? e.message : "Error desconocido";

        // Notify coordinator via ErrorNotificationService on send failure
        const notificationService = new ErrorNotificationService(
          numeroWhatsApp,
        );
        notificationService.notifyUser(errorMessages.NETWORK_ERROR);
      }
    }

    // Construir URL de WhatsApp Web como fallback
    const mensajeCodificado = encodeURIComponent(mensaje);
    const whatsappUrl =
      `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

    // Registrar en historial de WhatsApp
    try {
      await base44.asServiceRole.entities.HistorialWhatsApp.create({
        destinatario_id: camarero_id || null,
        destinatario_nombre: camarero_nombre || "Desconocido",
        telefono: numeroWhatsApp,
        mensaje: mensaje,
        plantilla_usada: plantilla_usada || null,
        pedido_id: pedido_id || null,
        asignacion_id: asignacion_id || null,
        estado: enviadoPorAPI ? "enviado" : "pendiente",
        proveedor: enviadoPorAPI ? "whatsapp_api" : "whatsapp_web",
        mensaje_id_proveedor: mensajeIdProveedor,
        error: errorAPI,
        coordinador_id: user.id,
      });
    } catch (e) {
      Logger.error(
        `Error registrando en historial de WhatsApp: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    return Response.json({
      success: true,
      telefono: numeroWhatsApp,
      whatsapp_url: enviadoPorAPI ? null : whatsappUrl,
      enviado_por_api: enviadoPorAPI,
      mensaje_id: mensajeIdProveedor,
      mensaje_enviado: enviadoPorAPI,
      error_api: errorAPI,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    Logger.error(
      `Error en sendWhatsAppMessage: ${(error as Error).message}`,
    );
    return handleWebhookError(error as Error, 500);
  }
});
