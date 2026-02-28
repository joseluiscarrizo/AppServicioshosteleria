# Setup Guide — AppServicioshosteleria

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Firebase project credentials (see `.env.example`)

## Installation

```bash
git clone https://github.com/joseluiscarrizo/AppServicioshosteleria.git
cd AppServicioshosteleria
npm install
```

## Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_BASE44_APP_ID` | Base44 application ID |

## Development server

```bash
npm run dev
```

The app is available at `http://localhost:5173`.

## Running tests

```bash
npm test            # run all tests once
npm run test:watch  # watch mode
npm run coverage    # test coverage report
```

## Building for production

```bash
npm run build
npm run preview     # preview the production build locally
```

## Firebase emulators (optional)

```bash
firebase emulators:start
```

Set `VITE_USE_EMULATORS=true` in your `.env.local` to point the app at the local emulators.
