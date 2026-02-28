# Guía de Rendimiento

## Estrategias de Rendimiento Implementadas

### React Query (Caché de Datos)
La aplicación usa `@tanstack/react-query` para gestionar el estado del servidor. Configuración global en `src/lib/query-client.js`:

```js
{
  queries: {
    refetchOnWindowFocus: false,  // Evita refetch al cambiar de pestaña
    retry: 1,                     // Solo 1 reintento en caso de error
  }
}
```

**Beneficios:**
- Datos cacheados automáticamente, reduciendo peticiones repetidas.
- Actualizaciones optimistas disponibles con `useMutation`.

### Carga Diferida de Componentes
Los componentes pesados (calendarios, gráficos, mapas) deben importarse de forma diferida:

```jsx
const CalendarioInteractivo = React.lazy(() =>
  import('@/components/asignacion/CalendarioInteractivo')
);
```

Esto reduce el bundle inicial y mejora el tiempo de primera carga.

### Polling con `refetchInterval`
Los componentes de chat y tiempo real usan `refetchInterval: 3000` (3 segundos). Consideraciones:

- El polling se desactiva automáticamente cuando el componente se desmonta.
- Usa WebSockets o SSE para aplicaciones con alta frecuencia de actualización.
- Ajusta el intervalo según la criticidad de los datos (pedidos: 3s, informes: 30s+).

### Optimización de Re-renders
- Usa `useCallback` y `useMemo` para funciones y cálculos costosos.
- `RoleContext` usa `useCallback` en `hasPermission` para evitar re-renders innecesarios.
- Evita crear objetos/arrays literales en el JSX que causen re-renders.

## Métricas Objetivo

| Métrica | Objetivo |
|---|---|
| First Contentful Paint (FCP) | < 1.5s |
| Time to Interactive (TTI) | < 3.5s |
| Bundle size inicial | < 500 KB gzipped |
| Tiempo de respuesta API | < 500ms (p95) |

## Herramientas de Diagnóstico

```bash
# Analizar el bundle
npm run build -- --mode analyze

# Perfil de renders con React DevTools Profiler
# (disponible en el navegador con React DevTools instalado)
```

## Recomendaciones Futuras

- [ ] Implementar virtualización de listas largas (pedidos, camareros) con `@tanstack/react-virtual`.
- [ ] Añadir Service Worker para caché offline de recursos estáticos.
- [ ] Configurar `staleTime` por query según la frecuencia de cambio de cada entidad.
- [ ] Migrar el polling de chat a WebSockets para reducir la carga del servidor.
