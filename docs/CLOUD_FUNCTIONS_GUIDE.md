# Cloud Functions Guide — AppServicioshosteleria

Base44 Cloud Functions are serverless TypeScript functions (running on Deno) that execute business logic, integrate with external services, and enforce security rules.

---

## Function Inventory

| Function | Purpose |
|----------|---------|
| `sugerirCamarerosInteligente` | AI-powered camarero ranking for assignments |
| `notificarAsignacionesProximas` | Push notifications to coordinators |
| `enviarWhatsAppDirecto` | Send WhatsApp message to one camarero |
| `enviarWhatsAppMasivo` | Bulk WhatsApp to multiple camareros |
| `exportarAsignacionesExcel` | Export assignments to Excel |
| `exportarAsistenciaSheets` | Sync attendance to Google Sheets |
| `enviarHojaAsistenciaGmail` | Send attendance sheet by email |
| `verificarDocumentosExpirados` | Alert on expired documentation |
| `procesarEnviosProgramados` | Process scheduled WhatsApp sends |
| `confirmarServicioAutomatico` | Auto-confirm services by token |
| `autoCrearGrupoChatConfirmado` | Create chat groups for confirmed services |
| `eliminarGruposExpirados` | Clean up inactive chat groups |
| `generarDocumentacionServicio` | Generate service documents |

---

## Secure Function Pattern

Every Cloud Function must follow this structure:

```typescript
import { validateUserAccess } from '../utils/auth';

interface MyFunctionInput {
  // Define the expected input shape
  pedidoId: string;
}

export default async function handler(
  req: { data: unknown },
  user: { id: string; role: string } | null
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // 1. Authenticate
    validateUserAccess(user, ['coordinador', 'admin']);

    // 2. Validate input
    const input = validateInput(req.data);

    // 3. Business logic
    const result = await doWork(input, user);

    // 4. Audit log
    await writeAuditLog({ action: 'my_function', actorId: user.id, entityId: input.pedidoId });

    // 5. Return safe response
    return { success: true, data: result };

  } catch (error) {
    console.error(JSON.stringify({
      function: 'myFunction',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }));
    // Never expose internal error details to the client
    return { success: false, error: 'Error processing request. Please try again.' };
  }
}

function validateInput(data: unknown): MyFunctionInput {
  if (!data || typeof data !== 'object') throw new Error('Invalid input');
  const d = data as Record<string, unknown>;
  if (typeof d.pedidoId !== 'string' || !d.pedidoId) throw new Error('pedidoId required');
  return { pedidoId: d.pedidoId };
}
```

---

## Error Handling in Functions

### Rules
- Catch all errors at the function's top level.
- Log the error with structured JSON (function name, error message, timestamp).
- Never log secrets, tokens, full phone numbers, or passwords.
- Return a generic, user-safe error message to the client.
- Do not let unhandled exceptions crash the function silently.

### Retry-Safe Operations
Functions called by the scheduler (`procesarEnviosProgramados`) must be **idempotent**:
- Check if the operation has already been performed (e.g., `estado: 'enviado'`) before executing.
- Use unique IDs or state flags to prevent duplicate sends/writes.

---

## Logging in Serverless (Deno)

Use structured JSON logging to enable log filtering in the Base44 dashboard:

```typescript
// Success
console.log(JSON.stringify({
  function: 'enviarWhatsAppDirecto',
  event: 'message_sent',
  camareroId: camarero.id,
  pedidoId: pedido.id,
  timestamp: new Date().toISOString(),
}));

// Error
console.error(JSON.stringify({
  function: 'enviarWhatsAppDirecto',
  event: 'message_failed',
  error: error.message,
  camareroId: camarero.id,
  timestamp: new Date().toISOString(),
}));
```

**Never log**: `user.token`, API keys, passwords, full phone numbers, or any PII beyond the minimum needed for debugging.

---

## Testing Cloud Functions

Since Cloud Functions run on Base44's Deno runtime, they cannot be directly imported in Vitest (Node.js). Use the following strategy:

### Unit Test Business Logic
Extract pure functions from Cloud Functions and test them independently:

```typescript
// functions/utils/assignmentLogic.ts (pure, no I/O)
export function rankCamareros(camareros: Camarero[], pedido: Pedido): Camarero[] {
  // Pure ranking logic
}

// tests/utils/assignmentLogic.test.ts
import { rankCamareros } from '../../functions/utils/assignmentLogic';
test('ranks camareros by availability', () => {
  // ...
});
```

### Integration Testing
Use the Base44 dashboard's Cloud Function test runner for end-to-end testing with real data. Always use a test/staging environment, never production.

### Manual Verification Checklist
- [ ] Function returns `{ success: true, data: ... }` on valid input.
- [ ] Function returns `{ success: false, error: 'safe message' }` on invalid input.
- [ ] Function rejects calls from unauthorized roles.
- [ ] Audit log record is created on success.
- [ ] No secrets appear in logs.

---

## Monitoring & Alerting

- Cloud Function logs are available in the Base44 dashboard under the function's log tab.
- Set up alerts for repeated `console.error` entries (Base44 dashboard → Monitoring).
- Monitor `procesarEnviosProgramados` for consecutive failures (indicates WhatsApp API issues).
- Track function execution times; investigate any function exceeding 10 seconds.

---

## Cold Start Optimization

Base44 serverless functions may experience cold starts. To minimize impact:

- Keep function dependencies minimal (import only what is needed).
- Avoid heavy initialization at the module top level; defer until first request.
- Use connection pooling if applicable.
- Cache reusable data within the function scope (not globally, as instances do not share state).

---

## Base44 SDK Best Practices

```typescript
// Use typed entity imports
import { Pedido, Camarero, AsignacionCamarero } from '../entities';

// Always await async calls
const pedidos = await Pedido.filter({ estado_evento: 'pendiente' });

// Use filter on server, not client
// ✅ Correct
const upcoming = await AsignacionCamarero.filter({ fecha_pedido: today });

// ❌ Incorrect (loads all records and filters client-side)
const all = await AsignacionCamarero.list();
const upcoming = all.filter(a => a.fecha_pedido === today);
```

---

## Related Documents

- [ARCHITECTURE_ROBUST.md](ARCHITECTURE_ROBUST.md) — Overall architecture
- [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md) — Security and RBAC
- [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) — Coding standards
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Debugging issues
