---
name: Backend Standards
description: Mongoose models over direct collections, findOne() not findById(), licencee filtering, aggregation patterns.
---

# Backend Standards

Use for **all backend database operations in `app/api/`**.

## Mongoose Models - ALWAYS

**Never use `db.collection()` directly:**

```typescript
// ✅ CORRECT - Use Mongoose model
import { Member } from '@/app/api/lib/models/members';
const members = await Member.find(query).lean();
const count = await Member.countDocuments(query);

// ❌ INCORRECT - Direct collection access
const members = await db.collection('members').find(query).toArray();
const count = await db.collection('members').countDocuments(query);
```

**Benefits:**
- Automatic indexing
- Type safety
- Validation
- Proper error handling

## MongoDB Query Methods

**Use `findOne()` with string IDs:**

```typescript
// ✅ CORRECT - findOne for string IDs
const session = await MachineSession.findOne({ _id: sessionId });
const user = await User.findOne({ _id: userId });

// ❌ INCORRECT - findById (expects ObjectId)
const session = await MachineSession.findById(sessionId);
const user = await User.findById(userId);
```

**Updates with `findOneAndUpdate()`:**

```typescript
// ✅ CORRECT
const updated = await Model.findOneAndUpdate(
  { _id: id },
  { $set: { field: newValue } },
  { new: true }
);

// ❌ INCORRECT
const updated = await Model.findByIdAndUpdate(id, { field: newValue });
```

## Licencee & Location Filtering

**ALWAYS apply location filters to location/machine queries:**

```typescript
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Support both spellings
  const licencee = searchParams.get('licencee') || searchParams.get('licencee');

  // Get allowed locations for user
  const allowedLocationIds = await getUserLocationFilter(licencee || undefined);

  // Handle no access
  if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  // Build query
  const query: Record<string, unknown> = {};
  if (allowedLocationIds !== 'all') {
    query._id = { $in: allowedLocationIds }; // For locations
    // OR
    query.gamingLocation = { $in: allowedLocationIds }; // For machines
  }

  // Execute
  const data = await GamingLocations.find(query);
  return NextResponse.json({ success: true, data });
}
```

## Aggregation Pipeline Patterns

### Basic Pattern with Licencee Filter

```typescript
const pipeline: PipelineStage[] = [
  // ============================================================================
  // Stage 1: Match documents
  // ============================================================================
  {
    $match: {
      readAt: { $gte: startDate, $lte: endDate },
    },
  },

  // ============================================================================
  // Stage 2: Filter by location if user has restrictions
  // ============================================================================
  ...(allowedLocationIds !== 'all'
    ? [{ $match: { location: { $in: allowedLocationIds } } }]
    : []),

  // ============================================================================
  // Stage 3: Group results
  // ============================================================================
  {
    $group: {
      _id: '$location',
      total: { $sum: '$movement.drop' },
    },
  },
];

const results = await Model.aggregate(pipeline);
```

### Pattern with Location Join

```typescript
const pipeline: PipelineStage[] = [
  {
    $match: {
      gamingLocation: { $in: allowedLocationIds },
    },
  },
  {
    $lookup: {
      from: 'gaminglocations',
      localField: 'gamingLocation',
      foreignField: '_id',
      as: 'locationDetails',
    },
  },
  {
    $unwind: '$locationDetails',
  },
  {
    $match: {
      'locationDetails.rel.licencee': licenceeId,
    },
  },
];
```

## Soft Delete Handling

**Always filter out soft-deleted records:**

```typescript
// ✅ CORRECT - Exclude soft-deleted
const locations = await GamingLocations.find({
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2025-01-01') } },
  ],
});

const machines = await Machine.find({
  gamingLocation: { $in: locationIds },
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2025-01-01') } },
  ],
});
```

## Error Handling

```typescript
try {
  // Database operations
  const data = await Model.findOne({ _id: id });

  if (!data) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  console.error('[Route Name] Error:', errorMessage);
  return NextResponse.json(
    { success: false, error: errorMessage, message: 'Database operation failed' },
    { status: 500 }
  );
}
```

## Common Query Patterns

### Find by ID

```typescript
const item = await Model.findOne({ _id: id });
if (!item) return notFoundResponse();
```

### Find Multiple by IDs

```typescript
const items = await Model.find({ _id: { $in: ids } });
```

### Count Documents

```typescript
const count = await Model.countDocuments(query);
```

### Update Single Document

```typescript
const updated = await Model.findOneAndUpdate(
  { _id: id },
  { $set: updateObject },
  { new: true }
);
```

### Update Multiple Documents

```typescript
const result = await Model.updateMany(
  { query },
  { $set: updateObject }
);
```

### Delete (Soft Delete)

```typescript
const deleted = await Model.findOneAndUpdate(
  { _id: id },
  { $set: { deletedAt: new Date() } },
  { new: true }
);
```

### Delete with Cascade

```typescript
// Archive location
await GamingLocations.findOneAndUpdate(
  { _id: locationId },
  { $set: { deletedAt: new Date() } }
);

// Archive all machines at that location
await Machine.updateMany(
  { gamingLocation: locationId },
  { $set: { deletedAt: new Date() } }
);
```

## Lean Queries (Performance)

Use `.lean()` when you don't need Mongoose document methods:

```typescript
// ✅ CORRECT - Use lean for read-only data
const machines = await Machine.find(query).lean();
const report = await Machine.aggregate(pipeline).exec();

// Use lean() only for queries that return documents
const machines = await Machine.find(query).lean(); // ✅ Good
const count = await Machine.countDocuments(query); // ✅ No lean needed
```

## Type Safety & DTOs

Refer to [`type-safety.md`](mdc:.instructions/rules/type-safety.md) for detailed rules.

**Key Backend Rules:**
1. **Explicit Return Types**: All API helpers must have explicit return type annotations.
2. **DTO Mapping**: When returning data to the frontend, ensure the mapped object matches a type defined in `shared/types/`.
3. **Zero `any`**: Use `unknown` or specific interfaces for database query results.

## Code Review Checklist

- ✅ Using Mongoose models, not `db.collection()`
- ✅ Using `findOne()` not `findById()`
- ✅ Using `findOneAndUpdate()` not `findByIdAndUpdate()`
- ✅ Licencee/location filtering applied
- ✅ Soft-deleted records filtered out
- ✅ Both `licencee` spellings supported
- ✅ Proper error handling with HTTP status codes
- ✅ `.lean()` used for read-only queries
- ✅ Aggregation pipelines properly structured
- ✅ No direct `db.collection()` access
- ✅ String IDs used (not ObjectId)
