import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { pedido_id } = await req.json();

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

        const camarerosIds = [...new Set(asignaciones.map(a => a.camarero_id))];
        const camareros = await Promise.all(
            camarerosIds.map(id => base44.entities.Camarero.get(id))
        );

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
            <span class="label">Hora entrada:</span> ${pedido.entrada || pedido.turnos?.[0]?.entrada || 'N/A'}
        </div>
        <div class="info-row">
            <span class="label">Hora salida:</span> ${pedido.salida || pedido.turnos?.[0]?.salida || 'N/A'}
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

        // Obtener emails del cliente
        const emailsDestinatarios: string[] = [];

        // Primero intentar desde el cliente relacionado
        if (pedido.cliente_id) {
            try {
                const clienteData = await base44.entities.Cliente.get(pedido.cliente_id);
                if (clienteData?.email_1) emailsDestinatarios.push(clienteData.email_1);
                if (clienteData?.email_2) emailsDestinatarios.push(clienteData.email_2);
            } catch (e) {
                console.error('Error obteniendo cliente:', e);
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
            console.warn(`Cliente ${pedido.cliente} sin email registrado — enviando al coordinador ${user.email}`);
        }

        // Obtener token de Gmail
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

        // Construir y enviar un email por destinatario
        const subject = `Hoja de Asistencia - ${pedido.cliente} - ${pedido.dia}`;
        const resultados: { to: string; ok: boolean }[] = [];

        for (const to of emailsDestinatarios) {
            const emailContent = [
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `To: ${to}`,
                `Subject: ${subject}`,
                '',
                htmlContent
            ].join('\r\n');

            const encodedEmail = btoa(emailContent)
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
                const error = await response.text();
                console.error(`Error enviando a ${to}:`, error);
                resultados.push({ to, ok: false });
            } else {
                resultados.push({ to, ok: true });
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
        console.error('Error:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});