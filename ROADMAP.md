# Roadmap — AppServicioshosteleria

## Semana 1 — Estabilidad y calidad base

- [x] Mejorar `ErrorBoundary`: UI de fallback localizada, soporte para retry y `fallback` prop personalizable
- [x] Centralizar manejo de errores con `useErrorHandler` (ErrorContext)
- [x] Corregir polling excesivo en componentes de chat que ya usan suscripciones en tiempo real
- [x] Añadir jsPDF ≥ 4.2.0 a `package.json` (corrige vulnerabilidades conocidas)
- [x] Tests unitarios para `ErrorBoundary` y `useErrorHandler`
- [ ] Aumentar cobertura de tests en flujos críticos (crear pedido, asignar camarero, confirmar servicio) hasta ≥ 80%

## Semana 2 — Rendimiento y experiencia de usuario

- [ ] Auditar y optimizar los `refetchInterval` restantes en toda la app
- [ ] Añadir paginación o virtualización en listas de mensajes largas
- [ ] Implementar lazy loading (dynamic `import()`) para páginas pesadas
- [ ] Alcanzar puntuación Lighthouse ≥ 80 en Performance
- [ ] Revisar y optimizar reglas de Firebase para minimizar lecturas innecesarias

## Semana 3 — Funcionalidades nuevas

- [ ] Panel de administración para gestión de roles y permisos
- [ ] Notificaciones push vía Web Push API para nuevas asignaciones
- [ ] Exportación a Google Sheets de informes de asistencia
- [ ] Mejora del módulo de valoración de camareros con gráficas históricas

## Semana 4 — Preparación para producción

- [ ] Revisión de seguridad completa (Firebase rules, dependencias, CSP)
- [ ] Configurar CI/CD con despliegue automático a Firebase Hosting en merge a `main`
- [ ] Documentación de usuario final (guía rápida para coordinadores y camareros)
- [ ] Stress test del sistema de chat con carga simulada
- [ ] Etiqueta de release `v1.0.0` y changelog inicial
