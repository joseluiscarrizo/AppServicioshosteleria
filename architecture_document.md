# Architecture Document — AppServicioshosteleria

This document describes the actual architecture of the AppServicioshosteleria application, a staffing management platform for hospitality events.

## Architecture Overview

The application uses a **Backend-as-a-Service (BaaS)** model via Base44, paired with a React SPA frontend hosted on Firebase Hosting. There are no self-managed servers or microservices; infrastructure is fully managed by Base44 and Firebase.

### Key Components

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| **Frontend** | React 18 + Vite | UI rendering, routing, state management |
| **Routing** | React Router v6 | Client-side navigation |
| **Server State** | TanStack Query v5 | API data fetching, caching, synchronisation |
| **UI Components** | Tailwind CSS + shadcn/ui + Framer Motion | Styling and animation |
| **Drag & Drop** | @hello-pangea/dnd | Kanban board interactions |
| **BaaS** | Base44 SDK v0.8.x | Data persistence, authentication, real-time updates |
| **Cloud Functions** | TypeScript (serverless on Base44) | Server-side business logic |
| **Hosting** | Firebase Hosting | Static asset delivery via CDN |

## Application Layers

### Frontend (`src/`)

```
src/
├── api/base44Client.js          # Base44 BaaS client (authentication, entities)
├── components/
│   ├── asignacion/              # Kanban board, drag-drop, AI waiter suggestions
│   ├── camareros/               # Waiter management and ratings
│   ├── informes/                # Analytics and performance reports
│   ├── notificaciones/          # Push and in-app notifications
│   ├── pedidos/                 # Service order forms and AI extractor
│   ├── recordatorios/           # Configurable reminders
│   ├── tiemporeal/              # Real-time attendance tracking
│   └── whatsapp/                # WhatsApp messaging integration
├── hooks/useBackgroundServices.js  # Unified background service polling
└── pages/                       # Top-level page components (Pedidos, Asignacion, etc.)
```

### Cloud Functions (`functions/`)

Serverless TypeScript functions deployed on Base44:

- `sugerirCamarerosInteligente` — AI-powered waiter suggestions
- `enviarWhatsAppDirecto` / `enviarWhatsAppMasivo` — WhatsApp messaging
- `exportarAsignacionesExcel` — Excel export
- `exportarAsistenciaSheets` — Google Sheets synchronisation
- `verificarDocumentosExpirados` — Document expiration alerts
- `autoCrearGrupoChatConfirmado` — Auto-create confirmation groups
- `eliminarGruposExpirados` — Cleanup of inactive groups

## Data Flow

```
Browser → React SPA → Base44 SDK → Base44 BaaS (data + auth)
                    ↳ Cloud Functions (server-side logic via Base44 triggers)
```

Authentication and all data operations go through the Base44 SDK. Cloud functions handle complex business logic (messaging, exports, AI suggestions) triggered by Base44 events or HTTP calls.

## CI/CD Pipeline

| Stage | Tool | Trigger |
|-------|------|---------|
| Lint | ESLint | Push / PR to `main` |
| Test | Vitest | Push / PR to `main` |
| Build | Vite | Push to `main` |
| Deploy | Firebase Hosting | Push to `main` (via GitHub Actions) |

## Security

- Authentication is enforced through Base44 (`requiresAuth: true` in `base44Client.js`).
- Entity-level access rules are configured in the Base44 Dashboard.
- Environment variables (`VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL`) are stored as GitHub Secrets; never committed to source.
- The public confirmation page (`/confirmar-servicio`) is the only unauthenticated route.

## Scalability

Scaling is handled transparently by Base44 and Firebase:

- **Base44**: Serverless compute scales automatically with request volume.
- **Firebase Hosting**: Global CDN serves the static frontend with no manual scaling required.
- **TanStack Query**: Client-side caching reduces redundant API calls.

## Conclusion

The application is designed to minimise operational overhead by delegating infrastructure concerns (auth, data, compute, hosting) to managed platforms. Development effort is focused on product features in the React frontend and TypeScript cloud functions.