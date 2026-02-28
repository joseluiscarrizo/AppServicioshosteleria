# Contributing Guidelines

## Code Style
- Usa Prettier para formatear el código
- Sigue las reglas de ESLint configuradas en `eslint.config.js`
- Usa TypeScript cuando sea posible para nuevos módulos

## Testing
- Escribe tests para todas las nuevas funcionalidades
- Mantén una cobertura de tests del 80%+
- Ejecuta los tests antes de hacer commit: `npm test`

## Commits
- Usa mensajes de commit descriptivos en español o inglés
- Referencia los issues relacionados: `fix: resolver infinite loading (#123)`
- Sigue el formato: `tipo: descripción corta`
  - `feat`: nueva funcionalidad
  - `fix`: corrección de bug
  - `docs`: cambios en documentación
  - `refactor`: refactoring sin cambio funcional
  - `test`: añadir o corregir tests

## Pull Requests
- Crea PRs pequeños y enfocados en un solo cambio
- Describe claramente qué problema resuelve y cómo
- Incluye capturas de pantalla si hay cambios visuales
- Asegúrate de que todos los tests pasen antes de solicitar review

## Error Handling
- Usa el componente `ErrorBoundary` para envolver secciones críticas
- Usa el hook `useErrorHandler` para logging centralizado de errores
- Nunca silencies errores sin registrarlos

## API Requests
- Usa el hook `useAPI` para requests HTTP
- Siempre implementa timeout y manejo de errores de red
- Cancela requests al desmontar componentes usando AbortController
