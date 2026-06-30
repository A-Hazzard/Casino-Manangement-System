# Evolution One CMS — Code Review Rules for Bugbot

**Name:** `evolution-one-standards`

---

## Rule Content (paste into GitLab Bugbot)

This is a Next.js 15 casino management system (CMS + Vault modes) using TypeScript, MongoDB/Mongoose, Zustand, and Tailwind CSS. It is multi-tenant with strict licencee isolation. Follow these rules for ALL pull requests.

---

### 1. ZERO-TYPE-SAFETY VIOLATIONS

**`any` is strictly prohibited.** No `any` in variables, parameters, return types, or generics. Use concrete types from `shared/types/` (frontend+backend), `lib/types/` (frontend-only), or `app/api/lib/types/` (backend-only). Use `unknown` only when the type truly cannot be determined at compile time, then cast immediately after validation.

**Prefer `type` over `interface`** unless forced by library requirements or declaration merging.

**No `Record<string, unknown>` for domain data.** Use `Pick<Type, Keys>` or specific types. Only use `Record` when the value is truly unknown (e.g., dynamic API response).

**No comments in type files** (`shared/types/`, `lib/types/`, `app/api/lib/types/`). Type names must be self-documenting.

**No single-letter variables.** Never use `s`, `c`, `i`, `g`, `m`, `l`, `r` etc. Use descriptive names: `sum`, `collection`, `index`, `gamingLocation`, `machine`, `location`, `role`.

**No underscore-prefixed variables** except `_id` for MongoDB document IDs.

**All IDs are strings.** Document `_id` fields are `string`, NOT `ObjectId`. Types must reflect `_id: string`.

---

### 2. BACKEND DATABASE RULES

**Always use Mongoose models.** Import from `@/app/api/lib/models/`. Never use `db.collection()` directly — it bypasses type safety and indexes.

**Use `findOne({ _id: id })` not `findById(id)`.** `findById` expects ObjectId, but all IDs in this codebase are strings. Same for `findOneAndUpdate` vs `findByIdAndUpdate`.

**Type all queries with generics:**
- `.lean<ClassName>()` for single documents
- `.lean<ClassName[]>()` for find queries
- `.lean<ClassName>().cursor().toArray()` for large/unbounded result sets
- `.aggregate<ClassName>([...]).exec()` for aggregation pipelines

Never use bare `.lean()` — it forces `Record<string, unknown>` casts downstream.

**Soft-delete filter:** `$or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }]`

**Parameter guards:** All exported functions MUST validate required parameters at the top with early returns. Log errors with `[functionName] paramName is required` prefix.

**Critical operation result checking:** Always check results of `findOneAndDelete`, `findOneAndUpdate`, `deleteOne`. Log with `[functionName] Failed to [operation] [resource] [id]`. Return early on failure for critical operations.

**Catch blocks:** Never type-annotate catch parameters. Use `console.error('[functionName] Error:', e instanceof Error ? e.message : 'Unknown error')`.

---

### 3. LICENCEE & LOCATION ACCESS CONTROL (CRITICAL — DATA ISOLATION)

**Every API route returning location/machine data MUST apply licencee filtering:**

1. Read `licencee` query param (support BOTH spellings: `licencee` and `licencee`)
2. Call `getUserLocationFilter(licencee)` from `@/app/api/lib/helpers/licenceeFilter`
3. If result is `'all'` — no filter needed (admins/developers/owners)
4. If result is empty array `[]` — return empty data (user has no access)
5. Apply filter: `matchStage['gamingLocation'] = { $in: allowedLocationIds }`

**Intersection logic:**
- **Managers**: See ALL locations under their `assignedLicencees`
- **Collectors/Location Admins/Technicians**: See ONLY `assignedLocations` that ALSO belong to their `assignedLicencees` (intersection)
- **Developers/Admins/Owners**: See everything

**Session invalidation:** When changing user `assignedLicencees`, `assignedLocations`, or `roles`, you MUST increment `sessionVersion` via `$inc: { sessionVersion: 1 }`.

---

### 4. MONGOOSE QUERY TYPING (CRITICAL)

Every query MUST specify its return type through generics — never cast results after the fact.

```typescript
// ✅ Single document
const machine = await Machine.findOne({ _id: id }).lean<GamingMachine>();

// ✅ Small bounded set
const machines = await Machine.find({ gamingLocation: id }).lean<GamingMachine[]>();

// ✅ Large/unbounded — stream to prevent memory spikes
const machines = await Machine.find({}).lean<GamingMachine>().cursor().toArray();

// ✅ Aggregation
const results = await Machine.aggregate<GamingMachine>([...]).exec();

// ❌ NEVER — bare .lean() forces Record<string, unknown> casts
const machine = await Machine.findOne({ _id: id }).lean();
```

