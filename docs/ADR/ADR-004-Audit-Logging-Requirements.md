# ADR-004: Audit Logging Requirements

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

The application manages sensitive operational data: worker assignments, communication records, and event coordination. For operational integrity and compliance:

- Coordinators need to know who made changes and when.
- In case of a dispute (e.g., "I was never notified"), there must be a record.
- Security incidents require an audit trail to determine what happened.
- Regulatory requirements for labor coordination may require records of assignment decisions.

Without audit logging:
- No accountability for data changes.
- Impossible to investigate incidents.
- No evidence of compliance.

---

## Decision

Every mutating Cloud Function must write an audit log entry after successful execution.

### Audit Log Entity Schema

```typescript
interface AuditLog {
  id: string;              // Auto-generated
  timestamp: string;       // ISO 8601: '2026-02-27T16:21:00Z'
  actorId: string;         // User ID who triggered the action
  actorRole: string;       // Role at time of action
  action: string;          // Verb describing what happened
  entityType: string;      // Entity type affected
  entityId: string;        // ID of the affected record
  details?: string;        // Optional JSON string with safe additional context
}
```

### Required Audit Events

| Action | Trigger |
|--------|---------|
| `pedido_created` | New pedido created |
| `pedido_updated` | Pedido fields modified |
| `pedido_deleted` | Pedido deleted |
| `camarero_assigned` | AsignacionCamarero created |
| `camarero_unassigned` | AsignacionCamarero deleted |
| `whatsapp_sent` | WhatsApp message sent successfully |
| `whatsapp_failed` | WhatsApp message failed to send |
| `service_confirmed` | Camarero confirmed via `/ConfirmarServicio` |
| `service_rejected` | Camarero rejected via `/ConfirmarServicio` |
| `document_exported` | Excel/Sheets/PDF export generated |

### Implementation Pattern

```typescript
async function writeAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    await AuditLog.create({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  } catch (auditError) {
    // Audit log failure should not fail the primary operation
    // but must be logged for investigation
    console.error(JSON.stringify({
      function: 'writeAuditLog',
      error: auditError instanceof Error ? auditError.message : 'audit log write failed',
      originalEntry: entry,
      timestamp: new Date().toISOString(),
    }));
  }
}

// Usage in a Cloud Function:
await writeAuditLog({
  actorId: user.id,
  actorRole: user.role,
  action: 'camarero_assigned',
  entityType: 'AsignacionCamarero',
  entityId: asignacion.id,
  details: JSON.stringify({ pedidoId, camareroId }),
});
```

### Data Retention
- Audit logs are retained indefinitely in the database by default.
- For GDPR compliance: personal identifiers in `details` should be minimized (use IDs, not names/phones).
- Records may be anonymized (not deleted) when a camarero account is removed.

### Access Control
- Audit logs are readable by `admin` role only.
- Audit logs are never writable or deletable by any application user (Base44 entity rule: write = system only).

---

## Consequences

**Positive**:
- Complete accountability for all operational decisions.
- Supports incident investigation.
- Demonstrates compliance readiness.
- Enables coordinator-facing history views in the future.

**Negative**:
- Additional database writes on every mutation (minor performance cost).
- Audit log write failures must not fail primary operations (requires careful error handling).
- Increased storage over time (mitigated by retention policies).

---

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Console logs only | Not queryable; lost after function instance ends |
| Application-level event bus | Over-engineering; no existing message bus infrastructure |
| No audit logging | Unacceptable for operational and compliance reasons |
