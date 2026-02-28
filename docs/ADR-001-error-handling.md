# ADR-001: Error Handling Strategy

## Status
Accepted

## Context
La aplicación necesita una estrategia robusta de manejo de errores para evitar crashes de UI y mejorar la experiencia de usuario cuando ocurren errores inesperados.

## Decision
Implementar Error Boundaries en React con un hook centralizado de logging de errores.

## Rationale
- Previene crashes que rompen la UI completa
- Mejora UX con mensajes de fallback claros
- Centraliza el error tracking para facilitar el debugging
- Permite a los usuarios recuperarse de errores sin recargar la página

## Implementation
- `src/components/ErrorBoundary.jsx`: Componente de clase que captura errores en el árbol de componentes
- `src/components/ErrorFallback.jsx`: UI de fallback mostrada cuando ocurre un error
- `src/hooks/useErrorHandler.js`: Hook para manejo centralizado de errores en componentes funcionales

## Consequences
- Los errores en componentes hijos quedan contenidos y no rompen la UI global
- Los usuarios pueden intentar recuperarse mediante el botón de reset
- Los errores se loguean en consola y pueden extenderse a servicios externos (Sentry, etc.)
