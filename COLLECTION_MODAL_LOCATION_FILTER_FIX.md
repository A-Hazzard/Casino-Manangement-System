# Collection Modal Location Filter Fix

**Date:** November 10, 2025  
**Issue:** Location dropdown in collection report modals was not respecting user's location permissions  
**Priority:** 🔴 CRITICAL SECURITY FIX

---

## 🐛 **The Problem**

### What Was Wrong?

The **Create** and **Edit Collection Report** modals were showing ALL locations for a licensee in their location dropdown, without checking if the user actually has permission to access those locations.

**Example Scenario:**
```
User: John (Collector)
- Assigned Licensees: [TTG]
- Assigned Locations: [Location A, Location B]  (via resourcePermissions)

Expected Behavior:
  Location dropdown should show ONLY: Location A, Location B

Actual Behavior:
  Location dropdown showed ALL TTG locations (A, B, C, D, E, F, G...)
```

### Why This is Critical 🔴

1. **Security Issue**: Users could see locations they shouldn't have access to
2. **Data Leakage**: Non-managers could view location names outside their permissions
3. **Inconsistency**: Other pages (Locations, Collection Reports) correctly filtered locations
4. **Permission Bypass**: Users could potentially create reports for unauthorized locations

---

## 🔍 **Root Cause Analysis**

### The API Endpoint: `/api/collectionReport?locationsWithMachines=1`

**File:** `app/api/collectionReport/route.ts` (lines 24-118)

**Old Logic:**
```typescript
// ❌ WRONG - Only filtered by licensee, ignored user permissions
const licencee = searchParams.get('licencee');
const matchCriteria: Record<string, unknown> = {
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2020-01-01') } },
  ],
};

if (licencee && licencee !== 'all') {
  matchCriteria['rel.licencee'] = licencee;  // Only licensee filter!
}

const locationsWithMachines = await GamingLocations.aggregate([
  { $match: matchCriteria },  // Missing user location permissions!
  // ... rest of aggregation
]);
```

**The Problem:**
- Only checked `rel.licencee` (licensee assignment)
- Did NOT check `resourcePermissions.gaming-locations.resources` (location permissions)
- Did NOT use intersection logic for non-managers

---

## ✅ **The Fix**

### Updated Logic

**File:** `app/api/collectionReport/route.ts`

```typescript
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

// ✅ CORRECT - Respects user permissions
const licensee = searchParams.get('licensee') || searchParams.get('licencee');

// Get user's accessible locations based on role and permissions
const allowedLocationIds = await getUserLocationFilter(licensee || undefined);

console.warn(`[LOCATIONS WITH MACHINES] Licensee: ${licensee || 'All'}`);
console.warn(`[LOCATIONS WITH MACHINES] Allowed locations:`, allowedLocationIds);

// If user has no access, return empty array
if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
  console.warn('[LOCATIONS WITH MACHINES] User has no accessible locations');
  return NextResponse.json({ locations: [] });
}

const matchCriteria: Record<string, unknown> = {
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2020-01-01') } },
  ],
};

// Apply location filter based on user permissions
if (allowedLocationIds !== 'all') {
  matchCriteria['_id'] = { $in: allowedLocationIds };  // ✅ User's allowed locations!
}

const locationsWithMachines = await GamingLocations.aggregate([
  { $match: matchCriteria },  // Now properly filtered!
  // ... rest of aggregation
]);
```

---

## 🔐 **How It Works Now**

### For Different User Roles

#### **1. Developer/Admin**
```
allowedLocationIds = 'all'

Result: See ALL locations (no filter applied)
Dropdown: Shows all locations across all licensees
```

#### **2. Manager**
```
User assigned to: TTG licensee
allowedLocationIds = [All TTG location IDs]

Result: See ALL locations for TTG (no intersection)
Dropdown: Shows all TTG locations
```

#### **3. Collector/Location Admin/Technician**
```
User assigned to:
  - Licensee: TTG
  - Locations: [Location A, Location B] (via resourcePermissions)

Intersection Logic:
  allowedLocationIds = (TTG locations) ∩ (assigned locations)
  allowedLocationIds = [Location A ID, Location B ID]

Result: See ONLY Location A and Location B
Dropdown: Shows only Location A, Location B
```

---

## 🧪 **Testing**

### Test Scenarios

#### **Test 1: Collector with Limited Locations**
```bash
# Setup
User: collector1
Licensee: TTG
Assigned Locations: [DevLabTuna, Location X]

# Steps
1. Login as collector1
2. Go to Collection Reports page
3. Click "Create Collection Report"
4. Check location dropdown

# Expected Result
Dropdown shows ONLY: DevLabTuna, Location X
(Not all TTG locations)
```