Type generics MUST come from `shared/types/` (imported via `@shared/types`), not inline object literals.

---

### 5. REACT & FRONTEND RULES

**Never import React namespace.** Use `import { useState, useEffect, FC } from 'react'`. Never `import React from 'react'` or `React.useState`.

**No generic spinners or "Loading..." text.** Every page/component with async data MUST use a content-specific skeleton loader in `components/ui/skeletons/` or `components/shared/ui/skeletons/`. Skeletons must exactly match the real content layout including responsive behavior (desktop table + mobile cards).

**Component structure order:** Hooks → Computed → Handlers → Effects → Render.

**Section comments:** Use `// ============================================================================` separators with domain-specific labels (e.g., `// Router & Component State`, `// Machine Interaction Handlers`). Never use generic labels like `// Hooks & State` or `// Render Logic`.

**File-level JSDoc:** Required for all API routes, page.tsx files, complex components (>200 lines), and helper files with multiple functions.

**Responsive modals:** Full-screen on mobile (`inset-0 w-full h-[100dvh]`), constrained on desktop (`md:` classes). Use `flex flex-col` + `flex-1 overflow-y-auto` for scrollable forms. Close button must be `z-50`.

---

### 6. FILE ORGANIZATION & NAMING

**Type location hierarchy (enforced):**
- `shared/types/` — types used by both frontend and backend
- `lib/types/` — types used only in components, hooks, or client utilities
- `app/api/lib/types/` — types used only in API routes or helpers
- Types used in both frontend and backend MUST be in `shared/types/`

**Naming conventions:**
- Page content components: `[PageName]PageContent.tsx`
- Prop types: `type [ComponentName]Props = { ... }`
- Event handlers: prefix `handle` (e.g., `handleRefresh`)
- Data fetching: prefix `fetch` (e.g., `fetchLocationData`)
- Transformation helpers: prefix `format`, `calculate`, or `map`
- File names reflect what the code DOES, not where it runs (no `frontendCalculation.ts`, `clientUtils.ts`)

**File length limits:**
- API route files: ≤500 lines
- Helper files: ≤600 lines
- Model files: ≤400 lines
- Page.tsx: ≤150 lines (thin wrapper)
- Components: ≤400-500 lines

---

### 7. API ROUTE STRUCTURE (MANDATORY)

Every API route handler MUST:

1. Have **file-level JSDoc** with `@module app/api/[path]/route` tag and feature bullets
2. Use `withApiAuth` from `@/app/api/lib/helpers/apiWrapper` for authentication
3. Include **performance tracking**: `const startTime = Date.now()` at top; log if >1000ms
4. Have **numbered steps** with `// ============================================================================` separators and `// STEP N: Description` labels
5. Document the **flow** in function JSDoc before implementation
6. Extract logic >20-30 lines to `app/api/lib/helpers/[feature].ts`

---

### 8. FINANCIAL DATA & CURRENCY

**Never hardcode `$` or use `style: 'currency', currency: 'USD'` in components.** Use `formatCurrencyWithCodeString(amount, displayCurrency)` from `lib/utils/currency.ts`.

**Format:** `[Sign][CurrencyCode] [Amount]` — e.g., `USD 10,000.00`, `-BBD 2,000.00`

**APIs:** Pass `?currency=[displayCurrency]` so the server converts raw DB amounts. Frontend displays, not converts.

**Rounding:** Round to 2 decimals at display point: `Math.round(value * 100) / 100`. Conversion helpers (`convertToUSD`/`convertFromUSD`) do NOT round.

**Financial color coding:** Green for positive/income, Red for negative/expenses. Use `getFinancialColorClass` from `lib/utils/financial/colors.ts`.

**Reviewer scale:** Apply AFTER currency conversion via `getReviewerScale` from `app/api/lib/utils/reviewerScale.ts`. Never inline scale logic.

---

### 9. PERFORMANCE — METERS QUERIES (CRITICAL)

- **`Meters.aggregate()` MUST use `.cursor({ batchSize: 1000 })`** instead of `.exec()`
- **Use `location` field directly** from Meters — never `$lookup` to machines then locations
- **Eliminate N+1 patterns** — batch all location IDs, query once, combine in memory
- **Per-location gaming day offsets** — calculate global date range, aggregate globally, filter in memory by location-specific ranges
- **Performance targets:** 7-day queries <10s, 30-day queries <15s

