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
pnpm run lint

# Auto-fix violations
pnpm run lint --fix
```

**If ESLint complains:**
1. Fix the issue immediately
2. Don't suppress with `// eslint-disable`
3. Address root cause, not symptom

## TypeScript Type Checking

```bash
# Check for type errors
pnpm run type-check

# Run before committing
pnpm run type-check && pnpm run lint
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

### Types & Interfaces

```typescript
// ✅ PascalCase with Type suffix (optional)
export type UserData = {
  id: string;
  name: string;
};

export type LocationDetails = {
  id: string;
  name: string;
};

// ❌ camelCase
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
const result = calculateMetrics(startDate, endDate, gameDayOffset, selectedLocations, additionalParam1, additionalParam2);
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
const unused = 'not used'; // ESLint error: unused variable

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
pnpm run type-check

# 2. Lint & auto-fix
pnpm run lint --fix

# 3. Check for remaining lint errors
pnpm run lint

# 4. Verify no regressions
pnpm run test

# 5. Commit only after all pass
git add .
git commit -m "..."
```

## Code Review Checklist

- ✅ No ESLint violations (`pnpm run lint` passes)
- ✅ No TypeScript errors (`pnpm run type-check` passes)
- ✅ File-level documentation present
- ✅ No redundant comments removed
- ✅ Complex logic has explanatory comments
- ✅ camelCase used for variables/functions
- ✅ PascalCase used for types/classes
- ✅ UPPER_SNAKE_CASE for constants
- ✅ Imports organized by source
- ✅ No unused imports or variables
- ✅ Lines under 100 characters
- ✅ Related code grouped together
- ✅ All tests pass
- ✅ No `// eslint-disable` comments without justification

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
const handler = useCallback(
  () => processItem(selectedItem),
  [selectedItem]
);
```
