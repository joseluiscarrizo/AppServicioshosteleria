export default async function enviarWhatsAppDirecto({ telefono, mensaje }) {
  // Enviar mensaje directo usando WhatsApp Business API
  // Por ahora simularemos el envío exitoso
  
  if (!telefono || !mensaje) {
    throw new Error('Teléfono y mensaje son requeridos');
  }
  
  // Limpiar el número de teléfono
  const telefonoLimpio = telefono.replace(/\D/g, '');
  
  // Aquí irá la integración con WhatsApp Business API
  // Simulamos un delay de red
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    telefono: telefonoLimpio,
    mensaje_enviado: true,
    timestamp: new Date().toISOString()
  };
}