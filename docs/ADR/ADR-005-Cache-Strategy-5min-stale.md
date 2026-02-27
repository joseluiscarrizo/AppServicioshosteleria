# ADR-005: Cache Strategy — 5-Minute Stale Time

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

The frontend uses TanStack Query v5 to cache server state. The default `staleTime` in TanStack Query is `0` (data is immediately stale and re-fetched on every component mount). For a hospitality coordination app:

- Data changes infrequently (pedidos created/edited a few times per day).
- Multiple components on the same page request the same entities.
- The app may be left open on a tablet or desktop for hours.
- Base44 BaaS charges per API request; unnecessary re-fetches increase cost.

With `staleTime: 0`:
- Every page navigation triggers redundant API calls for the same data.
- Background polling intervals compound with React Query refetching.
- The coordinator's view may flicker unnecessarily.

With an excessively long `staleTime`:
- Real-time changes (another coordinator assigns a camarero) may not appear.
- The coordinator sees stale data without knowing it.

---

## Decision

Set `staleTime: 5 * 60 * 1000` (5 minutes) globally for entity queries via `QueryClient` default options:

```js
// src/api/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});
```

### Per-Query Overrides

Some queries require shorter or longer stale times:

| Query | staleTime | Reason |
|-------|-----------|--------|
| `['pedidos']` | 5 min (default) | Changes infrequently |
| `['camareros']` | 5 min (default) | Changes infrequently |
| `['asignaciones', { pedidoId }]` | 1 min | Changes during active coordination |
| `['tiemporeal', ...]` | 30 s | Near-real-time monitoring |
| `['coordinadores']` | 15 min | Rarely changes |

```js
// Example: shorter stale time for active coordination
useQuery({
  queryKey: ['asignaciones', { pedidoId }],
  queryFn: () => AsignacionCamarero.filter({ pedido_id: pedidoId }),
  staleTime: 60_000, // 1 minute
});
```

### Mutation-Driven Invalidation

When a mutation succeeds, it immediately invalidates the relevant cache — regardless of stale time. This ensures coordinators always see their own changes instantly:

```js
const mutation = useMutation({
  mutationFn: (data) => Pedido.update(id, data),
  onSuccess: () => {
    // Immediately invalidate — don't wait for stale time to expire
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    toast.success('Pedido actualizado');
  },
});
```

### Background Refetch

- `refetchOnWindowFocus: false` — prevents refetch every time the coordinator switches browser tabs (noisy in a monitoring context).
- `refetchOnReconnect: true` — refetch after network reconnection to ensure data is current.

---

## Consequences

**Positive**:
- Significant reduction in redundant API calls.
- Smoother UX (no unnecessary loading states on navigation).
- Reduced Base44 API request costs.
- Mutations still provide instant feedback via cache invalidation.

**Negative**:
- Changes made by another coordinator may take up to 5 minutes to appear without a manual refresh.
- Real-time monitoring pages (`TiempoReal.jsx`) require a shorter stale time override.
- Developers must remember to call `invalidateQueries` in `onSuccess` handlers.

---

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| `staleTime: 0` (default) | Too many redundant API calls; poor performance |
| `staleTime: Infinity` | Stale data for other coordinators' changes; unacceptable |
| WebSocket for real-time updates | Base44 BaaS does not provide WebSocket subscriptions at current tier |
| Polling at 30-second intervals globally | Too aggressive; unnecessary for infrequently-changing data |
