# Security Guidelines

## Input Validation
- Valida siempre la entrada del usuario antes de procesarla
- Usa Zod para validación de esquemas cuando sea posible
- Sanitiza los outputs antes de renderizarlos

## XSS Prevention
- Nunca uses `dangerouslySetInnerHTML` con contenido de usuario
- Escapa el contenido generado por usuarios
- Implementa Content Security Policy (CSP) en el servidor

## Secrets Management
- Nunca commitees archivos `.env` con credenciales reales
- Usa variables de entorno para todos los secrets
- Rota los secrets regularmente
- Revisa el `.gitignore` para asegurarte de que `.env` está incluido

## Dependencies
- Ejecuta `npm run audit` regularmente para detectar vulnerabilidades
- Mantén las dependencias actualizadas
- Revisa los cambios de dependencias en los PRs

## Authentication
- Valida siempre el token de sesión en el servidor
- Implementa expiración de sesiones
- Usa HTTPS en producción

## Reporting Vulnerabilities
Si encuentras una vulnerabilidad de seguridad, repórtala de forma responsable contactando al equipo de desarrollo directamente antes de hacerla pública.
