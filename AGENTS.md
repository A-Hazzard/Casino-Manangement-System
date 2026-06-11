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

---

## Refactoring Tracker

### Backend (API Routes — Complete ✅)

All 22 oversized API routes (>500 lines) refactored to helpers. All under 500 lines.

| Route | Before | After | Helper |
|---|---|---|---|
| `cabinets/aggregation/route.ts` | 1746 | 715 | `cabinetAggregation.ts` |
| `collection-reports/collections/route.ts` | 1745 | 370 | `collectionOperations.ts` |
| `collection-reports/collections/[id]/route.ts` | 1095 | 273 | `collectionByIdOperations.ts` |
| `feedback/route.ts` | 1082 | 445 | `feedbackHandlers.ts`, `feedbackOperations.ts` |
| `collection-reports-v2/sessions/[sessionId]/submit/route.ts` | 914 | 254 | `submitOperations.ts` |
| `locations/route.ts` | 924 | 304 | `locationQueryHandlers.ts` |
| `locations/search-all/route.ts` | 882 | 226 | `searchOperations.ts` |
| `cabinets/status/route.ts` | 823 | 240 | `statusOperations.ts` |
| `reports/locations/route.ts` | 759 | 254 | `locationReportOperations.ts` |
| `collection-reports-v2/machines/route.ts` | 738 | 323 | `machineOperations.ts` |
| `cabinets/[cabinetId]/route.ts` | 730 | 433 | `cabinetDetailOperations.ts` |
| `cabinets/[cabinetId]/chart/route.ts` | 659 | 219 | `chartOperations.ts` |
| `collection-reports/route.ts` | 655 | 492 | `reportListOperations.ts` |
| `locations/[locationId]/route.ts` | 669 | 321 | `locationByIdOperations.ts` |
| `cabinets/route.ts` | 621 | 360 | `cabinetListOperations.ts` |
| `collection-reports-v2/sessions/[sessionId]/route.ts` | 592 | 306 | `sessionOperations.ts` |
| `bill-validator/[machineId]/route.ts` | 587 | 265 | `validatorOperations.ts` |
| `collection-reports-v2/sessions/route.ts` | 592 | 273 | `sessionOperations.ts` |
| `profile/route.ts` | 570 | 311 | `profileOperations.ts` |
| `members/[id]/route.ts` | 575 | 344 | `memberByIdOperations.ts` |
| `vault/float-request/route.ts` | 532 | 368 | `floatRequestOperations.ts` |
| `vault/expense/route.ts` | 523 | 337 | `expenseOperations.ts` |

**Type fixes:** 13 `interface`→`type`, 14 untyped `.lean()`→`.lean<T>()`, ~20 `Record<string,unknown>`→proper types.

### Frontend (Phase 1 Complete ✅ — Phase 2 Remaining)

**Phase 1 completed (June 2026):**

| Category | Files | Fix |
|---|---|---|
| `interface`→`type` in components | 25 files | VAULT/overview, CMS/collectionReport/variations, shared/ui — all 25 converted |
| `interface`→`type` in lib/hooks | 1 file | `useCollectionReportVariationCheck.ts` converted (6 interfaces) |
| `interface`→`type` in components (remaining) | 2 files | `VaultEndOfDayReportsPageContent.tsx`, `VaultOverviewRecordExpenseModal.tsx` (inline) |
| Comments removed from shared types | 3 files | No-comment rule enforced across `shared/types/` |
| Stale JSDoc removed | 2 files | Cleaned from shared type files |
| File-level JSDoc added | 6 app/ pages | All pages missing JSDoc now documented |
| Single-letter variable renames | 8 component files | ~16 instances renamed (`r`→`role`, `l`→`loc`, `m`→`machine`, etc.) |
| `Record<string,unknown>`→proper types in components | 3 files | 4 replacements |
| `Record<string,unknown>`→proper types in lib/ | 2 files | 7 replacements |
| `Record<string,unknown>`→proper types in shared/types | 3 files | ~14 replacements |
| Oversized page.tsx split | 2 files | `app/install/page.tsx` (320→wrapper+content), `app/auth/recovery/2fa/page.tsx` (263→wrapper+content) |
| Duplicate import fix | 1 file | `lib/types/components/props.ts` — duplicate `Location` import removed |

**Remaining issues:**

#### Components (`components/`)
- **15 files >1000 lines** — critical extraction candidates (worst: `AdministrationUserModal.tsx` 3086, `CollectionReportV2SessionDetail.tsx` 2489, `AdministrationAddUserModal.tsx` 1938)
- **~60 `Record<string, unknown>`** uses remaining (worst: `ReportsLocationsRevenueTable.tsx`, `ConfigurationCard.tsx`)
- **~20 single-letter variables** remaining in loops/maps
- **~70 files missing file-level JSDoc**
- **~104 files over 400 lines** need splitting
- **2 `Record<string,unknown>` type errors** (`ReportsLocationsTab.tsx:646,648`) — actual type errors, not just style

#### Pages (`app/`)
- **All pages now have file-level JSDoc** ✅
- **All oversized pages split** ✅
- **All other patterns:** ✅ clean

#### Hooks/Stores/Helpers (`lib/`)
- **5 files >1000 lines** — critical (`useEditCollectionModal.ts` 2522, `vaultHelpers.ts` 1880, `useNewCollectionModal.ts` 1811, `useMobileEditCollectionModal.ts` 1648, `useMobileCollectionModal.ts` 1412)
- **0 interfaces** remaining in lib/ ✅
- **~110+ `Record<string, unknown>`** uses
- **~200+ exported functions** missing JSDoc
- **~23 files** missing section separators
- **4 Date→string cast errors** in `vaultHelpers.ts` — actual type errors
- **React/any:** ✅ clean

#### Shared Types (`shared/`)
- 4 files over 400 lines (`models.ts` 1332, `entities.ts` 677, `reports.ts` 593, `vault.ts` 513)
- **0 comments in type files** ✅ (rule enforced)
- **~7 `Record<string, unknown>`** uses remaining
- **interfaces/any/React:** ✅ clean

#### Pre-existing type-check errors (not yet fixed)
- `DashboardDesktopLayout.tsx:221` — Location type mismatch
- `DashboardMobileLayout.tsx:197` — Location type mismatch
- `ReportsLocationsTab.tsx:646,648` — `Record<string,unknown>[]` not assignable
- `vaultHelpers.ts:564,617,808,1046` — Date→string cast
