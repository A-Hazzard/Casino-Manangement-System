---
name: API Route Structure
description: Structure API routes with step-by-step comments, JSDoc, helper extraction, and proper organization.
---

# API Route Structure

Use when **creating or modifying API routes** in `app/api/`.

## Required Pattern

### 1. File-Level JSDoc

```typescript
/**
 * [Route Name] API Route
 *
 * This route handles [brief description].
 * It supports:
 * - Feature 1
 * - Feature 2
 *
 * @module app/api/[path]/route
 */
```

### 2. Step-by-Step Implementation

```typescript
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const param = searchParams.get('param');

    // ============================================================================
    // STEP 2: Authenticate user and check permissions
    // ============================================================================
    const user = await getUserFromServer();

    // ============================================================================
    // STEP 3: [Next step description]
    // ============================================================================
    // Implementation

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

## Helper Extraction

**Extract to `app/api/lib/helpers/` when:**

- Function > 20-30 lines
- Complex business logic
- Reusable across routes
- Database operations
- Data transformation

**Keep in route when:**

- < 10 lines
- Route-specific
- Single use

## Critical Operation Result Checking (Rule 15)

**Check results of critical operations in both helpers AND routes:**

```typescript
// ✅ CORRECT — Helper checks critical DB operation
export async function deleteMeter(
  meterId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await Meters.findOneAndDelete({ _id: meterId });
  if (!result) {
    console.error(`[deleteMeter] Failed to delete meter ${meterId}`);
    return { success: false, error: 'Failed to delete meter' };
  }
  return { success: true };
}

// ✅ CORRECT — Route handler checks helper result
const deleteResult = await deleteMeter(meterId);
if (!deleteResult.success) {
  return NextResponse.json(
    { message: deleteResult.error || 'Operation failed' },
    { status: 500 }
  );
}
```

## Caller Responsibility (Rule 16)

**When calling functions that return `{ success: boolean; error?: string }`:**

```typescript
// ✅ CORRECT — Check result after await
const result = await someHelper(params);
if (!result.success) {
  return NextResponse.json(
    { message: result.error || 'Operation failed' },
    { status: 500 }
  );
}

// ✅ CORRECT — Non-critical operation (optional logging)
const logResult = await logActivity(...);
// logActivity throws on failure, caught by outer try/catch
```

**Critical vs Non-Critical:**
| Operation | Critical? | Action |
|-----------|----------|--------|
| Delete/Update DB record | ✅ Yes | Return early with error |
| Create report | ✅ Yes | Return early with error |
| Log activity | ❌ No | Log warning, continue |

## Parameter Guards in Helper Functions

**Every exported helper function must guard its mandatory parameters at the top:**

```typescript
// ✅ CORRECT - guard matches return type
export async function getMetricsForLocation(
  locationId: string,
  timePeriod: TimePeriod
): Promise<MetricsResult | null> {
  if (!locationId || !timePeriod) {
    console.error(
      '[getMetricsForLocation] locationId and timePeriod are required'
    );
    return null;
  }
  // implementation
}

export function buildReportPipeline(
  locationIds: string[],
  startDate: Date,
  endDate: Date
): PipelineStage[] {
  if (!Array.isArray(locationIds) || !startDate || !endDate) {
    console.error(
      '[buildReportPipeline] locationIds (array), startDate, and endDate are required'
    );
    return [];
  }
  // implementation
}
```

**Guard return values by function signature:**

- Array return → `return []`
- Nullable return → `return null`
- Object/record return → `return {}`
- Typed shape → `return { field: 0, other: 0 }`
- void/throws expected → `throw new Error(msg)`

## File Guidelines

- **Max route file**: ~400-500 lines
- **Imports**: Group by source (helpers, models, types)
- **Error handling**: Try/catch with proper HTTP status codes
- **Performance**: Track duration for slow operations

## Reference Example

File: `app/api/reports/meters/route.ts`

- ✅ Complete file-level JSDoc
- ✅ Numbered step comments
- ✅ Helpers extracted to `lib/helpers/`
- ✅ Proper error handling
- ✅ Performance tracking
