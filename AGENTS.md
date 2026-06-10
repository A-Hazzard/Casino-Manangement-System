# Evolution One CMS

Casino management platform — collection reports, cabinet monitoring, vault operations, analytics, and member management. Multi-tenant (licencee-isolated) Next.js 15 app with MongoDB/Mongoose, Bun runtime.

---

## Commands

```bash
bun run type-check    # TypeScript (tsc --noEmit, 4GB heap)
bun run lint          # ESLint
bun run check         # type-check && lint (run before committing)
bun run build         # Production build
bun run dev           # Dev server (localhost:3000)
bun run dev:https     # Dev with HTTPS (camera access on mobile)
bun run test:e2e      # Playwright end-to-end tests
```

Always run `bun run check` before committing. The only pre-existing error is in `scratch/simulate-supplemental.ts` (ignore it).

---

## Architecture

```
app/                          # Next.js App Router pages + API routes
  api/                        # All API routes (backend)
    lib/
      models/                 # Mongoose models (single source of truth)
      helpers/                # Business logic, grouped by domain
      services/               # External services (MQTT, etc.)
      utils/                  # Backend utilities (reviewerScale, etc.)
      types/                  # Backend-only types
components/
  CMS/                        # CMS-mode components (domain-organized)
  shared/ui/                  # Shared UI components
    skeletons/                # Skeleton loaders per feature
  ui/skeletons/               # Additional skeletons (vault, collection)
lib/
  hooks/                      # Custom React hooks
  helpers/                    # Frontend API helpers + shared math (rates.ts)
  store/                      # Zustand stores (13 total, one per domain)
  types/                      # Frontend-only types
  constants/                  # Constants (roles, collection tabs, etc.)
  utils/                      # Shared utilities (movement calc, dateFormat, etc.)
shared/types/                 # Frontend + backend shared types (single source of truth)
```

---

## Skills (auto-loaded by OpenCode)

These are in `.claude/skills/` and load on-demand when relevant:

| Skill | When to use |
|-------|-------------|
| `api-route-structure` | Creating/modifying API routes in `app/api/` |
| `backend-standards` | All backend database operations |
| `code-style-eslint` | Any code changes (ESLint, formatting) |
| `database-query-optimization` | Meters queries, aggregations, performance |
| `file-organization` | Creating new files, deciding where code goes |
| `gaming-day-offset-system` | Date/time calculations for reports, dashboards |
| `licencee-access-control` | Multi-tenant queries, role-based permissions |
| `page-component-structure` | Creating/modifying page.tsx or complex components |
| `react-typescript-rules` | Any React/TypeScript code |
| `skeleton-loaders` | Adding loading states to any async UI |

---

## Critical Invariants

### Currency & Rounding

- **All currency values rounded to 2 decimals at display point**: `Math.round(value * 100) / 100`
- **`convertToUSD`/`convertFromUSD` do NOT round** — they're intermediate helpers. Rounding at final display.
- **Same-currency guard**: Check `nativeCurrency !== displayCurrency` before converting. Skip unnecessary TTD->USD->TTD chains.
- **Reviewer scale**: `scale = 1 - multiplier`. Applied AFTER currency conversion. Only for `reviewer` role.

### Gaming Day

- **8 AM to 8 AM** (Trinidad UTC-4), not midnight-midnight
- Configurable per location via `gamingLocations.gameDayOffset` (0-23)
- Apply for: dashboard, reports, analytics
- **NOT for**: collection reports, activity logs, sessions
- Use `??` not `||` for offset (handles 0 as valid)

### Multi-Tenant Access Control

- Every user has `assignedLicencees` and `assignedLocations`
- **Managers** see ALL locations for their licencees
- **All other roles** see intersection: (licencee locations) ∩ (assigned locations)
- Role hierarchy: `developer > owner > admin > manager > location admin > vault-manager > cashier > technician > collector > reviewer`
- Always use `getUserLocationFilter()` for API queries

### Collection Reports

- **Never** send `prevIn`/`prevOut` from frontend — backend calculates these
- `isEditing: false` for finalized reports (financial reporting safe)
- `isEditing: true` = collections being modified, histories NOT synced
- Movement for supplemental meters uses previous meter document's absolute values
- Offline SMIB machines (`relayId` + stale `lastActivity`) get `sasMeters` updated during CR creation

### Backend Database Rules

