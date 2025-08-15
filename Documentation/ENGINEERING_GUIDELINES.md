## Evolution One CMS - Engineering Guidelines

This document is the single source of truth for how this system is structured and the standards contributors must follow. Newcomers should read this first.

### Folder purposes

- `app/`
  - Next.js App Router pages and API routes
  - Keep `page.tsx` lean; move non-UI logic into helpers/utils
  - API routes: keep handlers thin; delegate to `app/api/lib/helpers/`

- `components/`
  - Reusable UI components
  - No data fetching or business logic; pass data via props

- `lib/helpers/`
  - Frontend helper functions for data fetching and non-visual logic
  - Use axios for HTTP; return typed data only

- `lib/utils/`
  - Pure utilities (formatting, pagination, debounce)
  - No side effects or network calls

- `lib/types/`
  - Frontend-specific type aliases only
  - No interfaces; use `type` consistently

- `shared/types/`
  - Shared type aliases used by both frontend and backend
  - API contracts, entities, database-adjacent types

- `app/api/lib/helpers/`
  - Backend route helpers and business logic
  - No UI concerns; keep route handlers thin and declarative

- `Documentation/`
  - System-wide documentation lives at the root of this folder
  - Page-specific docs remain under appropriate subpages; general docs should live here

### Standards

- HTTP client: axios everywhere (no `fetch()` in source files)
- TypeScript: prefer `type` over `interface`; no `any`
- Types location: only in `shared/types`, `lib/types`, or `app/api/lib/types`
- Separation of concerns: UI in components, logic in helpers/utils
- Error handling: try/catch with actionable messages; no silent failures
- Logging: minimal and meaningful; avoid noisy console logs
- React hooks: stable dependency arrays; avoid unnecessary deps
- Linting/build: `pnpm lint && pnpm build` must pass cleanly

### Data flow and typing

1. API route (app/api/*) → validate/transform → returns typed JSON
2. Frontend helpers (`lib/helpers/*`) → call APIs with axios → return typed data
3. Components consume typed data via props/state only

### Security

- No secrets in client code
- Validate and sanitize all input on the server
- Use middleware for route protection where required

### Performance

- Memoize expensive computations
- Debounce user input for search
- Avoid rendering waterfalls; batch network requests when possible

### Testing and verification

- Manual testing of critical flows during development
- Treat TypeScript errors as build failures