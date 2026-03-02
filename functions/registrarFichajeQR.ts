/**
 * registrarFichajeQR
 * Endpoint público (no requiere auth de usuario) que registra fichaje de entrada o salida.
 * El camarero accede escaneando su QR único.
 * 
 * GET  /?token=XXX          → devuelve info de la asignación
 * POST { token, tipo }      → tipo: "entrada" | "salida"  → registra fichaje
 */
import { createClientFromRequest } from '@base44/sdk';

// ── Rate Limiter in-memory ──────────────────────────────────────
// Permite máximo 20 peticiones por IP cada 60 segundos
// Nota: en entorno distribuido cada instancia mantiene su propio estado.
// Para entornos de alta concurrencia, usar una solución distribuida (Redis, KV store).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 segundos

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Nueva ventana
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  const resetIn = entry.resetAt - now;

  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}

// Limpiar entradas expiradas periódicamente para evitar memory leak
function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}
// ─────────────────────────────────────────────────────────────────

function calcularHoras(entrada, salida) {
  if (!entrada || !salida) return null;
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = salida.split(':').map(Number);
  let minutos = (hS * 60 + mS) - (hE * 60 + mE);
  if (minutos < 0) minutos += 24 * 60;
  return Math.round((minutos / 60) * 100) / 100;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obtener IP del cliente
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    // Aplicar rate-limiting solo a POST (no a GET de consulta)
    if (req.method === 'POST') {
      cleanupRateLimitMap();
      const rateCheck = checkRateLimit(clientIp);

      if (!rateCheck.allowed) {
        return Response.json(
          { error: 'Demasiadas peticiones. Espera un momento antes de intentarlo de nuevo.' },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString(),
              'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
              'X-RateLimit-Remaining': '0',
            }
          }
        );
      }
    }

    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.json({ error: 'Token requerido' }, { status: 400, headers: corsHeaders });
    }

    // Buscar asignación por token
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({ qr_token: token });
    const asignacion = asignaciones[0];

    if (!asignacion) {
      return Response.json({ error: 'Token no válido o asignación no encontrada' }, { status: 404, headers: corsHeaders });
    }

    // Verificar expiración del token QR
    if (asignacion.qr_token_expires_at) {
      const ahora = new Date();
      const expiracion = new Date(asignacion.qr_token_expires_at);
      if (ahora > expiracion && req.method === 'POST') {
        return Response.json(
          { ok: false, error: 'El código QR ha expirado. Solicita un nuevo código al coordinador.' },
          { status: 410, headers: corsHeaders }
        );
      }
    }

    // Obtener pedido para contexto
    const pedido = await base44.asServiceRole.entities.Pedido.get(asignacion.pedido_id);

    if (req.method === 'GET') {
      return Response.json({
        ok: true,
        asignacion: {
          id: asignacion.id,
          camarero_nombre: asignacion.camarero_nombre,
          camarero_codigo: asignacion.camarero_codigo,
          estado: asignacion.estado,
          hora_entrada: asignacion.hora_entrada,
          hora_salida: asignacion.hora_salida,
          hora_entrada_real: asignacion.hora_entrada_real,
          hora_salida_real: asignacion.hora_salida_real,
          horas_reales: asignacion.horas_reales,
          fecha_pedido: asignacion.fecha_pedido
        },
        pedido: pedido ? {
          cliente: pedido.cliente,
          lugar_evento: pedido.lugar_evento,
          dia: pedido.dia
        } : null
      }, { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { tipo } = body; // "entrada" | "salida"

      if (!tipo || !['entrada', 'salida'].includes(tipo)) {
        return Response.json({ error: 'tipo debe ser "entrada" o "salida"' }, { status: 400, headers: corsHeaders });
      }

      const ahora = new Date();
      const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
      const timestampActual = ahora.toISOString();

      let updateData = {};

      if (tipo === 'entrada') {
        if (asignacion.hora_entrada_real) {
          return Response.json({
            ok: false,
            error: 'Ya se registró la entrada anteriormente',
            hora_entrada_real: asignacion.hora_entrada_real
          }, { status: 409, headers: corsHeaders });
        }
        updateData = {
          hora_entrada_real: horaActual,
          fichaje_entrada_timestamp: timestampActual
        };
      } else {
        if (!asignacion.hora_entrada_real) {
          return Response.json({ ok: false, error: 'Primero debes registrar la entrada' }, { status: 400, headers: corsHeaders });
        }
        if (asignacion.hora_salida_real) {
          return Response.json({
            ok: false,
            error: 'Ya se registró la salida anteriormente',
            hora_salida_real: asignacion.hora_salida_real
          }, { status: 409, headers: corsHeaders });
        }
        const horas = calcularHoras(asignacion.hora_entrada_real, horaActual);
        updateData = {
          hora_salida_real: horaActual,
          fichaje_salida_timestamp: timestampActual,
          horas_reales: horas
        };
      }

      await base44.asServiceRole.entities.AsignacionCamarero.update(asignacion.id, updateData);

      return Response.json({
        ok: true,
        tipo,
        hora: horaActual,
        camarero_nombre: asignacion.camarero_nombre,
        horas_reales: updateData.horas_reales || null
      }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Método no permitido' }, { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('Error en registrarFichajeQR:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});