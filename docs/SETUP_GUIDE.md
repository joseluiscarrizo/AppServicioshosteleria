# Setup & Development Guide

## Structure

```
src/
├─ components/      # Componentes reutilizables
├─ pages/          # Páginas de la app
├─ hooks/          # Custom hooks
├─ contexts/       # React contexts
├─ api/            # Clientes de API
├─ lib/            # Utilidades y configuración
└─ tests/          # Tests unitarios
tests/
├─ fixtures/       # Datos de prueba
├─ flows/          # Tests de flujos completos
└─ utils/          # Utilidades de testing
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Build
```bash
npm run build
```

### Security Audit
```bash
npm run audit
```

## Environment Variables

Copiar `.env.example` a `.env` y configurar las variables necesarias.

## Architecture

La aplicación usa:
- **React** para la UI
- **Vite** como bundler
- **TanStack Query** para estado del servidor
- **React Router** para navegación
- **Tailwind CSS** para estilos
- **Vitest** para testing
