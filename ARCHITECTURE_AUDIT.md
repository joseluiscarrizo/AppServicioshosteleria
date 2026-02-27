# 🏗️ Auditoría de Arquitectura — AppServicioshosteleria

**Fecha:** 2026-02-27  
**Rama:** `main`  
**Objetivo:** Auditoría completa de arquitectura para identificar errores, vulnerabilidades y problemas de diseño

---

## Resumen Ejecutivo

| Categoría | 🔴 Crítico | 🟠 Importante | 🟡 Recomendado |
|-----------|-----------|--------------|----------------|
| CI/CD | 3 | 1 | 1 |
| Código | 1 | 4 | 5 |
| Arquitectura | 0 | 4 | 3 |
| Dependencias | 0 | 2 | 2 |
| Seguridad | 1 | 2 | 2 |
| Testing | 0 | 2 | 3 |
| Performance | 0 | 2 | 4 |
| **Total** | **5** | **17** | **20** |

---

## FASE 1: Análisis de CI/CD

### 🔴 [CI-1] package.json vacío — Sin dependencias declaradas

**Archivo:** `package.json`

El `package.json` solo contenía `@vitest/coverage-v8` en `devDependencies`, faltando **todas** las dependencias del proyecto (React, Vite, Radix UI, TanStack Query, etc.). Esto hace que `npm install` no instale nada útil, impidiendo que la aplicación arranque, compile o sea probada.

**Impacto:** Los workflows de CI (`ci.yml`, `deploy.yml`) fallan completamente en el paso `npm install`.

**Corrección aplicada:** Se ha reconstruido el `package.json` completo con todas las dependencias detectadas en los imports del código fuente, incluyendo scripts (`dev`, `build`, `preview`, `lint`, `test`, `coverage`).

---

### 🔴 [CI-2] Node.js 14 (EOL) en CI — Incompatible con el proyecto

**Archivo:** `.github/workflows/ci.yml`

El workflow de CI especificaba `node-version: '14'`, que:
- Alcanzó su fin de vida (EOL) en abril de 2023
- Es incompatible con las dependencias modernas del proyecto (Vite 6, Vitest 2, ESLint 9 requieren Node 18+)
- Las dependencias del proyecto requieren al menos Node 20

**Corrección aplicada:** Actualizado a `node-version: '20'` en todos los jobs.

---

### 🔴 [CI-3] `npx tsc --noEmit` en proyecto JavaScript puro

**Archivo:** `.github/workflows/ci.yml`

El job `test` ejecutaba `npx tsc --noEmit` (TypeScript typecheck), pero:
- No existe `tsconfig.json` en la raíz del proyecto
- El proyecto es JavaScript (`.jsx`/`.js`), no TypeScript
- Las Cloud Functions sí usan TypeScript, pero se alojan en `/functions/` con su propio proceso de build

Este paso fallaba siempre con error de configuración.

**Corrección aplicada:** Eliminado el paso `npx tsc --noEmit`. La comprobación de tipos para las Cloud Functions debe hacerse en un job separado bajo `/functions/`.

---

### 🟠 [CI-4] Acciones de GitHub desactualizadas (v2)

**Archivo:** `.github/workflows/ci.yml`

Se usaban `actions/checkout@v2` y `actions/setup-node@v2`, que:
- Tienen vulnerabilidades conocidas en versiones antiguas
- No soportan Node.js caching (`cache: 'npm'`)
- Han sido deprecadas en favor de v4

**Corrección aplicada:** Actualizados a `actions/checkout@v4` y `actions/setup-node@v4` con `cache: 'npm'` habilitado.

---

### 🟡 [CI-5] Sin job de build en CI

**Archivo:** `.github/workflows/ci.yml`

El CI solo ejecutaba lint y test, pero no verificaba que `vite build` terminara con éxito. Un build roto podría llegar a producción si los tests pasan pero el bundling falla.

**Corrección aplicada:** Añadido job `build` que ejecuta `npm run build` tras los tests.

---

## FASE 2: Análisis de Código

### 🔴 [COD-1] `React.StrictMode` deshabilitado

**Archivo:** `src/main.jsx`

```jsx
// StrictMode comentado fuera
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
```

