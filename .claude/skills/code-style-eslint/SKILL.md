---
name: Code Style & ESLint
description: Never ignore ESLint violations, run lint regularly, file-level documentation, remove redundant comments.
---

# Code Style & ESLint

Use when **writing code** to maintain consistent style and pass linting.

## ESLint Rules - MANDATORY

**NEVER ignore ESLint violations.**

```bash
# Run linting
bun run lint

# Auto-fix violations
bun run lint --fix
```

**If ESLint complains:**

1. Fix the issue immediately
2. Don't suppress with `// eslint-disable`
3. Address root cause, not symptom

## TypeScript Type Checking

```bash
# Check for type errors
bun run type-check

# Run before committing
bun run type-check && bun run lint
```

**Type checking is strict mode:**

- `noUnusedLocals` - No unused variables
- `noImplicitReturns` - All code paths return
- `noFallthroughCases` - Switch cases must break/return
- No `any` types allowed

## File-Level Documentation

**Required for:**

- All API routes
- All `page.tsx` files
- Complex components (>200 lines)
- Helper files with multiple functions

**Format:**

```typescript
/**
 * [Name] [Type]
 *
 * [Brief description of purpose]
 *
 * Features/Supports:
 * - Feature 1
 * - Feature 2
 *
 * @module [path] (for routes/helpers)
 */
```

**Examples:**

```typescript
/**
 * Meters Report API Route
 *
 * This route handles fetching meter report data for machines
 * across selected locations.
 *
 * It supports:
 * - Gaming day offset calculations per location
 * - Hourly chart data aggregation
 * - Currency conversion for multi-licencee views
 *
 * @module app/api/reports/meters/route
 */
/**
 * Dashboard Page
 * System-wide financial overview with real-time metrics
 *
 * Features:
 * - Financial totals (Drop, Gross, Revenue)
 * - Gaming location status
 * - Time period selection (Today, 7d, 30d, Custom)
 * - Licencee filtering
 */
/**
 * useLocationData Hook
 *
 * Fetches and manages location data with filtering,
 * pagination, and caching.
 *
 * @returns { data, loading, error, fetchData }
 */
```

## Comment Guidelines

### DO Remove

❌ **Redundant comments** that restate code:

```typescript
// ❌ Redundant - Comment says exactly what code does
const count = items.length; // Get the count of items

// ✅ Remove it - Code is self-explanatory
const count = items.length;
```

❌ **Obvious comments:**

```typescript
// ❌ Obvious
const name = user.name; // Get the user's name
const email = user.email; // Get the user's email

// ✅ No comments needed
const name = user.name;
const email = user.email;
```

### DO Keep

✅ **Comments explaining WHY:**

```typescript
// ✅ Explains business logic
const excludedRoles = ['developer', 'admin']; // Only filter for non-admin roles
```

✅ **Comments on complex logic:**

```typescript
// ✅ Explains non-obvious calculation
// Gaming day hasn't rolled over yet (current time before 8 AM start)
const todayBase =
  currentHour < gameDayStartHour
    ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
    : today;
```

✅ **Comments on non-obvious code:**

```typescript
// ✅ Explains regex purpose
const isValidHex = /^[0-9a-fA-F]{24}$/.test(id); // MongoDB ObjectId format

// ✅ Explains why approach was chosen
// Use cursor() instead of exec() to prevent loading large datasets into memory
const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
```

## Parameter Guards on Exported Functions (Rule 10)

**EVERY exported function must validate mandatory parameters at the very top:**

### Rule

1. Check mandatory parameters immediately after function signature
2. Log errors with function name as prefix: `[FunctionName] paramName is required`
3. Return early with failure result or `undefined`
4. Do NOT use inline `if` checks scattered throughout function body

### Required Guards

- **Mandatory IDs** (`_id`, `machineId`, `locationReportId`): Must exist and be non-empty strings
- **Mandatory numbers** (`metersIn`, `amount`): Must be valid finite numbers (use `Number.isFinite()`)
- **Mandatory objects** (`body`, `payload`): Must be truthy and of correct type
- **Mandatory arrays** (`machines`, `items`): Must be arrays (use `Array.isArray()`)
- **Mandatory dates** (`timestamp`, `collectionTime`): Must be valid `Date` instances

