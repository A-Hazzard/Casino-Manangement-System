# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file is the single source of truth for architectural invariants, data integrity, and system philosophy for the Evolution One CMS project.

## 🏗️ Project & Architectural Foundations

### 1. Overview

**Evolution1 CMS** is a casino management system for real-time operations, financial tracking, and compliance. It is a unified Next.js App Router application where routing and features are determined by the user's assigned role.

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

### 5. The Financial Reviewer Scale

The `reviewer` role sees a scaled-down version of all currency metrics to protect actual business performance data.

- **Formula**: `scale = 1 - multiplier` (e.g., multiplier 0.30 results in 0.70 scale).
- **Rule**: If `reviewer` role is missing or `multiplier` is null/0, `scale = 1`.

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
- **Application**: Applied to financial metrics (dashboard, reports, analytics). Do NOT apply to collection reports or user sessions.

### 3. `isEditing` — The Transactional State

The system uses the `isEditing` flag on `CollectionReport` documents to manage data integrity.

- **State 2 (isEditing: true)**: Report is "Checked Out". Collections are being modified, machine histories are NOT yet synced. Unsafe for financial reporting.
- **State 3 (isEditing: false)**: Report is "Finalized". Machine histories are synchronized; record is auditable.

### 4. Collection Data Invariants

- **Synchronization**: `locationReportId` and `isCompleted` MUST be kept in sync.
- **prevIn / prevOut Priority**:
  1. Primary: The `metersIn/Out` from the machine's actual previous completed collection.
  2. Fallback: The `machine.collectionMeters` values.
- **Movement Delta**: `movement.gross` is the ground truth. Recalculations are ONLY permitted in the "Add Entry" phase; once saved, `movement.gross` is fixed.
- **Creation vs Edit flow**: `updateMachineCollectionData` (creation) advances the machine's meter state. Editing a collection entry (`PATCH /api/collection-reports/collections/[id]`) MUST NOT update `machine.collectionMeters`.

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

### 2. Database (MongoDB)

- **ID Pattern**: Use **String IDs** for everything (`_id: string`, NOT `ObjectId`).
- **Query Tools**: Always use `findOne({ _id: id })`. **NEVER use `findById`** or `findByIdAndUpdate`.
- **Deleted State**: Use `$or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }]` for legacy vs active records.
- **Models**: Always use imported Mongoose models from `app/api/lib/models/`. Never use `db.collection()`.
- **Licencee filtering**: Always apply via `getUserLocationFilter` from `licenceeFilter.ts`; support both `licencee` and `licencee` spellings in query params.

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

Type generics MUST come from `shared/types/` (imported via `@shared/types`), not inline object literals.

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

### 5. TypeScript & Naming Conventions (CRITICAL)

- **No `any`**: Create proper types or use `unknown`. Avoid `Record<string, unknown>` for domain data.
- **No Single-Letter Variables**: Never use `s`, `c`, `i`, etc. Use `sum`, `collection`, `index`.
- **No underscore-prefixed variables** except `_id` for MongoDB.
- **Prefer `type` over `interface`**. Path aliases: `@/*` = root, `@shared/*` = `shared/`.
- **Type location hierarchy**:
  - `shared/types/` — used by both frontend and backend (models, DTOs).
  - `lib/types/` — frontend only (component props, hook types, UI state).
  - `app/api/lib/types/` — backend only (API internals).
- **No comments in type files** (`shared/types/`, `lib/types/`, `app/api/lib/types/`). Names must be self-documenting.
- **Section Comments**: Use `// ============================================================================` separators with domain-specific labels (e.g., `// Router & Component State`, `// Machine Interaction Handlers`). Never use generic labels like `// Hooks & State` or `// Render Logic`.

### 6. Component & File Naming

- **Page content components**: `[PageName]PageContent.tsx` (e.g., `ReportsPageContent.tsx`).
- **Prop types**: `type [ComponentName]Props = { ... }`.
- **Event handlers**: prefix `handle` (e.g., `handleRefresh`).
- **Data fetching functions**: prefix `fetch` (e.g., `fetchLocationData`).
- **Transformation helpers**: prefix `format`, `calculate`, or `map`.
- **File names**: reflect what the code **does**, not where it runs (no `frontendCalculation.ts`, `clientUtils.ts`).
- **Component subfolders**: `tabs/`, `modals/`, `layouts/`, `details/`, `sections/`, `common/`, `forms/`, `tables/`, `cards/`, `skeletons/`, `mobile/`.

### 7. Custom Hook Structure

