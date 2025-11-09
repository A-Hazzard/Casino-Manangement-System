# Cabinets Page Filtering Fix

## Problem

User "mkirton" is assigned to "Barbados" licensee only, but on the cabinets page was seeing machines from TTG licensee instead of their allowed locations.

## Root Cause

The `/api/machines/aggregation` endpoint (used by the cabinets page) was:
- ✅ Filtering by licensee parameter (if provided)
- ❌ **NOT applying user's location permissions**
- ❌ **NOT intersecting licensee locations with allowed locations**

**Result:** Users saw ALL machines from a licensee, not just their allowed locations.

## Solution

Updated `/api/machines/aggregation` to apply the same intersection logic as other endpoints:
1. Get user's accessible licensees from JWT
2. Get user's location permissions from `resourcePermissions`
3. Call `getUserLocationFilter()` to get intersection
4. Filter locations by the allowed location IDs
5. Only return machines from those locations

## Changes Made

### File: `app/api/machines/aggregation/route.ts`

**Added Imports:**
```typescript
import { getUserAccessibleLicenseesFromToken, getUserLocationFilter } from '../../lib/helpers/licenseeFilter';
import { getUserFromServer } from '../../lib/helpers/users';
```

**Added Logic:**
```typescript
// Get user's accessible licensees and location permissions
const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
const userPayload = await getUserFromServer();
const userLocationPermissions = 
  userPayload?.resourcePermissions?.['gaming-locations']?.resources || [];

// Get allowed location IDs (intersection of licensee + location permissions)
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  licensee || undefined,
  userLocationPermissions
);

// If user has no accessible locations, return empty
if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
  return NextResponse.json({ success: true, data: [] });
}

// Build location match stage with access control
const matchStage: MachineAggregationMatchStage = {
  $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
};

// Apply location filter based on user permissions
if (locationId) {
  // Specific location requested - validate access
  if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
    return NextResponse.json({ success: true, data: [] });
  }
  matchStage._id = locationId;
} else if (allowedLocationIds !== 'all') {
  // Apply allowed locations filter
  matchStage._id = { $in: allowedLocationIds };
}
```

**Added Debug Logging:**
```typescript
console.log('[MACHINES AGGREGATION] User accessible licensees:', userAccessibleLicensees);
console.log('[MACHINES AGGREGATION] User location permissions:', userLocationPermissions);
console.log('[MACHINES AGGREGATION] Licensee filter:', licensee);
console.log('[MACHINES AGGREGATION] Allowed location IDs:', allowedLocationIds);
console.log('[MACHINES AGGREGATION] Location match stage:', matchStage);
console.log('[MACHINES AGGREGATION] Found locations:', locations.length);
```

### File: `shared/types/mongo.ts`

**Updated Type:**
```typescript
export type MachineAggregationMatchStage = {
  _id?: string | { $in: string[] };  // ✅ Now supports both formats
  $or?: Array<{
    deletedAt: null | { $lt: Date };
  }>;
  [key: string]: unknown;
};
```

## How It Works Now

### Example: User "mkirton"

**User Data:**
- `rel.licencee`: `["732b094083226f216b3fc11a"]` (Barbados)
- `resourcePermissions['gaming-locations'].resources`: `["location-dueces-id"]` (Only Dueces)

**Barbados Licensee has locations:**
- Dueces (ID: location-dueces-id)
- Marks Bar (ID: location-marks-id)
- Other Location (ID: location-other-id)

**Flow:**
1. User opens cabinets page
2. Frontend calls `/api/machines/aggregation?licensee=&timePeriod=Today`
3. Backend:
   - Gets user's licensees: `["barbados-id"]`
   - Gets user's locations: `["location-dueces-id"]`
   - Calls `getUserLocationFilter()`:
     - Gets all Barbados locations: `["dueces", "marks", "other"]`
     - Intersects with allowed: `["dueces"]`
     - Returns: `["location-dueces-id"]`
   - Query: `{ _id: { $in: ["location-dueces-id"] } }`
   - Fetches machines from Dueces only
4. **Result:** User only sees machines from Dueces (not Marks Bar or Other)

### Example: TTG Machines Filtered Out

**Before Fix:**
- User assigned to Barbados
- Licensee filter = "" (All)
- **Problem:** Saw ALL machines from all licensees (including TTG)

**After Fix:**
- User assigned to Barbados with Dueces location
- Licensee filter = "" (All)
- Backend gets allowed locations: Only Dueces (from Barbados)
- **Result:** Only sees machines from Dueces (Barbados location)

## Testing

### Server Logs

Check your terminal where `pnpm dev` is running. You should see:

```
[MACHINES AGGREGATION] User accessible licensees: ['732b094083226f216b3fc11a']
[MACHINES AGGREGATION] User location permissions: ['location-dueces-id']
[MACHINES AGGREGATION] Licensee filter: 
[MACHINES AGGREGATION] Allowed location IDs: ['location-dueces-id']
[MACHINES AGGREGATION] Location match stage: { _id: { $in: ['location-dueces-id'] }, $or: [...] }
[MACHINES AGGREGATION] Found locations: 1
```

### Test Scenarios

**1. User with Barbados + Dueces only:**
- Go to cabinets page
- **Expected:** Only see cabinets from Dueces
- **Should NOT see:** TTG cabinets

**2. User with TTG + (Dueces + Marks Bar):**
- Go to cabinets page
- **Expected:** See cabinets from both Dueces and Marks Bar
- **Should NOT see:** Cabinets from other TTG locations not in their allowed list

**3. User with TTG + Cabana licensees, Location permissions = specific locations:**
- Licensee filter = "" (All)
- **Expected:** See cabinets from allowed locations across both licensees
- Licensee filter = "TTG"
- **Expected:** See only TTG locations that are in allowed list

## APIs Updated (Complete List)

Now **all major APIs** apply the intersection filter:

1. ✅ `/api/locations` - Location list
2. ✅ `/api/machines` - Machines by location
3. ✅ `/api/machines/aggregation` - **JUST FIXED** - Cabinet aggregation
4. ✅ `/api/collection-reports` - Collection reports
5. ✅ `/api/dashboard/totals` - Dashboard totals

## Verification

- ✅ **TypeScript:** No errors
- ✅ **ESLint:** No warnings
- ✅ **Build:** Ready to test

## Next Steps

1. **Refresh the cabinets page** (or reload the browser)
2. **Check server console** for the debug logs
3. **Verify** you only see cabinets from your allowed locations

**Expected Result:**
- User "mkirton" (Barbados + Dueces only) should see 0 cabinets if there are no machines in Dueces
- Should NOT see any TTG machines

---

**Status:** ✅ **FIXED - Cabinets page now respects location permissions**

