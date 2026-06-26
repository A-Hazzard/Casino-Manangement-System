# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It is the single source of truth for architectural invariants, data integrity, and system philosophy for the Evolution One CMS project. `AGENTS.md` is a condensed mirror of this file for other agent tools — keep the two in sync when invariants change.

> **How guidance is layered (read in this priority order):**
>
> 1. **`CLAUDE.md`** (this file) — master context: system philosophy and invariants.
> 2. **`.claude/skills/`** — operational, task-triggered patterns. Claude Code auto-loads the relevant skill when a task matches (e.g. editing an API route loads `api-route-structure`). You do not need to read these manually.
> 3. **`.instructions/`** — deep-dive rule files and domain guides. Load on-demand when a task touches that domain (see [Skills & Instruction Map](#-skills--instruction-map)).
> 4. **Directory `README.md` files** — local conventions for a folder (see [Directory READMEs](#-directory-readmes)).

---

## 🏗️ Project & Architectural Foundations

### 1. Overview

**Evolution One CMS** is a casino management system for real-time operations, financial tracking, and compliance. It is a unified Next.js App Router application where routing and features are determined by the user's assigned role.

**Financial flow**: `Member Session` → `Machine Events` → `Meter Readings` → `Collections` → `Collection Reports`

### 2. Two-Layer Helper Architecture

Server-side and client-side logic are strictly separated:

- **Server helpers**: `app/api/lib/helpers/` — DB queries, aggregations, calculations run in API routes.
- **Client helpers**: `lib/helpers/` — Data transformation, UI logic, form helpers run in components.
- **Shared types/utils**: `shared/` — Types and pure utilities used by both sides. Path alias `@shared/*`.

Never import from `app/api/lib/` in client components, and never import from `lib/` in API routes.

### 3. CMS vs VAULT Mode (`process.env.APPLICATION`)

The app has two distinct operating modes sharing one codebase:

- **CMS Mode**: Casino management metrics, collection reports, analytics.
- **VAULT Mode**: Cash desk operations — Vault balance, Floats, Transfers, Cashier shifts.
- **Components**: Domain-split into `components/CMS/` and `components/VAULT/` mirroring page routes.
- **Routing**: Authorized VAULT users are redirected to `/vault-management`.

### 4. Multi-Tenant Isolation & Access Control

- **Licencee Isolation**: Every user belongs to one or more `assignedLicencees`. Data leakage between licencees is a critical failure.
- **Intersection Logic (Critical)**:
  - **Managers**: See ALL locations under their `assignedLicencees`.
  - **Collectors/Location Admins/Technicians**: See ONLY `assignedLocations` that ALSO belong to their `assignedLicencees`.
- **Role Hierarchy**: 1. Developer, 2. Owner, 3. Admin, 4. Manager, 5. Location Admin, 6. Vault-Manager, 7. Cashier, 8. Technician, 9. Collector, 10. Reviewer.
- **Session Invalidation**: Changes to roles, licencees, or locations MUST increment `sessionVersion` on the user document to force re-login.

Deep dive: `@.instructions/licencee-access-context.md` · `@.instructions/authorization.md`. Skill: `licencee-access-control`.

### 5. The Financial Reviewer Scale

The `reviewer` role sees a scaled-down version of all currency metrics to protect actual business performance data.

- **Formula**: `scale = 1 - multiplier` (e.g., multiplier 0.30 results in 0.70 scale).
- **Rule**: If `reviewer` role is missing or `multiplier` is null/0, `scale = 1`.
- Apply AFTER currency conversion, via `getReviewerScale` from `app/api/lib/utils/reviewerScale.ts` — never inline.

### 6. Command & Search Execution Constraints (CRITICAL)

- **Do NOT scan `.next` or `node_modules` folders** when searching for files, using grep/Select-String, or running shell commands. Always exclude these folders explicitly (e.g. `-Exclude *.next*,*node_modules*`) to prevent massive search loops and terminal output flood.

---

## 💰 Financial & Collection Systems

### 1. Key Financial Metrics

- **Drop (Money In)**: Physical cash inserted (`movement.drop`).
- **Money Out**: Manual payouts (`movement.totalCancelledCredits`).
- **Gross Revenue**: `Drop - Money Out`.
- **Net Gross**: `Gross - Jackpot`. **MANDATORY** metric for true revenue tracking.
- **Movement Delta Method**: MANDATORY. Sum movement fields from meters; never use a cumulative approach alone for periodic analysis.

### 2. Business Day & Gaming Day Offset

- **Trinidad Time (UTC-4)**: Business days run **8 AM to 8 AM**, not midnight.
- **Rollover Rule**: If local time < 8 AM, queries for "Today" MUST resolve to the previous calendar day's 8 AM start.
- **Default offset is 8**; configurable per location via `gamingLocations.gameDayOffset` (0-23). Use `??` not `||` so `0` is respected.
- **Application**: Applied to financial metrics (dashboard, reports, analytics). Do NOT apply to collection reports or user sessions.

Deep dive: `@.instructions/gaming-day-offset-system.md`. Skill: `gaming-day-offset-system`. Helper: `lib/utils/gamingDayRange.ts`.

### 3. `isEditing` — The Transactional State

The system uses the `isEditing` flag on `CollectionReport` documents to manage data integrity.

- **State 2 (isEditing: true)**: Report is "Checked Out". Collections are being modified, machine histories are NOT yet synced. Unsafe for financial reporting.
- **State 3 (isEditing: false)**: Report is "Finalized". Machine histories are synchronized; record is auditable. Filter `isEditing: false` for all financial reporting queries.

Deep dive: `@.instructions/isediting-system.md`.

### 4. Collection Data Invariants

- **Synchronization**: `locationReportId` and `isCompleted` MUST be kept in sync.
- **prevIn / prevOut Priority**:
  1. Primary: The `metersIn/Out` from the machine's actual previous completed collection.
  2. Fallback: The `machine.collectionMeters` values.
- **Never send `prevIn`/`prevOut` from the frontend** — the backend calculates these.
- **Movement Delta**: `movement.gross` is the ground truth. Recalculations are ONLY permitted in the "Add Entry" phase; once saved, `movement.gross` is fixed.
- **Creation vs Edit flow**: `updateMachineCollectionData` (creation) advances the machine's meter state. Editing a collection entry (`PATCH /api/collection-reports/collections/[id]`) MUST NOT update `machine.collectionMeters`.

Deep dive: `@.instructions/collection-reports-guidelines.md` · `@.claude/collection-report-study.md` · `@.claude/collection-report-v2-plan.md`.

### 5. SMIB Online/Offline Detection

- **Online SMIB**: `relayId` exists AND `lastActivity` is recent — the relay handles `sasMeters`; do NOT mutate them during collection-report creation.
- **Offline SMIB**: `relayId` exists BUT `lastActivity` is stale — update `sasMeters.drop` and `sasMeters.totalCancelledCredits` with collector-entered values during CR creation.

---

## 💻 Technical Standards & Conventions

### 1. API Routes — Structure & `withApiAuth` Wrapper

Every authenticated API route MUST use `withApiAuth` from `app/api/lib/helpers/apiWrapper.ts`:

```ts
export async function GET(req: NextRequest) {
  return withApiAuth(req, async ({ user, userRoles, isAdminOrDev }) => {
    return NextResponse.json({ success: true, data: result });
  });
}
```

Options: `{ optionalAuth: true }` for public routes, `{ bypassDb: true }` when DB is not needed.

Every route handler MUST also follow this structure:

- **File-level JSDoc** with `@module app/api/[path]/route` tag and feature bullets.
- **Performance tracking**: `const startTime = Date.now()` at the top; log a warning if `Date.now() - startTime > 1000`.
- **Numbered steps** with `// ============================================================================` separators and `// STEP N: Description` labels.
- **Flow documented in JSDoc** above the handler listing the steps.
- **Extract** any logic >20–30 lines to `app/api/lib/helpers/[feature].ts`.
- **File length limits**: route files ≤500 lines, helper files ≤600 lines, models ≤400 lines.

Skill: `api-route-structure`. Reference route: `app/api/reports/meters/route.ts`.

### 2. Database (MongoDB)

- **ID Pattern**: Use **String IDs** for everything (`_id: string`, NOT `ObjectId`).
- **Query Tools**: Always use `findOne({ _id: id })`. **NEVER use `findById`** or `findByIdAndUpdate`.
- **Deleted State**: Use `$or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }]` for legacy vs active records.
- **Models**: Always use imported Mongoose models from `app/api/lib/models/`. Never use `db.collection()`. See [`app/api/lib/models/README.md`](app/api/lib/models/README.md) for the full catalog.
- **Licencee filtering**: Always apply via `getUserLocationFilter` from `licenceeFilter.ts`; support both `licencee` and `licencee` spellings in query params.

Skill: `backend-standards`.

### 3. Mongoose Query Typing (CRITICAL)

Every query MUST specify its return type through generics — never cast results after the fact.

```ts
// ✅ Single document
const machine = await Machine.findOne({ _id: id }).lean<GamingMachine>();

// ✅ Small bounded set
const machines = await Machine.find({ gamingLocation: id }).lean<GamingMachine[]>();

// ✅ Large/unbounded set — stream to prevent memory spikes
const machines = await Machine.find({}).lean<GamingMachine>().cursor().toArray();

// ✅ Aggregation
const results = await Machine.aggregate<GamingMachine>([...]).exec();

// ❌ NEVER — bare .lean() forces Record<string, unknown> casts everywhere
const machine = await Machine.findOne({ _id: id }).lean();
```

Type generics MUST come from `shared/types/` (imported via `@shared/types`), not inline object literals. Deep dive: `@.instructions/rules/mongoose-query-typing.md`.

### 4. Performance — Meters Queries (CRITICAL)

- **`Meters.aggregate()` MUST use `.cursor({ batchSize: 1000 })`** instead of `.exec()`. Loading large meter sets with `.exec()` causes memory spikes and timeouts.
- **Use `location` field directly** from Meters — never `$lookup` to machines then locations. This avoids a 10–20× performance penalty.
- **Eliminate N+1 patterns**: batch all location IDs, query once, combine in memory.
- **Per-location gaming day offsets**: calculate a global date range (earliest start, latest end), aggregate globally, then filter in memory by location-specific ranges.
- **Performance targets**: 7-day queries <10s, 30-day queries <15s.

```ts
// ✅ CORRECT
const cursor = Meters.aggregate(pipeline, { allowDiskUse: true }).cursor({
  batchSize: 1000,
});
for await (const doc of cursor) {
  results.push(doc);
}

// ❌ WRONG
const results = await Meters.aggregate(pipeline).exec();
```

Skill: `database-query-optimization`.

### 5. TypeScript & Naming Conventions (CRITICAL)

- **No `any`**: Create proper types or use `unknown`. Avoid `Record<string, unknown>` for domain data.
- **No Single-Letter Variables**: Never use `s`, `c`, `i`, etc. Use `sum`, `collection`, `index`.
- **No underscore-prefixed variables** except `_id` for MongoDB.
- **Prefer `type` over `interface`**. Path aliases: `@/*` = root, `@shared/*` = `shared/`.
- **Type location hierarchy**:
  - `shared/types/` — used by both frontend and backend (models, DTOs).
  - `lib/types/` — frontend only (component props, hook types, UI state).
  - `app/api/lib/types/` — backend only (API internals).
  - `types/` — global definitions, env vars, polyfills.
- **No comments in type files** (`shared/types/`, `lib/types/`, `app/api/lib/types/`). Names must be self-documenting.
- **Section Comments**: Use `// ============================================================================` separators with domain-specific labels (e.g., `// Router & Component State`, `// Machine Interaction Handlers`). Never use generic labels like `// Hooks & State` or `// Render Logic`.

Skills: `react-typescript-rules`, `code-style-eslint`. Deep dive: `@.instructions/rules/type-safety.md`, `@.instructions/rules/naming-conventions.md`.

### 6. Component & File Naming

- **Page content components**: `[PageName]PageContent.tsx` (e.g., `ReportsPageContent.tsx`).
- **Prop types**: `type [ComponentName]Props = { ... }`.
- **Event handlers**: prefix `handle` (e.g., `handleRefresh`).
- **Data fetching functions**: prefix `fetch` (e.g., `fetchLocationData`).
- **Transformation helpers**: prefix `format`, `calculate`, or `map`.
- **File names**: reflect what the code **does**, not where it runs (no `frontendCalculation.ts`, `clientUtils.ts`).
- **Component subfolders**: `tabs/`, `modals/`, `layouts/`, `details/`, `sections/`, `common/`, `forms/`, `tables/`, `cards/`, `skeletons/`, `mobile/`.

See [`components/README.md`](components/README.md) for the full component organization map. Skill: `file-organization`, `page-component-structure`.

### 7. Custom Hook Structure

Sections inside hooks MUST appear in this order:

1. External Dependencies → 2. Type Definitions → 3. Helper Functions → 4. Main Hook → 5. Store State → 6. Local State (grouped by concern) → 7. Form Data Bindings → 8. Computed Values → 9. Debounced Values → 10. Refs → 11. Effects → 12. Event Handlers (grouped by category) → 13. Return.

Reference: `lib/hooks/collectionReport/useNewCollectionModal.ts`. Catalog: [`lib/hooks/README.md`](lib/hooks/README.md).

### 8. Error Handling Patterns

```ts
// Catch blocks — prefix with function name, message only
} catch (e) {
  console.error('[functionName] Error:', e instanceof Error ? e.message : 'Unknown error');
}

// Always check results of critical DB operations
const result = await Meters.findOneAndDelete({ _id: meterId });
if (!result) {
  console.error(`[deleteMeter] Failed to delete meter ${meterId}`);
  return { success: false };
}
```

- Never annotate catch parameters (`catch (e: unknown)` is wrong — just `catch (e)`).
- Always validate mandatory parameters at the top of helper functions with early returns.

### 9. React & Frontend

- **React Imports**: NEVER import the React namespace. Use `import { useState, FC } from 'react'`.
- **Loading States**: Every page/modal MUST have a matching skeleton in `components/ui/skeletons/` or `components/shared/ui/skeletons/`. No generic spinners. Skeletons must exactly match the real content layout including responsive variants.
- **Component Structure**: 1. Hooks → 2. Computed → 3. Handlers → 4. Effects → 5. Render.
- **Responsive Modals**: Full-screen on mobile (`inset-0 w-full h-[100dvh]`), constrained on desktop (`md:` classes). Use `flex flex-col` + `flex-1 overflow-y-auto` for scrollable forms. Close button must be `z-50`.

Skill: `skeleton-loaders`. Deep dive: `@.instructions/rules/nextjs-rules.md`.

### 10. State Management

- **Server state**: React Query (TanStack Query) — all API data fetching in components uses `useQuery`/`useMutation`.
- **Client state**: Zustand stores in `lib/store/` (one per domain). See [`lib/store/README.md`](lib/store/README.md).
- **User data caching**: Use `fetchUserWithCache` from `lib/services/userCacheService.ts` with `CACHE_KEYS` constants (or `useCurrentUserQuery` for the React Query path). Do not cache real-time data.

### 11. Currency Display (CRITICAL)

- **NEVER hardcode `$`** or use `Intl.NumberFormat` with `style: 'currency', currency: 'USD'` inside components.
- **Universal format**: `[Sign][CurrencyCode] [Amount]` → e.g., `USD 10,000.00`, `-BBD 2,000.00`.
- **Always**: `const { displayCurrency } = useCurrencyFormat();` then `formatCurrencyWithCodeString(amount, displayCurrency)` from `lib/utils/currency.ts`.
- **APIs**: pass `?currency=[displayCurrency]` so the server converts raw DB amounts. Frontend components should display, not convert.
- **Rounding**: round to 2 decimals at the display point (`Math.round(value * 100) / 100`). `convertToUSD`/`convertFromUSD` do NOT round — they're intermediate. Guard same-currency conversions (`nativeCurrency !== displayCurrency`).
- **Null/NaN**: the formatter outputs `--` or `-` for technicians automatically.
- **Charts**: tooltip formatters must also use `formatCurrencyWithCodeString`.

Deep dive: `@.instructions/rules/currency-display.md`.

### 12. Financial Color Coding

Use `getFinancialColorClass` / `getGrossColorClass` from `lib/utils/financial/colors.ts` consistently:

- **Green**: positive values, income, "Money In".
- **Red**: negative values, expenses, "Money Out".
- **Neutral**: zero or non-directional metrics.

Financial numbers in tables should be **right-aligned**.

### 13. Cookie & HTTP/HTTPS Security

- **The Rule**: Never hardcode `secure: true`.
- **Usage**: Always use `getAuthCookieOptions()` from `lib/utils/cookieSecurity.ts`.
- **sameSite**: Always `'lax'`. Never `'none'` unless cross-site embedding is explicitly required.

Deep dive: `@.instructions/rules/http-https-cookie-rules.md`.

---

## 🧪 Testing

The active, maintained test suite is **Playwright end-to-end tests** in `e2e/`. Jest is present in `devDependencies` for unit tests, but there is no configured Jest script — e2e is the suite that runs in CI and locally.

```sh
bun run test:e2e          # All e2e tests, all browsers (auto-starts dev server)
bun run test:e2e:ui       # Playwright interactive UI (best for debugging)
bun run test:e2e:api      # API-management spec only (Chromium)
```

Run a single spec (Chromium only):

```sh
bunx playwright test e2e/tests/<file>.spec.ts -c e2e/playwright.config.ts --project=chromium
```

For repeated runs, start `bun run dev` first (Playwright reuses it) and add `--workers=1` to avoid OneDrive cold-compile flakiness. Full conventions: [`e2e/README.md`](e2e/README.md).

---

## 🚀 Operations & Tooling

### Commands

Use **bun exclusively** for all operations (the project has bun-specific overrides in `package.json`).

| Command | Description |
| --- | --- |
| `bun run dev` | Start dev server at `localhost:3000` |
| `bun run dev:https` | Dev with HTTPS (camera access on mobile, CR V2 capture) |
| `bun run check` | `type-check && lint` — run before committing |
| `bun run type-check` | TypeScript only (`tsc --noEmit`, 4 GB heap) |
| `bun run lint` / `lint:fix` | ESLint (with optional auto-fix) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run format` | Prettier |
| `bun run test:e2e` | Playwright e2e suite |

### Key Environment Variables

- `MONGODB_URI`, `JWT_SECRET`, `NEXTAUTH_SECRET`, `COOKIE_SECURE`
- `SENDGRID_API_KEY`, `GMAIL_USER`/`GMAIL_APP_PASSWORD`, `INFOBIP_BASE_URL`/`INFOBIP_API_KEY`
- `MQTT_URI`, `MQTT_PUB_TOPIC`, `MQTT_SUB_TOPIC`, `MQTT_CFG_TOPIC`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, Google Drive OAuth (`GOOGLE_DRIVE_OAUTH_CLIENT_ID/SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`)
- `APPLICATION` — `"CMS"` or `"VAULT"` to select operating mode

Full env reference: [`Documentation/backend/README.md`](Documentation/backend/README.md).

### MQTT Topics (Runtime)

| Topic | Direction | Purpose |
| --- | --- | --- |
| `sas/relay/{relayId}` | Publish | Commands to SMIB devices |
| `sas/gy/server` | Subscribe | Device responses (meter data) |
| `smib/config` | Subscribe | Config responses |
| `sas/gli/server/{relayId}` | Subscribe | GLI server data per device |
| `sas/server` | Subscribe | Additional server topic |

---

## 🧭 Skills & Instruction Map

Claude Code **auto-loads** the matching skill from `.claude/skills/` when your task fits — you don't load these by hand:

| Skill | Triggers on |
| --- | --- |
| `api-route-structure` | Creating/modifying API routes in `app/api/` |
| `backend-standards` | Backend DB operations (models, queries, filtering) |
| `code-style-eslint` | Any code change (style, comments, lint) |
| `database-query-optimization` | Meters queries, aggregations, performance |
| `file-organization` | Deciding where new files/code go |
| `gaming-day-offset-system` | Date/time calculations for reports & dashboards |
| `licencee-access-control` | Multi-tenant queries, role-based permissions |
| `page-component-structure` | `page.tsx` wrappers and complex components |
| `react-typescript-rules` | Any React/TypeScript code |
| `skeleton-loaders` | Loading states for async UI |

**`.instructions/` deep-dive rules** — load on demand when relevant (do NOT preload all):

- Engineering constitution: `@.instructions/rules/nextjs-rules.md`, `@.instructions/rules/type-safety.md`, `@.instructions/rules/naming-conventions.md`
- Domain: `@.instructions/collection-reports-guidelines.md`, `@.instructions/gaming-day-offset-system.md`, `@.instructions/isediting-system.md`, `@.instructions/licencee-access-context.md`, `@.instructions/authorization.md`, `@.instructions/vault-FRD.md`
- Cross-cutting: `@.instructions/rules/currency-display.md`, `@.instructions/rules/http-https-cookie-rules.md`, `@.instructions/rules/mongoose-query-typing.md`, `@.instructions/rules/application-context.md`

---

## 📁 Directory READMEs

Local conventions live next to the code they describe:

| Area | README |
| --- | --- |
| Project root / setup | [`README.md`](README.md) |
| Backend (API, env, deploy, RBAC) | [`Documentation/backend/README.md`](Documentation/backend/README.md) |
| Mongoose models catalog | [`app/api/lib/models/README.md`](app/api/lib/models/README.md) |
| Component organization | [`components/README.md`](components/README.md) |
| Custom hooks | [`lib/hooks/README.md`](lib/hooks/README.md) |
| Zustand stores | [`lib/store/README.md`](lib/store/README.md) |
| E2E test suite | [`e2e/README.md`](e2e/README.md) |
| Full documentation hub | [`Documentation/PROJECT_GUIDE.md`](Documentation/PROJECT_GUIDE.md) |

---

## ✅ Workflow Expectations

- **Persistence**: Keep going until the task is fully solved before ending your turn.
- **Plan, then reflect**: Plan before tool calls; reflect on the outcome after.
- **Use your tools, don't guess**: If unsure about code or files, open them — never hallucinate.
- **Check dependencies before deleting code**: grep for usages first.
- **Prefer shared types over duplicates**; trace API data flow before creating/modifying types.
- **Build integrity**: `bun run check` must pass before committing. The only known pre-existing error is in `scratch/simulate-supplemental.ts` (ignore it).

---

**Last Updated:** June 2026 — Maintained by Aaron Hazzard (Senior Software Engineer)