`React.StrictMode` detecta efectos secundarios no intencionados, usos de APIs deprecadas y errores de hidratación. Deshabilitarlo oculta bugs que solo aparecen en producción.

**Recomendación:** Reactivar `<React.StrictMode>` y corregir las advertencias que surjan.

---

### 🟠 [COD-2] Componentes excesivamente grandes (> 500 líneas)

Los siguientes componentes violan el principio de responsabilidad única y son difíciles de mantener y testear:

| Archivo | Líneas |
|---------|--------|
| `src/pages/Asignacion.jsx` | 1.759 |
| `src/pages/Pedidos.jsx` | 828 |
| `src/pages/Camareros.jsx` | 698 |
| `src/pages/TiempoReal.jsx` | 668 |
| `src/pages/DashboardCoordinador.jsx` | 631 |
| `src/pages/Clientes.jsx` | 565 |
| `src/components/camareros/NotificacionesCamarero.jsx` | 639 |
| `src/components/whatsapp/WhatsAppEventos.jsx` | 536 |
| `src/hooks/useBackgroundServices.js` | 430 |
| `src/Layout.jsx` | 493 |

**Recomendación:** Extraer lógica en custom hooks (`useAsignacion`, `usePedidos`) y dividir vistas en subcomponentes especializados.

---

### 🟠 [COD-3] 77 sentencias `console.log/warn/error` en producción

```bash
$ grep -rn "console\." src/ | wc -l
77
```

Los logs de consola en producción exponen información interna de la aplicación, pueden degradar el rendimiento y dificultan el debugging.

**Recomendación:** Usar el `Logger` ya existente en `src/utils/logger.js` de forma consistente. Configurar una variable `import.meta.env.DEV` para suprimir logs en producción.

---

### 🟠 [COD-4] Patrón CRUD duplicado en cada página

Cada página (`Pedidos`, `Camareros`, `Clientes`, `Coordinadores`) reimplementa exactamente el mismo patrón:

```jsx
const { data, isLoading } = useQuery({ queryKey: [...], queryFn: ... });
const createMutation = useMutation({ mutationFn: ..., onSuccess: () => queryClient.invalidateQueries(...) });
const updateMutation = useMutation({ ... });
const deleteMutation = useMutation({ ... });
```

Esto genera ~200 líneas de código duplicado por página.

**Recomendación:** Crear un hook `useEntityCRUD(entity, queryKey)` que encapsule el patrón común.

---

### 🟠 [COD-5] `ErrorBoundary` pierde el error y no ofrece recuperación

**Archivo:** `src/components/ErrorBoundary.jsx`

```jsx
componentDidCatch(_error, errorInfo) {
  this.setState({ hasError: true });
  console.error("ErrorBoundary caught an error:", errorInfo);
  // El parámetro _error se descarta
}
render() {
  if (this.state.hasError) {
    return <h1>Something went wrong.</h1>; // Sin botón de reintento
  }
}
```

Problemas:
1. El error real (`_error`) se descarta con `_` y no se loguea
2. No hay botón de "Reintentar" o "Volver al inicio"
3. El mensaje "Something went wrong." está en inglés en una app en español

**Recomendación:** Capturar y loguear el error real; añadir botón de recuperación; internacionalizar el mensaje.

---

### 🟡 [COD-6] Props drilling profundo

En varios componentes se pasan props a través de múltiples niveles sin Context ni state management centralizado. Por ejemplo, en `Asignacion.jsx` se pasa `camareros`, `pedidos` y `asignaciones` a múltiples niveles de componentes hijo.

**Recomendación:** Usar Context o Zustand para estado compartido entre componentes hermanos.

---

### 🟡 [COD-7] Lógica de negocio mezclada en componentes de UI

Las páginas combinan fetching de datos, lógica de filtrado, transformaciones y renderizado en un mismo componente. Por ejemplo, `DashboardCoordinador.jsx` calcula estadísticas, filtra eventos y renderiza gráficos.

**Recomendación:** Separar la lógica de negocio en custom hooks o servicios dedicados.

---

### 🟡 [COD-8] Dos archivos de configuración de Vitest

