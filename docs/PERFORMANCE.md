# Performance Guidelines

## Metrics Objetivo
- Bundle size < 500KB (gzipped)
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

## Optimization Techniques

### Code Splitting
- Usa `React.lazy()` y `Suspense` para cargar páginas bajo demanda
- Divide el bundle por rutas para reducir el tiempo de carga inicial

### Lazy Loading
- Carga componentes pesados de forma diferida
- Usa `loading="lazy"` en imágenes que no estén en el viewport inicial

### Memoización
- Usa `React.memo()` para componentes que se renderizan frecuentemente
- Usa `useMemo()` para cálculos costosos
- Usa `useCallback()` para funciones pasadas como props

### State Management
- Evita re-renders innecesarios con selectores específicos
- Mantén el estado lo más local posible

### API Requests
- Usa TanStack Query para cachear respuestas del servidor
- Implementa stale-while-revalidate para mejor UX
- Cancela requests obsoletas con AbortController (ver `useAPI` hook)

## Monitoring
- Revisa el tamaño del bundle después de cada build: `npm run build`
- Usa las DevTools de React para identificar re-renders innecesarios
- Mide el rendimiento en dispositivos de gama baja para casos de uso reales