---

### 10. GAMING DAY OFFSET

- Gaming day runs **8 AM to 8 AM** (Trinidad UTC-4), not midnight-to-midnight
- **Rollover rule:** If local hour < 8 AM, queries for "Today" MUST resolve to the previous calendar day's 8 AM start
- Default offset is 8; configurable per location via `gamingLocations.gameDayOffset` (0-23)
- Use `??` not `||` for offset so `0` is respected as valid
- Applied to: dashboard, reports, analytics. NOT applied to: collection reports, activity logs, sessions

---

### 11. COOKIE & HTTP/HTTPS SECURITY

- **Never hardcode `secure: true`** on cookies. Use `getAuthCookieOptions()` from `lib/utils/cookieSecurity.ts`
- `sameSite` must always be `'lax'`. Never `'none'` unless cross-site embedding is explicitly required
- Browsers silently drop `secure: true` cookies on HTTP connections — this breaks authentication on IP access

---

### 12. COLLECTION REPORT INVARIANTS

- **`locationReportId` and `isCompleted` MUST be synchronized.** If `locationReportId` is set, `isCompleted` MUST be true. If empty, `isCompleted` MUST be false.
- **Never send `prevIn`/`prevOut` from frontend.** Backend calculates these from previous collection or `machine.collectionMeters` fallback.
- **Creation flow** (`updateMachineCollectionData`): Updates machine's `collectionMeters` — meter state moves FORWARD
- **Edit flow** (`PATCH /api/collection-reports/collections/[id]`): Updates collection document ONLY — does NOT update `machine.collectionMeters`
- **isEditing flag:** `true` = report checked out for editing (incomplete, unsafe for financial reporting). `false` = report finalized, auditable. Filter `isEditing: false` for all financial reporting queries.
- **Machine histories** are created when report is finalized, not when collection is created
- **Online SMIB** (`relayId` exists + recent `lastActivity`): Do NOT mutate `sasMeters` during CR creation — relay handles it

---

### 13. ERROR HANDLING PATTERNS

**Catch blocks — prefix with function name, message only:**
```typescript
} catch (e) {
  console.error('[functionName] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

**Never:**
- Type-annotate catch parameters (`catch (e: any)` or `catch (e: unknown)`)
- Log entire error objects (`console.error(e)`)
- Use complex if-else chains in catch blocks

**Always check results of critical DB operations:**
```typescript
const result = await Meters.findOneAndDelete({ _id: meterId });
if (!result) {
  console.error(`[deleteMeter] Failed to delete meter ${meterId}`);
  return { success: false };
}
```

---

### 14. ESLINT & BUILD INTEGRITY

- Run `bun run check` (type-check + lint) before committing
- Never ignore ESLint rule violations — fix the issue, don't suppress with `// eslint-disable`
- Use `bun run lint --fix` for auto-fixable violations
- Only pre-existing error to ignore: `scratch/simulate-supplemental.ts`

---

### 15. STATE MANAGEMENT

- **Server state:** React Query (TanStack Query) for all API data fetching
- **Client state:** Zustand stores in `lib/store/` (one per domain)
- **User data caching:** Use `fetchUserWithCache` from `lib/services/userCacheService.ts` with `CACHE_KEYS` constants
- Never cache real-time data in user cache
- Include `selectedLicencee` in ALL data fetching queries and useEffect dependency arrays

---

### 16. JSX & COMPONENT QUALITY

- Use JSX comments to mark major UI sections: headers, filters, tables, forms, modals, pagination
- Separate major UI sections with blank lines
- Group related elements together
- Make nested structures readable
- Avoid dense, unspaced JSX blocks

---

### 17. WHAT TO REJECT

Reject the PR if any of these are found:
- Any use of `any` type
- `import React from 'react'` or `React.` namespace usage
- `db.collection()` direct access
- `findById()` or `findByIdAndUpdate()` usage
- Bare `.lean()` without type generic
- Missing licencee/location filtering on data APIs
- Hardcoded `$` or `style: 'currency'` in components
- Generic "Loading..." text or spinners instead of skeleton loaders
- `Record<string, unknown>` used for core domain types
- `interface` used instead of `type` (without library justification)
- Single-letter variable names
- Missing parameter guards on exported functions
- Missing result checking on critical DB operations
- Hardcoded `secure: true` on cookies
- `||` used instead of `??` for gaming day offset
- API route files >500 lines without helper extraction
- Components >500 lines without sub-component extraction
- Missing file-level JSDoc on API routes or page.tsx files
