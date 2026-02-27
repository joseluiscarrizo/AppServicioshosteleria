# Deployment Security — AppServicioshosteleria

## Pre-Deployment Checklist

### Code & Build
- [ ] All tests pass (`npm test`).
- [ ] Lint passes with no errors (`npm run lint`).
- [ ] Build succeeds locally (`npm run build`).
- [ ] No secrets committed to source control (`git log --oneline` + manual review).
- [ ] `npm audit` shows no high/critical vulnerabilities.
- [ ] `.env.local` is git-ignored (not in repository).

### Configuration
- [ ] `requiresAuth: true` set in `src/api/base44Client.js`.
- [ ] All required environment variables configured in Firebase/Base44 dashboard.
- [ ] Base44 entity access rules reviewed and locked down.
- [ ] Cloud Function roles validated (no open endpoints without auth).

### Infrastructure
- [ ] Firebase Hosting HTTPS enforced.
- [ ] CORS origins configured to allowed domains only.
- [ ] Rate limiting enabled on Cloud Functions (see rate limiting section below).

---

## Environment Variable Setup

### Local Development

Create `.env.local` in the project root (this file is git-ignored):

```env
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_BACKEND_URL=https://your-backend.base44.com
```

### Production (Firebase Hosting)

Set environment variables through the Base44 dashboard or Firebase Functions config. **Never** set production secrets in `.env` files committed to source control.

### Required Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_BASE44_APP_ID` | Base44 Application ID | Base44 Dashboard → Settings → API Keys |
| `VITE_BASE44_BACKEND_URL` | Base44 backend URL | Base44 Dashboard → Settings → API Keys |

---

## Secrets Management

### Rules
- Secrets live only in environment variables or secret management services.
- Rotate secrets immediately if accidentally committed.
- Use `.env.example` (committed) to document required variables without values.
- Use `.env.local` (git-ignored) for local values.

### If a Secret is Accidentally Committed
1. **Immediately** revoke the exposed key from the service dashboard.
2. Generate a new key.
3. Update the environment variable in production.
4. Use `git filter-branch` or BFG Repo Cleaner to purge the secret from git history.
5. Force-push the cleaned history (coordinate with team).
6. Notify affected parties and document the incident.

---

## Database Backup Strategy

Base44 BaaS handles database backups as part of the managed service. Additional recommendations:

- Export critical data (Pedidos, Camareros, AsignacionCamarero) weekly using `exportarAsignacionesExcel` Cloud Function.
- Store exports in a secure location outside the application.
- Test restore procedures quarterly.
- Document the last successful restore test date.

---

## SSL/TLS Configuration

- Firebase Hosting automatically provisions and renews SSL certificates.
- All API calls to Base44 use HTTPS (enforced by the SDK).
- External services (WhatsApp API, Google Sheets API, Gmail API) use HTTPS.
- Do not disable SSL verification in any API client, even for development.

---

## Rate Limiting

### Application-Level Rate Limiting

Cloud Functions implement internal throttling for external API calls:

- **WhatsApp bulk sends**: `enviarWhatsAppMasivo` includes delays between messages to stay within API rate limits.
- **Background polling**: `useBackgroundServices` uses conservative intervals (5–15 minutes) to avoid triggering rate limits.
- **Scheduled sends**: `procesarEnviosProgramados` tracks `estado: 'enviado'` to prevent duplicate sends.

### Infrastructure-Level Rate Limiting

- Base44 BaaS enforces request rate limits at the API Gateway level.
- Firebase Hosting CDN provides basic DDoS protection for static assets.

---

## DDoS Protection

- Firebase Hosting CDN absorbs static asset traffic.
- Base44 BaaS API Gateway rate-limits authenticated requests.
- Public endpoints (e.g., `/ConfirmarServicio`) validate one-time tokens to prevent enumeration.
- Do not expose direct database connection strings or admin credentials.

---

## Deployment Steps (Manual)

```bash
# 1. Build the production bundle
npm run build

# 2. Deploy to Firebase Hosting
firebase deploy --only hosting

# 3. Verify deployment
# Open https://servicios-hosteleros-app.web.app and confirm the app loads
# Check the browser console for errors
# Test the login flow

# 4. Smoke test key flows
# - Create a test Pedido
# - Assign a Camarero
# - Confirm the WhatsApp notification is queued (if enabled)
```

---

## Rollback Procedure

Firebase Hosting maintains deployment history. To rollback:

```bash
# List recent releases
firebase hosting:releases:list

# Rollback to the previous release
firebase hosting:rollback
```

For Cloud Function rollbacks, redeploy the previous version from source control.

---

## Incident Response Plan

### Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| P1 — Critical | Data breach, complete outage | Immediate (< 1 hour) |
| P2 — High | Partial outage, security vulnerability | < 4 hours |
| P3 — Medium | Degraded performance, non-critical bug | < 24 hours |
| P4 — Low | Minor issue, cosmetic bug | Next sprint |

### P1 Response Steps

1. **Contain** — Disable affected Cloud Function or revoke compromised credentials.
2. **Assess** — Determine scope: what data was affected, which users.
3. **Notify** — Alert the repository owner and affected users.
4. **Remediate** — Deploy fix or rollback to last known good state.
5. **Review** — Post-incident review within 48 hours; document findings.

### Contacts

- Repository owner: [@joseluiscarrizo](https://github.com/joseluiscarrizo)
- Base44 support: Base44 dashboard support channel
- Firebase support: https://firebase.google.com/support

---

## Related Documents

- [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md) — Security implementation guide
- [ARCHITECTURE_ROBUST.md](ARCHITECTURE_ROBUST.md) — Architecture overview
