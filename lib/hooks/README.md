# Custom Hooks

All custom React hooks, grouped by domain/feature for discoverability. Hooks encapsulate data fetching, filtering, pagination, modal state, and navigation so that `*PageContent` components stay lean.

> Hook **structure** (section order, state grouping) is mandated in [`CLAUDE.md`](../../CLAUDE.md) and `.instructions/rules/nextjs-rules.md` §4.4. Reference implementation: `collectionReport/useNewCollectionModal.ts`.

---

## Folder structure

Hooks are organized into domain subfolders, with a handful of cross-cutting hooks at the root.

| Folder | Purpose |
| --- | --- |
| `auth/` | Authentication, RBAC, profile/user validation (`useAuth`, `useUserValidation`) |
| `data/` | Data fetching + filter/sort/pagination/modal state per domain (dashboard, location, cabinet, SMIB config, sessions, administration, …) |
| `navigation/` | Page/section navigation with permission gating (cabinets, collection, members, reports) |
| `reports/` | Report generation and analytics data (dashboard, locations, machines, logistics) |
| `cabinets/` | Cabinet-specific hooks (e.g. `useCabinetAccountingData`) |
| `collectionReport/` | Collection report modal + flow hooks (new, edit, mobile variants) |
| `locations/` | Location detail and management hooks |
| `machines/` | Machine-level data hooks |
| `members/` | Members tab/detail hooks |
| `administration/` | Administration data + modal hooks (users, licencees, activity logs) |
| `vault/` | Vault / cashier domain hooks |
| `ui/` | UI utilities (`useHasMounted`, animations) |

### Root-level cross-cutting hooks

These don't belong to a single domain:

- `useAuth.ts` — primary auth/role hook
- `useCurrentUserQuery.ts` — current-user React Query
- `useCurrencyFormat.ts` — display currency + `formatCurrencyWithCodeString` binding
- `useCashierShift.ts` — active cashier shift state
- `useMachineOnlineStatus.ts` — SMIB online/offline derivation
- `useDebounce.ts`, `useMediaQuery.ts`, `useTextOverflow.ts`, `useAbortableRequest.ts` — generic utilities
- `useProfileModal.ts` — profile modal state

---

## Importing

```typescript
// Domain hooks via their folder
import { useCabinetData, useLocationData } from '@/lib/hooks/data';
import { useCabinetNavigation } from '@/lib/hooks/navigation';
import { useAuth, useUserValidation } from '@/lib/hooks/auth';

// Cross-cutting root hooks
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
```

---

## Adding a hook

1. **Pick the right folder** by primary domain (or root if genuinely cross-cutting).
2. **Name it** `use[Domain][Purpose]` (e.g. `useCabinetFilters`).
3. **Follow the section order** from `nextjs-rules.md` §4.4: External deps → Types → Helpers → Main hook → Store state → Local state (grouped by concern) → Form bindings → Computed → Debounced → Refs → Effects → Handlers (grouped) → Return.
4. **Type everything** — no `any`; props/return types from `lib/types/` or `shared/types/`.
5. **Update the folder's `index.ts`** so the hook is exported.

---

## Cross-cutting behaviors

### Gaming day offset

Dashboard/location/cabinet/report data hooks apply the **8 AM Trinidad (UTC-4) gaming day**. Default offset 8, configurable per location, resolved with `??` (not `||`). Local time converts to UTC for queries. See `lib/utils/gamingDayRange.ts`.

### Financial calculations

Financial hooks use the **Movement Delta Method**: money in = Σ `movement.drop`, money out = Σ `movement.totalCancelledCredits`, gross = drop − cancelled. Net Gross = gross − jackpot.

### Authentication & permissions

Auth hooks implement the 10-role hierarchy: **developer → owner → admin → manager → location admin → vault-manager → cashier → technician → collector → reviewer**. Access is the intersection of assigned licencees and assigned locations (managers see all locations in their licencees). See `lib/utils/permissions/client.ts`.

### Currency

Display hooks format via `useCurrencyFormat()` + `formatCurrencyWithCodeString` — components display, the server converts (pass `?currency=`).

---

**Last Updated:** June 2026
