# ADR 002 — Centralise error handling with ErrorBoundary and ErrorContext

**Date:** 2026-02-28  
**Status:** Accepted

## Context

React render errors propagate up the component tree and crash the whole application unless caught. Additionally, async API errors need to be shown to the user in a consistent way.

## Decision

We use two complementary mechanisms:

1. **`ErrorBoundary`** (class component in `src/components/ErrorBoundary.jsx`) — catches synchronous render errors, displays a localised fallback UI, and allows the user to retry.
2. **`ErrorContext` / `useErrorHandler`** (in `src/contexts/ErrorContext.jsx`) — a React context that components can use to report async errors; it shows `sonner` toast notifications and accumulates errors for possible display in a dedicated error panel.

`App.jsx` wraps the entire application in `<ErrorBoundary>` and provides `<ErrorProvider>` inside it so that all components have access to `useErrorHandler`.

## Consequences

- Render crashes are isolated and recoverable without a full page reload.
- Async error reporting is centralised; no component needs its own toast logic.
- Adding a custom fallback UI per route is supported via the `fallback` prop of `ErrorBoundary`.
