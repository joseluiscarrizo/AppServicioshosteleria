# ADR-003: Error Handling Hierarchy

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

The application has multiple error-generating layers:
- Base44 SDK network errors.
- Cloud Function business logic errors.
- React Query mutation/query failures.
- Background service polling failures.
- External API failures (WhatsApp, Google, Gmail).

Without a defined hierarchy:
- Errors are handled inconsistently (some logged, some silently swallowed).
- Users see raw technical error messages.
- Debugging is difficult without structured logs.
- Security risk: internal details (stack traces, DB schemas) may leak to the client.

---

## Decision

Implement a three-layer error handling hierarchy:

```
Layer 1: Cloud Function (server)
  └── Catches all exceptions
  └── Logs structured JSON to Deno runtime
  └── Returns safe { success: false, error: 'human message' }

Layer 2: Base44 SDK / React Query (client boundary)
  └── SDK error → React Query onError callback
  └── Never exposes raw server errors to UI

Layer 3: UI (user-facing)
  └── toast.error('Human-readable message')
  └── Never shows stack traces or internal IDs
```

### Layer 1 — Cloud Function Error Handling

```typescript
export default async function handler(req, user) {
  try {
    // ... business logic
    return { success: true, data: result };
  } catch (error) {
    // Structured log for debugging
    console.error(JSON.stringify({
      function: 'functionName',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      // Never log: tokens, passwords, full phone numbers
    }));
    // Safe response — never expose internal details
    return { success: false, error: 'Error processing request. Please try again.' };
  }
}
```

### Layer 2 — React Query Error Propagation

```js
const mutation = useMutation({
  mutationFn: (data) => base44.invoke('myFunction', data),
  onError: (error) => {
    // error.message comes from Cloud Function's safe error string
    toast.error(error.message || 'An unexpected error occurred');
    // Optionally log to monitoring
    console.error('[mutation error]', error);
  },
});

const { data, error } = useQuery({
  queryKey: ['pedidos'],
  queryFn: () => Pedido.list(),
  // React Query retries 3 times by default for network errors
  retry: 3,
  onError: (error) => {
    toast.error('Could not load pedidos. Please refresh.');
  },
});
```

### Layer 3 — UI Error Display

- Always use `toast.error(message)` from `sonner` for transient errors.
- For persistent errors (page-level failures), show an `AlertDialog` with a retry option.
- Never render raw `error.stack` or internal IDs in the UI.
- Destructive actions (delete) always require `AlertDialog` confirmation first.

### Circuit Breaker (External APIs)

For Cloud Functions calling external APIs (WhatsApp, Google):

```typescript
class SimpleCircuitBreaker {
  private failures = 0;
  private readonly threshold = 3;
  private open = false;
  private lastFailureTime = 0;
  private readonly resetAfterMs = 60_000; // 1 minute

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.open) {
      if (Date.now() - this.lastFailureTime > this.resetAfterMs) {
        this.open = false; // Half-open: try again
      } else {
        throw new Error('Service temporarily unavailable');
      }
    }
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) this.open = true;
      throw error;
    }
  }
}
```

---

## Consequences

**Positive**:
- Consistent, predictable error experience for users.
- Safe error messages that don't expose internals.
- Structured logs enable debugging without client exposure.
- Circuit breaker prevents cascading failures to external APIs.

**Negative**:
- Requires discipline: every Cloud Function must wrap in try/catch.
- Circuit breaker state is per-function-instance (not shared across serverless instances) — acceptable for this scale.

---

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Bubble raw errors to client | Security risk; poor UX |
| Global error boundary only | Doesn't cover mutations; too coarse |
| Centralized error service | Over-engineering for current scale |
