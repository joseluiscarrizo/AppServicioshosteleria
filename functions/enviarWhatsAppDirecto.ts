import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
          // Usar mensaje interactivo con botones
          body = {
            messaging_product: 'whatsapp',
            to: numeroWhatsApp,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: {
                text: mensaje
              },
              action: {
                buttons: [
                  {
                    type: 'url',
                    reply: undefined,
                    url: undefined,
                    // WhatsApp Cloud API botones tipo "reply" (no url nativa en botones)
                    // Usamos reply buttons con id para identificar acción
                    id: 'confirmar',
                    title: '✅ Confirmo'
                  },
                  {
                    type: 'reply',
                    reply: {
                      id: 'rechazar',
                      title: '❌ Rechazo'
                    }
                  }
                ]
              }
            }
          };

          // La API de WhatsApp Cloud solo soporta reply buttons (sin URL nativa en botón)
          // Necesitamos el formato correcto:
          body = {
            messaging_product: 'whatsapp',
            to: numeroWhatsApp,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: mensaje },
              action: {
                buttons: [
                  { type: 'reply', reply: { id: `confirmar::${asignacion_id}`, title: '✅ Confirmo' } },
                  { type: 'reply', reply: { id: `rechazar::${asignacion_id}`, title: '❌ Rechazo' } }
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
          console.log(`✅ Mensaje enviado por API a ${numeroWhatsApp}: ${mensajeIdProveedor}`);
        } else {
          // Si falla el interactivo (ej: cuenta no soporta), intentar como texto plano
          if (tieneLinks) {
            console.warn('Interactivo falló, intentando texto plano:', resultado.error?.message);
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
              console.log(`✅ Mensaje texto plano enviado a ${numeroWhatsApp}`);
            } else {
              errorAPI = fallbackResult.error?.message || resultado.error?.message || 'Error desconocido';
              console.error('Error en fallback texto plano:', fallbackResult);
            }
          } else {
            errorAPI = resultado.error?.message || 'Error desconocido de la API';
            console.error('Error en API de WhatsApp:', resultado);
          }
        }
      } catch (e) {
        errorAPI = e.message;
        console.error('Error llamando a la API de WhatsApp:', e);
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
      console.error('Error registrando en historial:', e);
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
    console.error('Error en enviarWhatsAppDirecto:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});