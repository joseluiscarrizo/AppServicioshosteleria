import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from '../utils/logger.ts';

function calcularPeriodo(frecuencia) {
  const hoy = new Date();
  let desde, hasta, etiqueta;

  if (frecuencia === 'semanal') {
    hasta = new Date(hoy);
    desde = new Date(hoy);
    desde.setDate(hoy.getDate() - 7);
    etiqueta = `Semana del ${desde.toLocaleDateString('es-ES')} al ${hasta.toLocaleDateString('es-ES')}`;
  } else {
    // mensual: mes anterior
    desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    etiqueta = desde.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  return { desde, hasta, etiqueta };
}

function debeEnviarHoy(informe, hoy) {
  if (!informe.activo) return false;
  const dia = hoy.getDay() === 0 ? 7 : hoy.getDay(); // 1=Lunes...7=Domingo

  if (informe.frecuencia === 'semanal') {
    return (informe.dia_envio_semanal || 1) === dia;
  }
  if (informe.frecuencia === 'mensual') {
    return (informe.dia_envio_mensual || 1) === hoy.getDate();
  }
  return false;
}

function generarHtmlInforme(cliente, pedidosPeriodo, etiquetaPeriodo) {
  const totalEventos = pedidosPeriodo.length;
  const totalCamareros = pedidosPeriodo.reduce((sum, p) => {
    if (p.turnos?.length > 0) return sum + p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0);
    return sum + (p.cantidad_camareros || 0);
  }, 0);
  const totalHoras = pedidosPeriodo.reduce((sum, p) => {
    if (p.turnos?.length > 0) return sum + p.turnos.reduce((s, t) => s + ((t.t_horas || 0) * (t.cantidad_camareros || 0)), 0);
    return sum + ((p.t_horas || 0) * (p.cantidad_camareros || 0));
  }, 0);

  const filasEventos = pedidosPeriodo.map(p => {
    const cam = p.turnos?.length > 0 ? p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0) : (p.cantidad_camareros || 0);
    const hrs = p.turnos?.length > 0 ? p.turnos.reduce((s, t) => s + ((t.t_horas || 0) * (t.cantidad_camareros || 0)), 0) : ((p.t_horas || 0) * (p.cantidad_camareros || 0));
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${p.dia || '-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${p.lugar_evento || '-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${cam}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${hrs.toFixed(1)}h</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:700px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1e3a5f;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;">Informe de Rendimiento por Cliente</h1>
      <p style="color:#94afc5;margin:6px 0 0;">${etiquetaPeriodo}</p>
    </div>
    <div style="padding:28px 32px;">
      <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 20px;">Cliente: ${cliente}</h2>
      
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;">
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#1e3a5f;">${totalEventos}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Eventos</div>
        </div>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#1e3a5f;">${totalCamareros}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Total Camareros</div>
        </div>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#059669;">${totalHoras.toFixed(1)}h</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Horas Trabajadas</div>
        </div>
      </div>

      ${totalEventos > 0 ? `
      <h3 style="color:#334155;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Detalle de Eventos</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Fecha</th>
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Lugar</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Camareros</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Horas</th>
          </tr>
        </thead>
        <tbody>${filasEventos}</tbody>
      </table>` : '<p style="color:#94a3b8;text-align:center;padding:20px;">No hubo eventos en este período.</p>'}
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;">
      Informe generado automáticamente por Staff Coordinator · ${new Date().toLocaleDateString('es-ES')}
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar si es llamada manual o automática (por automación sin usuario)
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin' || user?.role === 'coordinador';
    } catch {
      // Llamada desde automación sin token de usuario → usar service role
      isAdmin = true;
    }

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hoy = new Date();
    const informes = await base44.asServiceRole.entities.InformeProgramado.filter({ activo: true });
    const pedidosTodos = await base44.asServiceRole.entities.Pedido.list('-dia', 1000);

    let enviados = 0;
    const errores = [];

    for (const informe of informes) {
      if (!debeEnviarHoy(informe, hoy)) continue;
      if (!informe.destinatarios?.length) continue;

      const { desde, hasta, etiqueta } = calcularPeriodo(informe.frecuencia);

      const pedidosPeriodo = pedidosTodos.filter(p => {
        if (p.cliente !== informe.cliente || !p.dia) return false;
        const fecha = new Date(p.dia);
        return fecha >= desde && fecha <= hasta;
      });

      const html = generarHtmlInforme(informe.cliente, pedidosPeriodo, etiqueta);

      for (const email of informe.destinatarios) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `Informe ${informe.frecuencia === 'semanal' ? 'Semanal' : 'Mensual'} — ${informe.cliente}`,
          body: html
        });
      }

      await base44.asServiceRole.entities.InformeProgramado.update(informe.id, {
        ultimo_envio: new Date().toISOString()
      });

      enviados++;
    }

    return Response.json({ ok: true, enviados, errores });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Error en enviarInformesProgramados: ${message}`);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, metadata: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
});