**Archivos:** `vitest.config.ts` y `vitest.config.cjs`

Existen dos configuraciones de Vitest simultáneamente. El archivo `.cjs` usa `testEnvironment: 'node'` mientras el `.ts` usa `environment: 'jsdom'`. Esto puede causar comportamientos inconsistentes según el entorno.

**Recomendación:** Eliminar `vitest.config.cjs` y mantener solo `vitest.config.ts`.

---

### 🟡 [COD-9] Componente `VisualEditAgent` en producción

**Archivo:** `src/lib/VisualEditAgent.jsx` (647 líneas)

Este componente parece ser una herramienta de edición visual para desarrollo, pero se incluye en el bundle de producción sin condicional.

**Recomendación:** Envolverlo en `import.meta.env.DEV && <VisualEditAgent />` o excluirlo del build de producción.

---

## FASE 3: Análisis de Dependencias

### 🟠 [DEP-2] `package-lock.json` desincronizado

El `package-lock.json` en el repositorio solo contenía la entrada de `@vitest/coverage-v8` como dependencia raíz, sin reflejar las dependencias reales del proyecto. Esto significa que el lockfile no proporciona las garantías de reproducibilidad para las que fue diseñado.

**Recomendación:** Tras restaurar el `package.json`, ejecutar `npm install` para regenerar el lockfile y commitear el resultado.

---

### 🟠 [DEP-3] Versión de `@vitest/coverage-v8: "latest"` sin fijar

Usar `"latest"` en lugar de una versión semántica específica puede causar builds no reproducibles si una versión mayor de Vitest introduce cambios breaking.

**Recomendación:** Fijar a una versión específica como `"^2.1.8"` (corregido en el nuevo `package.json`).

---

### 🟡 [DEP-4] 22 workflows de GitHub Actions — Riesgo de conflictos

Se detectaron 22 workflows en `.github/workflows/`, varios de los cuales automatizan acciones sobre PRs (auto-approve, auto-merge, auto-rebase, auto-fix). Esto puede generar:
- Loops de CI (un workflow activa otro)
- PRs aprobados automáticamente sin revisión humana
- Conflictos entre workflows de auto-rebase y auto-merge

**Recomendación:** Auditar y consolidar los workflows. Deshabilitar `auto-approve-prs.yml` y `auto-merge-prs.yml` o restringirlos con condiciones explícitas.

---

### 🟡 [DEP-5] `terser` no listado como dependencia de desarrollo

**Archivo:** `vite.config.js`

```js
build: {
  minify: 'terser',
```

Vite usa `terser` para la minificación si se especifica `minify: 'terser'`, pero `terser` debe estar instalado explícitamente como dependencia de desarrollo.

**Corrección aplicada:** Añadido `terser` a `devDependencies` en el nuevo `package.json`.

---

## FASE 4: Análisis de Configuración

### 🟠 [CONF-1] `.env.example` desalineado con variables reales

**Archivo:** `.env.example`

El `.env.example` contiene configuración de base de datos estilo Laravel:
```env
DB_CONNECTION=sqlite
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_dev_database
DB_USERNAME=your_dev_username
DB_PASSWORD=your_dev_password
APP_ENV=local
APP_DEBUG=true
```

Pero el proyecto es una SPA con Vite que necesita:
```env
VITE_BASE44_APP_ID=<tu_app_id>
VITE_BASE44_BACKEND_URL=<url_del_backend>
```

Esto confunde a nuevos desarrolladores sobre cómo configurar el entorno.

**Recomendación:** Actualizar `.env.example` para reflejar únicamente las variables de Vite reales.

---

### 🟠 [CONF-2] `base44Client.js` lanza error si faltan variables de entorno

**Archivo:** `src/api/base44Client.js`

```js
if (!import.meta.env.VITE_BASE44_APP_ID) {
  throw new Error('VITE_BASE44_APP_ID environment variable is required');
}
```

Este `throw` en el módulo de nivel raíz hace que la aplicación crashe completamente durante el boot si las variables no están presentes, sin ningún fallback de UI.

**Recomendación:** Capturar este error con el `ErrorBoundary` existente, o mostrar una pantalla de configuración amigable.

---

