---
name: Licencee Access Control
description: Multi-tenant access control, role-based permissions, location filtering, session invalidation on permission changes.
---

# Licencee Access Control

Use for **all data filtering and access control** in APIs and pages.

## Core Principles

1. **Every user belongs to licencees** - Multi-tenant data isolation
2. **Licencee filter persists** - Stored in Zustand store + localStorage
3. **Location access is intersection** - (Licencee locations) ∩ (User assigned locations)
4. **Session invalidation** - Permissions change = user must re-login
5. **Role hierarchy** - Developer > Admin > Manager > Collector > Location Admin > Technician

## User Fields

```typescript
{
  _id: string;
  username: string;
  emailAddress: string;
  roles: string[];

  // ⭐ PRIMARY FIELDS - Use these exclusively
  assignedLocations: string[];   // Specific locations user can access
  assignedLicencees: string[];   // Licencees user can access

  sessionVersion: number;         // Incremented when permissions change
}
```

## Location & Machine Hierarchy

```typescript
// Location → Licencee relationship
type Location = {
  _id: string;
  name: string;
  rel: {
    licencee: string;  // Single licencee ID
  }
}

// Machine → Location relationship
type Machine = {
  _id: string;
  serialNumber: string;
  gamingLocation: string;  // Location ID (inherits licencee)
}
```

## Role-Based Access Rules

| Role | Licencee Access | Location Access | Dropdown |
|------|---|---|---|
| Developer | ALL | ALL | Yes (filter only) |
| Admin | ALL | ALL | Yes (filter only) |
| Manager | Assigned only | ALL in assigned licencees | Yes if 2+ licencees |
| Collector | Assigned only | Intersection | Yes if 2+ licencees |
| Location Admin | Assigned only | Intersection | Never |
| Technician | Assigned only | Intersection | Yes if 2+ licencees |

**Key difference**: Managers see ALL locations for their licencees. Non-managers see ONLY the intersection of (licencee locations) ∩ (assigned locations).

## Backend API Pattern

```typescript
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // ============================================================================
    // STEP 1: Parse licencee parameter (support both spellings)
    // ============================================================================
    const licencee = searchParams.get('licencee') || searchParams.get('licencee');

    // ============================================================================
    // STEP 2: Get user's accessible locations
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      licencee || undefined
    );

    // Handle no access
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // ============================================================================
    // STEP 3: Build query with location filter
    // ============================================================================
    const query: Record<string, unknown> = {};

    if (allowedLocationIds !== 'all') {
      query._id = { $in: allowedLocationIds }; // For locations
      // OR
      query.gamingLocation = { $in: allowedLocationIds }; // For machines
    }

    // ============================================================================
    // STEP 4: Execute query
    // ============================================================================
    const data = await Model.find(query);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
```

## Frontend Pattern

```typescript
import { shouldShowNoLicenceeMessage } from '@/lib/utils/licenceeAccess';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { NoLicenceeAssigned } from '@/components/ui/NoLicenceeAssigned';

export default function MyPage() {
  // Get selected licencee from store (persists to localStorage)
  const { selectedLicencee, setSelectedLicencee } = useDashboardStore();
  const user = useUserStore(state => state.user);

  // Check if user should see content
  const showNoLicenceeMessage = shouldShowNoLicenceeMessage(user);

  if (showNoLicenceeMessage) {
    return <NoLicenceeAssigned />;
  }

  // Use selectedLicencee in data fetching
  useEffect(() => {
    fetchData(selectedLicencee, timePeriod, filters);
  }, [selectedLicencee, timePeriod, filters]); // ⭐ Include selectedLicencee!

  return (
    <PageLayout
      headerProps={{ selectedLicencee, setSelectedLicencee }}
    >
      {/* Page content */}
    </PageLayout>
  );
}
```

## Session Invalidation

**Increment `sessionVersion` when permissions change:**

