# Authorization & Role-Based Access Control (RBAC)

This document explains how user roles and authorization checks work in the Evolution One CMS codebase.

## Overview

The application uses a multi-layered authorization system:

1. **Client-side protection** - `ProtectedRoute` component blocks page access
2. **Navigation filtering** - Sidebar/header hide pages based on roles
3. **API-level protection** - Backend validates access for data operations
4. **Location filtering** - Multi-tenant filtering based on `assignedLocations`
5. **Reviewer scale** - Financial data is scaled down for `reviewer` role users before being returned from APIs

---

## Role Hierarchy

Roles are defined in `lib/constants/roles.ts`:

| Priority | Role             | Description                                      |
| -------- | ---------------- | ------------------------------------------------ |
| 1        | `developer`      | Full platform access                             |
| 2        | `owner`          | High-level administrative functions              |
| 3        | `admin`          | Administrative functions                         |
| 4        | `manager`        | Operational oversight                            |
| 5        | `location admin` | Location-specific management                     |
| 6        | `vault-manager`  | Vault management operations                      |
| 7        | `cashier`        | Cashier operations                               |
| 8        | `technician`     | Technical operations                             |
| 9        | `collector`      | Collection operations                            |
| 10       | `reviewer`       | Read-only, scaled-down view of financial reports |

---

## Key Files

### Permission Definitions

| File                              | Purpose                                                 |
| --------------------------------- | ------------------------------------------------------- |
| `lib/utils/permissions/client.ts` | Client-side permission checks (page access, navigation) |
| `lib/utils/permissions/server.ts` | Server-side database permission checks                  |
| `lib/utils/permissions/index.ts`  | Re-exports all permission utilities                     |
| `lib/constants/roles.ts`          | Role type definitions and constants                     |

### Reviewer Scale Utility

| File                                    | Purpose                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| `app/api/lib/utils/reviewerScale.ts`    | **Single source of truth** for all reviewer scale logic          |

### User State Management

| File                                 | Purpose                                    |
| ------------------------------------ | ------------------------------------------ |
| `lib/store/userStore.ts`             | Zustand store for user state (client-side) |
| `lib/hooks/useCurrentUserQuery.ts`   | React Query hook to fetch/sync user data   |
| `app/api/auth/current-user/route.ts` | API endpoint for current user data         |

### API-Level Protection

| File                                              | Purpose                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `app/api/lib/helpers/licenceeFilter.ts`           | Location access checks (`checkUserLocationAccess`)                |
| `app/api/lib/helpers/collectionReport/queries.ts` | Collection report-specific access (`determineAllowedLocationIds`) |

---

## How Authorization Works

### 1. Client-Side Page Protection

The `ProtectedRoute` component wraps pages and checks permissions:

```typescript
// app/collection-report/page.tsx
<ProtectedRoute requiredPage="collection-report">
  <CollectionReportPageContent />
</ProtectedRoute>
```

**Flow:**

1. `ProtectedRoute` calls `hasPageAccess(userRoles, 'collection-report')`
2. If local check passes, user can access page
3. If local check fails, calls `hasPageAccessDb('collection-report')` (server-side)

**Location:** `lib/utils/permissions/client.ts`

### 2. Page Access Definitions

Page permissions are defined in **two places that must stay in sync**:

#### Client-Side (`lib/utils/permissions/client.ts`)

```typescript
const pagePermissions: Record<PageName, UserRole[]> = {
  'collection-report': [
    'developer', 'owner', 'admin', 'manager',
    'location admin', 'collector', 'reviewer',
  ],
  reports: [
    'developer', 'owner', 'admin', 'manager', 'location admin',
    // reviewer intentionally excluded — reviewers cannot access /reports
  ],
  // ... other pages
};
```

#### Server-Side (`lib/utils/permissions/server.ts`)

```typescript
// Must mirror client.ts exactly
const pagePermissions: Record<PageName, UserRole[]> = {
  'collection-report': [
    'developer', 'owner', 'admin', 'manager',
    'location admin', 'collector', 'reviewer',
  ],
  reports: [
    'developer', 'owner', 'admin', 'manager', 'location admin',
  ],
  // ...
};
```

### 3. Navigation Visibility

Navigation links are filtered based on roles. The sidebar uses `shouldShowNavigationLinkDb`
(server DB lookup) and the header uses `shouldShowNavigationLink` (client-side).
Both ultimately delegate to the `pagePermissions` tables above, so removing a role
from `pagePermissions` is sufficient to hide the nav link AND block direct URL access.

```typescript
// lib/utils/permissions/client.ts
export const shouldShowNavigationLink = (userRoles, page) => {
  // ... special cases for sessions, members, vault ...
  return hasPageAccess(userRoles, page); // falls back to pagePermissions
};
```

### 4. API-Level Location Filtering

For multi-tenant data, APIs filter by user's `assignedLocations`:

**File:** `app/api/lib/helpers/collectionReport/queries.ts`

```typescript
const hasAllLocationAccess =
  userRoles.includes('admin') ||
  userRoles.includes('developer') ||
  userRoles.includes('owner') ||
  userRoles.includes('reviewer'); // reviewers see all locations

if (hasAllLocationAccess) return 'all';
```

