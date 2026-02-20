/**
 * webhookWhatsAppRespuestas.ts
 *
 * Webhook que recibe notificaciones de la WhatsApp Cloud API.
 * Procesa:
 *   - GET  → verificación del webhook (Meta lo llama una vez al configurarlo)
 *   - POST → mensajes entrantes, en especial reply buttons de los camareros:
 *              id: "confirmar::<asignacion_id>"  → marca asignación como confirmada
 *              id: "rechazar::<asignacion_id>"   → elimina asignación y alerta coordinador
 *
 * Variables de entorno requeridas:
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN   — token de verificación definido en Meta Dashboard
 *   WHATSAPP_API_TOKEN              — token de acceso permanente de la app
 *   WHATSAPP_PHONE_NUMBER           — ID del número de WhatsApp Business
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, parseISO } from 'npm:date-fns@3.6.0';
import { es } from 'npm:date-fns@3.6.0/locale';

Deno.serve(async (req) => {
  // ──────────────────────────────────────────────────────────────
  // GET: verificación del webhook por Meta
  // ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const url    = new URL(req.url);
    const mode   = url.searchParams.get('hub.mode');
    const token  = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verificado por Meta');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ──────────────────────────────────────────────────────────────
  // POST: notificación entrante de WhatsApp
  // ──────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    console.log('📨 Webhook recibido:', JSON.stringify(body).slice(0, 500));

    // Navegar estructura: body.entry[0].changes[0].value
    const entry   = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value) {
      return Response.json({ ok: true, skipped: 'sin value' });
    }

    const messages = value?.messages;
    if (!messages?.length) {
      return Response.json({ ok: true, skipped: 'sin mensajes' });
    }

    // Crear cliente Base44 en modo serviceRole (el webhook no tiene usuario autenticado)
    // Usamos la URL base de la función para reutilizar el client SDK disponible
    const base44 = createClientFromRequest(req);

    for (const message of messages) {
      // Solo procesar interactive reply buttons
      if (message.type !== 'interactive' || message.interactive?.type !== 'button_reply') {
        console.log(`Mensaje tipo ${message.type} ignorado`);
        continue;
      }

      const buttonId    = message.interactive.button_reply?.id   ?? '';
      const telefono    = message.from; // número del remitente (ya con código de país)

      // Parsear id: "confirmar::<asignacion_id>" o "rechazar::<asignacion_id>"
      const [accion, asignacionId] = buttonId.split('::');

      if (!asignacionId || !['confirmar', 'rechazar'].includes(accion)) {
        console.warn('Button id no reconocido:', buttonId);
        continue;
      }

      console.log(`🔔 Acción: ${accion} | Asignación: ${asignacionId} | Tel: ${telefono}`);

      // Obtener la asignación
      let asignaciones: any[] = [];
      try {
        asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
          id: asignacionId
        });
      } catch (e) {
        console.error('Error buscando asignación:', e);
        continue;
      }

      const asignacion = asignaciones[0];
      if (!asignacion) {
        console.warn('Asignación no encontrada:', asignacionId);
        continue;
      }

      // Obtener pedido
      let pedido: any = null;
      try {
        const pedidos = await base44.asServiceRole.entities.Pedido.filter({
          id: asignacion.pedido_id
        });
        pedido = pedidos[0];
      } catch (e) {
        console.error('Error buscando pedido:', e);
      }

      const fechaFormateada = pedido?.dia
        ? format(parseISO(pedido.dia), "dd 'de' MMMM yyyy", { locale: es })
        : 'fecha pendiente';

      // ────────────────────────────────────────────────────────
      // ACEPTO: marcar asignación como confirmada
      // ────────────────────────────────────────────────────────
      if (accion === 'confirmar') {
        // Evitar doble-confirmación
        if (asignacion.estado === 'confirmado') {
          console.log('Ya estaba confirmado, ignorando');
          continue;
        }

        await base44.asServiceRole.entities.AsignacionCamarero.update(asignacionId, {
          estado: 'confirmado'
        });

        // Marcar camarero como ocupado
        if (asignacion.camarero_id) {
          await base44.asServiceRole.entities.Camarero.update(asignacion.camarero_id, {
            estado_actual: 'ocupado'
          });
        }

        // Actualizar notificación si existe
        try {
          const notifs = await base44.asServiceRole.entities.NotificacionCamarero.filter({
            asignacion_id: asignacionId
          });
          if (notifs[0]) {
            await base44.asServiceRole.entities.NotificacionCamarero.update(notifs[0].id, {
              respondida: true,
              respuesta: 'aceptado',
              leida: true
            });
          }
        } catch (e) {
          console.error('Error actualizando notificación:', e);
        }

        // Notificar al coordinador
        if (pedido) {
          const camareroData = await base44.asServiceRole.entities.Camarero.filter({
            id: asignacion.camarero_id
          });
          const coordinadorId = camareroData[0]?.coordinador_id || pedido.coordinador_id;

          if (coordinadorId) {
            await base44.asServiceRole.entities.Notificacion.create({
              tipo: 'estado_cambio',
              titulo: '✅ Asignación Confirmada (vía WhatsApp)',
              mensaje: `${asignacion.camarero_nombre} ha confirmado el servicio de ${pedido.cliente} (${fechaFormateada}) respondiendo al WhatsApp.`,
              prioridad: 'media',
              pedido_id: pedido.id,
              email_enviado: false
            });
          }
        }

        console.log(`✅ Asignación ${asignacionId} confirmada vía botón WhatsApp`);

      // ────────────────────────────────────────────────────────
      // RECHAZO: eliminar asignación y alertar coordinador
      // ────────────────────────────────────────────────────────
      } else if (accion === 'rechazar') {
        // Marcar camarero disponible
        if (asignacion.camarero_id) {
          await base44.asServiceRole.entities.Camarero.update(asignacion.camarero_id, {
            estado_actual: 'disponible'
          });
        }

        // Actualizar notificación si existe
        try {
          const notifs = await base44.asServiceRole.entities.NotificacionCamarero.filter({
            asignacion_id: asignacionId
          });
          if (notifs[0]) {
            await base44.asServiceRole.entities.NotificacionCamarero.update(notifs[0].id, {
              respondida: true,
              respuesta: 'rechazado',
              leida: true
            });
          }
        } catch (e) {
          console.error('Error actualizando notificación:', e);
        }

        // Alerta urgente al coordinador
        if (pedido) {
          const camareroData = await base44.asServiceRole.entities.Camarero.filter({
            id: asignacion.camarero_id
          });
          const coordinadorId = camareroData[0]?.coordinador_id || pedido.coordinador_id;

          await base44.asServiceRole.entities.Notificacion.create({
            tipo: 'alerta',
            titulo: '❌ Asignación Rechazada - Acción Requerida',
            mensaje: `❌ ${asignacion.camarero_nombre} ha RECHAZADO el servicio de ${pedido.cliente} (${fechaFormateada}) respondiendo al WhatsApp. Se requiere buscar reemplazo urgente.`,
            prioridad: 'alta',
            pedido_id: pedido.id,
            email_enviado: false
          });

          // Email de alerta al coordinador si tiene email
          if (coordinadorId) {
            try {
              const coords = await base44.asServiceRole.entities.Coordinador.filter({
                id: coordinadorId
              });
              const coord = coords[0];
              if (coord?.email && coord?.notificaciones_email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: coord.email,
                  subject: `❌ URGENTE: Rechazo WhatsApp - ${pedido.cliente}`,
                  body: `Hola ${coord.nombre},\n\n⚠️ ATENCIÓN: El camarero ${asignacion.camarero_nombre} ha rechazado el servicio respondiendo al botón WhatsApp.\n\n📋 Cliente: ${pedido.cliente}\n📅 Fecha: ${fechaFormateada}\n📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}\n\n⚠️ SE REQUIERE BUSCAR UN REEMPLAZO URGENTEMENTE.\n\nSaludos,\nSistema de Gestión de Camareros`
                });
              }
            } catch (e) {
              console.error('Error enviando email de alerta:', e);
            }
          }
        }

        // Eliminar asignación
        await base44.asServiceRole.entities.AsignacionCamarero.delete(asignacionId);

        console.log(`❌ Asignación ${asignacionId} rechazada y eliminada vía botón WhatsApp`);
      }
    }

    return Response.json({ ok: true });

  } catch (error) {
    console.error('Error en webhookWhatsAppRespuestas:', error);
    // Siempre devolver 200 a Meta para que no reintente indefinidamente
    return Response.json({ ok: true, error: error.message });
  }
});
