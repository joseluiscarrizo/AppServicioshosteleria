# Performance Guidelines

## React Component Performance

- **Avoid unnecessary re-renders**: Wrap expensive computations in `useMemo`; wrap callbacks passed as props in `useCallback`.
- **Lazy load pages**: Use `React.lazy` + `Suspense` for route-level code splitting.
- **Keep component trees shallow**: Extract heavy sub-trees into separate components so React can bail out of reconciliation.

## Data Fetching

- Use **TanStack Query** for server-state (entities, lists) to get automatic caching, deduplication, and background refresh.
- Use the `useAPI` hook for simple, non-entity HTTP calls with built-in timeout (30 s default) and cleanup.
- Set appropriate `refetchInterval` values; avoid polling more frequently than necessary (minimum 5 s for chat, 10 s for counters).
- Cancel in-flight requests on component unmount via `AbortController` (handled automatically by `useAPI`).

## Bundle Size

- Import only the icons you need from `lucide-react` (tree-shakeable by default with the Vite build).
- Avoid importing entire lodash; use individual utility functions or native JS equivalents.
- Use the Vite `manualChunks` configuration in `vite.config.js` to split vendor bundles.

## Images & Assets

- Compress images before committing; prefer WebP for photos.
- Use SVG for icons and logos.
- Serve static assets from a CDN in production (Firebase Hosting handles this automatically).

## Monitoring Performance

- Use the browser's built-in **Performance** panel to profile React renders.
- Enable React DevTools' **Profiler** to identify slow component trees.
- Set up **Core Web Vitals** monitoring (LCP, FID/INP, CLS) in production.

## Build Optimisation

```bash
# Production build with minification and tree-shaking
npm run build

# Analyse the bundle (add rollup-plugin-visualizer if needed)
npx vite build --reportCompressedSize
```
