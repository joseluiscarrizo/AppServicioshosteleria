# Guía de Configuración — AppServicioshosteleria

## Requisitos Previos

- Node.js >= 18
- npm >= 9
- Cuenta en [Base44](https://base44.com) con una app configurada
- (Opcional) Firebase para funciones serverless

## Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/joseluiscarrizo/AppServicioshosteleria.git
cd AppServicioshosteleria

# 2. Instala las dependencias
npm install

# 3. Configura las variables de entorno
cp .env.example .env
# Edita .env con tus valores (ver sección siguiente)

# 4. Inicia el servidor de desarrollo
npm run dev
```

## Variables de Entorno

Copia `.env.example` a `.env` y rellena los siguientes valores:

| Variable | Descripción | Requerida |
|---|---|---|
| `VITE_BASE44_APP_ID` | ID de la aplicación en Base44 | ✅ |
| `VITE_BASE44_BACKEND_URL` | URL del backend de Base44 | ✅ |
| `VITE_BASE44_TOKEN` | Token de acceso (solo desarrollo) | ⚠️ |

> ⚠️ **Nunca** subas el archivo `.env` al repositorio. Está incluido en `.gitignore`.

## Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm test` | Ejecuta los tests con Vitest |
| `npm run lint` | Ejecuta el linter ESLint |

## Estructura del Proyecto

```
src/
├── api/           # Clientes de API (Base44)
├── components/    # Componentes React reutilizables
├── contexts/      # Contextos globales (Auth, Error, Loading, Role)
├── hooks/         # Custom hooks
├── lib/           # Utilidades y configuración (QueryClient, AuthContext)
├── pages/         # Páginas de la aplicación
└── utils/         # Funciones de utilidad
tests/
├── fixtures/      # Datos de prueba
├── flows/         # Tests de flujos de usuario
└── utils/         # Utilidades de test (mocks, factories, render)
docs/              # Documentación técnica y ADRs
```

## Configuración de Firebase (Opcional)

Si necesitas usar las funciones de Firebase:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Las funciones se encuentran en el directorio `functions/`.

## Ejecución de Tests

```bash
# Todos los tests
npm test

# Un test específico
npx vitest run tests/flows/crear-pedido.test.jsx

# Con cobertura
npx vitest run --coverage
```
