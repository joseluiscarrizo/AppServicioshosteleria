# Enterprise Architecture — AppServicioshosteleria

## Core Principles

1. **Security by design** — defense in depth at every layer
2. **Scalability** — horizontal scaling ready via serverless Cloud Functions
3. **Reliability** — fault tolerance with Circuit Breaker and retry patterns
4. **Observability** — logging, monitoring, and tracing throughout
5. **Maintainability** — clear patterns, conventions, and documentation

---

## Component Overview

| Component | Technology | Role |
|-----------|-----------|------|
| Frontend | React 18 + Vite | SPA, UI rendering |
| Routing | React Router v6 | Client-side navigation |
| State/Cache | TanStack Query v5 | Server state, caching |
| UI | Tailwind CSS + shadcn/ui | Styling and components |
| Drag & Drop | @hello-pangea/dnd | Kanban board interactions |
| API Gateway | Base44 SDK v0.8.x | BaaS client, auth |
| Cloud Functions | TypeScript (serverless, Base44) | Business logic |
| Database | Base44 BaaS | Entities, access control |
| Hosting | Firebase Hosting | Static asset delivery |

---

## Architecture Diagram (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18)                   │
│                                                              │
│  Pages → Components → hooks/useBackgroundServices            │
│                ↓               ↓                             │
│           TanStack Query   Polling/timers                    │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTP / Base44 SDK
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   API GATEWAY (Base44 BaaS)                  │
│   Authentication · Entity CRUD · Access Rules · SDK          │
└───────────────┬───────────────────────┬──────────────────────┘
                │ Triggers              │ Direct entity access
                ▼                       ▼
┌───────────────────────┐   ┌──────────────────────────────────┐
│   CLOUD FUNCTIONS     │   │          DATABASE                │
│   (TypeScript/Deno)   │   │   (Base44 Entities)              │
│                       │   │                                  │
│  Business logic       │   │  Pedidos, Camareros,             │
│  WhatsApp sending     │   │  AsignacionCamarero,             │
│  Excel/Sheets export  │   │  Coordinadores, Clientes         │
│  AI suggestions       │   │                                  │
│  Scheduled tasks      │   └──────────────────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                               │
│  WhatsApp API · Google Sheets · Gmail · Firebase Auth        │
└──────────────────────────────────────────────────────────────┘

Side channels:
  Frontend Cache (TanStack Query 5 min stale) ←→ API Gateway
  Audit Log entries written by Cloud Functions → Database
```

---

## Data Flow — End to End

### Pedido creation flow
```
Coordinator fills form
  → React component validates input (client-side)
  → Base44 SDK mutation (POST /Pedidos)
    → Base44 entity rules check auth + role
    → Record stored in database
      → onSuccess → TanStack Query invalidates ['pedidos']
        → UI re-renders with fresh data
```

### Camarero assignment & notification flow
```
Coordinator drags card on Kanban
  → useBackgroundServices triggers assignment
  → Cloud Function: sugerirCamarerosInteligente
    → Reads Pedidos + Asignaciones from DB
    → Returns ranked suggestions
  → Coordinator confirms
  → Cloud Function: enviarWhatsAppDirecto
    → Calls WhatsApp API with camarero details
    → Writes Notificacion record (audit log)
```

### Automated reminder flow
```
useBackgroundServices (polling every 5 min)
  → Cloud Function: procesarEnviosProgramados
    → Queries upcoming Pedidos (24h / 2h window)
    → Sends WhatsApp reminders if not already sent
    → Updates EnviosProgramados.estado = 'enviado'
```

---

## Applied Patterns

### Saga Pattern (distributed transactions)
Multi-step operations (create pedido → assign camareros → send notifications) use a compensating transaction approach. If WhatsApp sending fails, the assignment is marked `error` and retried. See [ADR-001](ADR/ADR-001-Saga-Pattern-for-Transactions.md).

### Circuit Breaker
External API calls (WhatsApp, Google Sheets) are wrapped with failure detection. After a threshold of consecutive failures the caller stops retrying and returns a fast failure. See [ADR-003](ADR/ADR-003-Error-Handling-Hierarchy.md).

### Query Normalization
All React Query keys follow a deterministic pattern (`['entity', filters]`) to avoid cache collisions. See [ADR-002](ADR/ADR-002-Query-Normalization-Strategy.md).

### Cache Strategy (5-min stale)
TanStack Query is configured with `staleTime: 5 * 60 * 1000` for read-heavy entity queries. See [ADR-005](ADR/ADR-005-Cache-Strategy-5min-stale.md).

### Error Handling Hierarchy
All errors propagate through a consistent hierarchy: Cloud Function error → SDK error → React Query `onError` → `toast.error()` + audit log. See [ADR-003](ADR/ADR-003-Error-Handling-Hierarchy.md).

### Audit Logging
Every mutating Cloud Function writes an audit record. See [ADR-004](ADR/ADR-004-Audit-Logging-Requirements.md).

---

## Security Architecture

- **Authentication**: Base44 SDK handles session tokens (`requiresAuth: true`).
- **Authorization (RBAC)**: Cloud Functions validate `user.role` before executing business logic.
- **Input validation**: All inputs validated server-side in Cloud Functions using shared validators.
- **Data in transit**: TLS enforced on all API endpoints.
- **Secrets**: Never hardcoded — loaded via environment variables (see [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md)).
- **Audit trail**: All state-changing operations logged with timestamp, actor, and entity ID.

For detailed security guidance see [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md).

---

## Scalability Considerations

- Cloud Functions scale horizontally (serverless, Base44 managed).
- Firebase Hosting serves the SPA from a global CDN.
- TanStack Query caching reduces API call volume.
- Background polling intervals (5–15 min) are intentionally conservative to avoid rate limiting.
- WhatsApp bulk sends use the `enviarWhatsAppMasivo` function with internal throttling.

---

## Observability

| Signal | Implementation |
|--------|---------------|
| Frontend errors | `toast.error()` (user-facing) + console.error |
| Cloud Function errors | Structured `console.error` logs in Deno runtime |
| Audit events | Database records in audit entity |
| Background services | Polling heartbeat logs in `useBackgroundServices` |

---

## Related Documents

- [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md) — Security implementation guide
- [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md) — Deployment checklist and secrets management
- [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) — Coding conventions and workflow
- [CLOUD_FUNCTIONS_GUIDE.md](CLOUD_FUNCTIONS_GUIDE.md) — Cloud Functions patterns
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Common issues and solutions
- [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) — Extended diagrams
- [ADR/](ADR/) — Architecture Decision Records
