import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from '../utils/logger.ts';
import { validateEmail } from '../utils/validators.ts';
import { retryWithExponentialBackoff } from '../utils/retryHandler.ts';
import ErrorNotificationService from '../utils/errorNotificationService.ts';
import {
    executeGmailOperation,
    executeDbOperation,
    GmailApiError,
    DatabaseError,
    handleWebhookError,
    ValidationError,
} from '../utils/webhookImprovements.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'No autenticado' }, { status: 401 });
        }

        Logger.info(`[enviarHojaAsistenciaGmail] Solicitud recibida — usuario: ${user.email}`);

        const { pedido_id } = await req.json();

        if (!pedido_id) {
            throw new ValidationError('El campo pedido_id es requerido', 'pedido_id');
        }

        // --- Obtener datos del pedido (BD) ---
        let pedido: Record<string, unknown>;
        try {
            pedido = await executeDbOperation(() => base44.entities.Pedido.get(pedido_id));
            if (!pedido) {
                return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
            }
            Logger.info(`[enviarHojaAsistenciaGmail] Pedido obtenido: ${pedido_id} — cliente: ${pedido.cliente}`);
        } catch (dbErr) {
            Logger.error(`[enviarHojaAsistenciaGmail] Error obteniendo pedido: ${dbErr}`);
            throw new DatabaseError(`No se pudo obtener el pedido ${pedido_id}`);
        }

        // --- Obtener asignaciones y camareros (BD) ---
        let asignaciones: Record<string, unknown>[];
        let camareros: Record<string, unknown>[];
        try {
            asignaciones = await executeDbOperation(() =>
                base44.entities.AsignacionCamarero.filter({
                    pedido_id: pedido_id,
                    estado: 'confirmado',
                })
            );

            const camarerosIds = [...new Set(asignaciones.map((a) => a.camarero_id))];
            camareros = await Promise.all(
                camarerosIds.map((id) =>
                    executeDbOperation(() => base44.entities.Camarero.get(id))
                ),
            );
            Logger.info(
                `[enviarHojaAsistenciaGmail] Asignaciones: ${asignaciones.length}, Camareros: ${camareros.length}`,
            );
        } catch (dbErr) {
            Logger.error(`[enviarHojaAsistenciaGmail] Error obteniendo asignaciones/camareros: ${dbErr}`);
            throw new DatabaseError('No se pudieron obtener asignaciones o camareros');
        }

        // Generar HTML de la hoja de asistencia
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; }
        .info-section { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #1e3a5f; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #1e3a5f; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background-color: #f5f5f5; }
        .signature-section { margin-top: 40px; }
        .signature-box { border-top: 2px solid #333; width: 300px; margin: 30px auto; padding-top: 10px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 HOJA DE ASISTENCIA</h1>
        <p>Control de Personal - Evento</p>
    </div>

    <div class="info-section">
        <h2>Información del Evento</h2>
        <div class="info-row">
            <span class="label">Cliente:</span> ${pedido.cliente || 'N/A'}
        </div>
        <div class="info-row">
            <span class="label">Fecha:</span> ${pedido.dia || 'N/A'}
        </div>
        <div class="info-row">
            <span class="label">Lugar:</span> ${pedido.lugar_evento || 'N/A'}
        </div>
        <div class="info-row">
            <span class="label">Hora entrada:</span> ${pedido.entrada || (pedido.turnos as Record<string, unknown>[])?.[0]?.entrada || 'N/A'}
        </div>
        <div class="info-row">
            <span class="label">Hora salida:</span> ${pedido.salida || (pedido.turnos as Record<string, unknown>[])?.[0]?.salida || 'N/A'}
        </div>
    </div>

    <h2>Personal Asignado (${camareros.length} camareros)</h2>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Código</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Firma</th>
            </tr>
        </thead>
        <tbody>
            ${camareros.map((camarero, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${camarero.codigo || 'N/A'}</td>
                    <td>${camarero.nombre || 'N/A'}</td>
                    <td>${camarero.telefono || 'N/A'}</td>
                    <td style="height: 50px;"></td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="signature-section">
        <div class="signature-box">
            <strong>Firma del Coordinador</strong>
        </div>
    </div>

    <p style="text-align: center; color: #666; font-size: 12px; margin-top: 40px;">
        Documento generado automáticamente el ${new Date().toLocaleString('es-ES')}
    </p>
</body>
</html>
        `;

        // --- Obtener emails del cliente (BD) ---
        let emailsDestinatarios: string[] = [];

        if (pedido.cliente_id) {
            try {
                const clienteData = await executeDbOperation(() =>
                    retryWithExponentialBackoff(
                        () => base44.entities.Cliente.get(pedido.cliente_id),
                        2,
                        500,
                    )
                );
                if (clienteData?.email_1 && validateEmail(clienteData.email_1)) {
                    emailsDestinatarios.push(clienteData.email_1);
                }
                if (clienteData?.email_2 && validateEmail(clienteData.email_2)) {
                    emailsDestinatarios.push(clienteData.email_2);
                }
                Logger.info(
                    `[enviarHojaAsistenciaGmail] Emails del cliente obtenidos: ${emailsDestinatarios.length}`,
                );
            } catch (e) {
                Logger.error(`[enviarHojaAsistenciaGmail] Error obteniendo cliente: ${e}`);
            }
        }

        // Fallback: usar emails desnormalizados en el pedido
        if (emailsDestinatarios.length === 0) {
            if (pedido.cliente_email_1 && validateEmail(String(pedido.cliente_email_1))) {
                emailsDestinatarios.push(String(pedido.cliente_email_1));
            }
            if (pedido.cliente_email_2 && validateEmail(String(pedido.cliente_email_2))) {
                emailsDestinatarios.push(String(pedido.cliente_email_2));
            }
        }

        // Si no hay emails del cliente, enviar al coordinador autenticado como fallback
        const sinEmailCliente = emailsDestinatarios.length === 0;
        if (sinEmailCliente) {
            if (!validateEmail(user.email)) {
                throw new ValidationError(
                    `Email del coordinador no válido: ${user.email}`,
                    'user.email',
                );
            }
            emailsDestinatarios.push(user.email);
            Logger.warn(
                `[enviarHojaAsistenciaGmail] Cliente ${pedido.cliente} sin email registrado — enviando al coordinador ${user.email}`,
            );
        }

        // --- Obtener token de Gmail ---
        let accessToken: string;
        try {
            accessToken = await retryWithExponentialBackoff(
                () => base44.asServiceRole.connectors.getAccessToken('gmail'),
                2,
                1000,
            );
        } catch (e) {
            Logger.error(`[enviarHojaAsistenciaGmail] Error obteniendo token de Gmail: ${e}`);
            throw new GmailApiError('No se pudo obtener el token de Gmail');
        }

        // --- Enviar emails usando Gmail API ---
        const subject = `Hoja de Asistencia - ${pedido.cliente} - ${pedido.dia}`;
        const resultados: { to: string; ok: boolean }[] = [];

        for (const to of emailsDestinatarios) {
            Logger.info(`[enviarHojaAsistenciaGmail] Enviando hoja a: ${to}`);
            try {
                await executeGmailOperation(() =>
                    retryWithExponentialBackoff(
                        async () => {
                            const emailContent = [
                                'Content-Type: text/html; charset=utf-8',
                                'MIME-Version: 1.0',
                                `To: ${to}`,
                                `Subject: ${subject}`,
                                '',
                                htmlContent,
                            ].join('\r\n');

                            const encodedEmail = btoa(emailContent)
                                .replace(/\+/g, '-')
                                .replace(/\//g, '_')
                                .replace(/=+$/, '');

                            const response = await fetch(
                                'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
                                {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ raw: encodedEmail }),
                                },
                            );

                            if (!response.ok) {
                                const errorText = await response.text();
                                throw new GmailApiError(
                                    `Error enviando email a ${to}`,
                                    response.status,
                                    errorText,
                                );
                            }
                        },
                        2,
                        1000,
                    )
                );
                Logger.info(`[enviarHojaAsistenciaGmail] Email enviado correctamente a: ${to}`);
                resultados.push({ to, ok: true });
            } catch (gmailErr) {
                Logger.error(`[enviarHojaAsistenciaGmail] Fallo al enviar a ${to}: ${gmailErr}`);
                resultados.push({ to, ok: false });
            }
        }

        const exitosos = resultados.filter((r) => r.ok).map((r) => r.to);
        if (exitosos.length === 0) {
            // Best-effort user notification (phone not available in this context)
            const notifier = new ErrorNotificationService('');
            notifier.notifyUser(
                `No se pudo enviar la hoja de asistencia del pedido ${pedido_id} a ningún destinatario.`,
            );
            throw new GmailApiError('No se pudo enviar a ningún destinatario');
        }

        Logger.info(
            `[enviarHojaAsistenciaGmail] Proceso completado — enviados a: ${exitosos.join(', ')}`,
        );

        return Response.json({
            success: true,
            message: 'Hoja de asistencia enviada correctamente',
            destinatarios: exitosos,
            sin_email_cliente: sinEmailCliente,
        });
    } catch (error) {
        Logger.error(`[enviarHojaAsistenciaGmail] Error: ${error}`);
        return handleWebhookError(error);
    }
});
