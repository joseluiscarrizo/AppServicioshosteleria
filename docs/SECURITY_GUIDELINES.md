# Security Guidelines

## Dependency Management

- Run `npm audit` regularly and after every `npm install`.
- Fix high and critical vulnerabilities before merging: `npm audit fix`.
- Pin major versions for critical dependencies in `package.json` (e.g., `"jspdf": "^4.2.0"`).
- Review the [GitHub Advisory Database](https://github.com/advisories) for known issues in dependencies.

## Environment Variables & Secrets

- **Never commit** `.env` files with real credentials.
- Keep `.env.example` up to date with placeholder values only.
- Rotate any credentials that are accidentally committed immediately.
- Use GitHub Secrets for CI/CD pipelines.

## Input Validation

- Sanitize all user-supplied data before rendering it in the DOM.
- Avoid `dangerouslySetInnerHTML`; if required, sanitize with a trusted library.
- Validate data received from external APIs before using it in state.

## Authentication & Authorization

- All protected routes must use `RoleBasedRoute` with the correct `requiredRoles`.
- Never trust client-side role checks alone; enforce permissions on the backend (Firebase Rules / Cloud Functions).
- Session tokens are managed by Firebase Auth; do not store them manually in `localStorage`.

## Error Handling

- Use the `ErrorBoundary` component to prevent full app crashes.
- Use `useErrorHandler` to log errors to a monitoring service (e.g., Sentry) in production.
- Do not expose internal stack traces to users in production (`NODE_ENV !== 'development'`).

## API Security

- Use HTTPS for all external API calls.
- Set request timeouts (see `useAPI` hook defaults: 30 s) to prevent denial-of-service via hanging requests.
- Validate HTTP response status codes before processing response bodies.

## Reporting Vulnerabilities

Please do **not** open a public issue for security vulnerabilities. Instead, email the maintainer directly with details of the vulnerability and steps to reproduce it. You will receive a response within 72 hours.
