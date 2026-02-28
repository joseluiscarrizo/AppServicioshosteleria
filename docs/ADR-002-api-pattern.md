# ADR-002: API Request Pattern

## Status
Accepted

## Context
La aplicación tenía problemas de infinite loading en páginas como Chat y Comunicación, causados por promesas que no se resolvían con timeout y estados de carga que no se limpiaban correctamente.

## Decision
Usar el custom hook `useAPI` para todas las requests HTTP y añadir timeout de autenticación en las páginas que lo requieran.

## Benefits
- Manejo centralizado de timeouts (30 segundos por defecto)
- Abort controller automático para evitar memory leaks
- Loading states consistentes en toda la aplicación
- Cancelación automática de requests al desmontar el componente

## Implementation
- `src/hooks/useAPI.js`: Custom hook para fetch requests con abort controller y timeout
- Páginas de Chat y Comunicación actualizadas con timeout de 10 segundos para carga del usuario

## Consequences
- Eliminación del infinite loading spinner en Chat y Comunicación
- Mejor manejo de errores de red con mensajes claros al usuario
- Reducción de memory leaks por requests no canceladas