```typescript
// ✅ CORRECT - guard early, return matches function signature
export function getTopPerforming(
  activeTab: string | null,
  timePeriod: TimePeriod
): SomeResult[] {
  if (!activeTab) {
    console.error('[getTopPerforming] activeTab is required');
    return [];
  }
  if (!timePeriod) {
    console.error('[getTopPerforming] timePeriod is required');
    return [];
  }
  // ... implementation
}

export async function getLocationTrends(
  locationIds: string[],
  timePeriod: TimePeriod
): Promise<TrendResult | null> {
  if (!Array.isArray(locationIds)) {
    console.error('[getLocationTrends] locationIds (array) is required');
    return null;
  }
  if (!timePeriod) {
    console.error('[getLocationTrends] timePeriod is required');
    return null;
  }
  // ... implementation
}
```

### Optional Parameters

- Optional parameters (`?` or `| undefined`) should still be checked if used later
- Log missing optional params at info level, not error

```typescript
// ✅ Check optional param if used
if (optionalParam) {
  console.log(`[FunctionName] Processing with optional: ${optionalParam}`);
}
```

**Guard return type rules — match the function's return signature:**

| Return type                                     | Guard return            |
| ----------------------------------------------- | ----------------------- |
| `T[]` / `Promise<T[]>`                          | `return []`             |
| `T \| null` / `Promise<T \| null>`              | `return null`           |
| `Record<K, V>` / object                         | `return {}`             |
| `void` / throws expected                        | `throw new Error(msg)`  |
| Typed shape `Promise<{ a: number; b: number }>` | `return { a: 0, b: 0 }` |

```typescript
// ✅ Array check for array params
if (!Array.isArray(items) || !timePeriod) {
  console.error('[functionName] items (array) and timePeriod are required');
  return [];
}

// ✅ Null/undefined check for params that can't be falsy-empty
if (allowedLocationIds === undefined || allowedLocationIds === null) {
  console.error('[functionName] allowedLocationIds is required');
  return null;
}
```

## Error Logging in Catch Blocks (Rule 14)

Use `console.error` with clean, readable messages. Avoid complex if statements in catch blocks.

### Rule

1. Never type annotate catch parameter (no `catch (e: any)` or `catch (e: unknown)`)
2. Always use `console.error` for errors
3. Prefix with function name: `[FunctionName]`
4. Log the message only, not the entire error object

### Correct Pattern

```typescript
// ❌ WRONG — type annotation, logging entire error
} catch (e: unknown) {
  console.error(e);
}

// ❌ WRONG — no function name prefix
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Unknown error');
}

// ✅ CORRECT — simple, clean, prefixed
} catch (e) {
  console.error('[FunctionName] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

### Backend (Node.js/Next.js API)

```typescript
} catch (e) {
  console.error('[createCollection] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

### Frontend (React)

```typescript
} catch (e) {
  console.error('[useCollection] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

### MongoDB-Specific Queries (Mongoose)

```typescript
// For .catch() on promises
}).catch((e) => {
  console.error('[updateMachine] DB Error:', e instanceof Error ? e.message : 'Unknown error');
});
```

### Never Do This

```typescript
// ❌ Logging entire MongoDB error object (verbose, unreadable)
console.error(e);

