import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const ahora = new Date().toISOString();

    const gruposExpirados = await base44.asServiceRole.entities.GrupoChat.filter({
      expira_en: { $lt: ahora },
      activo: true
    });

    let eliminados = 0;
    const errores: string[] = [];

    for (const grupo of gruposExpirados) {
      try {
        await base44.asServiceRole.entities.GrupoChat.update(grupo.id, {
          activo: false,
          fecha_desactivacion: ahora
        });
        eliminados++;
      } catch (err) {
        errores.push(`Error desactivando grupo ${grupo.id}: ${err.message}`);
      }
    }

    return Response.json({
      ok: true,
      procesados: gruposExpirados.length,
      eliminados,
      errores
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});
