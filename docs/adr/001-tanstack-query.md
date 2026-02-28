# ADR 001 — Use TanStack Query for server state management

**Date:** 2026-02-28  
**Status:** Accepted

## Context

The application fetches data from Firebase/Base44 in many components. Without a dedicated library, each component would need to manage its own loading, error, and caching state, leading to inconsistent behaviour and unnecessary re-fetches.

## Decision

We use **TanStack Query** (React Query v5) as the single solution for:
- Fetching and caching server data
- Background refetching
- Optimistic updates on mutations

## Consequences

- Consistent `isLoading`, `isError`, and `data` states across all components.
- Queries are deduped and cached automatically; components sharing a query key share the same request.
- Components that also subscribe to real-time events (via `base44.entities.*.subscribe`) must set `staleTime ≥ 30 000` ms to prevent redundant polling.
- Cache is co-located with the `QueryClientProvider` in `App.jsx`; the `queryClientInstance` is defined in `src/lib/query-client.js`.