// ❌ Complex type checking in catch
console.error(
  e instanceof Error && e.message
    ? e.message
    : typeof e === 'string'
      ? e
      : e?.errmsg
);
```

## Critical Operation Result Checking (Rule 15)

When performing critical database operations within `try` blocks, **always check the result** and return early on failure.

### Rule

1. **Check results** of `findOneAndDelete`, `findOneAndUpdate`, `deleteOne`, etc.
2. **Log with function name prefix**: `[FunctionName] Failed to [operation] [resource] [id]`
3. **Return early with failure** if a critical operation fails
4. **Non-critical operations** (e.g., optional cleanup) can continue without returning

### Correct Pattern

```typescript
// ✅ CORRECT — check critical delete, return on failure
try {
  const result = await Meters.findOneAndDelete({ _id: meterId });
  if (!result) {
    console.error(`[deleteMeter] Failed to delete meter ${meterId}`);
    return { success: false };
  }

  // Continue only if critical operation succeeded
  await SomeOtherOperation();
} catch (e) {
  console.error(
    '[deleteMeter] Error:',
    e instanceof Error ? e.message : 'Unknown error'
  );
  return { success: false };
}
```

### When to Return vs Continue

| Operation                  | Critical? | Action on Failure     |
| -------------------------- | --------- | --------------------- |
| Delete meter for ram clear | ✅ Yes    | Return early          |
| Delete main meter          | ✅ Yes    | Return early          |
| Update optional field      | ❌ No     | Log warning, continue |
| Delete optional history    | ❌ No     | Log warning, continue |

### Never Do This

```typescript
// ❌ No result checking — function continues even if critical delete failed
try {
  await Meters.findOneAndDelete({ _id: meterId });
  await SomeOtherOperation(); // Runs even if delete failed
} catch (e) { ... }

// ❌ Silent failure — no logging
try {
  const result = await Meters.findOneAndDelete({ _id: meterId });
  if (!result) return; // No error logged
} catch (e) { ... }
```

## Function Documentation

**In helper and utility files:**

```typescript
/**
 * Calculate gaming day range for a given time period
 *
 * @param period - Time period ('Today', 'Yesterday', '7d', 'Custom')
 * @param offset - Gaming day start hour (0-23)
 * @param startDate - Custom start date (YYYY-MM-DD format)
 * @param endDate - Custom end date (YYYY-MM-DD format)
 * @returns { rangeStart, rangeEnd } - UTC date range
 */
export function getGamingDayRangeForPeriod(
  period: string,
  offset: number,
  startDate?: Date,
  endDate?: Date
): { rangeStart: Date; rangeEnd: Date } {
  // Implementation
}
```

## Naming Conventions

### Variables & Functions

```typescript
// ✅ camelCase
const userName = 'John';
const isActive = true;
function fetchUserData() {}
const getUserById = (id: string) => {};

// ❌ snake_case
const user_name = 'John';
const is_active = true;

// ❌ PascalCase (except classes/types)
const UserName = 'John';
const IsActive = true;
```

### No Single-Letter Variables — CRITICAL

**NEVER use single-letter variable names, including in loops and callbacks:**

```typescript
// ❌ WRONG
for (let i = 0; i < items.length; i++) { ... }
const s = items.reduce((s, c) => s + c.value, 0);
items.map((i) => i.id);
items.forEach((e) => process(e));

// ✅ CORRECT
for (let index = 0; index < items.length; index++) { ... }
const sum = items.reduce((total, item) => total + item.value, 0);
items.map((item) => item.id);
items.forEach((entry) => process(entry));
```

**Common replacements:**

- `i` → `index` (loop counter)
- `s` → `sum`, `total`, `result` (accumulator)
- `c` → `collection`, `count`, `current`
- `v` → `value`, `item`
- `e` → `event`, `error`, `entry`
- `n` → `count`, `number`
- `_` → keep only for truly unused destructuring positional args, e.g. `Array.from({ length: 4 }, (_, index) => ...)`

### Types — `type` over `interface`

**Always use `type` keyword. Never use `interface` for data structures.**

```typescript
// ✅ CORRECT
export type UserData = {
  id: string;
  name: string;
};

export type LocationDetails = {
  id: string;
  name: string;
};

// ❌ WRONG
export interface UserData {
  id: string;
  name: string;
}

// ❌ camelCase type names
export type userData = {
  id: string;
};
```

### Constants

```typescript
// ✅ UPPER_SNAKE_CASE for module-level constants
const GAMING_DAY_OFFSET_DEFAULT = 8;
const MAX_PAGE_SIZE = 100;
const API_TIMEOUT_MS = 120000;

