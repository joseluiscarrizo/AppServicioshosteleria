# Auditoría Completa & Plan de Acción — AppServicioshosteleria
**Fecha:** Marzo 2026 | **Versión:** 1.0 | **Confidencial — Uso interno**

---

## RESUMEN EJECUTIVO

Auditoría técnica completa de la aplicación de gestión de servicios de hostelería.  
Tecnología principal: React 18 + Vite 6 + TanStack Query + React Router v6 + Base44 SDK.  
Estado actual: **4 áreas de mejora prioritaria** identificadas.  

| Severidad | Nº de hallazgos | Estado |
|-----------|----------------|--------|
| 🔴 Crítica / Alta | 2 | ✅ Corregidos |
| 🟠 Media | 3 | 🔄 En progreso |
| 🟡 Baja | 5 | 📋 Planificados |

---

## FASE 1 — SEGURIDAD (Semana 1) ✅ COMPLETADA

### 1.1 Vulnerabilidades de dependencias — CORREGIDAS

| CVE / Advisory | Paquete | Versión vulnerable | Versión segura | Severidad |
|----------------|---------|-------------------|----------------|-----------|
| GHSA-mw96-cpmx-2vgc | rollup | ≥ 4.0.0, < 4.59.0 | **4.59.0** | 🔴 Alta |
| GHSA-93m4-6634-74q7 | vite | ≥ 6.0.0, < 6.4.1 | **6.4.1** | 🟠 Moderada |

**Acción tomada:** `npm audit fix` — aplicado y verificado (`found 0 vulnerabilities`).

### 1.2 Autenticación y autorización — REVISADA

- ✅ `AuthContext` gestiona tokens con validación y refresco automático.  
- ✅ `ProtectedRoute` / `RoleBasedRoute` bloquean acceso sin autenticación.  
- ✅ `RoleContext` implementa RBAC (ADMIN_LEVEL_1, ADMIN_LEVEL_2, USER).  
- ✅ `htmlSanitizer.ts` y `validators.ts` previenen XSS e inyección de datos.  
- ✅ `rbacValidator.ts` valida permisos antes de operaciones sensibles.  
- ⚠️ Los tokens se almacenan vía `appParams` — validar que no se expongan en logs.  

---

## FASE 2 — CALIDAD DE CÓDIGO (Semanas 2–3)

### 2.1 Advertencias ESLint — 50 warnings de variables no usadas

Todas son advertencias (`warn`), no errores. No bloquean build ni CI.  
Archivos principales afectados:

| Archivo | Variables sin usar |
|---------|-------------------|
| `src/pages/Asignacion.jsx` | 11 variables |
| `src/components/comunicacion/PartesTrabajos.jsx` | 5 variables |
| `src/components/asignacion/FiltrosAvanzadosCamareros.jsx` | 3 variables |
| `src/pages/Camareros.jsx` | 4 variables |
| `src/pages/DashboardCoordinador.jsx` | 2 variables |

**Acción recomendada:** Prefijo `_` en parámetros no usados o eliminar declaraciones muertas.  
**Plazo:** Semana 2–3 (no bloquea producción).

### 2.2 Advertencias de React Router v6 — CORREGIDAS en tests

- ✅ Añadidos `future flags` (`v7_startTransition`, `v7_relativeSplatPath`) en `tests/utils/render.jsx`.  
- La aplicación principal (`App.jsx`) usa `BrowserRouter` sin flags — añadir en próxima iteración para evitar deprecation warnings en consola de producción.

### 2.3 Módulo ESM en package.json

- `eslint.config.js` y `postcss.config.js` usan sintaxis ES Module.
- `tailwind.config.js` usa `module.exports` (CommonJS).
- **Acción:** Convertir `tailwind.config.js` a ES Module y añadir `"type": "module"` en `package.json` en iteración futura, con prueba completa del build.

---

## FASE 3 — ARQUITECTURA & ROBUSTEZ (Semanas 4–6)

### 3.1 Gestión de errores

