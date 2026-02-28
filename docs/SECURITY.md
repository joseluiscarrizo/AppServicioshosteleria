# Security Policy

## Supported versions

Only the latest release on the `main` branch receives security fixes.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Send a private report to the maintainer via GitHub's [security advisory](https://github.com/joseluiscarrizo/AppServicioshosteleria/security/advisories/new) feature.

Include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You can expect an acknowledgement within **72 hours** and a patch within **14 days** for critical issues.

## Security practices in this project

### Authentication
- Firebase Authentication is used for all user sessions.
- Role-based access control (RBAC) is enforced server-side via Firebase custom claims and client-side via `RoleBasedRoute`.

### Input validation
- All user-supplied input is validated and sanitised before use (`utils/htmlSanitizer.ts`, `utils/validators.ts`).
- PDF generation uses jsPDF ≥ 4.2.0 to avoid known injection vulnerabilities.

### Dependencies
- Dependencies are kept up-to-date and checked against the GitHub Advisory Database.
- Run `npm audit` regularly and address high/critical advisories before each release.

### Secrets
- No secrets are committed to the repository.
- Use environment variables (`.env.local`) for all credentials; the file is listed in `.gitignore`.

### Least privilege
- Firebase security rules restrict read/write access to authenticated users with the appropriate role.
- Cloud Functions validate caller identity before performing privileged operations.
