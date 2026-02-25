import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'coordinador')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener todos los pedidos
    const pedidos = await base44.entities.Pedido.list('dia', 500);

    const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Construir filas del calendario
    const filas = [];

    // Cabecera
    filas.push([
      'Fecha',
      'Día',
      'Hora Entrada',
      'Cliente',
      'Lugar del Evento',
      'Hora Salida',
      'Transporte'
    ]);

    // Ordenar por fecha
    const pedidosOrdenados = [...pedidos].sort((a, b) => {
      if (!a.dia) return 1;
      if (!b.dia) return -1;
      return a.dia.localeCompare(b.dia);
    });

    pedidosOrdenados.forEach(pedido => {
      let fechaFormato = '-';
      let diaSemana = '-';

      if (pedido.dia) {
        try {
          // Parsear fecha como local (evitar desfase UTC)
          const [year, month, day] = pedido.dia.split('-').map(Number);
          const fecha = new Date(year, month - 1, day);
          fechaFormato = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
          diaSemana = DIAS_SEMANA[fecha.getDay()];
        } catch (_e) {
          fechaFormato = pedido.dia;
        }
      }

      // Si tiene turnos múltiples, una fila por turno
      if (pedido.turnos && pedido.turnos.length > 0) {
        pedido.turnos.forEach(turno => {
          filas.push([
            fechaFormato,
            diaSemana,
            turno.entrada || '-',
            pedido.cliente || '-',
            pedido.lugar_evento || '-',
            turno.salida || '-',
            pedido.extra_transporte ? 'Sí' : 'No'
          ]);
        });
      } else {
        filas.push([
          fechaFormato,
          diaSemana,
          pedido.entrada || '-',
          pedido.cliente || '-',
          pedido.lugar_evento || '-',
          pedido.salida || '-',
          pedido.extra_transporte ? 'Sí' : 'No'
        ]);
      }
    });

    // Crear hoja en Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const fechaHoy = new Date();
    const titulo = `Calendario Eventos - ${fechaHoy.getDate().toString().padStart(2,'0')}/${(fechaHoy.getMonth()+1).toString().padStart(2,'0')}/${fechaHoy.getFullYear()}`;

    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: titulo },
        sheets: [{
          properties: {
            title: 'Calendario',
            gridProperties: { frozenRowCount: 1 }
          }
        }]
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Error creando hoja: ${await createResponse.text()}`);
    }

    const sheet = await createResponse.json();
    const spreadsheetId = sheet.spreadsheetId;

    // Escribir datos
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Calendario!A1:G${filas.length}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: filas })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Error escribiendo datos: ${await updateResponse.text()}`);
    }

    // Formato: cabecera azul + autoajuste columnas
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.11, green: 0.23, blue: 0.37 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true,
                      fontSize: 11
                    },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            },
            {
              autoResizeDimensions: {
                dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 7 }
              }
            }
          ]
        })
      }
    );

    return Response.json({
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      total_eventos: pedidosOrdenados.length,
      message: 'Calendario exportado exitosamente'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});