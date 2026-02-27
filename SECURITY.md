# Security: Token Lifecycle

This document describes how authentication tokens are managed throughout the application.

## Overview

The application uses bearer tokens (JWT or opaque) issued by the base44 platform. All token lifecycle operations—creation, validation, refresh, and revocation—are handled by dedicated utilities in `src/utils/`.

---

## Token Utilities

| File | Responsibility |
|------|---------------|
| `src/utils/tokenRefresh.ts` | JWT parsing, expiration checks, and proactive token refresh |
| `src/utils/tokenBlacklist.ts` | In-memory revocation list for explicit token invalidation |
| `src/utils/tokenManager.ts` | High-level lifecycle: validation, rotation, metadata extraction, and audit logging |
| `src/hooks/useTokenStatus.ts` | React hook exposing token expiry status to UI components |

---

## Token Lifecycle

### 1. Issuance
Tokens are issued by the base44 authentication service upon successful login. The application stores the token in React state (via `AuthContext`) rather than `localStorage`, limiting XSS exposure.

### 2. Validation
Every token is validated through `validateTokenLifecycle()` which checks:
- **Structure** – must be a non-empty string; JWTs must have three dot-separated segments.
- **Expiration (`exp`)** – token is rejected if `exp` has passed.
- **Revocation** – token is rejected if found in the in-memory blacklist.
- **Issuer (`iss`)** – optional; caller may supply `expectedIssuer` for strict validation.
- **Subject (`sub`)** – optional; caller may supply `expectedSubject` for strict validation.

### 3. Refresh
`AuthContext` runs a background check every **3 minutes**. If the token will expire within **5 minutes** (`shouldRefresh === true`), `refreshTokenIfNeeded()` calls `base44.auth.me()` / `base44.auth.getToken()` to obtain a fresh token.

On success the new token replaces the old one in React state. On failure a warning is logged and the user is prompted to re-authenticate when the token expires.

### 4. Rotation
When a token is refreshed, `rotateToken(oldToken, newToken)` is called which:
1. Adds the old token to the blacklist (reason: `token_rotation`).
2. The new token is stored in React state.

This prevents reuse of old tokens even if they have not yet expired according to their `exp` claim.

### 5. Revocation / Session Invalidation
Call `revokeToken(token, reason?)` to immediately invalidate a specific token. The revocation is tracked in the in-memory blacklist keyed by the token's `jti` claim (or a deterministic hash for tokens without `jti`).

Call `pruneExpiredEntries(maxAgeMs?)` periodically to remove entries older than `maxAgeMs` (default: 24 hours) and prevent unbounded memory growth.

### 6. Expiry Warning
`useTokenStatus()` exposes `isExpiring` (true when < 5 minutes remain) and `minutesRemaining` so UI components can display session-timeout warnings to the user before forced logout.

### 7. Logout / Token Cleanup
`AuthContext.logout()` calls `base44.auth.logout()` which clears the platform-side session. If automatic logout is triggered by token expiry the application revokes the token client-side via the blacklist before clearing state.

---

## Audit Logging
`auditTokenOperation(operation, token)` emits a structured log entry (via `Logger.info`) containing:
- Operation name (e.g. `login`, `refresh`, `logout`)
- `jti`, `sub`, `iss`, `iat`, `exp` claims

This provides an audit trail for token operations in the application logs.

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| XSS token theft | Token stored in React state, not `localStorage` |
| Long-lived token breach impact | 5-minute proactive refresh + token rotation on every refresh |
| Token reuse after refresh | Old token added to blacklist on rotation |
| Session fixation | `rotateToken()` invalidates the old token on every refresh |
| Signature forgery | Tokens are validated server-side by base44; client-side checks are additive |
| Monitoring | Refresh failures logged as warnings; expiry logged as errors |

> **Note:** The blacklist is in-memory and does not survive process restarts. For production deployments requiring persistent revocation (e.g. after a security incident), the blacklist should be backed by a shared store such as Redis or Firestore.
