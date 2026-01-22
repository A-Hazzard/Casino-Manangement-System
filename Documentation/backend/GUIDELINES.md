# Backend Engineering Guidelines

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** January 2025
**Version:** 1.1.0

## Table of Contents

1. [Overview](#overview)
2. [API Route Structure & Organization](#api-route-structure--organization)
3. [Step-by-Step Commenting Standards](#step-by-step-commenting-standards)
4. [Helper Function Extraction](#helper-function-extraction)
5. [Error Handling](#error-handling)
6. [Performance Tracking](#performance-tracking)
7. [Import Organization](#import-organization)
8. [TypeScript Standards](#typescript-standards)
9. [Database Query Standards](#database-query-standards)

## Overview

This document provides comprehensive guidelines for backend/API development in the Evolution One CMS system. It covers API route structure, helper extraction, error handling, and maintainability standards.

### Key Principles

- **Thin Route Handlers**: Keep route handlers lean; delegate to helpers
- **Step-by-Step Comments**: Use visual separators and numbered steps
- **Extracted Logic**: Move business logic to `app/api/lib/helpers/`
- **Performance Tracking**: Monitor slow operations
- **Type Safety**: Strict TypeScript with no `any` types
- **Maintainability**: Code should be easy to understand, modify, and extend

---

## API Route Structure & Organization

**CRITICAL**: All API routes must follow a clear, step-by-step structure with proper commenting and helper function extraction.

### File Structure Requirements

1. **File-Level Documentation** (Required):

```typescript
/**
 * [Route Name] API Route
 *
 * This route handles [brief description of what the route does].
 * It supports:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 *
 * @module app/api/[path]/route
 */
```

2. **Import Organization**:

```typescript
// Group imports logically: helpers, types, utilities, Next.js
import { helper1, helper2 } from '@/app/api/lib/helpers/[feature]';
import { type Type1, type Type2 } from '@/app/api/lib/types';
import { NextRequest, NextResponse } from 'next/server';
```

3. **Helper Functions in Route File**:

```typescript
/**
 * [Small utility function if route-specific]
 */
function createEmptyResponse(...) {
  // Small helper functions can stay in route file
}
```

4. **Main Handler Structure**:

```typescript
/**
 * Main GET handler for [route name]
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Authenticate user and check permissions
 * 3. [Step 3 description]
 * 4. [Step 4 description]
 * ...
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now(); // Performance tracking

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const params = parseParams(searchParams);

    // ============================================================================
    // STEP 2: Connect to database and authenticate user
    // ============================================================================
    const db = await connectDB();
    const user = await getUserFromServer();

    // ============================================================================
    // STEP 3: [Next step description]
    // ============================================================================
    // Implementation

    // Continue with numbered steps...

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### Requirements

1. **File-Level JSDoc**: Must describe route purpose and features
2. **Step-by-Step Comments**: Use `// ============================================================================` separators
3. **Numbered Steps**: Each major operation must be a numbered step
4. **Flow Documentation**: Document the flow in function JSDoc before implementation
5. **Helper Extraction**: Extract complex logic to `app/api/lib/helpers/[feature].ts`
6. **Performance Tracking**: Track execution time for potentially slow operations
7. **Error Handling**: Proper try/catch with appropriate HTTP status codes

---

## Step-by-Step Commenting Standards

### Visual Separators

Use consistent visual separators for major steps:

```typescript
// ============================================================================
// STEP 1: [Clear step description]
// ============================================================================
```

### Numbered Steps

Each major operation should be a numbered step:

```typescript
// ============================================================================
// STEP 1: Parse and validate request parameters
// ============================================================================

// ============================================================================
// STEP 2: Authenticate user and check permissions
// ============================================================================

// ============================================================================
// STEP 3: Fetch data from database
// ============================================================================

// ============================================================================
// STEP 4: Transform and format response data
// ============================================================================

// ============================================================================
// STEP 5: Return response
// ============================================================================
```

### Step Descriptions

- **Clear and concise**: Each step should have a descriptive comment
- **Group related operations**: Multiple related operations can be in one step
- **Document complex logic**: Add inline comments for non-obvious business logic

### Flow Documentation

Document the flow in the handler's JSDoc before implementation:

```typescript
/**
 * Main GET handler for [route name]
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Authenticate user and check permissions
 * 3. Determine accessible locations based on user role
 * 4. Fetch data from database with proper filters
 * 5. Transform and format response data
 * 6. Return JSON response
 */
export async function GET(req: NextRequest) {
  // Implementation follows documented flow
}
```

---

## Helper Function Extraction

**Extract to `app/api/lib/helpers/` when:**

- Function is longer than 20-30 lines
- Function contains complex business logic
- Function is reusable across multiple routes
- Function performs database operations
- Function contains data transformation logic

**Keep in route file when:**

- Function is route-specific and very small (< 10 lines)
- Function is a simple response builder
- Function is only used once in the route

### Helper File Structure

```typescript
/**
 * [Feature Name] Helper Functions
 *
 * This file contains helper functions for [feature description].
 * It supports:
 * - Feature 1
 * - Feature 2
 *
 * @module app/api/lib/helpers/[feature]
 */

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch [data type] from database
 * @param params - Query parameters
 * @param db - Database connection
 * @returns Promise resolving to [data type]
 */
export async function fetchData(
  params: Params,
  db: DatabaseConnection
): Promise<DataType> {
  // Implementation
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Transform [data] to [format]
 * @param data - Raw data
 * @returns Transformed data
 */
export function transformData(data: RawData): TransformedData {
  // Implementation
}
```

### File Length Guidelines

- **Maximum route file length**: ~400-500 lines
- **If route exceeds limit**: Extract more helper functions
- **Helper files**: Can be longer but should be organized by functionality
- **Each helper file**: Should focus on a single domain (e.g., `metersReport.ts`)

---

## Error Handling

### Try/Catch Blocks

Always use try/catch blocks in route handlers:

```typescript
export async function GET(req: NextRequest) {
  try {
    // Route logic
    return NextResponse.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### HTTP Status Codes

Use appropriate HTTP status codes:

- **200 OK**: Successful GET, PUT, PATCH requests
- **201 Created**: Successful POST requests
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User lacks permission
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server errors

### Error Messages

- Provide meaningful error messages
- Log errors for debugging (use `console.error` or logger)
- Don't expose sensitive information in error messages

---

## Performance Tracking

### When to Track Performance

Track execution time for routes that may be slow:

- Database queries with large datasets
- Complex aggregations
- Data transformations
- External API calls

### Implementation

```typescript
export async function GET(req: NextRequest) {
  const startTime = Date.now(); // Performance tracking

  try {
    // Route logic
    
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Route Name] Completed in ${duration}ms`);
    }
    
    return NextResponse.json(response);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Route Name] Failed after ${duration}ms:`, err);
    // Error handling
  }
}
```

### Performance Logging

- Log slow operations (>1000ms) with `console.warn`
- Log errors with execution time using `console.error`
- Use this to identify optimization opportunities

---

## Import Organization

### Import Order

1. **Helper functions** from `app/api/lib/helpers/`
2. **Types** from `app/api/lib/types` or `shared/types/`
3. **Utilities** from `app/api/lib/utils/`
4. **Next.js** imports (`NextRequest`, `NextResponse`)
5. **External libraries** (if any)

### Example

```typescript
// Helpers
import { fetchData, transformData } from '@/app/api/lib/helpers/feature';
import { authenticateUser } from '@/app/api/lib/helpers/auth';

// Types
import { type UserData, type ApiResponse } from '@/app/api/lib/types';
import { type TimePeriod } from '@/shared/types/common';

// Utilities
import { validateParams } from '@/app/api/lib/utils/validation';
import { connectDB } from '@/app/api/lib/utils/db';

// Next.js
import { NextRequest, NextResponse } from 'next/server';
```

---

## TypeScript Standards

### Type Definitions

- **Prefer `type` over `interface`** - Use consistently across codebase
- **No `any` types** - Create proper type definitions
- **No underscore prefixes** - Never prefix variables with `_` (except `_id` for MongoDB)
- **Type organization**:
  - Shared types → `shared/types/`
  - Backend types → `app/api/lib/types/`

### Database Types

```typescript
// ✅ GOOD - Proper MongoDB document type
type MachineDocument = InferSchemaType<typeof machineSchema> & Document & {
  _id: string;
};

// ❌ BAD - Using any
const machine: any = await Machine.findById(id);
```

### Parameter Types

```typescript
// ✅ GOOD - Proper typing
export async function fetchData(
  params: { id: string; filter?: string },
  db: DatabaseConnection
): Promise<DataType> {
  // Implementation
}

// ❌ BAD - Using any
export async function fetchData(params: any, db: any): Promise<any> {
  // Implementation
}
```

---

## Database Query Standards

### Use Mongoose Models, Never Direct Collection Access

**CRITICAL**: Always use Mongoose models instead of direct `db.collection()` access:

- ✅ **Use Mongoose models** - Import from `@/app/api/lib/models/`
- ❌ **NEVER use `db.collection('name')`** - Bypasses type safety and indexes
- ✅ **Models provide**: Automatic indexing, type safety, validation, and optimization
- ❌ **Direct collection access**: No type safety, manual indexes required, error-prone

### Example

```typescript
// ✅ GOOD - Use Mongoose model
import { Member } from '@/app/api/lib/models/members';
const members = await Member.find(query).lean();
const count = await Member.countDocuments(query);

// ❌ BAD - Direct collection access
const members = await db.collection('members').find(query).toArray();
const count = await db.collection('members').countDocuments(query);
```

### Available Models

Import models from `@/app/api/lib/models/`:
- `Member` - members collection
- `Machine` - machines collection
- `GamingLocations` - gaminglocations collection
- `Meters` - meters collection
- `MachineSession` - machineSessions collection
- `MachineEvents` - machineEvents collection
- `Licencee` - licencees collection
- `Countries` - countries collection
- `Collections` - collections collection
- `CollectionReport` - collectionReports collection
- `MovementRequest` - movementRequests collection
- `Feedback` - feedback collection
- `Firmware` - firmwares collection
- `Scheduler` - schedulers collection
- `AcceptedBills` - acceptedBills collection
- `ActivityLog` - activityLog collection
- `User` - users collection

**Reference:** See `app/api/lib/models/` directory for all available models.

### Query Methods

**CRITICAL**: Use correct MongoDB query methods:

- ✅ **Use `findOne({ _id: id })`** for finding by ID (String IDs, not ObjectId)
- ❌ **NEVER use `findById(id)`** (it expects ObjectId)
- ✅ **Use `findOneAndUpdate({ _id: id }, ...)`** for updates
- ❌ **NEVER use `findByIdAndUpdate(id, ...)`**

### Example

```typescript
// ✅ GOOD - Correct query method with model
import { Machine } from '@/app/api/lib/models/machines';
const machine = await Machine.findOne({ _id: machineId });

// ❌ BAD - Wrong query method
const machine = await Machine.findById(machineId);

// ❌ BAD - Direct collection access
const machine = await db.collection('machines').findOne({ _id: machineId });
```

### Licensee Filtering

**CRITICAL**: Always filter data by user's accessible licensees/locations:

```typescript
// Always support both spellings
const licensee = searchParams.get('licensee') || searchParams.get('licencee');

// Get user's accessible locations
const allowedLocationIds = await getUserLocationFilter(licensee || undefined);

// Apply filter to query
if (allowedLocationIds !== 'all') {
  matchStage['gamingLocation'] = { $in: allowedLocationIds };
}
```

---

## File Length Guidelines Summary

| File Type        | Maximum Lines | Action if Exceeded                    |
| ---------------- | ------------- | ------------------------------------- |
| Route File       | 400-500       | Extract more helper functions         |
| Helper File      | 500-600       | Split into multiple focused files     |
| Model File       | 300-400       | Split schema definitions if needed     |
| Util File        | 300-400       | Split into multiple util files        |

---

## Best Practices Checklist

### For Every API Route File

- [ ] File-level JSDoc with description and features
- [ ] Step-by-step comments with visual separators
- [ ] Numbered steps (`STEP 1:`, `STEP 2:`, etc.)
- [ ] Flow documentation in handler JSDoc
- [ ] Business logic extracted to helpers
- [ ] Performance tracking for slow operations
- [ ] Proper error handling with status codes
- [ ] Import organization (helpers, types, utilities, Next.js)

### For Every Helper File

- [ ] File-level JSDoc with description
- [ ] Section comments for function groups
- [ ] Function-level comments for exported functions
- [ ] Proper TypeScript types (no `any`)
- [ ] Focused on single domain/feature

---

## Reference Examples

- `app/api/reports/meters/route.ts` - Exemplary API route structure
- `app/api/lib/helpers/metersReport.ts` - Well-organized helper file
- `app/api/dashboard/totals/route.ts` - Well-structured route with helper extraction

### Refactoring Checklist

When refactoring an API route, ensure:

- [ ] File-level JSDoc added
- [ ] Step-by-step comments with visual separators
- [ ] Numbered steps (`STEP 1:`, `STEP 2:`, etc.)
- [ ] Flow documented in handler JSDoc
- [ ] Business logic extracted to helpers
- [ ] Performance tracking added for slow operations
- [ ] Proper error handling with status codes
- [ ] Import organization (helpers, types, utilities, Next.js)
- [ ] TypeScript types are proper (no `any`)
- [ ] File length is within guidelines
- [ ] Tracker updated in `API_REFACTORING_TRACKER.md`

## 10. User Data Caching (Frontend)

### 10.1 When to Use Caching

Use `userCache` from `lib/utils/userCache.ts` for:
- User profile data that doesn't change frequently
- User permissions and roles (cached for session duration)
- Current user data needed by multiple components
- Any user-related data from `/api/auth/current-user` or similar endpoints

**Do NOT use caching for:**
- Real-time data that changes frequently
- Data that must always be fresh (use React Query with short `staleTime` instead)
- One-time data that won't be reused

### 10.2 How to Use

```typescript
import { CACHE_KEYS, fetchUserWithCache } from '@/lib/utils/userCache';

// Basic usage with default 5-minute TTL
const userData = await fetchUserWithCache(
  CACHE_KEYS.CURRENT_USER,
  async () => {
    const response = await axios.get('/api/auth/current-user');
    return response.data;
  }
);

// Custom TTL (10 minutes)
const profile = await fetchUserWithCache(
  CACHE_KEYS.USER_PROFILE,
  fetchFn,
  10 * 60 * 1000 // 10 minutes in milliseconds
);
```

### 10.3 Cache Keys

Always use `CACHE_KEYS` constants:
- `CACHE_KEYS.CURRENT_USER` - Current authenticated user data
- `CACHE_KEYS.USER_PROFILE` - User profile information
- `CACHE_KEYS.USER_PERMISSIONS` - User permissions and roles

### 10.4 Cache Invalidation

Cache is automatically cleared:
- When user logs in/out (via `userStore.setUser()` / `clearUser()`)
- When TTL expires (automatic cleanup)

Manually clear cache:
```typescript
import { clearUserCache } from '@/lib/utils/userCache';
clearUserCache(); // Clears all user-related cache entries
```

### 10.5 In-Flight Request Deduplication

The cache system automatically deduplicates concurrent requests:
- Multiple components requesting same data simultaneously share the same promise
- Prevents race conditions and duplicate API calls
- First request fetches, others wait for the same promise

### 10.6 Integration with React Query

The cache works alongside React Query:
- `useCurrentUserQuery` uses `fetchUserWithCache` internally
- Cache TTL aligns with React Query `staleTime`
- Both systems work together to prevent unnecessary requests

---

**Last Updated:** January 2025