```typescript
// When admin modifies user permissions
await User.findOneAndUpdate(
  { _id: userId },
  {
    $set: {
      assignedLicencees: newLicencees,
      assignedLocations: newLocations,
      roles: newRoles,
    },
    $inc: { sessionVersion: 1 }, // ⭐ Increment!
  }
);

// User's JWT becomes invalid
// 401 Unauthorized on next API call
// Auto-logout with toast message
```

**JWT validation on every request:**

```typescript
const payload = verifyJWT(token);
const dbUser = await User.findOne({ _id: payload.userId });

if (dbUser.sessionVersion !== payload.sessionVersion) {
  return null; // Session invalid - user logged out
}
```

## Licencee Dropdown Visibility

**Header component logic:**

```typescript
const isAdmin = roles.includes('admin') || roles.includes('developer');
const userLicencees = assignedLicencees || [];
const hasMultipleLicencees = userLicencees.length >= 2;

const shouldShowLicenceeSelect = isAdmin || hasMultipleLicencees;

// Show dropdown if admin OR user has 2+ licencees
```

## Helper Functions

### Get User's Accessible Licencees

```typescript
const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
// Returns: 'all' for admins, string[] for others
```

### Get User's Accessible Locations

```typescript
const allowedLocationIds = await getUserLocationFilter(
  selectedLicencee || undefined
);
// Returns: 'all' for admins, string[] for filtered, [] for no access
```

### Check if User Should See Content

```typescript
const showNoLicenceeMessage = shouldShowNoLicenceeMessage(user);
// Returns: true if non-admin with no licencees
```

## Backend Aggregation Pattern

```typescript
const pipeline: PipelineStage[] = [
  {
    $match: {
      readAt: { $gte: startDate, $lte: endDate },
    },
  },
  // Apply location filter if user has restrictions
  ...(allowedLocationIds !== 'all'
    ? [{ $match: { location: { $in: allowedLocationIds } } }]
    : []),
  {
    $group: {
      _id: '$location',
      total: { $sum: '$movement.drop' },
    },
  },
];

const results = await Meters.aggregate(pipeline)
  .cursor({ batchSize: 1000 });
```

## Common Mistakes - AVOID

❌ Not checking licencee parameter in API
❌ Returning all data without location filter
❌ Using `||` instead of `??` for default offset
❌ Not including `selectedLicencee` in useEffect dependencies
❌ Showing dropdown when user has only 1 licencee (non-admin)
❌ Forgetting to increment `sessionVersion` on permission changes
❌ Using old `rel.licencee` field instead of `assignedLicencees`
❌ Not supporting both `licencee` spellings in API
❌ Returning 500 error instead of empty array for no access
❌ Caching results per-licencee without invalidation

## Testing Checklist

### Test Each Role
- ✅ Developer (view all + filter)
- ✅ Manager with 3 licencees (dropdown filters correctly)
- ✅ Manager with 1 licencee (no dropdown)
- ✅ Collector with multi-location (sees only assigned)
- ✅ Location Admin (no dropdown, sees only assigned)
- ✅ Technician (minimal access)

### Verify No Data Leakage
- ✅ Select licencee → verify ONLY that licencee's data
- ✅ NO other licencee data visible
- ✅ Check all pages (Dashboard, Locations, Cabinets, Reports)

### Test Session Invalidation
- ✅ Login as user
- ✅ Admin changes permissions
- ✅ User makes next API call → 401 Unauthorized
- ✅ User redirected to /login
- ✅ Toast message shown

## Code Review Checklist

- ✅ Import `getUserLocationFilter` from `licenceeFilter.ts`
- ✅ Read `licencee` parameter (support both spellings)
- ✅ Call `getUserLocationFilter(licencee)` to get allowed locations
- ✅ Handle `allowedLocationIds === 'all'` case (admins)
- ✅ Handle `allowedLocationIds.length === 0` case (no access)
- ✅ Apply filter to MongoDB query
- ✅ Test with different roles
- ✅ Verify no data leakage between licencees
- ✅ `selectedLicencee` included in useEffect dependencies
- ✅ Dropdown visibility correct for role + licencee count
- ✅ Session invalidation working (permission changes invalidate JWT)
