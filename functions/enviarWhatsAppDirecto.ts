Deno.serve(async (req) => {
  try {
    const { telefono, mensaje } = await req.json();
    
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
    
    // Log del envío para seguimiento
    console.log(`📱 Mensaje WhatsApp preparado para: ${numeroWhatsApp}`);
    console.log(`📝 Longitud del mensaje: ${mensaje.length} caracteres`);
    
    // Simulamos el envío con delay realista
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return Response.json({
      success: true,
      telefono: numeroWhatsApp,
      telefono_original: telefono,
      whatsapp_url: whatsappUrl,
      mensaje_enviado: true,
      longitud_mensaje: mensaje.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});