# Evolution One CMS — Refactor Handoff Prompt

This document is a complete briefing for an AI agent (or set of parallel agents) to continue a
page-by-page refactor of the Evolution One CMS codebase. Read it fully before touching any code.

---

## Project Overview

**Evolution One CMS** — Next.js App Router + TypeScript + MongoDB/Mongoose. Dual-mode app:
- **CMS mode** (`process.env.APPLICATION = "CMS"`) — casino management, reports, analytics
- **VAULT mode** (`process.env.APPLICATION = "VAULT"`) — cash desk, shifts, transfers, floats

**Working directory:** `C:\Users\aaron\Documents\Github\evolution-one-cms`

**Quality gate (run after every batch before moving on):**
```sh
bun run type-check   # must produce zero "error TS" lines
bun run lint         # must produce zero "error" lines
```

**CRITICAL search constraint:** NEVER scan `.next` or `node_modules` when grepping/globbing.

---

## Non-Negotiable Rules (apply to every file touched)

### API Routes
- Every authenticated route MUST use `withApiAuth` from `app/api/lib/helpers/apiWrapper.ts`
  ```ts
  export async function GET(req: NextRequest) {
    return withApiAuth(req, async ({ user, userRoles, isAdminOrDev }) => {
      const startTime = Date.now();
      // ...
      if (Date.now() - startTime > 1000) console.warn(`[fnName] slow: ${Date.now() - startTime}ms`);
      return NextResponse.json({ success: true, data: result });
    });
  }
  ```
- Remove `connectDB()` calls inside `withApiAuth` callbacks — wrapper handles it
- Use `{ optionalAuth: true }` for public/webhook routes, `{ bypassDb: true }` when no DB needed
- File-level `@module` JSDoc required on every route file
- `const startTime = Date.now()` at handler top; `>1000ms` warn before returning
- Numbered `STEP N:` comments separated by `// ========...` (80 `=`)
- Never use `findById` or `findByIdAndUpdate` — always `findOne({ _id: id })`

### Mongoose Query Typing
```ts
// ✅ CORRECT
const machine = await Machine.findOne({ _id: id }).lean<GamingMachine>();
const machines = await Machine.find({ location: id }).lean<GamingMachine[]>();
const results = await Machine.aggregate<GamingMachine>([...]).exec();
// Meters MUST use cursor — never .exec()
const cursor = Meters.aggregate(pipeline, { allowDiskUse: true }).cursor({ batchSize: 1000 });
for await (const doc of cursor) { results.push(doc); }

// ❌ NEVER
const machine = await Machine.findOne({ _id: id }).lean(); // bare lean = TS errors everywhere
```

### TypeScript
- Zero `any` — use proper types or `unknown`
- `catch (e)` not `catch (e: unknown)` — TS infers `unknown` automatically
- `type` over `interface`; no inline object literals for domain types
- No single-letter variables: `m`→`machine`, `l`→`location`, `r`→`role`, `s`→context, `i`→`index`

### React / Components
- NEVER `import React from 'react'` — named imports only: `import { useState, FC } from 'react'`
- No `React.FC`, `React.ReactNode`, `React.useState` — use `FC`, `ReactNode`, `useState`
- No `key={Math.random()}` — use `key={item._id}` or `key={`item-${index}`}`
- Remove debug `console.warn`/`console.log` at component top-level (render-time logs)
- Keep `console.error` on real error paths

### Currency Display (CRITICAL)
```tsx
// ✅ CORRECT — always
const { displayCurrency } = useCurrencyFormat(); // from '@/lib/hooks/useCurrencyFormat'
formatCurrencyWithCodeString(amount, displayCurrency) // from '@/lib/utils/currency'

// ❌ NEVER
`$${amount}`, `$${value.toLocaleString()}`, `TT${amount}`
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
```

### Section Comments
Use domain-specific labels, never generic:
```ts
// ❌ // Hooks & State    // ❌ // Render Logic
// ✅ // Form State & Loading    // ✅ // Table Handlers
```

---

## Work Log — May 2026 (Refactor Handoff Update)

### Utils/Helpers (Phases B, C, D) — All done ✅
- `lib/utils/permissions/` (client.ts + roleChecks.ts)
- `lib/utils/validation/` (email.ts, password.ts, members.ts, collectionReports.ts)
- `lib/utils/date/` (formatting.ts, profileFormatting.ts)
- `lib/utils/gamingDayRange.ts` (split into main + internal)
- `lib/helpers/vault/` (dataFetching.ts, cashierOps.ts, transfers.ts, eventHandlers.ts)
- `lib/helpers/cabinets/` (cabinetList.ts, cabinetCrud.ts, cabinetTotals.ts, cabinetHistory.ts)
- `lib/helpers/metrics.ts` (extracted sub-steps)
- `lib/helpers/administration/page.ts` (navigation/userManagement split)

## What Was Already Refactored (DO NOT re-touch these)

### API Routes — All done ✅
(As listed above)

### Components — Done ✅
(As listed above)

---

## Remaining Mission — Hook Refactoring (Phase E)

**Current Status:** Hook refactor was attempted but produced broken code (missing exports, type mismatches, missing imports, unused variables).

### High Priority: Hook Fixes (E1-E7)
Fix all TypeScript/ESLint errors in these hook modules:

1. **Mobile Edit Modal Fixes**:
   - `lib/hooks/collectionReport/useMobileEditCollectionModal.ts`
   - `lib/hooks/collectionReport/useMobileEditUI.ts`
   - `lib/hooks/collectionReport/useMobileEditData.ts`
   - `lib/hooks/collectionReport/useMobileEditSubmit.ts`

2. **Mobile New Modal Fixes**:
   - `lib/hooks/collectionReport/useMobileCollectionModal.ts`
   - `lib/hooks/collectionReport/useMobileNewUI.ts`
   - `lib/hooks/collectionReport/useMobileNewData.ts`
   - `lib/hooks/collectionReport/useMobileNewSubmit.ts`

3. **Desktop Modal Fixes**:
   - `lib/hooks/collectionReport/useEditCollectionModal.ts` + sub-hooks
   - `lib/hooks/collectionReport/useNewCollectionModal.ts` + sub-hooks

4. **Locations Hook Fixes**:
   - `lib/hooks/locations/useLocationCabinetsFetching.ts`
   - `lib/hooks/locations/useLocationCabinetsFiltering.ts`
   - `lib/hooks/reports/useLocationsFetching.ts`

### General Fix Checklist for broken hooks:
- [ ] Create `lib/hooks/collectionReport/types.ts` for all shared types (MobileModalState, etc.)
- [ ] Ensure all sub-hooks export what the composition hook expects
- [ ] Fix missing React imports: `useState`, `useMemo`, `useCallback`, `useEffect`, `useRef`
- [ ] Add explicit type annotations to `prev` parameters in `setModalState` callbacks
- [ ] Fix `MobileModalState` type mismatches (unify shape)
- [ ] Ensure `useMobileEditSubmit` calls batch update API correctly
- [ ] Remove all unused imports/vars
- [ ] Run `node .\node_modules\typescript\bin\tsc --noEmit` after EVERY file fix
- [ ] Verify composition hooks are thin (< 400 lines)
