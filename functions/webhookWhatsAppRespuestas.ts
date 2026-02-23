/**
 * webhookWhatsAppRespuestas.js
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

const WA_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
const WA_PHONE = Deno.env.get('WHATSAPP_PHONE_NUMBER');

async function sendWAMessage(to, payload) {
  const res = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload })
  });
  const data = await res.json();
  if (!res.ok) console.error('Error WA:', JSON.stringify(data));
  return data;
}

async function sendMenuPrincipal(to) {
  return sendWAMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '👋 ¡Bienvenido!' },
      body: { text: '¿En qué podemos ayudarte? Elige una opción:' },
      footer: { text: 'Staff Coordinator' },
      action: {
        button: 'Ver opciones',
        sections: [{
          title: 'Opciones disponibles',
          rows: [
            { id: 'menu::pedido', title: '📋 Hacer un pedido' },
            { id: 'menu::coordinador', title: '💬 Mensaje al coordinador' },
            { id: 'menu::admin', title: '🏢 Comunicar con Administración' },
            { id: 'menu::evento', title: '📅 Consulta sobre un evento' }
          ]
        }]
      }
    }
  });
}

async function sendTextMessage(to, text) {
  return sendWAMessage(to, { type: 'text', text: { body: text } });
}

// Estado de conversaciones en memoria (por sesión de instancia; para producción usar DB)
const sesiones = new Map();

function getSesion(telefono) {
  return sesiones.get(telefono) || { paso: null, datos: {} };
}

function setSesion(telefono, data) {
  sesiones.set(telefono, data);
}

function clearSesion(telefono) {
  sesiones.delete(telefono);
}

const PASOS_PEDIDO = [
  { id: 'cliente',            prompt: '1️⃣ ¿Cuál es el *nombre del cliente*?' },
  { id: 'lugar_evento',       prompt: '2️⃣ ¿Cuál es el *lugar del evento*?' },
  { id: 'fecha_evento',       prompt: '3️⃣ ¿Cuál es la *fecha del evento*? (DD/MM/AAAA)' },
  { id: 'hora_evento',        prompt: '4️⃣ ¿A qué *hora* comenzará? (HH:MM)' },
  { id: 'cantidad_camareros', prompt: '6️⃣ ¿Cuántos camareros necesitas?' },
  { id: 'mail_contacto',      prompt: '7️⃣ ¿Cuál es tu *correo electrónico* de contacto?' },
  { id: 'telefono_contacto',  prompt: '8️⃣ ¿Cuál es tu *número de teléfono*?' },
];

async function handleFlujoPedido(base44, telefono, sesion, textoMensaje) {
  const pasoActual = sesion.paso;

  // Guardar respuesta del paso actual
  if (pasoActual && pasoActual !== 'color_camisa' && pasoActual !== 'confirmar_envio') {
    sesion.datos[pasoActual] = textoMensaje.trim();
  }

  // Determinar siguiente paso
  const indicePasoActual = PASOS_PEDIDO.findIndex(p => p.id === pasoActual);
  const siguientePasoIndex = indicePasoActual + 1;

  // Paso especial: color camisa (después de cantidad_camareros)
  if (pasoActual === 'cantidad_camareros') {
    sesion.paso = 'color_camisa';
    setSesion(telefono, sesion);
    return sendWAMessage(telefono, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: '5️⃣ ¿Qué color de camisa prefieres?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'camisa::blanca', title: '👔 Blanca' } },
            { type: 'reply', reply: { id: 'camisa::negra', title: '👔 Negra' } }
          ]
        }
      }
    });
  }

  // Paso confirmar envío
  if (pasoActual === 'telefono_contacto') {
    sesion.paso = 'confirmar_envio';
    setSesion(telefono, sesion);
    const d = sesion.datos;
    const resumen = `✅ *Resumen del pedido:*\n\n👤 Cliente: ${d.cliente}\n📍 Lugar: ${d.lugar_evento}\n📅 Fecha: ${d.fecha_evento}\n⏰ Hora: ${d.hora_evento}\n👕 Camisa: ${d.color_camisa || '-'}\n👨‍🍳 Camareros: ${d.cantidad_camareros}\n📧 Email: ${d.mail_contacto}\n📞 Teléfono: ${d.telefono_contacto}\n\n¿Deseas enviar la solicitud?`;
    return sendWAMessage(telefono, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: resumen },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'pedido::enviar', title: '✅ Enviar' } },
            { type: 'reply', reply: { id: 'pedido::cancelar', title: '❌ Cancelar' } }
          ]
        }
      }
    });
  }

  // Siguiente paso normal
  if (siguientePasoIndex < PASOS_PEDIDO.length) {
    const siguientePaso = PASOS_PEDIDO[siguientePasoIndex];
    sesion.paso = siguientePaso.id;
    setSesion(telefono, sesion);
    return sendTextMessage(telefono, siguientePaso.prompt);
  }
}

async function handleFlujoCoordinador(base44, telefono, sesion, textoMensaje) {
  const pasoActual = sesion.paso;

  // Paso 1: recibir nombre → crear grupo de chat y notificar coordinadores
  if (pasoActual === 'nombre') {
    const nombre = textoMensaje.trim();
    sesion.datos.nombre = nombre;

    // Crear grupo de chat cliente-coordinador
    const grupo = await base44.asServiceRole.entities.GrupoChat.create({
      nombre: `Chat con ${nombre}`,
      descripcion: `Cliente WhatsApp: ${telefono}`,
      fecha_evento: new Date().toISOString().split('T')[0],
      hora_fin_evento: '23:59',
      miembros: [],
      activo: true
    });
    sesion.datos.grupo_id = grupo.id;
    sesion.paso = 'mensaje_inicial';
    setSesion(telefono, sesion);

    // Notificar a todos los coordinadores
    const coordinadores = await base44.asServiceRole.entities.Coordinador.list();
    await base44.asServiceRole.entities.Notificacion.create({
      tipo: 'alerta',
      titulo: `💬 Nuevo chat de cliente: ${nombre}`,
      mensaje: `El cliente ${nombre} (WhatsApp: ${telefono}) ha iniciado una conversación. Entra al Chat para responderle.`,
      prioridad: 'alta'
    });

    // Email a coordinadores
    for (const coord of coordinadores) {
      if (coord.email && coord.notificaciones_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: coord.email,
          subject: `💬 Nuevo mensaje de cliente: ${nombre}`,
          body: `Hola ${coord.nombre},\n\nEl cliente *${nombre}* (WhatsApp: ${telefono}) quiere hablar contigo.\n\nEntra a la app en la sección de Chat para responderle.\n\nSaludos,\nSistema de Gestión de Camareros`
        });
      }
    }

    return sendTextMessage(telefono, `✅ ¡Hola ${nombre}! Tu chat con el coordinador ha sido abierto.\n\nEscribe tu mensaje y un coordinador te responderá muy pronto. 😊`);
  }

  // Paso 2+: reenviar mensajes al grupo de chat interno
  if (pasoActual === 'mensaje_inicial' || pasoActual === 'en_chat') {
    const texto = textoMensaje.trim();
    sesion.paso = 'en_chat';
    setSesion(telefono, sesion);

    if (sesion.datos.grupo_id) {
      await base44.asServiceRole.entities.MensajeChat.create({
        grupo_id: sesion.datos.grupo_id,
        user_id: telefono,
        nombre_usuario: sesion.datos.nombre || telefono,
        rol_usuario: 'camarero',
        mensaje: texto,
        tipo: 'texto',
        leido_por: []
      });
    }
    // No respondemos automáticamente; el coordinador responde desde la app
    return;
  }
}

async function crearPedidoEnBD(base44, datos, telefono) {
  // Parsear fecha DD/MM/AAAA → YYYY-MM-DD
  let diaFormateado = null;
  if (datos.fecha_evento) {
    const partes = datos.fecha_evento.split('/');
    if (partes.length === 3) {
      diaFormateado = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
    }
  }

  return base44.asServiceRole.entities.Pedido.create({
    cliente: datos.cliente || 'Pedido WhatsApp',
    lugar_evento: datos.lugar_evento || '',
    dia: diaFormateado,
    entrada: datos.hora_evento || '',
    cantidad_camareros: parseInt(datos.cantidad_camareros) || 1,
    camisa: (datos.color_camisa || 'blanca').toLowerCase(),
    cliente_email_1: datos.mail_contacto || '',
    cliente_telefono_1: datos.telefono_contacto || telefono,
    origen_pedido: 'whatsapp',
    notas: `Pedido recibido vía WhatsApp desde ${telefono}`
  });
}

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

    const base44 = createClientFromRequest(req);

    for (const message of messages) {
      const telefono = message.from;

      // ─── Mensaje de texto libre ───────────────────────────────
      if (message.type === 'text') {
        const texto = message.text?.body || '';
        const sesion = getSesion(telefono);

        if (sesion.paso && sesion.flujo === 'pedido') {
          await handleFlujoPedido(base44, telefono, sesion, texto);
          continue;
        }

        if (sesion.flujo === 'coordinador' && sesion.paso) {
          await handleFlujoCoordinador(base44, telefono, sesion, texto);
          continue;
        }

        if (sesion.flujo === 'admin') {
          await base44.asServiceRole.entities.Notificacion.create({
            tipo: 'alerta',
            titulo: '🏢 Mensaje de cliente para Administración vía WhatsApp',
            mensaje: `Mensaje de ${telefono}: "${texto}"`,
            prioridad: 'media'
          });
          await sendTextMessage(telefono, '✅ Tu mensaje ha llegado a Administración. Te responderemos a la brevedad. 😊');
          clearSesion(telefono);
          continue;
        }

        if (sesion.flujo === 'evento') {
          if (sesion.paso === 'nombre_cliente') {
            sesion.datos.nombre_cliente = texto.trim();
            sesion.paso = 'rango_evento';
            setSesion(telefono, sesion);
            await sendWAMessage(telefono, {
              type: 'interactive',
              interactive: {
                type: 'button',
                body: { text: '2️⃣ ¿Es sobre un evento pasado o futuro?' },
                action: {
                  buttons: [
                    { type: 'reply', reply: { id: 'evento::pasado', title: '📁 Últimas 2 semanas' } },
                    { type: 'reply', reply: { id: 'evento::futuro', title: '📅 Próximos 7 días' } }
                  ]
                }
              }
            });
            continue;
          }

          if (sesion.paso === 'escribir_mensaje') {
            const mensajeEvento = texto.trim();
            await base44.asServiceRole.entities.Notificacion.create({
              tipo: 'alerta',
              titulo: `📅 Consulta de evento vía WhatsApp`,
              mensaje: `Cliente ${sesion.datos.nombre_cliente} (${telefono}) sobre el evento "${sesion.datos.pedido_label}":\n\n"${mensajeEvento}"`,
              pedido_id: sesion.datos.pedido_id,
              prioridad: 'media'
            });
            await sendTextMessage(telefono, '✅ *¡MUCHAS GRACIAS!*\n\nTu consulta ha sido registrada. Un coordinador te responderá lo antes posible. 😊');
            clearSesion(telefono);
            continue;
          }

          continue;
        }

        await sendMenuPrincipal(telefono);
        continue;
      }

      // ─── Mensajes interactivos (list_reply o button_reply) ────
      if (message.type !== 'interactive') {
        console.log(`Mensaje tipo ${message.type} ignorado`);
        continue;
      }

      const interactiveType = message.interactive?.type;
      let buttonId = '';
      if (interactiveType === 'button_reply') {
        buttonId = message.interactive.button_reply?.id ?? '';
      } else if (interactiveType === 'list_reply') {
        buttonId = message.interactive.list_reply?.id ?? '';
      }

      // ─── MENÚ PRINCIPAL ───────────────────────────────────────
      if (buttonId === 'menu::pedido') {
        const sesion = { flujo: 'pedido', paso: 'cliente', datos: {} };
        setSesion(telefono, sesion);
        await sendTextMessage(telefono, '📋 *Solicitud de pedido*\n\nVoy a necesitar algunos datos. Puedes cancelar en cualquier momento escribiendo *cancelar*.\n\n1️⃣ ¿Cuál es el *nombre del cliente*?');
        continue;
      }

      if (buttonId === 'menu::coordinador') {
        const sesion = { flujo: 'coordinador', paso: 'nombre', datos: {} };
        setSesion(telefono, sesion);
        await sendTextMessage(telefono, '💬 *Conectar con coordinador*\n\nVoy a abrir un chat directo para ti. Puedes cancelar escribiendo *cancelar*.\n\n1️⃣ ¿Cuál es tu *nombre completo*?');
        continue;
      }

      if (buttonId === 'menu::admin') {
        setSesion(telefono, { flujo: 'admin' });
        await sendTextMessage(telefono, '🏢 Escribe el mensaje que quieres enviar a Administración:');
        continue;
      }

      if (buttonId === 'menu::evento') {
        setSesion(telefono, { flujo: 'evento', paso: 'nombre_cliente', datos: {} });
        await sendTextMessage(telefono, '📅 *Consulta sobre un evento*\n\nPuedes cancelar escribiendo *cancelar*.\n\n1️⃣ ¿Cuál es el *nombre del cliente* relacionado con el evento?');
        continue;
      }

      // ─── FLUJO EVENTO: rango (pasado/futuro) ─────────────────
      if (buttonId === 'evento::pasado' || buttonId === 'evento::futuro') {
        const sesion = getSesion(telefono);
        if (sesion.flujo !== 'evento') continue;

        const rango = buttonId === 'evento::pasado' ? 'past' : 'future';
        sesion.datos.rango = rango;
        setSesion(telefono, sesion);

        const hoy = new Date();
        let fechaDesde, fechaHasta;
        if (rango === 'past') {
          fechaDesde = new Date(hoy); fechaDesde.setDate(hoy.getDate() - 14);
          fechaHasta = hoy;
        } else {
          fechaDesde = hoy;
          fechaHasta = new Date(hoy); fechaHasta.setDate(hoy.getDate() + 7);
        }

        const fmtDate = (d) => d.toISOString().split('T')[0];
        const pedidosTodos = await base44.asServiceRole.entities.Pedido.list();
        const nombreCliente = (sesion.datos.nombre_cliente || '').toLowerCase();
        const pedidosFiltrados = pedidosTodos.filter(p => {
          if (!p.dia) return false;
          const fecha = new Date(p.dia);
          const matchCliente = !nombreCliente || (p.cliente || '').toLowerCase().includes(nombreCliente);
          return matchCliente && fecha >= new Date(fmtDate(fechaDesde)) && fecha <= new Date(fmtDate(fechaHasta));
        });

        if (pedidosFiltrados.length === 0) {
          await sendTextMessage(telefono, `😕 No encontré eventos ${rango === 'past' ? 'de las últimas 2 semanas' : 'en los próximos 7 días'} para "${sesion.datos.nombre_cliente || 'ese cliente'}".\n\nEscribe *cancelar* para volver al menú.`);
          continue;
        }

        sesion.datos.pedidos_disponibles = pedidosFiltrados.map(p => ({ id: p.id, label: `${p.cliente} – ${p.dia} – ${p.lugar_evento || ''}` }));
        sesion.paso = 'seleccionar_evento';
        setSesion(telefono, sesion);

        const rows = pedidosFiltrados.slice(0, 10).map(p => ({
          id: `evsel::${p.id}`,
          title: `${p.cliente}`.substring(0, 24),
          description: `${p.dia} – ${(p.lugar_evento || '').substring(0, 40)}`
        }));

        await sendWAMessage(telefono, {
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: 'Selecciona el evento sobre el que quieres consultar:' },
            action: {
              button: 'Ver eventos',
              sections: [{ title: 'Eventos', rows }]
            }
          }
        });
        continue;
      }

      // ─── FLUJO EVENTO: evento seleccionado ───────────────────
      if (buttonId.startsWith('evsel::')) {
        const pedidoId = buttonId.split('::')[1];
        const sesion = getSesion(telefono);
        if (sesion.flujo !== 'evento') continue;

        sesion.datos.pedido_id = pedidoId;
        const pedidoInfo = (sesion.datos.pedidos_disponibles || []).find(p => p.id === pedidoId);
        sesion.datos.pedido_label = pedidoInfo?.label || pedidoId;
        sesion.paso = 'escribir_mensaje';
        setSesion(telefono, sesion);

        await sendTextMessage(telefono, `✏️ Evento seleccionado: *${sesion.datos.pedido_label}*\n\nEscribe tu mensaje sobre este evento:`);
        continue;
      }

      // ─── FLUJO PEDIDO: color camisa ───────────────────────────
      if (buttonId.startsWith('camisa::')) {
        const color = buttonId.split('::')[1];
        const sesion = getSesion(telefono);
        if (sesion.flujo === 'pedido') {
          sesion.datos['color_camisa'] = color;
          const idxCantidad = PASOS_PEDIDO.findIndex(p => p.id === 'cantidad_camareros');
          const siguientePaso = PASOS_PEDIDO[idxCantidad + 1];
          sesion.paso = siguientePaso.id;
          setSesion(telefono, sesion);
          await sendTextMessage(telefono, siguientePaso.prompt);
        }
        continue;
      }

      // ─── FLUJO PEDIDO: confirmar/cancelar envío ───────────────
      if (buttonId === 'pedido::enviar') {
        const sesion = getSesion(telefono);
        if (sesion.flujo === 'pedido') {
          try {
            await crearPedidoEnBD(base44, sesion.datos, telefono);
            await sendTextMessage(telefono, '🎉 *¡Muchas gracias por confiar en nosotros!*\n\nTu solicitud ha sido registrada correctamente. Un coordinador se pondrá en contacto contigo muy pronto. 😊');
          } catch (e) {
            console.error('Error creando pedido:', e);
            await sendTextMessage(telefono, '⚠️ Hubo un problema al registrar tu solicitud. Por favor llámanos directamente.');
          }
          clearSesion(telefono);
        }
        continue;
      }

      if (buttonId === 'pedido::cancelar') {
        clearSesion(telefono);
        await sendTextMessage(telefono, '❌ Solicitud cancelada. ¡Hasta pronto! Si necesitas algo más, escríbenos.');
        continue;
      }

      // ─── BOTONES DE CAMAREROS (confirmar/rechazar asignación) ─
      const parts = buttonId.split('::');
      const accion = parts[0];
      const asignacionId = parts[1];

      if (!asignacionId || !['confirmar', 'rechazar'].includes(accion)) {
        console.warn('Button id no reconocido:', buttonId);
        continue;
      }

      console.log(`🔔 Acción: ${accion} | Asignación: ${asignacionId} | Tel: ${telefono}`);

      let asignaciones = [];
      try {
        asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({ id: asignacionId });
      } catch (e) {
        console.error('Error buscando asignación:', e);
        continue;
      }

      const asignacion = asignaciones[0];
      if (!asignacion) {
        console.warn('Asignación no encontrada:', asignacionId);
        continue;
      }

      let pedido = null;
      try {
        const pedidos = await base44.asServiceRole.entities.Pedido.filter({ id: asignacion.pedido_id });
        pedido = pedidos[0];
      } catch (e) {
        console.error('Error buscando pedido:', e);
      }

      const fechaFormateada = pedido?.dia
        ? format(parseISO(pedido.dia), "dd 'de' MMMM yyyy", { locale: es })
        : 'fecha pendiente';

      if (accion === 'confirmar') {
        if (asignacion.estado === 'confirmado') {
          console.log('Ya estaba confirmado, ignorando');
          continue;
        }

        await base44.asServiceRole.entities.AsignacionCamarero.update(asignacionId, { estado: 'confirmado' });

        if (asignacion.camarero_id) {
          await base44.asServiceRole.entities.Camarero.update(asignacion.camarero_id, { estado_actual: 'ocupado' });
        }

        try {
          const notifs = await base44.asServiceRole.entities.NotificacionCamarero.filter({ asignacion_id: asignacionId });
          if (notifs[0]) {
            await base44.asServiceRole.entities.NotificacionCamarero.update(notifs[0].id, {
              respondida: true, respuesta: 'aceptado', leida: true
            });
          }
        } catch (e) {
          console.error('Error actualizando notificación:', e);
        }

        if (pedido) {
          const camareroData = await base44.asServiceRole.entities.Camarero.filter({ id: asignacion.camarero_id });
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

      } else if (accion === 'rechazar') {
        if (asignacion.camarero_id) {
          await base44.asServiceRole.entities.Camarero.update(asignacion.camarero_id, { estado_actual: 'disponible' });
        }

        try {
          const notifs = await base44.asServiceRole.entities.NotificacionCamarero.filter({ asignacion_id: asignacionId });
          if (notifs[0]) {
            await base44.asServiceRole.entities.NotificacionCamarero.update(notifs[0].id, {
              respondida: true, respuesta: 'rechazado', leida: true
            });
          }
        } catch (e) {
          console.error('Error actualizando notificación:', e);
        }

        if (pedido) {
          const camareroData = await base44.asServiceRole.entities.Camarero.filter({ id: asignacion.camarero_id });
          const coordinadorId = camareroData[0]?.coordinador_id || pedido.coordinador_id;

          await base44.asServiceRole.entities.Notificacion.create({
            tipo: 'alerta',
            titulo: '❌ Asignación Rechazada - Acción Requerida',
            mensaje: `❌ ${asignacion.camarero_nombre} ha RECHAZADO el servicio de ${pedido.cliente} (${fechaFormateada}) respondiendo al WhatsApp. Se requiere buscar reemplazo urgente.`,
            prioridad: 'alta',
            pedido_id: pedido.id,
            email_enviado: false
          });

          if (coordinadorId) {
            try {
              const coords = await base44.asServiceRole.entities.Coordinador.filter({ id: coordinadorId });
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

        await base44.asServiceRole.entities.AsignacionCamarero.delete(asignacionId);
        console.log(`❌ Asignación ${asignacionId} rechazada y eliminada vía botón WhatsApp`);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error en webhookWhatsAppRespuestas:', error);
    return Response.json({ ok: true, error: error.message });
  }
});