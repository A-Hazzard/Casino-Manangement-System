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
export async function GET(req: NextRequest) {
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
