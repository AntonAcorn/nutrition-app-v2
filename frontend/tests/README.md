# Tests

Two layers:

## Unit (`tests/unit/`)
Vitest, jsdom env. Pure logic — no network, no DOM rendering of full app.

```bash
npm test                # one-shot
npm run test:watch      # watch mode
```

Add new tests as `*.test.ts` next to the existing ones. Cover:
- Pure functions (`apiClient`, date helpers, calculation utils)
- Reducers / state transitions
- Hooks (with `@testing-library/react-hooks` if needed)

## Smoke (`tests/smoke/`)
Puppeteer-core driving local Chrome against a running dev server.
Verifies critical UX paths still load without JS errors and that
key user flows (auth, routing) still work.

```bash
npm run test:smoke:ci   # spins up vite, runs smoke, tears down
npm run test:smoke      # assumes dev server already on :5174
```

Per-file env vars:
- `SMOKE_URL` — override target (default `http://127.0.0.1:5174`)
- `CHROME_PATH` — alternative Chrome binary path

API requests are mocked in-browser via puppeteer's request interception
in `routes.smoke.js`. Auth tests expect API calls to fail (since they
test the not-authenticated flow).

## When to add what

| Change | Add a test? |
|---|---|
| Pure helper, calculation | unit test |
| API client wrapper logic | unit test |
| New tab / route | smoke test (route loads) |
| Auth flow change | smoke test (form fields render correctly) |
| New page-wide error handling | smoke test |
| Backend integration | manual — needs live backend |

## Why no React component tests yet

For a UI-heavy SPA, smoke tests with a real browser catch ~80% of
regressions for ~20% of the maintenance cost of full RTL trees.
Add `@testing-library/react` later when we have specific component
logic worth testing in isolation (e.g. a complex form reducer).