// ✅ camelCase for local constants
const maxRetries = 3;
```

## Formatting & Spacing

### Import Organization

```typescript
// ✅ Organized by source
import { helper1, helper2 } from '@/app/api/lib/helpers/feature';
import { type Type1, type Type2 } from '@/app/api/lib/types';
import { Model } from '@/app/api/lib/models/model';
import { useState, useEffect, FC } from 'react';
import { NextRequest, NextResponse } from 'next/server';
```

### Code Grouping

```typescript
// ✅ Group related code together
const [count, setCount] = useState(0);
const [items, setItems] = useState<Item[]>([]);

useEffect(() => {
  // Related effect
}, [count, items]);

// Blank line between sections
const handleClick = () => {
  // Handler
};
```

### Line Length

Keep lines under 100 characters when reasonable:

```typescript
// ✅ Readable line length
const result = calculateMetrics(
  startDate,
  endDate,
  gameDayOffset,
  selectedLocations
);

// ❌ Too long (hard to read)
const result = calculateMetrics(
  startDate,
  endDate,
  gameDayOffset,
  selectedLocations,
  additionalParam1,
  additionalParam2
);
```

## Unused Code Cleanup

### Remove Unused Imports

```typescript
// ❌ WRONG - Unused import
import { useMemo } from 'react'; // Not used

// ✅ CORRECT - Remove or use
import { useState, useEffect } from 'react'; // Both used
```

### Remove Unused Variables

```typescript
// ❌ WRONG
const data = fetchData();
const unused = 'value'; // ESLint error: unused variable

// ✅ CORRECT
const data = fetchData();
```

### Remove Unused Functions

**Before deleting, verify no dependencies:**

```bash
# Search for function usage
grep -r "myFunction" .

# If only definition appears, safe to delete
```

## Before Committing

```bash
# 1. Type check
bun run type-check

# 2. Lint & auto-fix
bun run lint --fix

# 3. Check for remaining lint errors
bun run lint

# 4. Verify no regressions
bun run test

# 5. Commit only after all pass
git add .
git commit -m "..."
```

## Code Review Checklist

- ✅ No ESLint violations (`bun run lint` passes)
- ✅ No TypeScript errors (`bun run type-check` passes)
- ✅ File-level documentation present
- ✅ No redundant comments removed
- ✅ Complex logic has explanatory comments
- ✅ All exported functions have parameter guards (`console.error` + early return)
- ✅ Guard return value matches function return type
- ✅ No single-letter variable names (`index` not `i`, `item` not `c`)
- ✅ `type` keyword used (never `interface`) for data structures
- ✅ camelCase used for variables/functions
- ✅ PascalCase used for types/classes
- ✅ UPPER_SNAKE_CASE for constants
- ✅ Imports organized by source
- ✅ No unused imports or variables
- ✅ Lines under 100 characters
- ✅ Related code grouped together
- ✅ All tests pass
- ✅ No `// eslint-disable` comments without justification
- ✅ Critical operations check results (Rule 15)
- ✅ Callers check `{ success, error? }` return types (Rule 16)

## Common ESLint Issues

### Unused Variables

```typescript
// ❌ ESLint error: 'unused' is declared but never used
const data = fetchData();
const unused = 'value';

// ✅ Remove it
const data = fetchData();
```

### Missing Dependencies

```typescript
// ❌ ESLint error: missing dependency 'data' in useEffect
useEffect(() => {
  console.log(data);
}, []); // Should include 'data'

// ✅ Add to dependencies
useEffect(() => {
  console.log(data);
}, [data]);
```

### React Imports

```typescript
// ❌ ESLint error: unnecessary React import
import React from 'react';

// ✅ Direct imports only
import { useState } from 'react';
```

## Performance Linting

Some ESLint rules catch performance issues:

```typescript
// ⚠️ Warning: Function defined inside loop
for (const item of items) {
  const handler = () => processItem(item); // New function every iteration
}

// ✅ Define outside loop or use useCallback
const handler = useCallback(() => processItem(selectedItem), [selectedItem]);
```
