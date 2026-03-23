# Engineering Skills & Guidelines

---

## Skill 1: React Hooks Refactoring

- **Trigger**: `React.useState`, `React.useEffect`, `React.FC`, `import * as React`, `import React from 'react'`
- **Purpose**: Enforce modern React patterns with direct named imports.
- **Actions**:
  1. Replace `React.useState` → `useState`
  2. Replace `React.useEffect` → `useEffect`
  3. Replace `React.FC` → `FC`
  4. Replace `React.ChangeEvent` → `ChangeEvent`
  5. Replace `React.ElementRef` → `ElementRef`
  6. Replace `React.ComponentPropsWithoutRef` → `ComponentPropsWithoutRef`
  7. Add imports: `import { useState, useEffect, FC, ChangeEvent, ElementRef, ComponentPropsWithoutRef } from 'react'`
  8. Remove unused `import * as React` statements.

---

## Skill 2: Meters & Financial Data Querying

- **Trigger**: When working with reports, meters aggregation, financial calculations.
- **Purpose**: Correctly query `Meters` collection for accurate financial reporting.
- **Critical Rules**:

### 1. Use `readAt` for Date Filtering (NOT `timestamp` or `createdAt`)
```typescript
// ✅ CORRECT - Use readAt for date filtering
{ $match: { readAt: { $gte: startDate, $lte: endDate } } }

// ❌ WRONG - timestamp/createdAt are not used by aggregation APIs
{ $match: { timestamp: { ... } } }
```

### 2. Always Include `movement` Field
Movement field is the source of truth for financial metrics in aggregation APIs.
```typescript
movement: {
  drop: number,                  // Money In
  totalCancelledCredits: number, // Money Out (Base)
  jackpot: number,               // Jackpot payouts
  coinIn: number,                // Handle (betting activity)
  gamesPlayed: number,           // Game activity
}
```

### 3. Use Cursors for Aggregations (Performance Critical)
```typescript
// ✅ CORRECT - Use cursor with batchSize
const cursor = Meters.aggregate(pipeline, {
  allowDiskUse: true,
  maxTimeMS: 120000,
}).cursor({ batchSize: 1000 });

for await (const doc of cursor) { ... }

// ❌ WRONG - Loading all results into memory
const results = await Meters.aggregate(pipeline).exec();
```

### 4. Use `location` Field Directly (NOT `$lookup`)
```typescript
// ✅ CORRECT - Direct field access (uses index)
{ $match: { location: { $in: locationIds } } }

// ❌ WRONG - Expensive $lookup
{ $lookup: { from: 'machines', ... } }
```

### 5. Movement Delta Method
Sum movement fields, never use cumulative values.
```typescript
// ✅ CORRECT - Sum movement fields
{ $group: { _id: '$location', totalDrop: { $sum: '$movement.drop' } } }

// ❌ WRONG - Using raw meter values
{ $group: { _id: '$location', totalDrop: { $last: '$drop' } } }
```

---

## Skill 3: Entity Hierarchy & Relationships

- **Trigger**: When creating queries, understanding data flow, or linking collections.
- **Core Hierarchy**:
```text
Licencee
└── GamingLocation
    ├── Machine (sasMeters: drop, coinIn, jackpot)
    │   └── Meter (movement: drop, totalCancelledCredits, jackpot)
    ├── Collection (compliance reports)
    └── CollectionReport (financial summaries)
```

- **Key Relationships**:
  - `Machine.gamingLocation` → `GamingLocation._id`
  - `Meter.machine` → `Machine._id`
  - `Meter.location` → `GamingLocation._id` (for direct aggregation)
  - `GamingLocation.rel.licencee` → `Licencee._id`

- **Important Fields**:
  - `GamingLocation.gameDayOffset`: Gaming day start hour (default: 8 for 8 AM).
  - `GamingLocation.country`: For currency detection.
  - `Machine.sasMeters`: Live machine meter readings.
  - `Machine.status`: `"online"` | `"offline"` for UI display.

---

## Skill 4: Financial Metrics Calculation

- **Trigger**: Dashboard metrics, revenue calculations, financial reports.
- **Key Formulas**:
  - **Gross Revenue**: `sum(movement.drop) - sum(movement.totalCancelledCredits)`
  - **Jackpot**: `sum(movement.jackpot)`
  - **Handle**: `sum(movement.coinIn)`

> **Always Use Movement Fields**: Financial calculations must come from `movement.sum`.

---

## Skill 5: TypeScript Discipline

- **Trigger**: Type creation, `any` usage, type mismatches.
- **Rules**:
  1. **No `any`**: Create proper types.
  2. **Single Source of Truth**: `shared/types/` for cross-domain types.
  3. **Cast through `unknown`**: When casting Mongoose `.lean()` results.
  4. **No underscore prefixes**: Except `_id` for MongoDB.

---

## Skill 6: API Route Structure

- **Trigger**: Creating/modifying API routes.
- **Mandatory Template**:
  1. File-level JSDoc with `@module` tag.
  2. Step-by-step comments with `// STEP N:`.
  3. Extract logic to `app/api/lib/helpers/` if > 20-30 lines.
  4. Use Mongoose models (NOT `db.collection()`).
  5. Query with `findOne({ _id: id })` NOT `findById(id)`.

---

## Skill 7: Gaming Day Offset

- **Trigger**: Date filtering, financial queries, dashboard.
- **Gaming Day**: 8 AM to 8 AM Trinidad time (UTC-4).
- **Apply To**: Dashboard, reports, analytics.
- **Do NOT Apply To**: Collection reports, activity logs, sessions.

```typescript
// Gaming day at 2 AM Nov 11 → Nov 10 8 AM to Nov 11 8 AM
const gamingDayRange = getGamingDayRange(new Date(), 8);
```

---

## Skill 8: Skeleton Loaders

- **Trigger**: Creating pages, components with async data.
- **Rules**:
  1. Every async component **MUST** have a specific skeleton.
  2. Skeleton **MUST** match actual content layout exactly.
  3. **NO** generic "Loading..." text.
  4. **NO** generic spinners for content areas.
  5. Create in `components/ui/skeletons/`.

---

## Skill 9: Code Cleanup & Dependency Safety

- **Trigger**: Deleting code, refactoring.
- **Always Check**:
  1. `grep_search` for all usages before deletion.
  2. Update or remove dependent code.
  3. Clean up unused imports.
  ---

## Skill 10: API Route Params Extraction

- **Trigger**: When handling dynamic Next.js App Router API routes (e.g., `[id]/route.ts`).
- **Rule**: NEVER use the `{ params }` argument in API routes. Instead, extract dynamic parameters directly from the `NextRequest` URL.

```typescript
// ✅ CORRECT - Extract from URL path
export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const locationId = pathname.split('/').pop();
  // ...
}

// ❌ WRONG - Using { params } argument
export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  const { locationId } = params;
  // ...
}
```