# Política de Seguridad

## Versiones Soportadas

| Versión | Soporte de Seguridad |
|---|---|
| main (última) | ✅ Activo |

## Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad, **no abras un issue público**. En su lugar:

1. Envía un reporte privado al equipo de desarrollo.
2. Incluye una descripción detallada del problema y los pasos para reproducirlo.
3. Recibirás una respuesta en un plazo máximo de 72 horas.

## Buenas Prácticas de Seguridad en el Proyecto

### Variables de Entorno
- **Nunca** guardes credenciales, tokens ni claves en el código fuente.
- Usa `.env` para desarrollo local (incluido en `.gitignore`).
- En producción, configura las variables en el entorno de CI/CD.

### Tokens de Autenticación
- Los tokens se validan estructuralmente antes de su uso (ver `src/utils/validators.js`).
- Los tokens expirados provocan logout automático con notificación al usuario.
- El token se refresca automáticamente cuando está próximo a expirar (umbral: 5 minutos).

### Manejo de Errores
- Los errores de red y autenticación nunca exponen información sensible al usuario final.
- Los errores detallados se registran en consola solo en desarrollo.
- `ErrorBoundary` captura errores de renderizado para evitar que la app quede en estado inconsistente.

### Dependencias
- Ejecuta `npm audit` regularmente para detectar vulnerabilidades en dependencias.
- Usa `npm audit fix` para aplicar parches automáticos cuando estén disponibles.
- Revisa manualmente las actualizaciones de dependencias antes de hacer merge.

### Roles y Permisos
- La autorización se gestiona mediante `RoleContext` y `RoleBasedRoute`.
- Las rutas sensibles (`/admin/*`, `/manager/*`) requieren roles específicos.
- Los permisos se validan tanto en cliente como en backend.

## Historial de Vulnerabilidades Resueltas

| Fecha | Paquete | Severidad | CVE / Advisory | Resolución |
|---|---|---|---|---|
| 2026-02-28 | `rollup` | High | GHSA-mw96-cpmx-2vgc | Actualizado vía `npm audit fix` |
| 2026-02-28 | `vite` | Moderate | GHSA-93m4-6634-74q7 | Actualizado vía `npm audit fix` |
