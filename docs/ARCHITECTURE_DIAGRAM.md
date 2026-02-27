# Architecture Diagram — AppServicioshosteleria

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USERS                                           │
│                                                                         │
│   [Coordinador]          [Camarero]            [Admin]                  │
│        │                     │                    │                     │
│        │ Browser             │ Browser/Mobile      │ Browser             │
└────────┼─────────────────────┼────────────────────┼─────────────────────┘
         │                     │                    │
         ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE HOSTING (CDN)                               │
│            https://servicios-hosteleros-app.web.app                     │
│                                                                         │
│                  React 18 SPA (Vite bundle)                             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
    ┌──────────────────┐  ┌──────────┐  ┌──────────────────┐
    │  React Router v6 │  │ TanStack │  │  Framer Motion   │
    │  (client routing)│  │ Query v5 │  │  + shadcn/ui     │
    └────────┬─────────┘  │ (cache)  │  └──────────────────┘
             │            └─────┬────┘
             │                  │
             ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BASE44 SDK v0.8.x                                   │
│              (API Gateway / BaaS Client)                                │
│                                                                         │
│   requiresAuth: true  │  Entity CRUD  │  Auth  │  Cloud Fn calls       │
└──────────┬──────────────────────────────────────────────────────────────┘
           │
     ┌─────┴─────────────────────────────────────────────────┐
     │                     BASE44 BACKEND                     │
     │                                                        │
     │  ┌──────────────────┐    ┌───────────────────────┐    │
     │  │    DATABASE       │    │   CLOUD FUNCTIONS     │    │
     │  │  (Managed BaaS)  │    │  (TypeScript / Deno)  │    │
     │  │                  │    │                       │    │
     │  │  Pedidos          │    │  sugerirCamareros...  │    │
     │  │  Camareros        │◄───│  enviarWhatsApp...    │    │
     │  │  Asignaciones     │    │  exportarAsig...      │    │
     │  │  Coordinadores    │    │  procesarEnvios...    │    │
     │  │  Clientes         │    │  confirmarServicio... │    │
     │  │  AuditLog         │    │  ...13 functions      │    │
     │  └──────────────────┘    └───────────┬───────────┘    │
     └──────────────────────────────────────┼────────────────┘
                                            │
            ┌───────────────────────────────┼─────────────────────┐
            │                               │                     │
            ▼                               ▼                     ▼
  ┌─────────────────┐           ┌──────────────────┐   ┌─────────────────┐
  │  WhatsApp API   │           │  Google Sheets   │   │   Gmail API     │
  │  (messaging)    │           │  API (export)    │   │  (email sends)  │
  └─────────────────┘           └──────────────────┘   └─────────────────┘
```

---

## Component Dependency Graph

```
Layout.jsx
  └─ useBackgroundServices.js
       ├─ notificarAsignacionesProximas   (Cloud Fn, every 10 min)
       ├─ procesarEnviosProgramados        (Cloud Fn, every 5 min)
       └─ [tareas pendientes poller]

Pages
  ├─ Pedidos.jsx
  │    ├─ components/pedidos/FormularioPedido
  │    ├─ components/pedidos/EditorTurnos
  │    └─ components/pedidos/ExtractorIA
  │
  ├─ Asignacion.jsx
  │    ├─ components/asignacion/KanbanAsignacion
  │    ├─ components/asignacion/SugerenciasIA
  │    └─ [drag-drop: @hello-pangea/dnd]
  │
  ├─ Camareros.jsx
  │    ├─ components/camareros/TarjetaCamarero
  │    └─ components/camareros/FormularioDisponibilidad
  │
  ├─ TiempoReal.jsx
  │    └─ components/tiemporeal/HojaAsistencia
  │
  └─ ConfirmarServicio.jsx   ← Public page (no auth)
       └─ confirmarServicioAutomatico  (Cloud Fn, token-validated)
```

---

## Data Flow Diagrams

### Create Pedido

```
Coordinator                Frontend              Base44 API         Database
    │                          │                     │                 │
    │── Fill form ────────────►│                     │                 │
    │                          │─ Validate inputs ──►│                 │
    │                          │                     │─ Auth check ───►│
    │                          │                     │                 │─ Write record
    │                          │                     │◄── Record ID ───│
    │                          │◄── success ─────────│                 │
    │◄── toast.success() ──────│                     │                 │
    │                          │─ invalidateQueries(['pedidos']) ──────►│
    │                          │◄── fresh list ──────────────────────── │
```

### Camarero Assignment + WhatsApp Notification

```
Coordinator         Frontend          Cloud Fn           WhatsApp API    Database
    │                   │                │                    │              │
    │── Drag card ─────►│                │                    │              │
    │                   │── sugerirCamareros ───────────────►│              │
    │                   │◄── ranked list ────────────────────│              │
    │── Confirm ───────►│                │                    │              │
    │                   │── createAsignacion ─────────────────────────────►│
    │                   │── enviarWhatsApp ────────────────►│              │
    │                   │                │─ POST message ───►│              │
    │                   │                │◄── 200 OK ────────│              │
    │                   │                │── writeAuditLog ──────────────►│
    │◄── toast.success()│                │                    │              │
```

### Scheduled Reminder Flow

```
Timer (every 5 min)
    │
    └─ useBackgroundServices.pollReminders()
         │
         └─ Cloud Fn: procesarEnviosProgramados
              │
              ├─ Query EnviosProgramados WHERE estado='pendiente' AND fecha <= now+24h
              │
              ├─ For each pending send:
              │    ├─ Cloud Fn: enviarWhatsAppDirecto → WhatsApp API
              │    └─ Update EnviosProgramados.estado = 'enviado'
              │
              └─ Return { sent: N, failed: M }
```

---

## Entity Relationship Diagram

```
Pedido (1) ──────────── (N) AsignacionCamarero
  │                              │
  │ id, cliente, lugar_evento    │ pedido_id (FK)
  │ dia (yyyy-MM-dd)             │ camarero_id (FK)
  │ turnos[]                     │ turno_index
  │ estado_evento                │ posicion_slot
  │                              │ estado
  │                              │ fecha_pedido (denorm.)
  │                              │
Camarero (1) ────────── (N) AsignacionCamarero
  │
  │ id, nombre, codigo, telefono
  │ disponibilidad[]
  │ valoracion_promedio

Coordinador (1) ─────── (N) Pedido
  │
  │ id, nombre, email, role

Cliente (1) ──────────── (N) Pedido
  │
  │ id, nombre, contacto

EnviosProgramado (N) ──── (1) AsignacionCamarero
  │ tipo (recordatorio_24h | recordatorio_2h)
  │ estado (pendiente | enviado | error)
  │ fecha_programada
```

---

## Security Zones

```
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC ZONE (no auth required)                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /ConfirmarServicio?token=<one-time-token>           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AUTHENTICATED ZONE (requiresAuth: true)                    │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  COORDINADOR role   │  │  ADMIN role                 │  │
│  │  /Pedidos           │  │  All pages                  │  │
│  │  /Asignacion        │  │  User management            │  │
│  │  /Camareros         │  │  System config              │  │
│  │  /Clientes          │  └─────────────────────────────┘  │
│  │  /Disponibilidad    │                                    │
│  │  /TiempoReal        │                                    │
│  │  /Dashboard         │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```