**File:** `app/api/lib/helpers/licenceeFilter.ts`

```typescript
const hasAllLocationAccess =
  userRoles.includes('admin') ||
  userRoles.includes('developer') ||
  userRoles.includes('owner') ||
  userRoles.includes('reviewer'); // reviewers bypass location filter

if (hasAllLocationAccess) return true;
```

---

## Reviewer Scale System

The `reviewer` role sees a **scaled-down view of all financial data**. Every API that
returns financial metrics must apply the reviewer scale before sending the response.

### How It Works

Each reviewer user has a `multiplier` field stored in the database (e.g. `0.30`).
The scale factor applied to every financial value is:

```
scale = 1 - multiplier       (e.g.  multiplier 0.30  →  scale 0.70)
```

Non-reviewers always receive `scale = 1` (no transformation). A reviewer with no
multiplier set (`0` or `null`) also receives `scale = 1`.

**Two conditions must both be true for scaling to apply:**
1. The user's `roles` array includes `'reviewer'`
2. The user's `multiplier` is a non-zero truthy number

### The Utility File

**`app/api/lib/utils/reviewerScale.ts`** — import from here in every API route.

```typescript
import {
  getReviewerScale,
  scaleMachineValues,
  scaleReportFinancials,
} from '@/app/api/lib/utils/reviewerScale';
```

### `getReviewerScale(user)` — compute the scale factor

Call this once per request, right after authenticating the user.

```typescript
// Works with any object that has multiplier and roles
const scale = getReviewerScale(userPayload as { multiplier?: number | null; roles?: string[] });
// Returns 0.70 for a reviewer with multiplier 0.30
// Returns 1    for admin, manager, any non-reviewer role
// Returns 1    for a reviewer with multiplier 0 or null
```

### `scaleMachineValues(values, scale)` — scale per-machine financial values

Use this when building a per-machine metrics object before formatting output.
Pass the raw computed numbers and get scaled numbers back.

```typescript
import { scaleMachineValues } from '@/app/api/lib/utils/reviewerScale';

const scaled = scaleMachineValues(
  {
    drop,           // metersIn - prevIn
    cancelled,      // metersOut - prevOut
    meterGross,     // movement.gross
    jackpot,        // from meter data
    netGross,       // meterGross - jackpot
    sasGross,       // raw SAS gross (pre-jackpot-adjustment), for display only
    variation,      // already computed meterGross − adjustedSasGross
    hasNoSasData,   // true when no SAS time window exists
  },
  scale
);

// scaled.drop, scaled.cancelled, scaled.meterGross,
// scaled.jackpot, scaled.netGross, scaled.variation are all * scale
// scaled.sasGross is 0 when hasNoSasData, otherwise sasGross * scale
```

### `scaleReportFinancials(report, scale)` — scale report-level summary fields

Use this when returning raw Mongoose `CollectionReport` documents from a list API.
It is a no-op when `scale === 1` (fast path for non-reviewers).

```typescript
import { scaleReportFinancials } from '@/app/api/lib/utils/reviewerScale';

const scaledReports = reviewerScale === 1
  ? rawReports
  : rawReports.map(r =>
      scaleReportFinancials(r.toObject() as Parameters<typeof scaleReportFinancials>[0], reviewerScale)
    );
```

Fields scaled: `amountCollected`, `amountToCollect`, `amountUncollected`,
`partnerProfit`, `taxes`, `advance`, `previousBalance`, `balanceCorrection`,
`currentBalance`, `variance`.

### Complete API Route Example

```typescript
import { getReviewerScale, scaleMachineValues } from '@/app/api/lib/utils/reviewerScale';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload }) => {
    // 1. Compute scale once per request — non-reviewers get 1 (no-op)
    const scale = getReviewerScale(userPayload as { multiplier?: number | null; roles?: string[] });

    // 2. Aggregate raw meter data from DB
    const raw = await Meters.aggregate([...]);

    // 3. Apply scale before returning
    const moneyIn  = raw.drop * scale;
    const cancelled = raw.totalCancelledCredits * scale;
    const jackpot  = raw.jackpot * scale;
    const gross    = moneyIn - cancelled;

    return NextResponse.json({ success: true, data: { moneyIn, cancelled, jackpot, gross } });
  });
}
```

### APIs Where Reviewer Scale Is Applied

| API Route | Helper/File | How scale is applied |
| --------- | ----------- | -------------------- |
| `GET /api/collection-report/[reportId]` | `accountingDetails.ts` → `getCollectionReportById` | `getReviewerScale` → all `locationMetrics`, `sasMetrics`, and per-machine `scaleMachineValues` |
| `GET /api/collectionReport` (list) | `collectionReport/service.ts` → `getAllCollectionReportsWithMachineCounts` | `scale` param → multiplied before `formatSmartDecimal` on gross, collected, uncollected, variation, balance, locationRevenue |
| `GET /api/collection-reports` (admin list) | `collection-reports/route.ts` | `scaleReportFinancials` on each raw Mongoose doc |
| `GET /api/locations/[locationId]` (cabinet list) | `locations/[locationId]/route.ts` | `getReviewerScale` → moneyIn, moneyOut, jackpot, gross, cancelledCredits, netGross per cabinet |
| `GET /api/locations/[locationId]/cabinets/[cabinetId]` | `cabinets/[cabinetId]/route.ts` | `getReviewerScale` → moneyIn, moneyOut, jackpot, gross, netGross on the single cabinet |

