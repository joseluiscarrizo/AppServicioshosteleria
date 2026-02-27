import { createClientFromRequest } from '@base44/sdk';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Autenticar como service role para acceso completo
        const ahora = new Date();
        const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
        const _en2h = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
        const _en1h = new Date(ahora.getTime() + 60 * 60 * 1000);
        
        const hoy = ahora.toISOString().split('T')[0];
        const manana = en24h.toISOString().split('T')[0];
        
        // Obtener todas las asignaciones de hoy y mañana
        const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
            fecha_pedido: { $in: [hoy, manana] }
        });
        
        // Obtener pedidos relacionados
        const pedidoIds = [...new Set(asignaciones.map(a => a.pedido_id))];
        const pedidos = await base44.asServiceRole.entities.Pedido.filter({
            id: { $in: pedidoIds }
        });
        
        const pedidosMap = {};
        pedidos.forEach(p => pedidosMap[p.id] = p);
        
        // Obtener camareros
        const camareroIds = [...new Set(asignaciones.map(a => a.camarero_id))];
        const camareros = await base44.asServiceRole.entities.Camarero.filter({
            id: { $in: camareroIds }
        });
        
        const camarerosMap = {};
        camareros.forEach(c => camarerosMap[c.id] = c);
        
        // Obtener usuarios con sus preferencias de notificación
        const usuarios = await base44.asServiceRole.entities.User.list();
        const adminUsers = usuarios.filter(u => u.role === 'admin');
        
        const preferencias = await base44.asServiceRole.entities.PreferenciasNotificacion.list();
        const preferenciasMap = {};
        preferencias.forEach(p => preferenciasMap[p.user_id] = p);
        
        const notificacionesEnviadas = [];
        const alertasAdmin = [];
        
        // Procesar cada asignación
        for (const asignacion of asignaciones) {
            const pedido = pedidosMap[asignacion.pedido_id];
            const camarero = camarerosMap[asignacion.camarero_id];
            
            if (!pedido || !camarero) continue;
            
            // Construir fecha/hora del evento
            const horaEntrada = asignacion.hora_entrada || pedido.entrada || '00:00';
            const fechaHoraEvento = new Date(`${pedido.dia}T${horaEntrada}:00`);
            const tiempoRestante = fechaHoraEvento.getTime() - ahora.getTime();
            const horasRestantes = tiempoRestante / (60 * 60 * 1000);
            
            // Obtener preferencias del camarero (buscar por email o ID)
            const usuarioCamarero = usuarios.find(u => u.email === camarero.email);
            const prefs = usuarioCamarero ? preferenciasMap[usuarioCamarero.id] : null;
            
            // Verificar modo "No Molestar"
            const estaEnNoMolestar = (prefs) => {
                if (!prefs?.no_molestar_habilitado) return false;
                
                const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
                const [inicioH, inicioM] = (prefs.no_molestar_inicio || '22:00').split(':').map(Number);
                const [finH, finM] = (prefs.no_molestar_fin || '08:00').split(':').map(Number);
                const inicio = inicioH * 60 + inicioM;
                const fin = finH * 60 + finM;
                
                const diaActual = ahora.getDay();
                const diasNoMolestar = prefs.no_molestar_dias || [0, 1, 2, 3, 4, 5, 6];
                
                if (!diasNoMolestar.includes(diaActual)) return false;
                
                if (inicio < fin) {
                    return horaActual >= inicio && horaActual < fin;
                } else {
                    return horaActual >= inicio || horaActual < fin;
                }
            };
            
            const bloqueadoPorNoMolestar = estaEnNoMolestar(prefs);
            
            // ALERTAS A ADMINISTRADORES
            
            // Alerta: Asignación sin confirmar próxima a comenzar
            if (horasRestantes > 0 && horasRestantes <= 2 && asignacion.estado !== 'confirmado') {
                alertasAdmin.push({
                    tipo: 'asignacion_sin_confirmar',
                    prioridad: 'urgente',
                    titulo: `⚠️ Asignación sin confirmar en ${Math.round(horasRestantes)}h`,
                    mensaje: `${camarero.nombre} no ha confirmado su asignación para ${pedido.cliente}`,
                    pedido_id: pedido.id,
                    asignacion_id: asignacion.id,
                    data_adicional: {
                        camarero: camarero.nombre,
                        cliente: pedido.cliente,
                        hora_evento: horaEntrada,
                        estado: asignacion.estado
                    }
                });
            }
            
            // Alerta: Camarero no disponible
            if (!camarero.disponible) {
                alertasAdmin.push({
                    tipo: 'camarero_no_disponible',
                    prioridad: 'alta',
                    titulo: `🚫 Camarero marcado como no disponible`,
                    mensaje: `${camarero.nombre} tiene asignación pero está marcado como no disponible para ${pedido.cliente}`,
                    pedido_id: pedido.id,
                    asignacion_id: asignacion.id,
                    data_adicional: {
                        camarero: camarero.nombre,
                        cliente: pedido.cliente
                    }
                });
            }
            
            // NOTIFICACIONES A CAMAREROS
            
            let debeNotificar = false;
            let tipoNotificacion = '';
            let titulo = '';
            let mensaje = '';
            let prioridad = 'media';
            
            // Recordatorio 24 horas antes
            if (horasRestantes > 23 && horasRestantes <= 25) {
                if (prefs?.recordatorios !== false) {
                    debeNotificar = true;
                    tipoNotificacion = 'recordatorio';
                    titulo = '📅 Recordatorio: Servicio mañana';
                    mensaje = `Tienes servicio mañana a las ${horaEntrada} para ${pedido.cliente} en ${pedido.lugar_evento || 'ubicación por confirmar'}`;
                    prioridad = 'media';
                }
            }
            
            // Recordatorio 2 horas antes
            else if (horasRestantes > 1.5 && horasRestantes <= 2.5) {
                if (prefs?.recordatorios !== false) {
                    debeNotificar = true;
                    tipoNotificacion = 'recordatorio';
                    titulo = '⏰ Tu servicio es en 2 horas';
                    mensaje = `Recuerda: Servicio a las ${horaEntrada} para ${pedido.cliente}. ${pedido.lugar_evento || ''}`;
                    prioridad = 'alta';
                }
            }
            
            // Recordatorio URGENTE 1 hora antes si no confirmado
            else if (horasRestantes > 0.5 && horasRestantes <= 1.5 && asignacion.estado !== 'confirmado') {
                debeNotificar = true;
                tipoNotificacion = 'alerta';
                titulo = '🚨 URGENTE: Confirma tu asistencia';
                mensaje = `Tu servicio comienza en 1 hora (${horaEntrada}) y aún no has confirmado. Cliente: ${pedido.cliente}`;
                prioridad = 'urgente';
            }
            
            // Si debe notificar, crear la notificación
            if (debeNotificar) {
                const notifData = {
                    user_id: usuarioCamarero?.id || camarero.id,
                    tipo: tipoNotificacion,
                    titulo,
                    mensaje,
                    prioridad,
                    leida: false,
                    enviada_push: false,
                    enviada_email: false,
                    bloqueada_no_molestar: bloqueadoPorNoMolestar,
                    pedido_id: pedido.id,
                    asignacion_id: asignacion.id,
                    data_adicional: {
                        camarero_nombre: camarero.nombre,
                        cliente: pedido.cliente,
                        lugar_evento: pedido.lugar_evento,
                        hora_entrada: horaEntrada,
                        estado_asignacion: asignacion.estado
                    }
                };
                
                // Si no está bloqueada o es urgente, intentar enviar
                if (!bloqueadoPorNoMolestar || (prefs?.permitir_urgentes_no_molestar && prioridad === 'urgente')) {
                    await base44.asServiceRole.entities.HistorialNotificacion.create(notifData);
                    notifData.enviada_push = true;
                    notificacionesEnviadas.push({
                        camarero: camarero.nombre,
                        tipo: tipoNotificacion,
                        prioridad
                    });
                } else {
                    await base44.asServiceRole.entities.HistorialNotificacion.create(notifData);
                }
            }
        }
        
        // Enviar alertas a administradores
        for (const alerta of alertasAdmin) {
            for (const admin of adminUsers) {
                const prefsAdmin = preferenciasMap[admin.id];
                
                // Verificar si el admin tiene notificaciones habilitadas
                if (prefsAdmin?.push_habilitadas === false) continue;
                
                await base44.asServiceRole.entities.HistorialNotificacion.create({
                    user_id: admin.id,
                    tipo: alerta.tipo,
                    titulo: alerta.titulo,
                    mensaje: alerta.mensaje,
                    prioridad: alerta.prioridad,
                    leida: false,
                    enviada_push: true,
                    pedido_id: alerta.pedido_id,
                    asignacion_id: alerta.asignacion_id,
                    data_adicional: alerta.data_adicional
                });
            }
        }
        
        return Response.json({
            success: true,
            notificaciones_enviadas: notificacionesEnviadas.length,
            alertas_admin: alertasAdmin.length,
            asignaciones_revisadas: asignaciones.length,
            detalles: {
                notificaciones: notificacionesEnviadas,
                alertas: alertasAdmin.map(a => ({ tipo: a.tipo, prioridad: a.prioridad }))
            }
        });
        
    } catch (error) {
        console.error('Error en notificaciones automáticas:', error);
        return Response.json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});