- **Always use Mongoose models**, never `db.collection()`
- **`findOne()` not `findById()`**, `findOneAndUpdate()` not `findByIdAndUpdate()`
- **Soft-delete filter**: `$or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2026-01-01') } }]`
- **`type` over `interface` always** — no exceptions
- **No `any`** — use specific types. No `Record<string, unknown>` either.

### SMIB Online/Offline Detection

- **Online SMIB**: `relayId` exists AND `lastActivity` is recent (< 3 min threshold, will restore to 72h)
- **Offline SMIB**: `relayId` exists BUT `lastActivity` is stale
- Online SMIB: relay handles `sasMeters` — do NOT mutate during CR
- Offline SMIB: update `sasMeters.drop` and `sasMeters.totalCancelledCredits` with collector-entered values

---

## Code Style

- **No trailing decimals** longer than 2 places
- **No single-letter variables**: `index` not `i`, `sum` not `s`
- **UPPER_SNAKE_CASE** for constants, `camelCase` for variables
- **Explicit return types** required for helpers and API functions
- **String literal unions** over enums: `'active' | 'inactive'`
- **Remove redundant comments**, keep WHY comments
- **Error logging**: `[FunctionName] Error: message` in catch blocks
- **File-level JSDoc** required for API routes, page.tsx, complex components
- **Skeleton loaders** required for all async data — never generic "Loading..." or spinners

---

## Component Structure

Every page/component follows this order (with `=====` section separators):

```
1. Hooks (useState, useEffect, custom hooks)
2. Computed (useMemo, derived values)
3. Handlers (callbacks, event handlers)
4. Effects (useEffect side effects)
5. Return (JSX)
```

- `page.tsx` must be thin wrapper (< 150 lines)
- Responsive: `hidden md:block` for desktop, `md:hidden` for mobile
- Extract logic to helpers, hooks, or sub-components

---

## API Route Structure

- File-level JSDoc with `@module` tag
- Step-by-step numbered comments with `=====` separators
- Extract helpers > 20-30 lines to `app/api/lib/helpers/`
- Max route file ~ 400-500 lines
- Parameter guards on exported functions
- Critical operation result checking

---

## MQTT Topics (Runtime)

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `sas/relay/{relayId}` | Publish | Commands to SMIB devices |
| `sas/gy/server` | Subscribe | Device responses (meter data) |
| `smib/config` | Subscribe | Config responses |
| `sas/gli/server/{relayId}` | Subscribe | GLI server data per device |
| `sas/server` | Subscribe | Additional server topic |

---

## Key Files

| Purpose | Path |
|---------|------|
| Mongoose models | `app/api/lib/models/` |
| Backend helpers | `app/api/lib/helpers/` |
| Currency conversion | `lib/helpers/rates.ts` |
| Movement calculation | `lib/utils/movement/calculation.ts` |
| Reviewer scaling | `app/api/lib/utils/reviewerScale.ts` |
| Date formatting | `shared/utils/dateFormat.ts` |
| Gaming day range | `lib/utils/gamingDayRange.ts` |
| Zustand stores | `lib/store/` |
| Skeleton loaders | `components/shared/ui/skeletons/` + `components/ui/skeletons/` |
| Role definitions | `lib/constants/roles.ts` |
| Permissions | `lib/utils/permissions/client.ts` |

---

## External References

CRITICAL: Load these files on-demand when the task is relevant. Do NOT preemptively load all of them.

- Collection report data flow: `@.instructions/collection-reports-guidelines.md`
- Licencee access control deep dive: `@.instructions/licencee-access-context.md`
- `isEditing` flag system: `@.instructions/isediting-system.md`
- Gaming day offset system: `@.instructions/gaming-day-offset-system.md`
- RBAC and page permissions: `@.instructions/authorization.md`
- Type safety rules: `@.instructions/rules/type-safety.md`
- Next.js/React rules: `@.instructions/rules/nextjs-rules.md`
- Naming conventions: `@.instructions/rules/naming-conventions.md`
- Mongoose query typing: `@.instructions/rules/mongoose-query-typing.md`
- Cookie security: `@.instructions/rules/http-https-cookie-rules.md`
- Backend guidelines: `@.instructions/rules/guidlines.md`
- Currency display: `@.instructions/rules/currency-display.md`
- Collection report study: `@.claude/collection-report-study.md`
- V2 feature plan: `@.claude/collection-report-v2-plan.md`
- Vault FRD: `@.instructions/vault-FRD.md`
- Application context: `@.instructions/rules/application-context.md`
