# ADR-002: HTTP Request Strategy with useAPI Hook

**Status:** Accepted  
**Date:** 2026-02-28  
**Deciders:** Development Team

## Context

Several pages (Comunicacion, Chat) showed infinite loading states when API calls failed or timed out. There was no standardised way to handle fetch lifecycle (loading, error, data, timeout, cleanup) across the application.

## Decision

We will provide a reusable `useAPI` custom hook that wraps the native `fetch` API with:

1. **AbortController**: Each request gets an `AbortController` so it can be cancelled on component unmount or on timeout.
2. **Configurable timeout** (default 30 s): A `setTimeout` triggers `abort()` to prevent infinite loading.
3. **Cleanup on unmount**: The `useEffect` cleanup function cancels in-flight requests and clears the timer.
4. **Stable `refetch`**: Exposed via `useCallback` so consumers can trigger manual refreshes.
5. **Empty URL guard**: When `url` is falsy the hook skips fetching and sets `loading: false`.

## Consequences

### Positive
- Eliminates infinite loading by enforcing a hard timeout.
- Prevents memory leaks from state updates on unmounted components.
- Consistent `{ data, loading, error, refetch }` API across the app.
- Easy to test with mocked `fetch`.

### Negative
- Pages using TanStack Query (`useQuery`) already have similar features; `useAPI` is intended for cases where Query is not suitable (e.g., simple one-off fetches, non-React-Query contexts).
- The hook re-creates `fetchData` on every options object change if options are inline objects; callers should memoize options.

## Alternatives Considered

- **TanStack Query everywhere**: Already in use for entity data; `useAPI` fills the gap for non-entity endpoints.
- **Axios with interceptors**: Adds a dependency; native `fetch` + AbortController is sufficient.
