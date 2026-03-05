/**
 * getUser
 * Devuelve el perfil del usuario autenticado usando el SDK de Base44.
 * 
 * NOTA: La versión anterior de este archivo usaba Supabase directamente
 * (con SUPABASE_SERVICE_ROLE_KEY), lo cual fue eliminado por ser un
 * vector de seguridad. Todo el acceso a datos se hace a través de Base44.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener perfil completo del usuario desde la entidad users de Base44
    const perfiles = await base44.asServiceRole.entities.users.filter({ id: user.id });
    const perfil = perfiles[0] || null;

    return Response.json({
      user: perfil || user
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en getUser:', (error as Error).message);
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
