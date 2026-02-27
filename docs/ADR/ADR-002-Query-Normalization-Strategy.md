# ADR-002: Query Normalization Strategy

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

The frontend uses TanStack Query v5 to manage server state. Query cache keys determine:
- Which queries are considered the same (cache hits vs. misses).
- Which queries are invalidated after mutations.
- How data is deduped across components.

Without a consistent key convention:
- Multiple components requesting the same data with different keys create redundant API calls.
- Mutations that invalidate `['pedidos']` won't invalidate `['pedido_list']` or `['all_pedidos']`.
- Cache inconsistency leads to stale UI state after writes.

---

## Decision

All TanStack Query keys follow a **normalized, deterministic array format**:

```
[entityName]                         // full collection, no filters
[entityName, { filter: value }]      // filtered collection
[entityName, id]                     // single entity by ID
[entityName, 'action', params]       // derived/computed queries
```

### Standard Keys

| Data | Query Key |
|------|-----------|
| All pedidos | `['pedidos']` |
| Pedidos by date | `['pedidos', { fecha: '2026-02-27' }]` |
| Single pedido | `['pedidos', pedidoId]` |
| All camareros | `['camareros']` |
| Asignaciones for pedido | `['asignaciones', { pedidoId }]` |
| All coordinadores | `['coordinadores']` |
| All clientes | `['clientes']` |

### Invalidation Pattern

```js
// After creating a pedido, invalidate the full collection:
queryClient.invalidateQueries({ queryKey: ['pedidos'] });

// After updating a specific pedido, invalidate both collection and single:
queryClient.invalidateQueries({ queryKey: ['pedidos'] });
queryClient.invalidateQueries({ queryKey: ['pedidos', pedidoId] });

// After creating an asignacion, invalidate asignaciones:
queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
```

### Anti-Patterns (Forbidden)

```js
// ❌ Inconsistent key format
useQuery({ queryKey: 'pedidos' });            // string, not array
useQuery({ queryKey: ['pedido_list'] });      // wrong entity name
useQuery({ queryKey: ['getPedidos', user] }); // action-prefixed

// ✅ Correct
useQuery({ queryKey: ['pedidos'] });
useQuery({ queryKey: ['pedidos', { fecha: today }] });
```

---

## Consequences

**Positive**:
- Mutations reliably invalidate the correct cache entries.
- No redundant API calls for the same data.
- Consistent, discoverable pattern for new developers.
- React Query DevTools clearly shows all cached entities.

**Negative**:
- Requires discipline to follow the convention.
- Overly broad invalidation (e.g., `['pedidos']`) may re-fetch more than needed — acceptable trade-off for simplicity.

---

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| String keys (`'pedidos'`) | TanStack Query v5 recommends array keys; harder to invalidate subsets |
| Object keys (`{ entity: 'pedidos' }`) | More verbose with no added benefit for this app's scale |
| Per-component key namespacing | Creates silos; mutations cannot cross-invalidate |
