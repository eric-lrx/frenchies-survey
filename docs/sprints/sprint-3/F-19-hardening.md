# F-19 Hardening and delivery

| | |
|---|---|
| Feature | F-19 Hardening and delivery |
| Requirement | NFR: Performance, responsive design, accessibility, error handling |
| Sprint | 3 |
| Status | Planned |

## 1. Scope

F-19 is not a single feature but a cross-cutting hardening pass before the final
release. It covers:

1. **Responsive design:** All pages render correctly on mobile (375 px) and tablet
   (768 px). Tables scroll horizontally. Forms stack vertically on narrow screens.
2. **Loading and error states:** Every data-fetching page shows a spinner while loading
   and a retry-able error message on failure.
3. **Accessibility:** Every interactive element has an accessible name. Focus management
   after dialogs. Skip links. Color contrast AA.
4. **Performance:** Lazy-load routes. Bundle size < 300 KB gzipped.

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F19-01 | All pages render without horizontal scroll on a 375 px viewport |
| AC-F19-02 | Every page shows a loading indicator while fetching |
| AC-F19-03 | Every page shows a user-friendly error with a Retry button on fetch failure |
| AC-F19-04 | All form controls have visible labels or aria-label |
| AC-F19-05 | Main JS bundle < 300 KB gzipped |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F19-01 | Manual | Open each page at 375 px | No horizontal scroll | AC-F19-01 |
| TEST-F19-02 | Manual | Throttle network, navigate | Spinner visible | AC-F19-02 |
| TEST-F19-03 | Manual | Disconnect network, navigate | Error + Retry visible | AC-F19-03 |
| TEST-F19-04 | Automated | axe-core scan on each page | 0 violations | AC-F19-04 |
| TEST-F19-05 | Build | `npm run build`, check output | < 300 KB gzip | AC-F19-05 |

## 4. Remaining work

| Item | Owner | Target |
|------|-------|--------|
| Responsive audit and CSS fixes | Marc | 8 Dec |
| Loading/error state review | Eric | 8 Dec |
| Accessibility audit (axe-core) | Eric | 10 Dec |
| Bundle size check | Eric | 10 Dec |
| Final review | Marc | 11 Dec |
