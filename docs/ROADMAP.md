# Roadmap

## Overview

This document outlines the planned development roadmap for **AppServicioshosteleria** over the next 4 weeks.

---

## Week 1: Stability & Error Handling ✅

- [x] Enhance `ErrorBoundary` with reset capability and friendly fallback UI (`ErrorFallback`)
- [x] Add `useErrorHandler` hook for consistent async error logging
- [x] Add `useAPI` hook with timeout and AbortController to fix infinite loading
- [x] Update dependencies and resolve security vulnerabilities (jsPDF → v4.2.0, Rollup, Vite)
- [x] Add npm audit scripts to `package.json`
- [x] Add unit tests for `ErrorBoundary`, `useErrorHandler`, and `useAPI`

---

## Week 2: Testing Coverage

- [ ] Reach ≥ 70 % line coverage across `src/` (track with `npm run test:coverage`)
- [ ] Add integration tests for `Comunicacion` and `Chat` pages
- [ ] Add tests for role-based route guards (`RoleBasedRoute`)
- [ ] Set up coverage thresholds in `vitest.config.ts`
- [ ] Add CI step to fail PRs that drop coverage below threshold

---

## Week 3: UX & Accessibility

- [ ] Add loading skeleton screens to replace spinner-only states
- [ ] Implement optimistic updates for chat message sending
- [ ] Audit and fix WCAG 2.1 AA accessibility issues (keyboard navigation, ARIA labels, contrast ratios)
- [ ] Add `<Suspense>` boundaries with meaningful fallback UI for lazy-loaded pages
- [ ] Implement offline-aware UI: show a banner when the network is unavailable

---

## Week 4: Performance & Observability

- [ ] Integrate an error monitoring service (e.g., Sentry) using `useErrorHandler`
- [ ] Add Core Web Vitals measurement and reporting
- [ ] Implement bundle analysis and reduce initial bundle size by ≥ 15 %
- [ ] Cache TanStack Query results in `localStorage` for faster repeat loads
- [ ] Add structured logging for Cloud Functions with severity levels

---

## Ongoing

- Weekly `npm audit` run via GitHub Actions (`auto-dependency-updates.yml`)
- Keep documentation in `/docs` up to date with architectural decisions (ADRs)
- Code review checklist enforced on every PR (see `CONTRIBUTING.md`)
