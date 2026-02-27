# API Documentation

Complete reference for all Cloud Function endpoints in AppServicioshosteleria.

> **Machine-readable spec:** [`docs/openapi.yaml`](./openapi.yaml) (OpenAPI 3.0)

---

## Table of Contents

1. [Base URL & Versioning](#base-url--versioning)
2. [Authentication](#authentication)
3. [Roles & RBAC](#roles--rbac)
4. [Rate Limits](#rate-limits)
5. [Common Response Codes](#common-response-codes)
6. [WhatsApp Endpoints](#whatsapp-endpoints)
7. [Assignment Endpoints](#assignment-endpoints)
8. [Export Endpoints](#export-endpoints)
9. [Attendance & QR Endpoints](#attendance--qr-endpoints)
10. [Chat Group Endpoints](#chat-group-endpoints)
11. [Report Endpoints](#report-endpoints)
12. [Document Endpoints](#document-endpoints)
13. [Scheduled Jobs](#scheduled-jobs)
14. [User Endpoints](#user-endpoints)

---

## Base URL & Versioning

```
https://<project-id>.base44.app/functions/v1/<function-name>
```

All endpoints accept and return `application/json` unless otherwise stated.
The API does not currently enforce explicit versioning in the path; changes are
communicated via the [CHANGELOG](../README.md).

---

## Authentication

All endpoints (except public QR check-in and the WhatsApp webhook verification
handshake) require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <session-token>
```

Tokens are obtained by signing in through the Base44 SDK:

```typescript
const session = await base44.auth.signIn({ email, password });
// session.token → use as Bearer token
```

See [AUTHENTICATION.md](./AUTHENTICATION.md) for full details.

---

## Roles & RBAC

| Role | Description |
|------|-------------|
| `admin` | Full access to all endpoints |
| `coordinador` | Access to coordination, assignment, and export operations |
| `camarero` | No direct API access; uses QR tokens for check-in only |
| *(public)* | QR check-in endpoints and webhook verification — no auth required |

When a request is made with an insufficient role the API returns **403 Forbidden**.

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `enviarWhatsAppDirecto` | 100 req / 60 s |
| `enviarWhatsAppMasivo` | 20 req / 60 s |
| All others | No explicit limit (subject to Base44 platform limits) |

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request — missing or invalid parameters |
| `401` | Unauthorized — missing or expired token |
| `403` | Forbidden — insufficient role |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate operation (e.g. check-in already registered) |
| `500` | Internal Server Error |

All error responses follow this shape:

```json
{ "error": "Human-readable message" }
```

---

## WhatsApp Endpoints

### `POST /enviarWhatsAppDirecto`

Sends a WhatsApp message to a single phone number.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telefono` | `string` | ✅ | Recipient phone (Spanish format accepted) |
| `mensaje` | `string` | ✅ | Message body |
| `camarero_id` | `string` | — | Waiter ID for history logging |
| `camarero_nombre` | `string` | — | Waiter display name for history logging |
| `pedido_id` | `string` | — | Associated order ID |
| `asignacion_id` | `string` | — | Assignment ID — needed for interactive buttons |
| `plantilla_usada` | `string` | — | Name of the WhatsApp template |
| `link_confirmar` | `string` | — | Confirm deep-link (triggers interactive buttons) |
| `link_rechazar` | `string` | — | Reject deep-link (triggers interactive buttons) |

**Example request:**

```json
{
  "telefono": "612345678",
  "mensaje": "Hola Juan, tienes servicio mañana. ¿Lo aceptas?",
  "camarero_id": "cam1",
  "camarero_nombre": "Juan García",
  "pedido_id": "ped456",
  "asignacion_id": "asig789",
  "link_confirmar": "https://app.example.com/confirmar/asig789",
  "link_rechazar": "https://app.example.com/rechazar/asig789"
}
```

**Example response:**

```json
{
  "success": true,
  "telefono": "34612345678",
  "whatsapp_url": null,
  "enviado_por_api": true,
  "mensaje_id": "wamid.abc123",
  "mensaje_enviado": true,
  "error_api": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### `POST /enviarWhatsAppMasivo`

Sends WhatsApp messages to multiple waiters in bulk.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `camareros_ids` | `string[]` | ✅ | List of waiter IDs |
| `pedido_id` | `string` | — | Order ID for template variable substitution |
| `mensaje` | `string` | — | Message body (one of `mensaje` or `plantilla_id` required) |
| `plantilla_id` | `string` | — | Stored template ID (overrides `mensaje`) |
| `coordinador_id` | `string` | — | Coordinator ID for logging |

**Template variables** (replaced in `mensaje`):
`{{camarero}}`, `{{cliente}}`, `{{dia}}`, `{{lugar_evento}}`,
`{{hora_entrada}}`, `{{hora_salida}}`, `{{camisa}}`

**Example response:**

```json
{
  "success": true,
  "total": 3,
  "exitosos": 2,
  "fallidos": 1,
  "detalles": [
    { "camarero": "Juan García", "telefono": "34612345678", "estado": "enviado", "proveedor": "whatsapp_api", "enviado_por_api": true },
    { "camarero": "Ana Martínez", "telefono": "34698765432", "estado": "enviado", "proveedor": "whatsapp_api", "enviado_por_api": true },
    { "camarero": "Luis Pérez", "estado": "fallido", "error": "Sin teléfono" }
  ],
  "mensaje": "Mensajes procesados: 2 exitosos, 1 fallidos"
}
```

---

### `GET /webhookWhatsAppRespuestas` — Webhook verification

Meta calls this once when the webhook URL is registered in the Meta Developer Dashboard.
No authentication required.

**Query parameters:** `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`

---

### `POST /webhookWhatsAppRespuestas` — Receive messages

Receives incoming WhatsApp messages and status updates from the WhatsApp Cloud API.

- Reply button `confirmar::<asignacion_id>` → marks assignment as confirmed
- Reply button `rechazar::<asignacion_id>` → removes assignment and alerts coordinator

See [WEBHOOKS.md](./WEBHOOKS.md) for the full event reference.

---

## Assignment Endpoints

### `POST /confirmarServicioAutomatico`

Confirms a waiter assignment and sends a WhatsApp notification.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asignacion_id` | `string` | ✅ | ID of the assignment to confirm |

---

### `POST /sugerirCamarerosInteligente`

Returns an AI-ranked list of available waiters for an event.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pedido_id` | `string` | ✅ | Event/order ID |
| `limite` | `integer` | — | Max suggestions (default: `10`) |

**Scoring factors:** ratings history, declared availability, experience with the
same client, day conflicts, active assignment rules.

---

### `POST /sugerirYNotificarPedido`

Runs the suggestion algorithm and immediately sends WhatsApp invitations.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:** same as `sugerirCamarerosInteligente`.

---

### `POST /autoCrearGrupoChatConfirmado` *(webhook)*

Triggered by a Base44 database event when an assignment transitions to
`estado = "confirmado"`. Creates or reuses a WhatsApp group for the order.

See [WEBHOOKS.md](./WEBHOOKS.md) for the trigger payload format.

---

## Export Endpoints

### `POST /exportarAsignacionesExcel`

Exports all orders and waiter assignments as a structured data payload suitable
for Excel or Google Sheets import.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

No required body fields. Returns an array of rows (first row is the header):

```
Cod. Coordinador | Fecha | Cliente | Evento | Cod. Camarero | Nombre Camarero |
Nº Camarero | Hora Entrada | Hora Salida | Total Horas | Estado | Transporte
```

---

### `POST /exportarAsistenciaSheets`

Exports attendance data for a single order.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`, `camarero`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pedido_id` | `string` | ✅ | Order ID |

---

### `POST /exportarCalendarioEventos`

Generates an iCalendar (`.ics`) feed of scheduled events.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `desde` | `string` (date) | — | Start date. Default: today |
| `hasta` | `string` (date) | — | End date. Default: today + 90 days |

---

## Attendance & QR Endpoints

### `GET /registrarFichajeQR?token=<token>` *(public)*

Returns assignment and event details for the QR token. No authentication required.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | `string` | ✅ | 32-char alphanumeric QR token |

---

### `POST /registrarFichajeQR` *(public)*

Records a waiter's entry or exit time.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | `string` | ✅ | QR token |
| `tipo` | `string` | ✅ | `"entrada"` or `"salida"` |

Returns `409 Conflict` if the same type was already registered.

---

### `POST /generarTokensQR`

Generates unique QR tokens for all confirmed assignments of an order.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pedido_id` | `string` | ✅ | Order ID |

---

### `POST /detectarAusencias`

Detects waiters who should have checked in but have not yet done so.
Scheduled every 30 minutes; can also be triggered manually.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

---

### `POST /enviarHojaAsistenciaGmail`

Sends an HTML attendance sheet via Gmail to a specified recipient.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pedido_id` | `string` | ✅ | Order ID |
| `destinatario` | `string` | ✅ | Recipient email address |

**Environment variables required:** `GMAIL_USER`, `GMAIL_PASS`

---

## Chat Group Endpoints

### `POST /crearGrupoChat`

Manually creates a WhatsApp group for an order and adds all confirmed waiters.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pedido_id` | `string` | ✅ | Order ID |

---

### `POST /verificarYCrearGruposChat`

Scans upcoming confirmed orders and creates any missing WhatsApp groups.
Scheduled daily at 08:00.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

---

### `POST /eliminarGruposExpirados`

Deletes WhatsApp groups for orders whose event date has passed the grace period.
Scheduled daily at 03:00.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dias_gracia` | `integer` | — | Days after event before deletion (default: `7`) |

---

## Report Endpoints

### `POST /enviarParteAutomatico`

Generates and sends a service summary report for a completed order.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pedido_id` | `string` | ✅ | Order ID |

---

### `POST /enviarInformesProgramados`

Sends all periodic reports due today (daily / weekly / monthly).
Scheduled daily at 07:00.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

---

### `POST /procesarEnviosProgramados`

Dispatches queued `EnvioProgramado` records.
Scheduled every 15 minutes.

---

### `POST /notificarAsignacionesProximas`

Sends reminder messages to waiters with assignments today or tomorrow.
Scheduled daily at 09:00.

---

## Document Endpoints

### `POST /generarDocumentacionServicio`

Generates a service documentation PDF for an order.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pedido_id` | `string` | ✅ | Order ID |

---

### `POST /verificarDocumentosExpirados`

Checks waiter document expiration dates and creates coordinator alerts.
Scheduled every Monday at 08:00.

**Auth:** Bearer token | **Roles:** `admin`, `coordinador`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dias_alerta` | `integer` | — | Days before expiration to alert (default: `30`) |

---

## Scheduled Jobs

| Function | Schedule (cron) | Description |
|----------|-----------------|-------------|
| `detectarAusencias` | `*/30 * * * *` | Absence detection |
| `notificarAsignacionesProximas` | `0 9 * * *` | Upcoming assignment reminders |
| `enviarInformesProgramados` | `0 7 * * *` | Periodic reports |
| `procesarEnviosProgramados` | `*/15 * * * *` | Queued send processing |
| `verificarYCrearGruposChat` | `0 8 * * *` | WhatsApp group creation |
| `eliminarGruposExpirados` | `0 3 * * *` | Expired group cleanup |
| `verificarDocumentosExpirados` | `0 8 * * 1` | Document expiration check |

---

## User Endpoints

### `POST /createUser`

Creates a new user account (Supabase Auth + profile row).

**Auth:** Bearer token | **Roles:** `admin`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | ✅ | User email address |
| `password` | `string` | ✅ | Password (min 8 characters) |
| `role` | `string` | ✅ | `admin`, `coordinador`, or `camarero` |
| `name` | `string` | — | Display name |

---

### `GET /getUser`

Returns the authenticated user's profile.

**Auth:** Bearer token | **Roles:** any authenticated user
