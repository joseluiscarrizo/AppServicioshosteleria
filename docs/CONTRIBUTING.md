# Contributing Guide

Thank you for contributing to **AppServicioshosteleria**! Please read this guide before opening a pull request.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Getting Started

1. Fork the repository and create a feature branch from `main`.
2. Follow the [Setup Guide](SETUP_GUIDE.md) to get your environment running.
3. Run tests before and after your changes: `npm test`.

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<short-description>` | `feature/add-export-pdf` |
| Bug fix | `fix/<short-description>` | `fix/infinite-loading-chat` |
| Refactor | `refactor/<short-description>` | `refactor/useAPI-hook` |
| Docs | `docs/<short-description>` | `docs/setup-guide` |

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add ErrorBoundary with reset capability
fix: prevent infinite loading in Comunicacion page
docs: add ADR for error boundary strategy
test: add useAPI hook tests
```

## Pull Request Checklist

- [ ] Tests added or updated for the changed code
- [ ] `npm test` passes with no new failures
- [ ] `npm run audit` shows no new high/critical vulnerabilities
- [ ] Code follows existing patterns and style
- [ ] Documentation updated if public API changed

## Code Style

- Use existing ESLint configuration (`eslint.config.js`).
- Prefer functional components and hooks over class components (exception: `ErrorBoundary`).
- Keep components small and focused; extract logic into custom hooks.
- Use Tailwind CSS for styling; avoid inline styles.

## Testing

- Place unit tests for components in `src/tests/` or alongside the component.
- Place integration/flow tests in `tests/flows/`.
- Use **vitest** + **@testing-library/react** for all React tests.
- Mock external dependencies (Firebase, Base44) using the utilities in `tests/utils/`.

## Security

- Never commit secrets, API keys, or credentials.
- Run `npm run audit` before submitting a PR that changes dependencies.
- Follow the [Security Guidelines](SECURITY_GUIDELINES.md).
