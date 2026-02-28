# Performance Guidelines

## Core Web Vitals Targets

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

## Bundle Size

- Main bundle: < 500KB (gzipped)
- Code splitting by routes
- Lazy load non-critical components

## React Optimization

- Use `React.memo` for pure components
- `useMemo` for expensive calculations
- `useCallback` for event handlers passed as props
- Avoid inline object/array literals in JSX

## Performance Checklist

- [ ] Bundle size < 500KB
- [ ] LCP < 2.5s
- [ ] No layout shifts
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Lighthouse score > 90
