# Security Guidelines

## Input Validation

- Always validate user input on client AND server
- Sanitize outputs to prevent XSS

## XSS Prevention

- Never use `dangerouslySetInnerHTML` with user content
- Escape user-generated content
- Use Content Security Policy headers

## Secrets Management

- Never commit `.env` files
- Use environment variables for all secrets
- `.env` is in `.gitignore`

## Dependency Security

Run `npm audit` regularly:

```bash
npm audit          # Check for vulnerabilities
npm audit fix      # Auto-fix compatible vulnerabilities
```

## Security Checklist

- [ ] No hardcoded secrets
- [ ] Input validation on all forms
- [ ] Output encoding
- [ ] HTTPS enforced
- [ ] CORS configured
- [ ] Dependency audit clean (`npm audit`)
