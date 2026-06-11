# E2E Tests (Playwright)

End-to-end tests for Evolution One CMS. This is the **active, maintained test suite** — Jest is installed for unit tests but has no configured script, so e2e is what runs in CI and locally.

---

## Running

```sh
bun run test:e2e          # All specs, all projects (auto-starts the dev server)
bun run test:e2e:ui       # Playwright interactive UI — best for debugging
bun run test:e2e:api      # API-management spec only (Chromium)
```

Single spec, Chromium only:

```sh
bunx playwright test e2e/tests/cabinets.spec.ts -c e2e/playwright.config.ts --project=chromium
```

List tests without running:

```sh
bunx playwright test -c e2e/playwright.config.ts --list
```

### Warm-server workflow (recommended on Windows / OneDrive)

The dev server does not always hot-reload under OneDrive, and parallel cold compiles cause flaky first-run timeouts. For repeated local runs:

```sh
# Terminal 1 — leave running
bun run dev

# Terminal 2 — Playwright reuses the running server
bun run test:e2e --workers=1
```

`reuseExistingServer` is enabled (non-CI), so a running dev server is reused instead of spawned. `--workers=1` avoids concurrent cold-compile flakiness. Navigation and global timeouts are set generously in the config for the same reason.

---

## Layout

```
e2e/
├── playwright.config.ts   # Projects (setup → chromium, firefox), web server, timeouts
├── fixtures/              # Custom test fixtures
│   ├── test.fixture.ts    # Extended `test`/`expect` + page-object fixtures
│   └── auth.fixture.ts    # loginViaMock, setupAuthState, setRoleAuthCookie
├── mocks/                 # API response mocks per domain (auth, cabinets, locations, vault, …)
├── pages/                 # Page Object Models (CabinetsPage, CabinetDetailPage, …)
├── tests/                 # *.spec.ts test files
└── .auth/user.json        # Persisted auth state (produced by the setup project)
```

### Projects (config)

1. **`setup`** — runs `auth.setup.ts` first, performs a mock login, and writes `.auth/user.json`.
2. **`chromium`** / **`firefox`** — depend on `setup` and reuse the stored auth state.

---

## Conventions

### Auth

- Most specs rely on the persisted admin auth state from the `setup` project.
- For role-specific behavior, seed a different role with `setRoleAuthCookie(page, MOCK_USER_COLLECTOR)` from `fixtures/auth.fixture.ts` before navigating.

### Mocking APIs

- Register routes with `page.route('**/api/...', ...)` and fulfill with fixtures from `mocks/`.
- **Order matters (LIFO):** register the broad pattern first, then the more specific one, so the specific route wins. Example: `**/api/members/{id}**` before `**/api/members/{id}/sessions**`.
- When chaining mock handlers, prefer `route.fallback()` over `route.continue()` so later-registered handlers still get a chance to match.
- Inspect the request URL inside the handler when the response depends on query params (e.g. returning `cursorResolved: true` only when a `command` param is present).

### Page Object Models

- Reusable navigation/selectors live in `pages/` (e.g. `cabinetDetailPage.goto(id)`).
- Keep selectors role/text-based (`getByRole`, `getByText`) over brittle CSS where practical.

### Writing a spec

- Group with `test.describe('<Page> Page', …)` and number tests for readability.
- Use `test.step(...)` to label phases — it makes failures far easier to read.
- Mock all APIs the page calls (auth, licencees, locations are almost always required) before `page.goto`.
- Prefer `toBeVisible({ timeout })` / `toHaveCount(0)` assertions over arbitrary waits.

---

## Notes

- Reports (HTML + list) output to `playwright-report/`; artifacts to `test-results/`.
- Some flows (e.g. SMIB config fetch) have built-in multi-second delays — give those assertions a generous timeout (10–15 s).
