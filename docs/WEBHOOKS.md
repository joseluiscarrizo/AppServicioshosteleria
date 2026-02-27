# Webhook Documentation

AppServicioshosteleria uses two types of webhooks:

1. **WhatsApp Cloud API webhook** — receives incoming messages and delivery
   status updates from Meta.
2. **Base44 database webhooks** — internal triggers fired by the Base44 platform
   when entity records change.

---

## Table of Contents

1. [WhatsApp Cloud API Webhook](#whatsapp-cloud-api-webhook)
   - [Verification handshake](#verification-handshake)
   - [Incoming message events](#incoming-message-events)
   - [Status update events](#status-update-events)
   - [Reply button handling](#reply-button-handling)
   - [Interactive list handling](#interactive-list-handling)
2. [Base44 Database Webhooks](#base44-database-webhooks)
   - [`autoCrearGrupoChatConfirmado`](#autocreargrupochatconfirmado)
3. [Security](#security)
4. [Environment Variables](#environment-variables)

---

## WhatsApp Cloud API Webhook

**Endpoint:** `POST /webhookWhatsAppRespuestas`
**Verification:** `GET /webhookWhatsAppRespuestas`

### Verification handshake

When you register the webhook URL in the Meta Developer Dashboard, Meta sends a
`GET` request with the following query parameters:

| Parameter | Description |
|-----------|-------------|
| `hub.mode` | Always `subscribe` |
| `hub.verify_token` | Must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` env var |
| `hub.challenge` | Random string that the endpoint must echo back |

The function validates the token and returns `hub.challenge` as plain text with
`200 OK`. If the token does not match, it returns `403 Forbidden`.

### Incoming message events

Meta sends a `POST` request for every incoming WhatsApp message. The top-level
payload shape is:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<WABA_ID>",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": { "phone_number_id": "...", "display_phone_number": "..." },
            "messages": [
              {
                "from": "34612345678",
                "id": "wamid.xxx",
                "timestamp": "1699999999",
                "type": "interactive",
                "interactive": {
                  "type": "button_reply",
                  "button_reply": { "id": "confirmar::asig789", "title": "ACEPTO ✅" }
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Status update events

Delivery and read receipts share the same endpoint:

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id": "wamid.xxx",
          "status": "delivered",
          "timestamp": "1699999999",
          "recipient_id": "34612345678"
        }]
      }
    }]
  }]
}
```

Status values: `sent`, `delivered`, `read`, `failed`.

### Reply button handling

When a waiter presses a reply button in the WhatsApp message sent by
`enviarWhatsAppDirecto`, the webhook receives an `interactive.button_reply`
event. The button ID encodes the action and the assignment ID:

| Button ID format | Action |
|------------------|--------|
| `confirmar::<asignacion_id>` | Mark assignment as confirmed; send confirmation message to the waiter |
| `rechazar::<asignacion_id>` | Delete the assignment; notify the coordinator |

**Confirmation flow:**

1. Waiter taps "ACEPTO ✅"
2. Meta sends `POST /webhookWhatsAppRespuestas` with `button_reply.id = "confirmar::asig789"`
3. The function calls `confirmCamareroAssignment(asignacion_id)` from
   `utils/confirmationService.ts`
4. The function sends a confirmation WhatsApp message back to the waiter
5. A `Notificacion` is created for the coordinator

**Rejection flow:**

1. Waiter taps "RECHAZO ❌"
2. Meta sends `POST /webhookWhatsAppRespuestas` with `button_reply.id = "rechazar::asig789"`
3. The function deletes the `AsignacionCamarero` record
4. The function sends a rejection confirmation to the waiter
5. A high-priority `Notificacion` is created for the coordinator

### Interactive list handling

When a customer (or coordinator) interacts with a list message, the
`interactive.list_reply.id` field contains a prefixed action:

| ID prefix | Action |
|-----------|--------|
| `menu::pedido` | Opens the order flow in the conversation |
| `menu::coordinador` | Routes the message to the coordinator |
| `menu::admin` | Routes the message to administration |
| `menu::evento` | Opens the event enquiry flow |

Conversation state is maintained in a server-side `Map` keyed by the sender's
phone number (session lives as long as the function instance). For production
high-availability, persist session state in the database.

---

## Base44 Database Webhooks

Base44 can call a Cloud Function whenever a record is inserted, updated, or
deleted. The payload shape is:

```json
{
  "event": { "type": "insert | update | delete" },
  "data": { /* current record */ },
  "old_data": { /* previous record (update/delete only) */ }
}
```

### `autoCrearGrupoChatConfirmado`

**Trigger:** `AsignacionCamarero` **update** where `estado` changes to `"confirmado"`

**Endpoint:** `POST /autoCrearGrupoChatConfirmado`

**Purpose:** Creates (or reuses) a WhatsApp group for the order and adds the
newly confirmed waiter.

**Payload example:**

```json
{
  "event": { "type": "update" },
  "data": {
    "id": "asig789",
    "estado": "confirmado",
    "pedido_id": "ped456",
    "camarero_id": "cam1",
    "camarero_nombre": "Juan García"
  },
  "old_data": {
    "estado": "pendiente"
  }
}
```

**Behaviour:**

| Condition | Response |
|-----------|----------|
| `event.type !== "update"` | `{ "skipped": true, "reason": "No es cambio a confirmado" }` |
| `data.estado !== "confirmado"` | `{ "skipped": true, "reason": "No es cambio a confirmado" }` |
| `old_data.estado === "confirmado"` | `{ "skipped": true, "reason": "No es cambio a confirmado" }` |
| `pedido_id` missing | `400` error |
| Group already exists for order | Reuses existing group; adds waiter |
| Group does not exist | Creates new group; adds waiter |

---

## Security

### WhatsApp webhook signature verification

Meta signs every `POST` request with an HMAC-SHA256 signature using the app
secret, sent in the `X-Hub-Signature-256` header:

```
X-Hub-Signature-256: sha256=<hex_digest>
```

**Current status:** Signature validation is **not yet implemented**. It is
strongly recommended to add verification before deploying to production:

```typescript
import { createHmac } from 'node:crypto';

function verifySignature(body: string, signature: string, appSecret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');
  return expected === signature;
}
```

### Base44 database webhooks

Base44 internal webhooks are called server-to-server and are not reachable from
the public internet. No additional authentication is required.

---

## Environment Variables

| Variable | Webhook | Description |
|----------|---------|-------------|
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `webhookWhatsAppRespuestas` (GET) | Token checked against `hub.verify_token` |
| `WHATSAPP_API_TOKEN` | `webhookWhatsAppRespuestas` (POST) | Used to send reply messages |
| `WHATSAPP_PHONE_NUMBER` | `webhookWhatsAppRespuestas` (POST) | WhatsApp Business phone number ID |
