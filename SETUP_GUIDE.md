# Setup & Development Guide

## Project Structure

```
src/
├── components/          # Componentes reutilizables
│   ├── ErrorBoundary.jsx
│   ├── ErrorFallback.jsx
│   └── ...otros
├── pages/              # Páginas principales
│   ├── Comunicacion.jsx
│   ├── Chat.jsx
│   └── ...otras
├── hooks/              # Custom hooks
│   ├── useAPI.js       # API requests con AbortController y timeout
│   ├── useErrorHandler.js
│   └── ...otros
├── contexts/           # React Contexts
│   ├── ErrorContext.jsx
│   ├── LoadingContext.jsx
│   └── RoleContext.jsx
├── services/           # API services
├── utils/              # Utilidades
├── tests/              # Test files (src/tests/)
└── config/             # Configuración
tests/
├── flows/              # Integration tests
├── fixtures/           # Test fixtures
└── utils/              # Test utilities
```

## Getting Started

1. Clone el repositorio
2. `npm install`
3. `npm run dev` — Start development server
4. `npx vitest run` — Run tests
5. `npm run build` — Build for production

## Development Workflow

1. Create feature branch
2. Make changes
3. Run tests: `npx vitest run`
4. Run linting: `npx eslint .`
5. Commit with semantic message
6. Push y create PR

## Running Tests

```bash
# Run all tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Watch mode
npx vitest

# Specific test file
npx vitest run src/tests/useAPI.test.js
```

## Performance Tips

- Use React.memo for pure components
- Lazy load routes with React.lazy
- Monitor bundle size
- Use Performance tab in DevTools

## Common Issues

### Infinite Loading

- Check `useAPI` hook timeout (default 30s)
- Verify API endpoint is reachable
- Check network tab in DevTools

### Error Boundary Not Catching

- `ErrorBoundary` only catches render errors, not event handlers
- Use try-catch in event handlers
- Use `useErrorHandler` hook for async errors
