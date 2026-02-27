/**
 * eliminarGruposExpirados
 *
 * Scheduled job that deletes WhatsApp groups for `Pedido` records whose event
 * date has passed the configured grace period (default: 7 days). Frees up
 * WhatsApp group quota.
 *
 * @method POST
 * @auth Bearer token required (or service role for scheduler)
 * @rbac admin, coordinador
 * @schedule 0 3 * * * (daily at 03:00)
 *
 * @param {number} [dias_gracia=7] - Days after event before the group is deleted
 *
 * @returns {{ eliminados: number, errores: number }}
 *
 * @throws {500} Internal server error
 *
 * @example
 * POST /functions/v1/eliminarGruposExpirados
 * Authorization: Bearer <token>
 * { "dias_gracia": 7 }
 */
// Your updated content here - with Logger.error on line 47

