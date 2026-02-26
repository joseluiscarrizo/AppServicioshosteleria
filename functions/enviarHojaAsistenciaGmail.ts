import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from '../utils/logger.ts';
import { validateEmail, ValidationError } from '../utils/validators.ts';
import { retryWithExponentialBackoff } from '../utils/retryHandler.ts';
import {
    executeGmailOperation,
    GmailApiError,
    handleWebhookError
} from '../utils/webhookImprovements.ts';
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';
import { escapeHtml } from '../utils/htmlSanitizer.ts';

const MAX_EMAILS_PER_REQUEST = 10;

type Asignacion = { camarero_id: string };
type Camarero = { codigo?: string; nombre?: string; telefono?: string };

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'No autenticado' }, { status: 401 });
        }

        // RBAC: only admin or coordinador may send attendance sheets
        validateUserAccess(user, ['admin', 'coordinador']);

        const body = await req.json();
        const { pedido_id } = body;

        // Input validation
        if (!pedido_id || typeof pedido_id !== 'string' || pedido_id.trim() === '') {
            throw new ValidationError('pedido_id es requerido y debe ser un identificador válido');
        }

        // Obtener datos del pedido
        const pedido = await base44.entities.Pedido.get(pedido_id);
        if (!pedido) {
            return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // Obtener asignaciones y camareros
        const asignaciones = await base44.entities.AsignacionCamarero.filter({
            pedido_id: pedido_id,
            estado: 'confirmado'
        });

        // Null/undefined check for asignaciones
        if (!Array.isArray(asignaciones) || asignaciones.length === 0) {
            Logger.warn(`No hay asignaciones confirmadas para pedido_id=${pedido_id}`);
        }

        const camarerosIds = Array.isArray(asignaciones)
            ? [...new Set(asignaciones.map((a: Asignacion) => a.camarero_id))]
            : [];

        const camareros: Camarero[] = camarerosIds.length > 0
            ? await Promise.all(camarerosIds.map((id: string) => base44.entities.Camarero.get(id)))
            : [];

        // Generar HTML de la hoja de asistencia (con escapeHtml para prevenir XSS)
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
            <span class="label">Cliente:</span> ${escapeHtml(pedido.cliente || 'N/A')}
        </div>
        <div class="info-row">
            <span class="label">Fecha:</span> ${escapeHtml(pedido.dia || 'N/A')}
        </div>
        <div class="info-row">
            <span class="label">Lugar:</span> ${escapeHtml(pedido.lugar_evento || 'N/A')}
        </div>
        <div class="info-row">
            <span class="label">Hora entrada:</span> ${escapeHtml(pedido.entrada || pedido.turnos?.[0]?.entrada || 'N/A')}
        </div>
        <div class="info-row">
            <span class="label">Hora salida:</span> ${escapeHtml(pedido.salida || pedido.turnos?.[0]?.salida || 'N/A')}
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
            ${camareros.map((camarero: Camarero, index: number) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(camarero.codigo || 'N/A')}</td>
                    <td>${escapeHtml(camarero.nombre || 'N/A')}</td>
                    <td>${escapeHtml(camarero.telefono || 'N/A')}</td>
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

        // Obtener emails del cliente
        const emailsDestinatarios: string[] = [];

        // Primero intentar desde el cliente relacionado
        if (pedido.cliente_id) {
            try {
                const clienteData = await base44.entities.Cliente.get(pedido.cliente_id);
                if (clienteData?.email_1) emailsDestinatarios.push(clienteData.email_1);
                if (clienteData?.email_2) emailsDestinatarios.push(clienteData.email_2);
            } catch (e) {
                Logger.error(`Error obteniendo cliente: ${(e as Error).message}`);
            }
        }

        // Fallback: usar emails desnormalizados en el pedido
        if (emailsDestinatarios.length === 0) {
            if (pedido.cliente_email_1) emailsDestinatarios.push(pedido.cliente_email_1);
            if (pedido.cliente_email_2) emailsDestinatarios.push(pedido.cliente_email_2);
        }

        // Si no hay emails del cliente, enviar al coordinador autenticado como fallback
        const sinEmailCliente = emailsDestinatarios.length === 0;
        if (sinEmailCliente) {
            emailsDestinatarios.push(user.email);
            Logger.warn(`Cliente ${pedido.cliente} sin email registrado — enviando al coordinador ${user.email}`);
        }

        // Validate all emails before sending
        const validRecipients = emailsDestinatarios.filter((email: string) => {
            if (!validateEmail(email)) {
                Logger.warn(`Formato de email inválido, omitido: ${email}`);
                return false;
            }
            return true;
        });

        if (validRecipients.length === 0) {
            throw new ValidationError('No se encontraron emails de destinatarios válidos');
        }

        // Rate limiting
        if (validRecipients.length > MAX_EMAILS_PER_REQUEST) {
            throw new ValidationError(`Demasiados destinatarios (máximo ${MAX_EMAILS_PER_REQUEST})`);
        }

        // Obtener token de Gmail
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

        // Sanitize subject line special characters
        const rawSubject = `Hoja de Asistencia - ${pedido.cliente} - ${pedido.dia}`;
        const subject = rawSubject.replace(/[\r\n]/g, ' ');

        Logger.info(`Enviando hoja de asistencia para pedido_id=${pedido_id} a ${validRecipients.length} destinatario(s)`);

        const resultados: { to: string; ok: boolean; messageId?: string; error?: string }[] = [];

        for (const to of validRecipients) {
            try {
                const resultado = await executeGmailOperation(() =>
                    retryWithExponentialBackoff(async () => {
                        const emailContent = [
                            'Content-Type: text/html; charset=utf-8',
                            'MIME-Version: 1.0',
                            `To: ${to}`,
                            `Subject: ${subject}`,
                            '',
                            htmlContent
                        ].join('\r\n');

                        const encodedEmail = Buffer.from(emailContent, 'utf-8')
                            .toString('base64')
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_')
                            .replace(/=+$/, '');

                        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ raw: encodedEmail })
                        });

                        if (!response.ok) {
                            const errorBody = await response.json().catch(() => ({}));
                            const errorCode = errorBody?.error?.code ?? response.status;
                            const errorMsg = errorBody?.error?.message ?? response.statusText;
                            throw new GmailApiError(errorCode, errorMsg);
                        }

                        const json = await response.json();
                        if (!json?.id) {
                            throw new GmailApiError('INVALID_RESPONSE', 'Respuesta de Gmail API sin messageId');
                        }
                        return json;
                    }, 3, 500)
                );

                resultados.push({ to, ok: true, messageId: resultado.id });
                Logger.info(`Email enviado a ${to}: messageId=${resultado.id}`);
            } catch (e) {
                if (e instanceof GmailApiError) {
                    Logger.error(`Gmail API error para ${to} [${e.code}]: ${e.message}`);
                } else {
                    Logger.error(`Error enviando a ${to}: ${(e as Error).message}`);
                }
                resultados.push({ to, ok: false, error: (e as Error).message });
            }
        }

        const exitosos = resultados.filter(r => r.ok).map(r => r.to);
        if (exitosos.length === 0) {
            throw new Error('No se pudo enviar a ningún destinatario');
        }

        return Response.json({
            success: true,
            message: 'Hoja de asistencia enviada correctamente',
            destinatarios: exitosos,
            sin_email_cliente: sinEmailCliente
        });

    } catch (error) {
        if (error instanceof ValidationError) {
            Logger.warn(`Validation error: ${error.message}`);
            return handleWebhookError(error, 400);
        }
        if (error instanceof RBACError) {
            Logger.warn(`RBAC error: ${error.message}`);
            return handleWebhookError(error, 403);
        }
        Logger.error(`Error en enviarHojaAsistenciaGmail: ${(error as Error).message}`);
        return handleWebhookError(error as Error, 500);
    }
});