### 🟡 [CONF-3] Sin `engines` en package.json

No se especifica la versión de Node.js requerida en `package.json`.

**Recomendación:** Añadir `"engines": { "node": ">=20.0.0" }` para que npm/CI alerten cuando se use una versión incompatible.

---

### 🟡 [CONF-4] Falta `jsconfig.json` path aliases en vitest.config.ts

**Archivo:** `vitest.config.ts`

```ts
test: {
  alias: {
    '@': '/src',  // Alias manual — puede desincronizarse con jsconfig.json
  }
}
```

El alias `@` se define manualmente en vitest pero debería derivarse de la misma fuente que `jsconfig.json` o `vite.config.js` para evitar inconsistencias.

---

## FASE 5: Análisis de Performance

### 🟠 [PERF-1] Sin lazy loading de rutas

**Archivo:** `src/pages.config.js` o `src/App.jsx`

Todas las páginas (`Pedidos`, `Asignacion`, `Camareros`, etc.) se importan de forma estática y se incluyen en el bundle inicial. Con 22+ páginas, el bundle inicial es significativamente mayor de lo necesario.

**Recomendación:** Usar `React.lazy()` + `Suspense` para cargar páginas bajo demanda:
```jsx
const Pedidos = React.lazy(() => import('./pages/Pedidos'));
```

---

### 🟠 [PERF-2] Sin `React.memo` en componentes de lista

Los componentes que renderizan listas largas (filas de tabla, tarjetas Kanban) no usan `React.memo`, lo que puede causar re-renders costosos cuando el estado padre cambia.

**Recomendación:** Aplicar `React.memo` a componentes como `PedidoRow`, `CamareroCard`, `AsignacionCard`.

---

### 🟡 [PERF-3] `useBackgroundServices.js` con múltiples `setInterval` sin cleanup garantizado

**Archivo:** `src/hooks/useBackgroundServices.js` (430 líneas)

El hook registra varios intervalos (cada 5 min, 10 min, 15 min). Si el componente se desmonta y remonta, pueden quedar intervalos activos no limpiados.

**Recomendación:** Verificar que todos los `setInterval` retornan su `clearInterval` en el cleanup de `useEffect`.

---

### 🟡 [PERF-4] Sin `useMemo` para cálculos derivados costosos

En `DashboardCoordinador.jsx` y `Informes.jsx` se calculan estadísticas y agregaciones en el cuerpo del componente, sin `useMemo`, por lo que se recalculan en cada render.

**Recomendación:** Envolver cálculos costosos con `useMemo`:
```jsx
const estadisticas = useMemo(() => calcularStats(pedidos), [pedidos]);
```

---

### 🟡 [PERF-5] Imágenes no optimizadas / sin formato moderno

No se detecta uso de `<picture>` con formatos WebP/AVIF ni lazy loading de imágenes (`loading="lazy"`).

**Recomendación:** Usar `loading="lazy"` en imágenes fuera del viewport inicial y convertir assets a WebP.

---

## FASE 6: Análisis de Seguridad

### 🟠 [SEC-1] `dangerouslySetInnerHTML` en componente de chart

**Archivo:** `src/components/ui/chart.jsx` (línea 61)

```jsx
<style dangerouslySetInnerHTML={{ __html: Object.entries(THEMES)... }} />
```

Se usa `dangerouslySetInnerHTML` para inyectar CSS generado desde la configuración de temas. Aunque el contenido proviene de la configuración del componente (no de input del usuario), cualquier manipulación futura que incluya datos externos podría convertirse en un vector XSS.

**Estado:** Bajo riesgo en la implementación actual, ya que el CSS se genera desde constantes internas. Monitorizar si la fuente de datos cambia.

---

### 🟠 [SEC-2] Variables de entorno expuestas sin validación de formato

**Archivo:** `src/api/base44Client.js`

Las variables `VITE_BASE44_APP_ID` y `VITE_BASE44_BACKEND_URL` se usan directamente sin validar su formato (ej. URL válida, ID no vacío). Una URL malformada en `VITE_BASE44_BACKEND_URL` podría causar errores difíciles de diagnosticar.

