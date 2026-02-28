# Performance Guide

## Real-time data fetching

The app uses **TanStack Query** for server state management. Follow these guidelines to avoid performance regressions:

### Polling vs. subscriptions
- Components that subscribe to real-time events via `base44.entities.*.subscribe()` should set `staleTime ≥ 30 000` ms and `refetchInterval ≥ 30 000` ms.
  - Reason: the subscription already delivers updates; aggressive polling duplicates network traffic and triggers unnecessary re-renders.
- Components without subscriptions may use shorter polling intervals (e.g. `refetchInterval: 10 000`).

### Query key granularity
Use entity + identifier in query keys to allow targeted invalidation:

```js
queryKey: ['mensajes-chat', grupo.id]   // ✅
queryKey: ['mensajes-chat']             // ❌ too broad
```

## Bundle size

- Dynamic `import()` is used for heavy pages to keep the initial bundle small.
- Avoid importing full icon libraries; import individual icons from `lucide-react`.
- PDF generation (`jsPDF`) is only loaded when the user triggers an export.

## Rendering

- Lists of messages and assignments are virtualised or paginated to avoid rendering thousands of DOM nodes.
- Memoize expensive derived data with `useMemo`; stabilise callbacks with `useCallback`.

## Lighthouse targets

| Metric | Target |
|--------|--------|
| Performance | ≥ 80 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 90 |
| SEO | ≥ 80 |

Run `npm run build && npm run preview` and open Chrome DevTools → Lighthouse to measure.

## Firebase reads

- Minimise the number of Firestore reads per page load.
- Use compound queries instead of fetching entire collections and filtering on the client.
- Cache results where appropriate using TanStack Query's `staleTime` and `gcTime`.
