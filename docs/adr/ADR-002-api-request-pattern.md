# ADR-002: API Request Pattern

## Status

Accepted

## Context

Múltiples componentes implementan fetch requests directamente en `useEffect` sin patrón consistente: sin cancelación de requests, sin timeout, y sin cleanup al desmontar el componente, lo que produce infinite loading y actualizaciones de estado en componentes desmontados.

## Decision

Implementar el custom hook `useAPI` en `src/hooks/useAPI.js` para todas las requests HTTP de usuario y estado inicial.

## Rationale

- Centraliza manejo de timeouts (30 segundos por defecto)
- Cancela requests automáticamente con `AbortController` al desmontar el componente
- Loading states consistentes en toda la aplicación
- Error handling estandarizado
- Reutilizable: cualquier componente puede usar `useAPI`

## Consequences

- Un lugar único para cambios de estrategia de fetch
- Comportamiento de timeout compartido
- Mensajes de error consistentes
- Migración incremental posible (pages existentes migran una a una)

## Implementation

- `src/hooks/useAPI.js` — hook con `AbortController`, timeout configurable, cleanup on unmount
- `src/pages/Comunicacion.jsx` — migrado a `useAPI` para fetch de usuario
- `src/pages/Chat.jsx` — migrado a `useAPI` para fetch de usuario

## Configuration

```javascript
const { data, loading, error, refetch } = useAPI(fetchFn, {
  immediate: true,   // ejecutar al montar (default: true)
  timeout: 30000,    // timeout en ms (default: 30000)
  deps: []           // dependencias que re-ejecutan el fetch
});
```