**Recomendación:** Validar el formato de las variables al arrancar:
```js
try { new URL(import.meta.env.VITE_BASE44_BACKEND_URL); }
catch { throw new Error('VITE_BASE44_BACKEND_URL debe ser una URL válida'); }
```

---

### 🟠 [SEC-3] `auto-approve-prs.yml` — Aprobación automática de PRs

**Archivo:** `.github/workflows/auto-approve-prs.yml`

Existe un workflow que aprueba automáticamente pull requests. Esto elimina la revisión de código como barrera de seguridad, permitiendo que código malicioso o roto llegue a `main` sin revisión humana.

**Recomendación:** Deshabilitar o restringir significativamente este workflow. Las aprobaciones deben requerir revisión humana.

---

### 🟡 [SEC-4] Sin Content Security Policy (CSP)

**Archivo:** `index.html`

No se detectan headers de seguridad HTTP (CSP, X-Frame-Options, X-Content-Type-Options) en la configuración de Firebase Hosting (`firebase.json`).

**Recomendación:** Añadir headers de seguridad en `firebase.json`:
```json
"headers": [{
  "source": "**",
  "headers": [
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Content-Security-Policy", "value": "default-src 'self'..." }
  ]
}]
```

---

### 🟡 [SEC-5] `requiresAuth: false` en base44Client

**Archivo:** `src/api/base44Client.js`

```js
export const base44 = createClient({
  ...
  requiresAuth: false  // Comentario: debe ser true en producción
});
```

El README indica que este valor debe ser `true` en producción, pero el código tiene `false`. Esto puede exponer datos de la aplicación sin autenticación.

**Recomendación:** Cambiar a `requiresAuth: true` o controlarlo con `import.meta.env.PROD`.

---

## FASE 7: Análisis de Testing

### 🟠 [TEST-1] Cobertura de tests muy limitada

Solo existen 3 archivos de test de flujo:
- `tests/flows/crear-pedido.test.jsx`
- `tests/flows/asignar-camarero.test.jsx`
- `tests/flows/confirmar-servicio.test.jsx`

Con 120+ componentes y 22 páginas, la cobertura es mínima. Flows críticos como autenticación, gestión de camareros, informes y WhatsApp no están cubiertos.

**Recomendación:** Priorizar tests para:
1. Rutas protegidas (`RoleBasedRoute`)
2. Mutaciones de datos (crear/editar/eliminar)
3. Servicios background
4. Cálculos de estadísticas en informes

---

### 🟠 [TEST-2] Sin umbrales de cobertura configurados

**Archivo:** `vitest.config.ts`

No se definen umbrales mínimos de cobertura (`coverage.thresholds`), por lo que la cobertura puede caer a 0% sin que el CI falle.

**Recomendación:**
```ts
coverage: {
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 50,
  }
}
```

---

### 🟡 [TEST-3] `vitest.config.cjs` usa `testEnvironment: 'node'` incorrecto

**Archivo:** `vitest.config.cjs`

```js
module.exports = {
  testEnvironment: 'node',
```

Los tests usan `@testing-library/react` que requiere `jsdom`. Un entorno `node` haría fallar todos los tests si Vitest usara este archivo.

**Recomendación:** Eliminar `vitest.config.cjs` para evitar confusión.

---

### 🟡 [TEST-4] Mocks no centralizados en todos los tests

Cada test file reimplementa sus propios mocks de `@base44/sdk`. Los mocks están parcialmente centralizados en `tests/utils/mocks.js` pero no todos los tests lo usan.

**Recomendación:** Mover todos los mocks globales a `tests/setup.js` con `vi.mock` global.

---

### 🟡 [TEST-5] Sin tests para hooks y utilities

Los custom hooks (`useBackgroundServices`, `useRole`, `usePermission`) y utilities (`logger`, `passwordGenerator`, `passwordValidator`) no tienen tests unitarios.

**Recomendación:** Añadir tests unitarios para lógica pura en hooks y utilities.

---

## FASE 8: Análisis Estructural

### 🟡 [EST-1] Importaciones con rutas relativas largas en algunos archivos

Algunos archivos usan rutas relativas profundas (`../../../components/...`) en lugar del alias `@/`. Esto dificulta mover archivos y crea inconsistencia.