### ❌ Common Mistakes to Avoid

```typescript
// WRONG — ignores the reviewer role check; applies to ALL users with a non-null multiplier
const mult = user.multiplier ?? null;
const scale = mult !== null ? 1 - mult : 1;

// WRONG — never hardcode inline scale logic in a route
const isReviewer = user.roles?.includes('reviewer');
const scale = isReviewer && user.multiplier ? 1 - user.multiplier : 1;

// CORRECT — always use the utility
import { getReviewerScale } from '@/app/api/lib/utils/reviewerScale';
const scale = getReviewerScale(userPayload);
```

---

## User Data Structure

### UserAuthPayload (stored in userStore)

```typescript
type UserAuthPayload = {
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  roles?: string[];
  assignedLocations?: string[];  // Location IDs user can access
  assignedLicencees?: string[];  // Licencee IDs user can access
  multiplier?: number | null;    // Reviewer scale input (e.g. 0.30 → scale 0.70)
  profile?: { /* profile fields */ };
};
```

---

## Adding a New Role

### Step 1: Add Role to Constants

**File:** `lib/constants/roles.ts`

```typescript
export type UserRole =
  | 'developer' | 'owner' | 'admin' | 'manager'
  | 'location admin' | 'vault-manager' | 'cashier'
  | 'technician' | 'collector' | 'reviewer'
  | 'auditor'; // NEW ROLE
```

### Step 2: Add to Page Permissions (both files must stay in sync)

**Files:** `lib/utils/permissions/client.ts` AND `lib/utils/permissions/server.ts`

```typescript
const pagePermissions: Record<PageName, UserRole[]> = {
  'collection-report': [
    'developer', 'owner', 'admin', 'manager',
    'location admin', 'collector', 'reviewer',
    'auditor', // ADD HERE
  ],
  // add to any other page the new role should access
};
```

### Step 3: Update Location Access (if needed)

**File:** `app/api/lib/helpers/collectionReport/queries.ts`

```typescript
const hasAllLocationAccess =
  userRoles.includes('admin') ||
  userRoles.includes('developer') ||
  userRoles.includes('owner') ||
  userRoles.includes('reviewer') ||
  userRoles.includes('auditor'); // NEW
```

**File:** `app/api/lib/helpers/licenceeFilter.ts` — same change as above.

### Step 4: Update Navigation Visibility (if needed)

`shouldShowNavigationLink` delegates to `hasPageAccess` by default, so updating
`pagePermissions` in Step 2 is usually sufficient. Only add a special case here
if the nav visibility rule differs from the route access rule.

### Step 5: Reviewer Scale (if new role needs scaled data)

If the new role should also see scaled financial data, update `getReviewerScale`
in `app/api/lib/utils/reviewerScale.ts`:

```typescript
export function getReviewerScale(user: UserForScale): number {
  const multiplier = user.multiplier ?? 0;
  const isScaledRole =
    (user.roles as string[])?.includes('reviewer') ||
    (user.roles as string[])?.includes('auditor'); // ADD NEW ROLE
  return isScaledRole && multiplier ? 1 - multiplier : 1;
}
```

---

## Quick Reference: Role Capabilities

| Capability         | developer | owner | admin | manager | location admin | collector | reviewer |
| ------------------ | --------- | ----- | ----- | ------- | -------------- | --------- | -------- |
| All pages          | ✅        | ✅    | ✅    | ❌      | ❌             | ❌        | ❌       |
| Dashboard          | ✅        | ✅    | ✅    | ✅      | ✅             | ❌        | ❌       |
| Machines           | ✅        | ✅    | ✅    | ✅      | ✅             | ✅        | ✅       |
| Locations          | ✅        | ✅    | ✅    | ✅      | ✅             | ❌        | ✅       |
| Collection Reports | ✅        | ✅    | ✅    | ✅      | ✅             | ✅        | ✅       |
| Reports            | ✅        | ✅    | ✅    | ✅      | ✅             | ❌        | ❌       |
| Administration     | ✅        | ✅    | ✅    | ✅      | ✅             | ❌        | ❌       |
| Vault              | ✅        | ✅    | ✅    | ✅      | ✅             | ❌        | ❌       |
| **Financial data scaled** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

| Location Access | developer | owner | admin | manager | location admin | collector | reviewer |
| --------------- | --------- | ----- | ----- | ------- | -------------- | --------- | -------- |
| All locations   | ✅        | ✅    | ✅    | ❌      | ❌             | ❌        | ✅       |
| Assigned only   | ❌        | ❌    | ❌    | ✅      | ✅             | ✅        | ❌       |
