# Setup Guide

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A Firebase project (for backend/auth)
- A Base44 account (for the platform SDK)

## 1. Clone the Repository

```bash
git clone https://github.com/joseluiscarrizo/AppServicioshosteleria.git
cd AppServicioshosteleria
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required variables (see `.env.example` for the full list):

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_BASE44_APP_ID` | Base44 application ID |

## 4. Run in Development Mode

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## 5. Run Tests

```bash
npm test
```

To watch for changes:

```bash
npm run test:watch
```

To generate a coverage report:

```bash
npm run test:coverage
```

## 6. Build for Production

```bash
npm run build
```

The compiled output is in the `dist/` directory.

## 7. Security Audit

```bash
# Check for vulnerabilities
npm run audit

# Fix automatically fixable vulnerabilities
npm run audit:fix

# Audit production dependencies only
npm run audit:security
```

## Troubleshooting

- **`Cannot find module '@vitejs/plugin-react'`** – Run `npm install` again; the devDependency may be missing.
- **Firebase auth errors in tests** – The test setup mocks Firebase; ensure `tests/utils/mocks.js` is up to date.
- **Port conflict** – Change the port with `npm run dev -- --port 3000`.
