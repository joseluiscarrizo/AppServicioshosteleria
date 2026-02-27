import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';
import { escapeHtml } from '../utils/htmlSanitizer.ts';

const MAX_RETRIES = 3;

function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    validateUserAccess(user, ['admin', 'coordinador']);

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'Se requiere pedido_id' }, { status: 400 });
    }

    const pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);
    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
      pedido_id: pedido.id
    });
    const camareros = await base44.asServiceRole.entities.Camarero.list();

    const camarerosList = asignaciones
      .map((a: { camarero_id: string }) => camareros.find((c: { id: string }) => c.id === a.camarero_id))
      .filter(Boolean);

    const clienteEscapado = escapeHtml(pedido.cliente || '');
    const diaEscapado = escapeHtml(pedido.dia || '');
    const lugarEscapado = escapeHtml(pedido.lugar_evento || 'No especificado');
    const entradaEscapado = escapeHtml(pedido.entrada || '');
    const salidaEscapado = escapeHtml(pedido.salida || 'Por confirmar');

    const hojaHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .header div { flex: 1; }
    h2 { margin: 0; color: #1e3a5f; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th, td { border: 1px solid #333; padding: 12px; text-align: left; }
    th { background-color: #1e3a5f; color: white; font-weight: bold; }
    .firma-box { width: 300px; height: 100px; border: 2px solid #333; margin-left: auto; margin-top: 40px; padding: 10px; }
    .firma-label { font-weight: bold; margin-bottom: 60px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <strong>Cliente:</strong> ${clienteEscapado}<br>
      <strong>Día:</strong> ${diaEscapado}
    </div>
    <div style="text-align: right;">
      <strong>Evento:</strong> ${lugarEscapado}<br>
      <strong>Horario:</strong> ${entradaEscapado} - ${salidaEscapado}
    </div>
  </div>
  <h3>Lista de Camareros</h3>
  <table>
    <thead>
      <tr>
        <th>Camarero</th>
        <th>Hora Entrada</th>
        <th>Hora Salida</th>
        <th>Total Horas</th>
        <th>Firma</th>
        <th>Observaciones</th>
      </tr>
    </thead>
    <tbody>
      ${camarerosList.map((c: { nombre: string }) => `
      <tr>
        <td>${escapeHtml(c.nombre || '')}</td>
        <td>${entradaEscapado}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="firma-box">
    <div class="firma-label">Firma del Responsable:</div>
  </div>
</body>
</html>`;

    // Determine recipients: client email(s) + coordinator
    const destinatarios: string[] = [];
    const clienteEmail1 = pedido.cliente_email_1;
    const clienteEmail2 = pedido.cliente_email_2;
    if (clienteEmail1 && validateEmail(clienteEmail1)) destinatarios.push(clienteEmail1);
    if (clienteEmail2 && validateEmail(clienteEmail2)) destinatarios.push(clienteEmail2);

    let sinEmailCliente = false;
    if (destinatarios.length === 0) {
      sinEmailCliente = true;
      // Fall back to coordinator
      const coordinadores = await base44.asServiceRole.entities.Coordinador.list();
      const coord = coordinadores.find((c: { email?: string }) => c.email && validateEmail(c.email));
      if (coord?.email) destinatarios.push(coord.email);
    }

    if (destinatarios.length === 0) {
      return Response.json({ error: 'No hay destinatario válido para enviar el email' }, { status: 400 });
    }

    const subject = `Hoja de Asistencia - ${(pedido.cliente || '').replace(/[\r\n]/g, '')} - ${(pedido.dia || '').replace(/[\r\n]/g, '')}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        for (const destinatario of destinatarios) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: destinatario,
            subject,
            body: hojaHTML
          });
        }
        console.log(`✅ Hoja de asistencia enviada a: ${destinatarios.join(', ')}`);
        return Response.json({
          success: true,
          destinatarios,
          sin_email_cliente: sinEmailCliente,
          camareros_incluidos: camarerosList.map((c: { nombre: string }) => c.nombre)
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`❌ Intento ${attempt + 1} fallido:`, lastError.message);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw new Error(`Error al enviar email tras ${MAX_RETRIES} intentos: ${lastError?.message}`);

  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('❌ Error en enviarHojaAsistenciaGmail:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
});
