# Contributing to AppServicioshosteleria

Thank you for your interest in contributing! Please read the following guidelines before submitting a pull request.

## Branch naming

Use descriptive, lowercase branch names:

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add PDF export for shift reports
fix: prevent infinite loading in chat window
docs: add SETUP guide
```

## Pull request checklist

- [ ] Code compiles without errors (`npm run build`)
- [ ] All existing tests pass (`npm test`)
- [ ] New behaviour is covered by tests
- [ ] ESLint reports no new warnings (`npx eslint .`)
- [ ] Relevant documentation is updated

## Code style

- React components use functional style with hooks; class components only for `ErrorBoundary`.
- Use Tailwind CSS utility classes for styling.
- Keep components small and single-purpose.
- Prefer named exports for hooks and utilities, default export for components.

## Testing

Write tests under `tests/` following the existing structure:

| Folder | Purpose |
|--------|---------|
| `tests/flows/` | Integration tests for full user flows |
| `tests/components/` | Unit tests for individual components and hooks |
| `tests/utils/` | Shared test helpers, factories, and mocks |

Run the suite with `npm test` before submitting.

## Reporting issues

Open a GitHub issue and include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser/Node version
