# Security Guidelines — AppServicioshosteleria

## Principles

1. **Defense in depth** — multiple independent security layers; no single point of failure.
2. **Least privilege** — each role receives only the permissions required for its function.
3. **Fail secure** — on error, deny access; never silently grant access.
4. **Trust no client** — all business rules and access checks enforced server-side in Cloud Functions.
5. **Audit everything** — every mutating operation is logged with actor, timestamp, and entity ID.

---

## Input Validation Checklist

All user input must pass these checks before any database write:

- [ ] Type check — correct data type (string, number, date).
- [ ] Length limit — strings max 1 000 characters unless otherwise specified.
- [ ] Format check — dates in `yyyy-MM-dd`, phone numbers with country code.
- [ ] Whitelist characters — reject unexpected special characters where applicable.
- [ ] Required fields — presence validated before processing.
- [ ] Server-side only — never rely solely on client-side validation.

Example (Cloud Function):

```typescript
function validatePedidoInput(data: unknown): asserts data is PedidoInput {
  if (!data || typeof data !== 'object') throw new Error('Invalid input');
  const d = data as Record<string, unknown>;
  if (typeof d.cliente !== 'string' || d.cliente.length === 0) throw new Error('cliente required');
  if (typeof d.lugar_evento !== 'string' || d.lugar_evento.length > 1000) throw new Error('lugar_evento invalid');
  if (typeof d.dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.dia)) throw new Error('dia must be yyyy-MM-dd');
}
```

---

## RBAC Implementation

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | System administrator | Full access |
| `coordinador` | Event coordinator | Create/edit/delete pedidos, assign camareros, view all |
| `camarero` | Waiter | View own assignments, confirm/reject services |
| `public` | Unauthenticated | Confirm service via token URL only |

### Enforcement in Cloud Functions

```typescript
function validateUserAccess(user: User, allowedRoles: string[]): void {
  if (!user || !user.role) throw new Error('Unauthorized: no user session');
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: role '${user.role}' cannot perform this action`);
  }
}

// Usage at the top of every Cloud Function:
export default async function handler(req, user) {
  validateUserAccess(user, ['coordinador', 'admin']);
  // ... business logic
}
```

### Rules
- Always check role **in the Cloud Function**, not only in Base44 entity rules.
- Never expose internal IDs, stack traces, or database details in error responses.
- Public endpoints (e.g., `/ConfirmarServicio`) must validate the one-time token before any read.

---

## Data Protection

### Data at Rest
- Base44 BaaS handles database encryption at rest (managed service).
- Sensitive fields (e.g., phone numbers, email addresses) are stored only where operationally required.
- Do not store passwords in application entities; delegate authentication entirely to Base44 Auth.

### Data in Transit
- All communication with Base44 APIs uses TLS (HTTPS).
- Firebase Hosting enforces HTTPS; HTTP requests are redirected.
- WhatsApp API calls use HTTPS with API key authentication.

### Log Redaction
Logs **must never** contain:
- Passwords or PIN codes
- Full API tokens or secret keys
- Full credit card numbers
- Personal data beyond what is strictly needed for debugging

Redact before logging:
```typescript
console.log('Sending WhatsApp to', phone.slice(0, -4) + '****');
```

---

## OWASP Top 10 Mitigations

| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | RBAC in Cloud Functions, Base44 entity rules |
| A02 Cryptographic Failures | TLS in transit, Base44 managed encryption at rest |
| A03 Injection | No raw SQL — Base44 ORM handles queries; validate all inputs |
| A04 Insecure Design | Security review in PR checklist; ADR for security decisions |
| A05 Security Misconfiguration | Environment variables for all secrets; `.env.example` documented |
| A06 Vulnerable Components | `npm audit` in CI; dependency updates tracked |
| A07 Auth & Session Failures | Base44 Auth with `requiresAuth: true`; token expiry handled by SDK |
| A08 Software & Data Integrity | CI/CD pipeline validates builds before deploy |
| A09 Logging & Monitoring Failures | Audit log entity; structured logging in Cloud Functions |
| A10 SSRF | No user-controlled URLs in server-side requests |

---

## API Authentication Flow

```
1. User opens app
   └→ Base44 SDK checks session token in localStorage
      ├→ Valid token: proceed to app (requiresAuth: true enforced)
      └→ No/expired token: redirect to Base44 login page

2. Authenticated request
   └→ Base44 SDK injects Authorization header automatically
      └→ API Gateway validates token
         └→ Cloud Function receives validated `user` object
            └→ Cloud Function calls validateUserAccess(user, roles)
```

---

## Secrets Management

- All secrets must be in environment variables, never hardcoded.
- For local development: use `.env.local` (git-ignored).
- For production: configure via Firebase / Base44 dashboard environment settings.
- Rotate keys immediately if accidentally committed.

Required environment variables:

```env
VITE_BASE44_APP_ID=         # Base44 Application ID
VITE_BASE44_BACKEND_URL=    # Base44 backend URL
```

See [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md) for full secrets checklist.

---

## Key Rotation Procedures

1. Generate new key in the relevant service dashboard (Base44, WhatsApp, Google).
2. Update the environment variable in the Firebase / Base44 dashboard.
3. Deploy the updated configuration.
4. Verify the app functions correctly with the new key.
5. Revoke the old key.
6. Record the rotation in the audit log with date and actor.

**Never** update a key directly in source code. If a key is found in source code, treat it as compromised and rotate immediately.

---

## Security Review Checklist (per PR)

- [ ] No secrets or API keys added to source code.
- [ ] New Cloud Functions call `validateUserAccess` at entry point.
- [ ] All user inputs validated server-side.
- [ ] Error responses do not expose internal details.
- [ ] New entities have access rules defined in Base44 dashboard.
- [ ] Sensitive data is not logged.
- [ ] Dependencies reviewed for known vulnerabilities.
