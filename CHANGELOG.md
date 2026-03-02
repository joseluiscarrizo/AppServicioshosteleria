# CHANGELOG

Historial de cambios del proyecto "Camareros Bcn — Gestión de Servicios".

---

## [Fase 3] — Tests, Rate-limiting, TTL tokens QR, PWA y datos demo

### Añadido
- **Tests unitarios con Vitest**
  - `tests/utils/validators.test.js`: Tests para `validateToken`, `validateEmail` y `validatePhoneNumber`
  - `tests/fichaje/fichajeLogic.test.js`: Tests de lógica de fichaje (validación de entrada/salida con token y estado)
  - `tests/admin/adminDashboard.test.js`: Tests de cálculo de KPIs del dashboard admin
- **Rate-limiting en `functions/registrarFichajeQR.ts`**
  - Límite de 20 peticiones por minuto por IP (HTTP 429 con cabeceras `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`)
  - Limpieza automática del mapa de rate-limit en cada petición POST
- **TTL 24h para tokens QR**
  - `functions/generarTokensQR.ts`: guarda `qr_token_generated_at` y `qr_token_expires_at` (ahora + 24h) al crear o regenerar tokens
  - `functions/registrarFichajeQR.ts`: verifica expiración del token QR y devuelve HTTP 410 si ha expirado
- **PWA Manifest completo** en `public/manifest.json`
  - Metadata completa: nombre, descripción, idioma, orientación, colores de tema
  - Iconos SVG y PNG (192x192, 512x512)
  - Shortcuts a Pedidos, Camareros y Fichaje QR
- **Generación de iconos PWA** con `scripts/generate-icons.js` (requiere `sharp`)
- **Documentación de iconos** en `public/icons/README.md`
- **Seed de datos demo** en `utils/seedDemoData.ts`
  - 5 camareros demo, 3 clientes demo, 3 pedidos demo (próximos 1, 7 y 14 días)
  - Solo accesible por admin; usa RBAC unificado y Logger
- **`validateEmail` y `validatePhoneNumber`** exportadas desde `src/utils/validators.js`

---

## [Fase 2] — Seguridad y calidad de código

### Añadido / Modificado
- **`validateToken` robusto**: validación con regex `/^[A-Za-z0-9]{32,}$/`, rechaza nulos, no-strings y tokens cortos
- **CORS dinámico**: cabeceras CORS configurables por entorno
- **RBAC unificado** en `utils/rbacValidator.ts`: `validateUserRole`, `validateUserRoleAny`, `validateUserAccess`, `validateOwnershipOrAdmin`
- **SDK versionado** a `@base44/sdk@0.8.6` para reproducibilidad
- **Filtrado temporal** en consultas de asignaciones y pedidos
- **`sourcemap: hidden`** en Vite para seguridad en producción

---

## [Fase 1] — Fundamentos y branding

### Añadido / Modificado
- **`requiresAuth: true`** en todas las rutas protegidas
- **`eliminarGruposExpirados`** implementada para limpiar grupos de chat obsoletos
- **Branding propio** "Camareros Bcn" (logo, colores, tipografía)
- **`.env.example`** correcto con todas las variables requeridas
- **AdminDashboard con KPIs reales**: camareros disponibles, eventos activos, coordinadores, asignaciones pendientes
- **UserManagement funcional**: listado, edición de roles y desactivación de usuarios
- **Fix Netlify → Base44**: configuración de despliegue corregida
- **`alert` → `toast`**: notificaciones migradas a Sonner para mejor UX
