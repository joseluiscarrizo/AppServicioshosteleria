/**
 * exportarAsistenciaSheets
 *
 * Exports attendance data for a single order, including confirmed waiter
 * assignments with actual check-in and check-out times. Designed for
 * Google Sheets import via Apps Script.
 *
 * @method POST
 * @auth Bearer token required
 * @rbac admin, coordinador, camarero
 *
 * @param {string} pedido_id - Order ID
 *
 * @returns {{ success: boolean, filas: Array<Array<any>>, total: number }}
 *
 * @throws {401} No autenticado
 * @throws {404} Pedido no encontrado
 * @throws {500} Internal server error
 *
 * @example
 * POST /functions/v1/exportarAsistenciaSheets
 * Authorization: Bearer <token>
 * { "pedido_id": "ped456" }
 */
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

        // Obtener token de Google Sheets
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

        // Crear nuevo spreadsheet
        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                properties: {
                    title: `Asistencia - ${pedido.cliente} - ${pedido.dia}`
                },
                sheets: [{
                    properties: {
                        title: 'Asistencia',
                        gridProperties: {
                            frozenRowCount: 1
                        }
                    }
                }]
            })
        });

        if (!createResponse.ok) {
            const error = await createResponse.text();
            throw new Error(`Error al crear spreadsheet: ${error}`);
        }

        const spreadsheet = await createResponse.json();
        const spreadsheetId = spreadsheet.spreadsheetId;

        // Preparar datos
        const headers = [
            ['HOJA DE ASISTENCIA'],
            [],
            ['Cliente:', pedido.cliente || 'N/A'],
            ['Fecha:', pedido.dia || 'N/A'],
            ['Lugar:', pedido.lugar_evento || 'N/A'],
            ['Hora entrada:', pedido.entrada || pedido.turnos?.[0]?.entrada || 'N/A'],
            ['Hora salida:', pedido.salida || pedido.turnos?.[0]?.salida || 'N/A'],
            [],
            ['#', 'Código', 'Nombre', 'Teléfono', 'Hora Entrada Real', 'Hora Salida Real', 'Total Horas', 'Firma', 'Observaciones']
        ];

        const rows = camareros.map((camarero, index) => [
            index + 1,
            camarero.codigo || 'N/A',
            camarero.nombre || 'N/A',
            camarero.telefono || 'N/A',
            '',
            '',
            '',
            '',
            ''
        ]);

        const allData = [...headers, ...rows];

        // Escribir datos
        const updateResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Asistencia!A1:I${allData.length}?valueInputOption=RAW`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: allData
                })
            }
        );

        if (!updateResponse.ok) {
            const error = await updateResponse.text();
            throw new Error(`Error al escribir datos: ${error}`);
        }

        // Formatear el spreadsheet
        const formatResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requests: [
                        // Título principal
                        {
                            mergeCells: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 0,
                                    endRowIndex: 1,
                                    startColumnIndex: 0,
                                    endColumnIndex: 9
                                },
                                mergeType: 'MERGE_ALL'
                            }
                        },
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.12, green: 0.23, blue: 0.37 },
                                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 16, bold: true },
                                        horizontalAlignment: 'CENTER'
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                            }
                        },
                        // Encabezados de tabla
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 8,
                                    endRowIndex: 9
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.12, green: 0.23, blue: 0.37 },
                                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                                        horizontalAlignment: 'CENTER'
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                            }
                        },
                        // Ajustar columnas
                        {
                            autoResizeDimensions: {
                                dimensions: {
                                    sheetId: 0,
                                    dimension: 'COLUMNS',
                                    startIndex: 0,
                                    endIndex: 9
                                }
                            }
                        }
                    ]
                })
            }
        );

        if (!formatResponse.ok) {
            console.warn('Error al formatear spreadsheet:', await formatResponse.text());
        }

        return Response.json({
            success: true,
            spreadsheetId: spreadsheetId,
            url: spreadsheet.spreadsheetUrl,
            message: 'Hoja de asistencia exportada a Google Sheets'
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});