Sections inside hooks MUST appear in this order:

1. External Dependencies → 2. Type Definitions → 3. Helper Functions → 4. Main Hook → 5. Store State → 6. Local State (grouped by concern) → 7. Form Data Bindings → 8. Computed Values → 9. Debounced Values → 10. Refs → 11. Effects → 12. Event Handlers (grouped by category) → 13. Return.

Reference: `lib/hooks/collectionReport/useNewCollectionModal.ts`.

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
- **Loading States**: Every page/modal MUST have a matching skeleton in `components/ui/skeletons/`. No generic spinners. Skeletons must exactly match the real content layout including responsive variants.
- **Component Structure**: 1. Hooks → 2. Computed → 3. Handlers → 4. Effects → 5. Render.
- **Responsive Modals**: Full-screen on mobile (`inset-0 w-full h-[100dvh]`), constrained on desktop (`md:` classes). Use `flex flex-col` + `flex-1 overflow-y-auto` for scrollable forms. Close button must be `z-50`.

### 10. State Management

- **Server state**: React Query (TanStack Query) — all API data fetching in components uses `useQuery`/`useMutation`.
- **Client state**: Zustand stores in `lib/store/` (13 stores, one per domain).
- **User data caching**: Use `fetchUserWithCache` from `lib/utils/userCache` with `CACHE_KEYS` constants. Do not cache real-time data.

### 11. Currency Display (CRITICAL)

- **NEVER hardcode `$`** or use `Intl.NumberFormat` with `style: 'currency', currency: 'USD'` inside components.
- **Universal format**: `[Sign][CurrencyCode] [Amount]` → e.g., `USD 10,000.00`, `-BBD 2,000.00`.
- **Always**: `const { displayCurrency } = useCurrencyFormat();` then `formatCurrencyWithCodeString(amount, displayCurrency)` from `lib/utils/currency.ts`.
- **APIs**: pass `?currency=[displayCurrency]` so the server converts raw DB amounts. Frontend components should display, not convert.
- **Null/NaN**: the formatter outputs `--` or `-` for technicians automatically.
- **Charts**: tooltip formatters must also use `formatCurrencyWithCodeString`.

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

---

## 🚀 Operations & Tooling

### 1. Commands

Use **bun exclusively** for all operations.

- `bun run dev` - Start dev server at localhost:3000
- `bun run check` - Run type-check && lint before committing
- `bun run build` - Build Next.js application
- `bun run test` - Run Playwright e2e tests (dashboard suite, Chromium)

To run a single Playwright test file:

```sh
bunx playwright test e2e/tests/<file>.spec.ts -c e2e/playwright.config.ts --project=chromium
```

To run TypeScript unit tests with Jest:

```sh
bun jest <path/to/file.test.ts>
```

### 2. Key Environment Variables

- `MONGODB_URI`, `JWT_SECRET`, `COOKIE_SECURE`
- `SENDGRID_API_KEY`, `INFOBIP_BASE_URL`/`INFOBIP_API_KEY`
- `MQTT_URI`, `MQTT_PUB_TOPIC`, `MQTT_SUB_TOPIC`
- `APPLICATION` — `"CMS"` or `"VAULT"` to select operating mode

### 3. File Map & References

- **Licencee Filtering**: `app/api/lib/helpers/licenceeFilter.ts`
- **Reviewer Scale**: `app/api/lib/utils/reviewerScale.ts`
- **Gaming Day**: `lib/utils/gamingDayRange.ts`
- **Permissions**: `lib/utils/permissions/client.ts` / `server.ts`
- **DB Middleware**: `app/api/lib/middleware/db.ts`
- **API Wrapper**: `app/api/lib/helpers/apiWrapper.ts`
- **Activity Logger**: `app/api/lib/helpers/activityLogger.ts`
- **Currency Formatter**: `lib/utils/currency.ts` (`formatCurrencyWithCodeString`)
- **Currency Hook**: `useCurrencyFormat()` via `lib/contexts/CurrencyContext.tsx`
- **Financial Colors**: `lib/utils/financial/colors.ts`
- **User Cache**: `lib/utils/userCache.ts` (`fetchUserWithCache`, `CACHE_KEYS`)
- **Cookie Security**: `lib/utils/cookieSecurity.ts` (`getAuthCookieOptions`)
- **Reference API route**: `app/api/reports/meters/route.ts` (exemplary structure)
- **Reference hook**: `lib/hooks/collectionReport/useNewCollectionModal.ts` (exemplary structure)
