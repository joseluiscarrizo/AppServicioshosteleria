# ROADMAP — AppServicioshosteleria

## Estado General: En Progreso

---

## Semana 1 (actual): Estabilidad y Fundamentos ⏳

### ✅ Completado
- `ErrorBoundary` mejorado con `ErrorFallback` y soporte de reset.
- `ErrorContext` + `useErrorHandler` para manejo global de errores en lógica de negocio.
- `LoadingContext` + `useLoading` para estados de carga centralizados.
- Timeout de seguridad en `AuthContext` para evitar loading infinito (15s).
- Integración de `ErrorBoundary`, `ErrorProvider` y `LoadingProvider` en `App.jsx`.
- Actualización de dependencias: `rollup` y `vite` parcheados (vulnerabilidades alta y moderada).
- ADR-001: Arquitectura de Manejo Global de Errores.
- ADR-002: Gestión de Estados de Carga.

### ⏳ En Progreso
- Revisión de componentes de chat para optimizar polling.
- Tests de integración para `ErrorBoundary` y `ErrorContext`.

---

## Semana 2: Mejoras de UX y Robustez ⏸️

- [ ] Implementar page-level `ErrorBoundary` en rutas críticas (`/admin`, `/manager`).
- [ ] Añadir `Suspense` + `React.lazy` para carga diferida de componentes pesados.
- [ ] Mejorar el manejo de errores en mutaciones (pedidos, asignaciones).
- [ ] Añadir tests E2E para flujos de autenticación.
- [ ] Integrar logging de errores en servicio externo (Sentry o similar).

---

## Semanas 3–4: Rendimiento y Escalabilidad ⏸️

- [ ] Virtualización de listas largas (pedidos, camareros) con `@tanstack/react-virtual`.
- [ ] Migrar polling de chat a WebSockets/SSE.
- [ ] Configurar `staleTime` granular por entidad en React Query.
- [ ] Añadir Service Worker para caché offline.
- [ ] Implementar métricas de rendimiento con Web Vitals.
- [ ] Auditoría de accesibilidad (WCAG 2.1 AA).

---

## Backlog (sin fecha) ⏸️

- [ ] Internacionalización (i18n) para soporte multi-idioma.
- [ ] Modo oscuro.
- [ ] Exportación de informes a PDF/Excel desde el cliente.
- [ ] Notificaciones push en tiempo real.
- [ ] Panel de analytics para administradores.

---

*Última actualización: 2026-02-28*
