/**
 * @module rbacMiddleware
 *
 * Provides a `withRBAC` wrapper for Cloud Functions that integrates with the
 * RBAC validation utilities in `rbacValidator.ts`. Use this to apply role-based
 * access control to any Deno Cloud Function handler in a reusable, type-safe way.
 *
 * Automatically returns 401 for unauthenticated requests and 403 for
 * insufficient role permissions, delegating to `validateUserAccess`.
 */
import { validateUserAccess, RBACError } from './rbacValidator.ts';

/**
 * Wraps a Cloud Function handler with RBAC validation.
 * Automatically handles authentication (401) and authorization (403) errors.
 *
 * @param requiredRoles - Role(s) required to access this function
 * @param handler - The actual function logic, receives (req, user, base44)
 * @returns A Deno.serve-compatible handler
 *
 * @example
 * Deno.serve(withRBAC(['admin', 'coordinador'], async (req, user, base44) => {
 *   // handler body — user is validated and typed
 *   return Response.json({ ok: true });
 * }));
 */
export function withRBAC(
  requiredRoles: string | string[],
  handler: (
    req: Request,
    user: { id: string; role: string },
    base44: { auth: { me: () => Promise<{ id: string; role: string } | null> } } & Record<string, unknown>
  ) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Dynamically import to avoid circular references in Deno
      const { createClientFromRequest } = await import('@base44/sdk');
      const base44 = createClientFromRequest(req);
      const rawUser = await base44.auth.me();
      const user = validateUserAccess(rawUser, requiredRoles);
      return await handler(req, user, base44);
    } catch (error) {
      if (error instanceof RBACError) {
        return Response.json({ error: error.message }, { status: error.statusCode });
      }
      throw error;
    }
  };
}
