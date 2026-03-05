import { base44 } from '@/api/base44Client';

/**
 * Envía un mensaje de WhatsApp a un camarero via la Cloud Function de Base44.
 *
 * Requiere que `VITE_BASE44_APP_BASE_URL` (proxy Vite) o `VITE_BASE44_BACKEND_URL`
 * estén configurados para que el cliente Base44 pueda alcanzar el backend.
 *
 * @param {Object} payload
 * @param {string}  payload.telefono          - Número de teléfono del destinatario
 * @param {string}  payload.mensaje           - Texto del mensaje
 * @param {string}  [payload.camarero_id]     - ID del camarero
 * @param {string}  [payload.camarero_nombre] - Nombre del camarero
 * @param {string}  [payload.pedido_id]       - ID del pedido
 * @param {string}  [payload.asignacion_id]   - ID de la asignación
 * @param {string}  [payload.link_confirmar]  - URL de confirmación de asistencia
 * @param {string}  [payload.link_rechazar]   - URL de rechazo de asistencia
 * @param {string}  [payload.plantilla_usada] - Nombre de la plantilla utilizada
 *
 * @returns {Promise<{enviado_por_api: boolean, error_api: string|null, whatsapp_url: string|null}>}
 */
export async function enviarWhatsApp(payload) {
  const response = await base44.functions.invoke('enviarWhatsAppDirecto', payload);
  return response.data ?? response;
}
