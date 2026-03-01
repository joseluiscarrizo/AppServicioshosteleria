# ADR-001: Error Boundary Strategy

**Status:** Accepted  
**Date:** 2026-02-28  
**Deciders:** Development Team

## Context

The application lacked a structured approach for catching and displaying runtime errors in React components. Unhandled errors would cause the entire application to crash with a white screen, providing a poor user experience and making debugging difficult.

## Decision

We will implement React Error Boundaries at the application root and provide a reusable `ErrorBoundary` class component with an `ErrorFallback` UI component.

### Key design decisions:

1. **Class component**: React Error Boundaries must be class components (`componentDidCatch`, `getDerivedStateFromError`).
2. **Separate fallback UI**: `ErrorFallback` is a separate functional component for easy customization.
3. **Reset capability**: The boundary exposes a `resetError` method so users can recover without a full page reload.
4. **Development details**: Error stack traces are only shown in `NODE_ENV === 'development'`.
5. **Global placement**: `ErrorBoundary` wraps the entire app in `App.jsx` to catch any uncaught error.

## Consequences

### Positive
- Users see a friendly error message instead of a white screen.
- Developers get stack traces in development mode.
- Errors can be recovered from without a full page reload.
- The `useErrorHandler` hook provides consistent error logging across async operations.

### Negative
- Class component syntax is required for the boundary itself.
- Must manually wrap additional sections if granular isolation is needed.

## Alternatives Considered

- **react-error-boundary library**: Adds a dependency; the custom implementation is lightweight and sufficient.
- **Single global handler only**: Does not catch synchronous render errors in React's tree.
