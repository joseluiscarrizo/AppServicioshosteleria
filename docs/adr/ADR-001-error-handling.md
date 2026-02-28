# ADR-001: Error Handling Strategy

## Status

Accepted

## Context

La aplicación necesita manejo robusto de errores para mejorar UX y debugging. Sin error boundaries, un error en un componente puede derribar toda la UI, mostrando una pantalla en blanco al usuario.

## Decision

Implementar Error Boundaries en React combinado con logging centralizado a través de `ErrorContext` y `ErrorFallback`.

## Rationale

- Previene crashes que rompen la UI completamente
- Permite graceful degradation con mensajes de error claros
- Facilita debugging en producción mediante logging centralizado
- Mejor experiencia de usuario con opción de recuperación

## Consequences

- Requiere React class components para `ErrorBoundary` (los hooks no pueden capturar errores de render)
- Logging overhead mínimo (solo `console.error`)
- Mejor observabilidad del estado de la aplicación

## Implementation

- `src/components/ErrorBoundary.jsx` — class component que captura errores de render
- `src/components/ErrorFallback.jsx` — UI de fallback con botón de recuperación
- `src/contexts/ErrorContext.jsx` — contexto global para errores async y notificaciones
- `src/hooks/useErrorHandler.js` — re-export conveniente del hook
- `src/App.jsx` — `ErrorBoundary` envuelve toda la aplicación
