# Changelog — Camareros Bcn

Todos los cambios notables de este proyecto se documentan en este archivo.

## [2.0.0] — 2026-03-02 — Plan de Saneamiento Completo

### 🔴 FASE 1 — Correcciones Críticas Urgentes

#### Seguridad
- **CORREGIDO** `requiresAuth: false` → `requiresAuth: true` en `src/api/base44Client.js`
- **IMPLEMENTADO** `functions/eliminarGruposExpirados.ts` (estaba completamente vacía — riesgo de data leak)

#### Branding & Demo
- **CORREGIDO** `index.html`: título "Base44 APP" → "Camareros Bcn — Gestión de Servicios de Hostelería"
- **CORREGIDO** `index.html`: `lang="en"` → `lang="es"`
- **CORREGIDO** `index.html`: favicon externo de Base44 → favicon SVG propio
- **AÑADIDO** Meta tags OG, description, theme-color, apple-mobile-web-app
- **CREADO** `public/favicon.svg` con diseño propio (colores `#1e3a5f`)
- **CORREGIDO** `.env.example`: variables Laravel genéricas → variables reales `VITE_BASE44_*`

#### Admin Panel
- **REESCRITO** `src/components/admin/AdminDashboard.jsx`: KPIs reales con TanStack Query (camareros, pedidos, coordinadores, asignaciones pendientes)
- **COMPLETADO** `src/components/admin/UserManagement.jsx`: tabla de usuarios funcional con búsqueda, loading states y estados vacíos
- **CORREGIDO** `UserManagement`: `fetch('/.netlify/functions/createUser')` → `base44.functions.invoke('createUser')`
- **CORREGIDO** `UserManagement`: todos los `alert()` → `toast()` de sonner

---

### 🟠 FASE 2 — Seguridad Robusta y Consistencia

#### Seguridad
- **FORTALECIDO** `validateToken()` en `src/utils/validators.js`: solo `length > 0` → regex `/^[A-Za-z0-9]{32,}$/`
- **FORTALECIDO** `validateToken()` en `utils/validators.ts`: misma validación
- **CORREGIDO** CORS en `functions/registrarFichajeQR.ts`: `'*'` → dinámico con `getAllowedOrigin()` y env var `ALLOWED_ORIGIN`

#### RBAC Unificado
- **ELIMINADO** `checkRBAC()` privado en `functions/enviarHojaAsistenciaGmail.ts`
- **UNIFICADO** Todas las funciones usan `validateUserAccess()` de `utils/rbacValidator.ts`
- **CORREGIDO** Comprobaciones RBAC inline en `generarTokensQR.ts` y `sugerirCamarerosInteligente.ts`

#### Estabilidad
- **UNIFICADO** Todas las Cloud Functions usan `from 'npm:@base44/sdk@0.8.6'` (versión fija)
- **OPTIMIZADO** `verificarYCrearGruposChat.ts`: queries sin límite → filtrado temporal (±30 días)

#### Debugging
- **CORREGIDO** `vite.config.js`: `sourcemap: false` → `sourcemap: 'hidden'`

---

### 🟡 FASE 3 — Calidad, Tests y Preparación Mobile

#### Tests
- **AÑADIDO** `tests/utils/validators.test.js`: tests completos para `validateToken`, `validateEmail`, `validatePhoneNumber`
- **AÑADIDO** `tests/pages/FichajeQR.test.jsx`: tests de lógica de validación de fichaje QR
- **AÑADIDO** `tests/utils/webhookImprovements.test.js`: tests para `ValidationError` y `handleWebhookError`

#### Seguridad Avanzada
- **AÑADIDO** Rate-limiting en `functions/registrarFichajeQR.ts`: máx 20 POST/minuto por IP (HTTP 429)
- **AÑADIDO** TTL de 24h en tokens QR: campo `qr_token_expires_at` en `AsignacionCamarero`
- **AÑADIDO** Verificación de expiración en `functions/registrarFichajeQR.ts` (HTTP 410 Gone)

#### PWA/Mobile
- **ACTUALIZADO** `public/manifest.json`: manifest PWA completo con shortcuts, categorías y orientación
- **CREADO** `scripts/generate-icons.js`: script para generar iconos PNG para PWA
- **CREADO** `public/icons/README.md`: instrucciones para generar iconos PWA

#### Demo
- **CREADO** `utils/seedDemoData.ts`: función para generar datos de demo realistas (camareros, clientes, pedidos)

---

## [1.0.0] — Estado pre-auditoría

Estado inicial de la aplicación antes del plan de saneamiento completo.