#### **Test 2: Manager with Multiple Licensees**
```bash
# Setup
User: manager1
Licensees: [TTG, Cabana]
No specific location restrictions (manager sees all)

# Steps
1. Login as manager1
2. Select "TTG" from licensee dropdown
3. Click "Create Collection Report"
4. Check location dropdown

# Expected Result
Dropdown shows ALL TTG locations
(Manager has full access to licensee locations)
```

#### **Test 3: Admin**
```bash
# Setup
User: admin1
Role: admin (no restrictions)

# Steps
1. Login as admin1
2. Select "All Licensees"
3. Click "Create Collection Report"
4. Check location dropdown

# Expected Result
Dropdown shows ALL locations across ALL licensees
```

#### **Test 4: User with No Access**
```bash
# Setup
User: newuser
Licensees: []
Assigned Locations: []

# Steps
1. Login as newuser
2. Try to access Collection Reports page

# Expected Result
- Shows "No Licensee Assigned" message
- Cannot create collection reports
```

---

## 📋 **Changes Summary**

### Files Modified
1. `app/api/collectionReport/route.ts` - Added location permission filtering

### Functions Used
1. `getUserLocationFilter()` - Core filtering function from `licenseeFilter.ts`

### New Imports
```typescript
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
```

### Lines Changed
- **Lines 4**: Added import
- **Lines 29-54**: Replaced old licensee-only logic with permission-based filtering

---

## 🔄 **Data Flow**

```
User opens Create/Edit Collection Modal
  ↓
Modal calls getLocationsWithMachines(selectedLicencee)
  ↓
Helper calls /api/collectionReport?locationsWithMachines=1&licencee=xxx
  ↓
API calls getUserLocationFilter(licencee)
  ↓
getUserLocationFilter checks:
  - Is user admin/developer? → Return 'all'
  - Is user manager? → Return all licensee locations
  - Is user collector/location admin? → Return intersection of (licensee locations ∩ assigned locations)
  ↓
API applies filter to MongoDB aggregation
  ↓
Returns only locations user has permission to access
  ↓
Modal dropdown shows filtered locations
```

---

## ⚠️ **Impact Assessment**

### Security Impact
- **HIGH**: Closes a permission bypass vulnerability
- Users can no longer see locations outside their permissions
- Prevents potential unauthorized report creation

### User Experience Impact
- **POSITIVE for most users**: No change (already had access)
- **NEGATIVE for misconfigured users**: If they were accessing unauthorized locations, they'll now see fewer options (this is CORRECT behavior)

### Compatibility Impact
- **NONE**: Backwards compatible
- Supports both `licensee` and `licencee` parameter spellings
- No breaking changes to existing functionality

---

## 📚 **Reference**

### Related Documentation
- `.cursor/licensee-access-context.md` - Complete access control guide
- `Documentation/licensee-location-filtering.md` - Detailed filtering rules
- `app/api/lib/helpers/licenseeFilter.ts` - Core filtering functions

### Similar Implementations
These endpoints already correctly filter locations:
- `/api/reports/locations` - Locations page
- `/api/dashboard/totals` - Dashboard
- `/api/machines/aggregation` - Cabinets page
- `/api/locationAggregation` - Location aggregation

### Helper Function Used
```typescript
/**
 * Get user's accessible location IDs based on role and permissions
 * @param selectedLicenseeFilter - Optional licensee filter from dropdown
 * @returns 'all' for admins, string[] for filtered results, [] for no access
 */
export async function getUserLocationFilter(
  selectedLicenseeFilter?: string
): Promise<string[] | 'all'>
```

---

## ✅ **Verification Checklist**

- [x] Import `getUserLocationFilter` from `licenseeFilter.ts`
- [x] Support both `licensee` and `licencee` parameter spellings
- [x] Call `getUserLocationFilter(licensee)` to get allowed locations
- [x] Handle `allowedLocationIds === 'all'` case (admins)
- [x] Handle `allowedLocationIds.length === 0` case (no access)
- [x] Apply filter to MongoDB query (`_id` for locations)
- [x] Add console.log for debugging
- [x] Test with different roles (admin, manager, collector)
- [x] Verify no data leakage between licensees
- [x] Verify intersection logic for non-managers

---

## 🎯 **Key Takeaway**

**Before:** Location dropdown showed all licensee locations, ignoring user's specific location permissions.

**After:** Location dropdown respects user's role and `resourcePermissions.gaming-locations.resources`, showing only authorized locations.

This fix ensures the collection modal location dropdown works **exactly like** the Locations page and Collection Reports page - all three now use the same permission logic via `getUserLocationFilter()`.

---

**Status:** ✅ FIXED  
**Priority:** 🔴 CRITICAL  
**Security:** ✅ SECURED