- ✅ `ErrorBoundary.jsx` captura errores de renderizado React.
- ✅ `ErrorContext` / `LoadingContext` para estado global de errores y carga.
- ✅ `retryHandler.ts` con lógica de reintentos en llamadas a API.
- ✅ `webhookErrorHandler.ts` para manejo de errores en webhooks de WhatsApp.
- ⚠️ Verificar que todas las rutas críticas tengan `ErrorBoundary` como fallback.

### 3.2 Rendimiento

- ✅ TanStack Query gestiona caché y refetching automático.
- ⚠️ Revisar `staleTime` y `cacheTime` en `query-client.js` para optimizar llamadas.
- ⚠️ Code splitting — verificar lazy loading de páginas pesadas (Informes, Asignacion).

### 3.3 Cobertura de tests

- ✅ 46 tests pasando (3 flows principales + RoleContext).
- ⚠️ Ampliar tests para: `AuthContext`, `ErrorBoundary`, `webhookErrorHandler`.
- ⚠️ Añadir tests de integración para flujo completo de asignación de camareros.

---

## FASE 4 — PREPARACIÓN PARA DEMO (Semana 7–8)

### 4.1 Checklist de demo

- [ ] Datos de prueba: crear fixtures completos (camareros, pedidos, asignaciones reales).
- [ ] Entorno demo aislado en Firebase con datos sanitizados.
- [ ] Flujo demo definido: Login → Dashboard → Crear pedido → Asignar camarero → Confirmar servicio → QR fichaje.
- [ ] Modo demo sin WhatsApp real (mock de notificaciones).
- [ ] Guía interactiva (`INTERACTIVE_DEMO_GUIDE.md` ya existe — verificar vigencia).

### 4.2 Variables de entorno

- ⚠️ Auditar que `.env` no esté en el repositorio — verificar `.gitignore`.
- ⚠️ Configurar variables de entorno separadas para `demo` y `production`.
- ⚠️ API keys de WhatsApp / Base44 / Firebase no deben estar en código fuente.

### 4.3 Build y despliegue

- ✅ Pipeline CI/CD configurado (`ci.yml`, `deploy.yml`).
- ✅ Build Vite con `terser` para minificación.
- ⚠️ Añadir step de `npm audit --audit-level=high` en CI para bloquear vulnerabilidades altas.

---

## FASE 5 — MONITORIZACIÓN & MANTENIMIENTO CONTINUO (Semana 9+)

### 5.1 Acciones automáticas a configurar

- Activar `dependabot` para actualizaciones automáticas de seguridad.
- Revisar semanalmente `npm audit`.
- Mantener tests ≥ 80% cobertura en paths críticos.

### 5.2 KPIs de calidad

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Tests pasando | 100% | ✅ 100% (46/46) |
| Vulnerabilidades críticas/altas | 0 | ✅ 0 |
| Errores de lint | 0 | ✅ 0 |
| Warnings de lint | < 20 | 🟠 50 |
| TypeScript errores | 0 | ✅ 0 |

---

## RESUMEN DE CAMBIOS IMPLEMENTADOS EN ESTA AUDITORÍA

| # | Cambio | Archivo | Impacto |
|---|--------|---------|---------|
| 1 | Actualización rollup 4.52 → 4.59 (CVE GHSA-mw96-cpmx-2vgc) | `package-lock.json` | 🔴 Crítico |
| 2 | Actualización vite 6.3.6 → 6.4.1 (CVE GHSA-93m4-6634-74q7) | `package-lock.json` | 🟠 Moderado |
| 3 | React Router v7 future flags en tests | `tests/utils/render.jsx` | 🟡 Bajo |

---

## PRÓXIMOS PASOS INMEDIATOS

1. **Esta semana:** Revisar `.gitignore` y variables de entorno antes de la demo.
2. **Esta semana:** Preparar datos de prueba para la demo en entorno aislado.
3. **Próxima semana:** Limpiar las 50 advertencias de ESLint (variables sin usar).
4. **✅ Completado:** Añadido `npm audit --audit-level=high` al pipeline de CI (`.github/workflows/ci.yml`).
5. **En 2 semanas:** Ampliar cobertura de tests para módulos de autenticación y webhooks.
