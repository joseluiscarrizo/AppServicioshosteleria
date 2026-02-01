import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { telefono, mensaje, camarero_id, camarero_nombre, pedido_id, asignacion_id, plantilla_usada } = await req.json();
    
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
    
    // Construir URL de WhatsApp Web
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
        estado: 'enviado',
        proveedor: 'whatsapp_web',
        coordinador_id: user.id
      });
    } catch (e) {
      console.error('Error registrando en historial:', e);
    }

    console.log(`📱 Mensaje WhatsApp enviado a: ${numeroWhatsApp}`);
    
    return Response.json({
      success: true,
      telefono: numeroWhatsApp,
      whatsapp_url: whatsappUrl,
      mensaje_enviado: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en enviarWhatsAppDirecto:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});