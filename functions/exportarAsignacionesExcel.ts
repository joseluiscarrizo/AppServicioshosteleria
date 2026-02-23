import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'coordinador')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener datos
    const pedidos = await base44.entities.Pedido.list('-dia', 500);
    const asignaciones = await base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000);
    const camareros = await base44.entities.Camarero.list('nombre');

    // Crear mapping de camareros por ID
    const camarerosMap = {};
    camareros.forEach(c => {
      camarerosMap[c.id] = c;
    });

    // Obtener coordinadores para mapear por código
    const coordinadores = await base44.entities.Coordinador.list('nombre');
    const coordinadoresMap = {};
    coordinadores.forEach(c => { coordinadoresMap[c.id] = c; });

    // Preparar datos para la hoja
    const filas = [];
    
    // Header según formato requerido
    filas.push([
      'Cod. Coordinador',
      'Fecha',
      'Cliente',
      'Evento',
      'Cod. Camarero',
      'Nombre Camarero',
      'Nº Camarero',
      'Hora Entrada',
      'Hora Salida',
      'Total Horas',
      'Estado Asignado',
      'Transporte'
    ]);

    // Datos
    pedidos.forEach(pedido => {
      const turnos = pedido.turnos && pedido.turnos.length > 0 
        ? pedido.turnos 
        : [{ 
            cantidad_camareros: pedido.cantidad_camareros || 0, 
            entrada: pedido.entrada || '-', 
            salida: pedido.salida || '-', 
            t_horas: pedido.t_horas || 0 
          }];
      
      // Formato de fecha
      let fechaFormato = '-';
      if (pedido.dia) {
        try {
          const [y, m, d] = pedido.dia.split('-');
          fechaFormato = `${d}/${m}/${y}`;
        } catch (e) {
          fechaFormato = pedido.dia;
        }
      }

      // Código coordinador del pedido (via cliente → coordinador)
      let codCoordinador = '-';
      // Intentar obtenerlo del cliente vinculado
      // Se usa el campo coordinador_codigo si el pedido lo tiene, o via cliente
      if (pedido.coordinador_codigo) {
        codCoordinador = pedido.coordinador_codigo;
      }

      turnos.forEach((turno, turnoIndex) => {
        const cantidadCamareros = turno.cantidad_camareros || 0;
        const filasCamareros = Math.max(1, cantidadCamareros);
        
        for (let camareroIndex = 0; camareroIndex < filasCamareros; camareroIndex++) {
          // Número de camarero acumulado
          let numeroCamarero = camareroIndex + 1;
          for (let i = 0; i < turnoIndex; i++) {
            numeroCamarero += Math.max(1, turnos[i].cantidad_camareros || 0);
          }
          
          // Buscar asignación
          let asignacion = asignaciones.find(a => 
            a.pedido_id === pedido.id && 
            a.turno_index === turnoIndex &&
            a.posicion_slot === camareroIndex
          );
          if (!asignacion) {
            const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
            if (asignacionesPedido[numeroCamarero - 1]) {
              asignacion = asignacionesPedido[numeroCamarero - 1];
            }
          }

          // Estado de asignación
          let estadoAsignacion = 'Sin asignar';
          if (asignacion) {
            if (asignacion.estado === 'pendiente') estadoAsignacion = 'Pendiente';
            else if (asignacion.estado === 'enviado') estadoAsignacion = 'Enviado';
            else if (asignacion.estado === 'confirmado') estadoAsignacion = 'Confirmado';
            else if (asignacion.estado === 'alta') estadoAsignacion = 'Alta';
          }

          // Total horas
          const totalHoras = turno.t_horas ? turno.t_horas.toFixed(2) : '0';
          
          filas.push([
            codCoordinador,
            fechaFormato,
            pedido.cliente || '-',
            pedido.lugar_evento || '-',
            asignacion ? (asignacion.camarero_codigo || '-') : '-',
            asignacion ? (asignacion.camarero_nombre || 'Sin asignar') : 'Sin asignar',
            numeroCamarero.toString(),
            turno.entrada || '-',
            turno.salida || '-',
            totalHoras,
            estadoAsignacion,
            pedido.extra_transporte ? 'Sí' : 'No'
          ]);
        }
      });
    });

    // Crear hoja de cálculo en Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    
    // Crear nueva hoja
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `Asignaciones Camareros - ${new Date().toLocaleDateString('es-ES')}`
        },
        sheets: [{
          properties: {
            title: 'Asignaciones',
            gridProperties: {
              frozenRowCount: 1
            }
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
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Asignaciones!A1:L${filas.length}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: filas
        })
      }
    );
    
    if (!updateResponse.ok) {
      throw new Error(`Error escribiendo datos: ${await updateResponse.text()}`);
    }
    
    // Aplicar formato al header
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
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.11, green: 0.23, blue: 0.37 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true
                    }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 16
                }
              }
            }
          ]
        })
      }
    );
    
    return Response.json({ 
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      message: 'Excel creado exitosamente'
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});