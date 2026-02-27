# Development Standards — AppServicioshosteleria

## Code Conventions

### Language & Tooling
- **Frontend**: JavaScript (React 18) with JSX. Migrate to TypeScript incrementally — new utility files should use `.ts`/`.tsx`.
- **Cloud Functions**: TypeScript (strict mode).
- **Formatting**: ESLint (`npm run lint`). Fix all errors before committing (`npm run lint:fix`).
- **Node.js**: >= 18 required for local development.

### Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| React components | PascalCase | `AsignacionKanban.jsx` |
| Hooks | camelCase with `use` prefix | `useBackgroundServices.js` |
| Cloud Functions | camelCase | `enviarWhatsAppDirecto.ts` |
| CSS classes | Tailwind utility classes (no custom class names unless necessary) | `flex items-center gap-2` |
| Constants | UPPER_SNAKE_CASE | `MAX_CAMAREROS_PER_TURNO` |
| Variables/functions | camelCase | `pedidoActivo`, `calcularHoras()` |
| Files | camelCase for hooks/utils, PascalCase for components | `utils.js`, `Pedidos.jsx` |

### Date Handling
- Always store dates as `'yyyy-MM-dd'` strings.
- Always parse with `parseISO()` from `date-fns` — never `new Date(string)`.
- Always format with `format()` from `date-fns`.

```js
// ✅ Correct
import { parseISO, format } from 'date-fns';
const date = parseISO(pedido.dia);
const label = format(date, 'dd/MM/yyyy');

// ❌ Incorrect
const date = new Date(pedido.dia); // timezone-sensitive, avoid
```

---

## React Query Conventions

- Query keys must be consistent arrays: `['pedidos']`, `['camareros']`, `['asignaciones', { pedidoId }]`.
- All mutations must include:
  - `onSuccess`: `queryClient.invalidateQueries(...)` + `toast.success(message)`.
  - `onError`: `toast.error(error.message)`.
- Use `staleTime: 5 * 60 * 1000` (5 minutes) for entity queries that don't change frequently.
- Never call `queryClient.clear()` globally — only invalidate specific query keys.

---

## Git Workflow

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code; protected branch |
| `feature/<short-description>` | New features |
| `fix/<short-description>` | Bug fixes |
| `chore/<short-description>` | Maintenance, dependencies, docs |

### Commit Message Format (Semantic Commits)

```
<type>(<scope>): <short description>

[optional body]

[optional footer: CLOSES #issue]
```

Types:

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Build, tooling, dependencies |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |

Examples:
```
feat(asignacion): add bulk assignment from kanban board
fix(whatsapp): retry failed sends after timeout
docs(readme): add links to architecture docs
chore(deps): update date-fns to 3.6.0
```

---

## Code Review Checklist

Before requesting a review, the author verifies:

- [ ] `npm run lint` passes with no errors.
- [ ] `npm test` passes (no regressions).
- [ ] No secrets or API keys in the diff.
- [ ] New Cloud Functions call `validateUserAccess` at entry point.
- [ ] All user inputs validated server-side.
- [ ] React Query keys are consistent with existing convention.
- [ ] Dates use `parseISO` / `format` from `date-fns`.
- [ ] Mutations have `onSuccess` + `onError` handlers.
- [ ] Destructive actions use `AlertDialog` confirmation.
- [ ] PR description explains **what** and **why**, not just how.

Reviewer verifies:
- [ ] Logic is correct and handles edge cases.
- [ ] No duplicate code — reuse existing utils/components.
- [ ] Security checklist items (see [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md)).
- [ ] Documentation updated if public API/behavior changed.

---

## Testing Requirements

- Target: **> 80% coverage** on critical flows (Pedidos, Asignaciones, Confirmación).
- Test framework: **Vitest + Testing Library**.
- Tests live in `tests/` directory.

### Test Structure

```
tests/
├── setup.js              # Global setup, mocks
├── fixtures/             # Shared mock data (JSON)
├── flows/                # Integration tests for user flows
└── utils/                # render helpers, factories
```

### Writing Tests

```jsx
// Use the custom render with providers
import { renderWithProviders } from '../utils/render';

test('creates a pedido', async () => {
  renderWithProviders(<Pedidos />);
  // ...
});
```

- Mock Base44 SDK calls via `tests/utils/mocks.js`.
- Use factory functions from `tests/utils/factories.js` for test data.
- Do not test implementation details — test user-visible behavior.

---

## Performance Benchmarks

| Metric | Target |
|--------|--------|
| Initial page load (LCP) | < 2.5 s on 4G |
| Time to interactive | < 3.5 s |
| React Query cache hit rate | > 70% on repeated navigations |
| Cloud Function cold start | < 2 s |
| Cloud Function p99 latency | < 5 s |

---

## Logging Standards

### Frontend
- Use `console.error` for unexpected errors only.
- Do not log sensitive data (tokens, passwords, personal info).
- User-facing errors go through `toast.error()`.

### Cloud Functions (TypeScript)
```typescript
// Structured logging
console.log(JSON.stringify({
  function: 'enviarWhatsAppDirecto',
  action: 'send',
  camareroId: camarero.id,
  status: 'success',
  timestamp: new Date().toISOString(),
}));

console.error(JSON.stringify({
  function: 'enviarWhatsAppDirecto',
  action: 'send',
  error: error.message,
  timestamp: new Date().toISOString(),
  // Never log: tokens, passwords, full phone numbers
}));
```

---

## Error Handling Patterns

### Cloud Functions
```typescript
export default async function handler(req, user) {
  try {
    validateUserAccess(user, ['coordinador', 'admin']);
    // ... business logic
    return { success: true, data: result };
  } catch (error) {
    console.error(JSON.stringify({ function: 'myFunction', error: error.message }));
    // Return a safe error without internal details
    return { success: false, error: 'An error occurred. Please try again.' };
  }
}
```

### React Mutations
```js
const mutation = useMutation({
  mutationFn: (data) => Pedido.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    toast.success('Pedido creado correctamente');
  },
  onError: (error) => {
    toast.error(error.message || 'Error al crear el pedido');
  },
});
```

---

## Database Query Optimization

- Use `staleTime` in React Query to avoid redundant API calls.
- Filter on the server (Base44 query filters) rather than client-side where possible.
- For list queries, always request only needed fields.
- Use `fecha_pedido` denormalized field on `AsignacionCamarero` for date-range filters instead of joining `Pedidos`.
- Avoid unbounded list queries; always pass a date range or limit.

---

## Related Documents

- [ARCHITECTURE_ROBUST.md](ARCHITECTURE_ROBUST.md) — Architecture overview
- [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md) — Security implementation
- [CLOUD_FUNCTIONS_GUIDE.md](CLOUD_FUNCTIONS_GUIDE.md) — Cloud Functions patterns
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Debugging guide
