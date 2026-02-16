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

    // Preparar datos para la hoja
    const filas = [];
    
    // Header
    filas.push([
      'Código Pedido',
      'Estado Evento',
      'Cliente',
      'Lugar',
      'Fecha',
      'Entrada',
      'Salida',
      'Horas',
      'Camisa',
      'Transporte',
      'Nº Camarero',
      'Nombre Camarero',
      'Código Camarero',
      'Estado Asignación',
      'Teléfono',
      'Email'
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
      
      turnos.forEach((turno, turnoIndex) => {
        const cantidadCamareros = turno.cantidad_camareros || 0;
        const filasCamareros = Math.max(1, cantidadCamareros);
        
        for (let camareroIndex = 0; camareroIndex < filasCamareros; camareroIndex++) {
          // Calcular el número de camarero acumulado
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
          
          const camarero = asignacion ? camarerosMap[asignacion.camarero_id] : null;
          
          // Formato de fecha
          let fechaFormato = '-';
          if (pedido.dia) {
            try {
              const fecha = new Date(pedido.dia);
              fechaFormato = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
            } catch (e) {
              fechaFormato = pedido.dia;
            }
          }
          
          // Estado del evento
          let estadoEvento = 'Planificado';
          if (pedido.estado_evento === 'cancelado') estadoEvento = 'Cancelado';
          else if (pedido.estado_evento === 'finalizado') estadoEvento = 'Finalizado';
          else if (pedido.estado_evento === 'en_curso') estadoEvento = 'En Curso';
          
          // Estado de asignación
          let estadoAsignacion = 'Sin asignar';
          if (asignacion) {
            if (asignacion.estado === 'pendiente') estadoAsignacion = 'Pendiente';
            else if (asignacion.estado === 'enviado') estadoAsignacion = 'Enviado';
            else if (asignacion.estado === 'confirmado') estadoAsignacion = 'Confirmado';
            else if (asignacion.estado === 'alta') estadoAsignacion = 'Alta';
          }
          
          filas.push([
            pedido.codigo_pedido || '-',
            estadoEvento,
            pedido.cliente || '-',
            pedido.lugar_evento || '-',
            fechaFormato,
            turno.entrada || '-',
            turno.salida || '-',
            turno.t_horas ? `${turno.t_horas.toFixed(1)}h` : '0h',
            pedido.camisa || '-',
            pedido.extra_transporte ? 'Sí' : 'No',
            numeroCamarero.toString(),
            asignacion ? asignacion.camarero_nombre : 'Sin asignar',
            asignacion ? asignacion.camarero_codigo : '-',
            estadoAsignacion,
            camarero?.telefono || '-',
            camarero?.email || '-'
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
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Asignaciones!A1:P${filas.length}?valueInputOption=RAW`,
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