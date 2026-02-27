# Contributing to AppServicioshosteleria

Thank you for your interest in contributing! This document explains how to set up your local development environment, submit changes, and follow the project's standards.

---

## Local Development Setup

### Prerequisites

- **Node.js >= 18** (required for ESLint 10.x and Vitest)
- **npm >= 9**
- A Base44 account with access to the AppServicioshosteleria project
- Firebase CLI (for deployment only): `npm install -g firebase-tools`

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/joseluiscarrizo/AppServicioshosteleria.git
cd AppServicioshosteleria

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Base44 App ID and backend URL
# (Get these from Base44 Dashboard → Settings → API Keys)

# 4. Start the development server
npm run dev
# App available at http://localhost:5173
```

---

## Project Structure

```
src/
├── api/base44Client.js        # Base44 SDK client
├── components/                # Reusable UI components (grouped by domain)
├── hooks/                     # Custom React hooks
├── pages/                     # Page-level components
└── utils.js                   # Shared utilities

functions/                     # Cloud Functions (TypeScript)
tests/                         # Vitest test suite
docs/                          # Architecture and developer documentation
```

---

## Development Workflow

### 1. Create a Branch

Follow the branch naming convention:

```bash
git checkout -b feature/add-bulk-assignment
git checkout -b fix/whatsapp-retry-logic
git checkout -b chore/update-date-fns
git checkout -b docs/improve-readme
```

### 2. Make Changes

- Follow the [Development Standards](docs/DEVELOPMENT_STANDARDS.md).
- Run lint and tests as you work:

```bash
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors
npm test              # Run test suite
```

### 3. Commit

Use semantic commit messages:

```
feat(asignacion): add bulk assignment from kanban board
fix(whatsapp): retry failed sends after timeout
docs(readme): add links to architecture docs
chore(deps): update date-fns to 3.6.0
```

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`

### 4. Open a Pull Request

- PR title should match the commit message format.
- PR description should explain **what** changed and **why**.
- Link to the related issue if applicable.
- Ensure all CI checks pass before requesting review.

---

## Code Review Process

1. All PRs require at least one review from the repository owner.
2. The author completes the [PR checklist](#pr-checklist) before requesting review.
3. Reviewers should provide actionable, constructive feedback.
4. Address all requested changes or explain why you disagree.
5. PRs are merged with "Squash and merge" to keep history clean.

---

## PR Checklist

Before marking a PR as "Ready for Review":

- [ ] `npm run lint` passes with no errors.
- [ ] `npm test` passes (no regressions).
- [ ] No secrets or API keys in the diff.
- [ ] New Cloud Functions call `validateUserAccess` at entry point.
- [ ] All user inputs validated server-side.
- [ ] React Query keys follow the [normalization strategy](docs/ADR/ADR-002-Query-Normalization-Strategy.md).
- [ ] Mutations have `onSuccess` + `onError` handlers with `toast`.
- [ ] Destructive actions use `AlertDialog` confirmation.
- [ ] Dates use `parseISO` / `format` from `date-fns`.
- [ ] PR description explains what and why.

---

## Code Standards Summary

For full details, see [DEVELOPMENT_STANDARDS.md](docs/DEVELOPMENT_STANDARDS.md).

- **Dates**: Always `parseISO()` + `format()` from `date-fns`. Never `new Date(string)`.
- **React Query keys**: `['entityName']`, `['entityName', { filter }]`, `['entityName', id]`.
- **Mutations**: Always include `onSuccess` (invalidate + toast) and `onError` (toast).
- **Cloud Functions**: Validate auth, validate input, try/catch, structured logs, audit log.
- **Error messages**: Never expose internal details; use human-readable messages.
- **Secrets**: Environment variables only; never in source code.

---

## Testing

```bash
# Run all tests once
npm test

# Watch mode
npx vitest

# Coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

- Tests live in `tests/`.
- Use `tests/utils/render.jsx` for components (includes BrowserRouter + QueryClient).
- Use `tests/utils/factories.js` for test data.
- Target > 80% coverage on critical flows.

---

## Getting Help

- Open a GitHub issue for bugs or feature requests.
- Review the [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for common issues.
- Check the [Architecture Documentation](docs/ARCHITECTURE_ROBUST.md) for design context.

---

## Security

If you discover a security vulnerability, please **do not** open a public issue. Contact the repository owner directly via GitHub. See [SECURITY_GUIDELINES.md](docs/SECURITY_GUIDELINES.md) for security policies.
