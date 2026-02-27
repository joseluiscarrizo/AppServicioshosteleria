# ADR-001: Saga Pattern for Distributed Transactions

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

The core workflow of AppServicioshosteleria involves a sequence of operations that span multiple systems:

1. Create `AsignacionCamarero` record in the database.
2. Send a WhatsApp notification to the camarero.
3. Update `EnviosProgramado` status.
4. Write an audit log entry.

These steps involve external APIs (WhatsApp) that can fail independently of the database. A traditional ACID transaction cannot span a database write and a third-party API call.

Without a strategy for partial failures:
- A successful database write followed by a failed WhatsApp send leaves the system in an inconsistent state.
- The coordinator may believe the camarero was notified when they were not.
- Retry logic without idempotency guarantees can cause duplicate sends.

---

## Decision

Implement the **Saga pattern** (choreography-based) for multi-step operations:

1. Each step writes its result to the database before proceeding to the next.
2. If a step fails, a **compensating action** is taken to undo or flag the previous steps.
3. All steps are **idempotent** — safe to retry without side effects.

### Implementation

```typescript
// Cloud Function: coordinated assignment + notification
export default async function handler(req, user) {
  validateUserAccess(user, ['coordinador', 'admin']);
  const { pedidoId, camareroId } = validateInput(req.data);

  // Step 1: Create assignment (compensable)
  const asignacion = await AsignacionCamarero.create({
    pedido_id: pedidoId,
    camarero_id: camareroId,
    estado: 'pendiente',  // Not 'confirmado' yet
  });

  // Step 2: Send WhatsApp (may fail)
  try {
    await sendWhatsApp(camarero.telefono, buildMessage(pedido, camarero));
    // Step 3: Mark as notified (compensating write on success)
    await AsignacionCamarero.update(asignacion.id, { estado: 'notificado' });
    await writeAuditLog({ action: 'assigned_and_notified', ... });
  } catch (whatsappError) {
    // Compensating action: mark assignment as error (not delete)
    await AsignacionCamarero.update(asignacion.id, { estado: 'error_notificacion' });
    await writeAuditLog({ action: 'notification_failed', error: whatsappError.message, ... });
    // Return partial success so coordinator can retry notification
    return { success: true, notified: false, asignacionId: asignacion.id };
  }

  return { success: true, notified: true, asignacionId: asignacion.id };
}
```

### Idempotency
- `procesarEnviosProgramados` checks `estado: 'pendiente'` before sending — already-sent records are skipped.
- All write operations use entity IDs to prevent duplicate records.

---

## Consequences

**Positive**:
- System remains in a consistent, queryable state even after partial failures.
- Coordinators can see which assignments failed notification and retry.
- No silent data loss.

**Negative**:
- More complex Cloud Function code than a simple sequential call.
- Requires careful state machine design for `AsignacionCamarero.estado`.
- Eventual consistency — the coordinator may see `estado: 'error_notificacion'` briefly.

---

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Two-phase commit | Not possible across Base44 DB + WhatsApp API |
| Fire-and-forget (ignore WhatsApp failures) | Silent failures unacceptable for operational reliability |
| Sync retry in same request | WhatsApp API timeouts would block the user |
