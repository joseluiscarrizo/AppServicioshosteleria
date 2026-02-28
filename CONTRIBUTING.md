# Guía de Contribución

¡Gracias por tu interés en contribuir a AppServicioshosteleria! Por favor, sigue estas pautas para que el proceso sea fluido para todos.

## Flujo de Trabajo

1. **Haz un fork** del repositorio y clónalo localmente.
2. Crea una **rama descriptiva** a partir de `main`:
   ```bash
   git checkout -b feat/nombre-de-tu-feature
   # o
   git checkout -b fix/descripcion-del-bug
   ```
3. Realiza tus cambios siguiendo las [convenciones de código](#convenciones-de-código).
4. Asegúrate de que los **tests pasen**:
   ```bash
   npm test
   ```
5. Asegúrate de que el **linter no reporta errores**:
   ```bash
   npm run lint
   ```
6. Haz **commit** con un mensaje descriptivo siguiendo [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: añadir validación de camarero en asignación"
   git commit -m "fix: corregir estado de carga infinita en AuthContext"
   ```
7. Abre una **Pull Request** contra `main` describiendo tus cambios.

## Convenciones de Código

- **JavaScript/JSX:** Sigue la configuración ESLint del proyecto (ver `eslint.config.js`).
- **Componentes React:** Componentes funcionales con hooks. Evita componentes de clase excepto para `ErrorBoundary`.
- **Estilos:** Tailwind CSS. Evita CSS en línea excepto para valores dinámicos.
- **Imports:** Usa el alias `@/` para importar desde `src/`.
- **Nombres:** camelCase para funciones/variables, PascalCase para componentes.

## Estructura de Tests

Los tests se organizan en:

- `tests/flows/` — Tests de integración de flujos de usuario completos.
- `src/contexts/__tests__/` — Tests unitarios de contextos React.

Usa `renderWithProviders` de `tests/utils/render.jsx` para tests que necesiten `QueryClient` y `BrowserRouter`.

## Revisión de Pull Requests

- Todos los PRs necesitan al menos **1 aprobación** antes de hacer merge.
- Los PRs deben pasar todos los checks de CI (lint, tests, build).
- Mantén los PRs pequeños y enfocados en un único cambio.

## Reporte de Bugs

Abre un [issue](https://github.com/joseluiscarrizo/AppServicioshosteleria/issues) con:
- Descripción del problema
- Pasos para reproducirlo
- Comportamiento esperado vs. real
- Capturas de pantalla si aplica