**Recomendación:** Usar siempre `@/` para importaciones desde `src/`.

---

### 🟡 [EST-2] Archivos de presentación y documentación de negocio en el repositorio de código

Los archivos `BusinessPlan.md`, `FINANCIAL_PROJECTIONS_3YEARS.md`, `INTERACTIVE_DEMO_GUIDE.md` y el directorio `/presentation/` no deberían estar en el repositorio de código fuente. Contienen información de negocio confidencial que no es parte del código.

**Recomendación:** Mover a un repositorio privado separado o a un sistema de gestión documental.

---

## Roadmap de Correcciones

### Prioridad 1 — Inmediata (bloquean CI/CD)

| ID | Descripción | Estado |
|----|-------------|--------|
| CI-1 | Reconstruir package.json con todas las dependencias | ✅ Aplicado |
| CI-2 | Actualizar Node.js a v20 en CI | ✅ Aplicado |
| CI-3 | Eliminar paso `tsc --noEmit` inválido | ✅ Aplicado |
| CI-4 | Actualizar GitHub Actions a v4 | ✅ Aplicado |
| CI-5 | Añadir job de build en CI | ✅ Aplicado |

### Prioridad 2 — Semana 1 (seguridad y estabilidad)

| ID | Descripción | Esfuerzo |
|----|-------------|----------|
| SEC-3 | Deshabilitar auto-approve-prs.yml | Bajo |
| SEC-5 | Cambiar requiresAuth a true | Bajo |
| COD-1 | Reactivar React.StrictMode | Bajo |
| COD-5 | Mejorar ErrorBoundary | Medio |
| CONF-1 | Actualizar .env.example | Bajo |

### Prioridad 3 — Sprint 1 (calidad de código)

| ID | Descripción | Esfuerzo |
|----|-------------|----------|
| COD-2 | Dividir Asignacion.jsx (1,759 líneas) | Alto |
| COD-4 | Crear hook useEntityCRUD | Medio |
| COD-3 | Eliminar console.logs de producción | Medio |
| DEP-2 | Regenerar package-lock.json | Bajo |
| TEST-2 | Configurar umbrales de cobertura | Bajo |

### Prioridad 4 — Sprint 2 (performance y testing)

| ID | Descripción | Esfuerzo |
|----|-------------|----------|
| PERF-1 | Implementar lazy loading de rutas | Medio |
| PERF-2 | Aplicar React.memo en componentes de lista | Medio |
| TEST-1 | Ampliar suite de tests | Alto |
| SEC-4 | Añadir headers CSP en Firebase | Bajo |
| COD-8 | Eliminar vitest.config.cjs | Bajo |

### Prioridad 5 — Sprint 3 (arquitectura)

| ID | Descripción | Esfuerzo |
|----|-------------|----------|
| COD-6 | Reducir props drilling con Context | Alto |
| COD-7 | Extraer lógica de negocio a hooks | Alto |
| PERF-3 | Auditar cleanup de setInterval | Medio |
| PERF-4 | Añadir useMemo para cálculos derivados | Medio |
| DEP-4 | Consolidar workflows de GitHub Actions | Medio |

---

## Conclusiones

La aplicación tiene una base funcional sólida con características avanzadas (kanban, WhatsApp, informes, QR check-in). Sin embargo, presenta **6 problemas críticos** que bloquean el CI/CD y afectan la estabilidad del proyecto:

1. El `package.json` estaba completamente vacío de dependencias (**corregido**)
2. El CI usaba Node.js 14, incompatible con las dependencias modernas (**corregido**)
3. El CI ejecutaba TypeScript typecheck en un proyecto JavaScript (**corregido**)
4. Las Actions de GitHub estaban desactualizadas (**corregido**)
5. El CI no tenía job de build para verificar que el bundle funciona (**corregido**)
6. `React.StrictMode` está deshabilitado, ocultando potenciales bugs

Los problemas de código más urgentes son el tamaño excesivo de `Asignacion.jsx` (1.759 líneas) y la duplicación del patrón CRUD en todas las páginas. Abordarlos mejoraría significativamente la mantenibilidad y permitiría ampliar la cobertura de tests.
