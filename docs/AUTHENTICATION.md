# Authentication & RBAC

This document describes how authentication and role-based access control (RBAC)
work in AppServicioshosteleria.

---

## Table of Contents

1. [Authentication Provider](#authentication-provider)
2. [Obtaining a Token](#obtaining-a-token)
3. [Sending Authenticated Requests](#sending-authenticated-requests)
4. [Token Lifecycle](#token-lifecycle)
5. [Roles](#roles)
6. [RBAC Enforcement](#rbac-enforcement)
7. [Public Endpoints](#public-endpoints)
8. [Environment Variables](#environment-variables)

---

## Authentication Provider

The API uses **Base44 Auth** (JWT-based) as the primary authentication provider.
Some legacy functions (`createUser`, `getUser`) also interact with **Supabase Auth**.

---

## Obtaining a Token

### Via Base44 SDK (frontend)

```typescript
import { base44 } from '@base44/sdk';

const session = await base44.auth.signIn({
  email: 'user@empresa.com',
  password: 'SecurePass123!'
});

const token = session.token; // Store securely (e.g. memory, httpOnly cookie)
```

### Via Supabase (legacy `getUser` / `createUser`)

```typescript
const { data } = await supabase.auth.signInWithPassword({
  email: 'user@empresa.com',
  password: 'SecurePass123!'
});
const token = data.session.access_token;
```

---

## Sending Authenticated Requests

Include the token as a Bearer token in every request:

```http
POST /functions/v1/enviarWhatsAppDirecto HTTP/1.1
Host: <project-id>.base44.app
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{ "telefono": "612345678", "mensaje": "Hola!" }
```

Using `fetch`:

```typescript
const response = await fetch('/functions/v1/enviarWhatsAppDirecto', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ telefono: '612345678', mensaje: 'Hola!' })
});
```

---

## Token Lifecycle

| Event | Behaviour |
|-------|-----------|
| Successful sign-in | Session token issued |
| Token expired | API returns `401 Unauthorized` |
| Invalid token | API returns `401 Unauthorized` |
| Sign-out | Token invalidated server-side |

The frontend should catch `401` responses and redirect the user to the login page.

---

## Roles

The platform defines three user roles:

| Role | Description | Typical permissions |
|------|-------------|---------------------|
| `admin` | Platform administrator | Full access to all endpoints and data |
| `coordinador` | Event coordinator | Manage assignments, send messages, export data |
| `camarero` | Waiter / staff member | QR check-in only (via token, not Bearer auth) |

Roles are stored in the `role` field of the user profile entity.

### Role hierarchy

```
admin > coordinador > camarero
```

An `admin` can perform all `coordinador` and `camarero` actions.
A `coordinador` can perform all `camarero` actions.

---

## RBAC Enforcement

Every Cloud Function validates the caller's role using the shared
`validateUserAccess` utility (`utils/rbacValidator.ts`):

```typescript
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';

const user = await base44.auth.me();            // throws if token invalid
validateUserAccess(user, ['admin', 'coordinador']); // throws RBACError if role insufficient
```

`RBACError` is caught at the top level and returned as a JSON error with the
appropriate HTTP status code:

| Validation failure | HTTP status |
|--------------------|-------------|
| No token / invalid token | `401` |
| Token valid but role insufficient | `403` |

### Role requirements by endpoint

| Endpoint | Required roles |
|----------|---------------|
| `enviarWhatsAppDirecto` | `admin`, `coordinador` |
| `enviarWhatsAppMasivo` | `admin`, `coordinador` |
| `confirmarServicioAutomatico` | `admin`, `coordinador` |
| `sugerirCamarerosInteligente` | `admin`, `coordinador` |
| `sugerirYNotificarPedido` | `admin`, `coordinador` |
| `exportarAsignacionesExcel` | `admin`, `coordinador` |
| `exportarAsistenciaSheets` | `admin`, `coordinador`, `camarero` |
| `exportarCalendarioEventos` | `admin`, `coordinador` |
| `generarTokensQR` | `admin`, `coordinador` |
| `detectarAusencias` | `admin`, `coordinador` |
| `enviarHojaAsistenciaGmail` | `admin`, `coordinador` |
| `crearGrupoChat` | `admin`, `coordinador` |
| `verificarYCrearGruposChat` | `admin`, `coordinador` |
| `eliminarGruposExpirados` | `admin`, `coordinador` |
| `enviarParteAutomatico` | `admin`, `coordinador` |
| `enviarInformesProgramados` | `admin`, `coordinador` |
| `procesarEnviosProgramados` | `admin`, `coordinador` |
| `notificarAsignacionesProximas` | `admin`, `coordinador` |
| `generarDocumentacionServicio` | `admin`, `coordinador` |
| `verificarDocumentosExpirados` | `admin`, `coordinador` |
| `createUser` | `admin` |
| `getUser` | any authenticated user |
| `registrarFichajeQR` (GET & POST) | public (QR token) |
| `webhookWhatsAppRespuestas` (GET) | public (Meta handshake) |
| `webhookWhatsAppRespuestas` (POST) | public (WhatsApp Cloud API) |
| `autoCrearGrupoChatConfirmado` | public (Base44 webhook) |

---

## Public Endpoints

The following endpoints do **not** require a Bearer token:

| Endpoint | Method | Authentication mechanism |
|----------|--------|--------------------------|
| `registrarFichajeQR` | GET, POST | QR token query/body parameter |
| `webhookWhatsAppRespuestas` | GET | `hub.verify_token` parameter |
| `webhookWhatsAppRespuestas` | POST | WhatsApp Cloud API signature *(optional — currently not validated)* |
| `autoCrearGrupoChatConfirmado` | POST | Base44 internal webhook (no external access) |

> **Security note:** The WhatsApp webhook endpoint (`POST`) is currently not
> validating the `X-Hub-Signature-256` header. It is strongly recommended to add
> signature verification before deploying to production.

---

## Environment Variables

Cloud Functions read the following environment variables for authentication:

| Variable | Used by | Description |
|----------|---------|-------------|
| `WHATSAPP_API_TOKEN` | `enviarWhatsAppDirecto`, `enviarWhatsAppMasivo`, `webhookWhatsAppRespuestas` | WhatsApp Business API access token |
| `WHATSAPP_PHONE_NUMBER` | WhatsApp functions | WhatsApp Business phone number ID |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `webhookWhatsAppRespuestas` | Token for Meta webhook verification handshake |
| `GMAIL_USER` | `enviarHojaAsistenciaGmail` | Gmail account for sending emails |
| `GMAIL_PASS` | `enviarHojaAsistenciaGmail` | Gmail app password |
| `SUPABASE_URL` | `createUser`, `getUser` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `createUser`, `getUser` | Supabase service role key (keep secret) |
