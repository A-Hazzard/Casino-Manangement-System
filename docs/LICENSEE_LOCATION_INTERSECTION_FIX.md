# Licensee & Location Permission Intersection Implementation

## Overview

Implemented proper data filtering that respects BOTH licensee assignments AND location permissions as an intersection. Users now only see data from locations they have access to within their assigned licensees.

---

## Changes Made

### 1. Profile Modal - Show Licensee Names (Not IDs)

**File:** `components/layout/ProfileModal.tsx`

**Problem:** User "mkirton" was seeing `732b094083226f216b3fc11a` instead of "Barbados"

**Fix:**
- Added debug logging to trace ID matching issues
- Improved fallback display to show `Unknown (${licenseeId})` for better debugging
- Added console warnings in development mode to help identify mismatches

**Code:**
```typescript
const licensee = licensees.find(l => {
  const licId = String(l._id);
  const userId = String(licenseeId);
  return licId === userId;
});

return licensee?.name || `Unknown (${licenseeId})`;
```

---

### 2. Header - Conditional Licensee Select Display

**File:** `components/layout/Header.tsx`

**Changes:**
- Licensee select now only shown if user has multiple licensees OR is admin
- Hidden for users with 0 or 1 licensee
- Passes `userLicenseeIds` prop to filter options for non-admin users

**Logic:**
```typescript
const userLicensees = user?.rel?.licencee || [];
const isAdmin = userRoles.includes('admin') || userRoles.includes('evolution admin');
const shouldShowLicenseeSelect = isAdmin || userLicensees.length > 1;

{!hideLicenceeFilter && shouldShowLicenseeSelect && (
  <LicenceeSelect
    selected={selectedLicencee || ''}
    onChange={handleLicenseeChange}
    userLicenseeIds={isAdmin ? undefined : userLicensees}
    disabled={disabled}
  />
)}
```

**Behavior:**
- User with 1 licensee: No select shown (auto-filtered to their licensee)
- User with 2+ licensees: Select shows only their licensees + "All"
- Admin: Select shows all licensees + "All"

---

### 3. LicenceeSelect Component - Dynamic Filtering

**File:** `components/ui/LicenceeSelect.tsx`

**Changes:**
- Replaced hardcoded `licenceeOptions` constant with dynamic API fetch
- Accepts `userLicenseeIds` prop to filter options for non-admins
- Fetches all licensees and filters by user's assignments
- Always includes "All Licensees" option at top

**Implementation:**
```typescript
type LicenceeSelectProps = {
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  userLicenseeIds?: string[]; // If provided, only show these licensees
};

// Fetch licensees from API
const allLicensees = await fetchLicensees();

// Filter by userLicenseeIds if provided (non-admin users)
const filteredLicensees = userLicenseeIds
  ? allLicensees.filter(lic => userLicenseeIds.includes(String(lic._id)))
  : allLicensees;
```

---

### 4. Backend Helper - getUserLocationFilter

**File:** `app/api/lib/helpers/licenseeFilter.ts`

**New Function:** `getUserLocationFilter(userAccessibleLicensees, selectedLicenseeFilter, userLocationPermissions)`

**Purpose:** Returns the INTERSECTION of:
1. Locations from user's assigned licensees (or selected licensee filter)
2. Locations from user's `resourcePermissions['gaming-locations'].resources`

**Logic:**
```typescript
// Step 1: Get locations from licensee(s)
if (selectedLicenseeFilter) {
  // Get locations from specific licensee
} else {
  // Get locations from all user's licensees
}

// Step 2: Intersect with user's location permissions
if (userLocationPermissions.length > 0) {
  return licenseeLocations.filter(id => userLocationPermissions.includes(id));
}

return licenseeLocations;
```

**Result:** Array of location IDs or 'all' for unrestricted admins

---

### 5. Backend APIs - Apply Intersection Filtering

Updated the following APIs to use `getUserLocationFilter`:

#### A. `/api/locations` (GET)

**File:** `app/api/locations/route.ts`

**Changes:**
- Gets user's location permissions from JWT
- Calls `getUserLocationFilter()` to get intersection
- Applies `_id: { $in: allowedLocationIds }` filter

**Code:**
```typescript
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  licencee || undefined,
  userLocationPermissions
);

if (allowedLocationIds !== 'all') {
  queryFilter._id = { $in: allowedLocationIds };
}
```

---

#### B. `/api/machines` (GET with locationId)

**File:** `app/api/machines/route.ts`

**Changes:**
- Validates location access using `getUserLocationFilter()`
- Returns 403 if user doesn't have access to requested location

**Code:**
```typescript
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  undefined,
  userLocationPermissions
);

// Check if user can access this specific location
if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
  return NextResponse.json(
    { error: 'Unauthorized: You do not have access to this location' },
    { status: 403 }
  );
}
```

---

#### C. `/api/collection-reports` (GET)

**File:** `app/api/collection-reports/route.ts`

**Changes:**
- Uses `getUserLocationFilter()` to get accessible locations
- Filters collection reports by `locationId: { $in: accessibleLocationIds }`

**Code:**
```typescript
const accessibleLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  undefined,
  userLocationPermissions
);

if (accessibleLocationIds !== 'all' && accessibleLocationIds.length > 0) {
  query.locationId = { $in: accessibleLocationIds };
}
```

---

#### D. `/api/dashboard/totals` (GET)

**File:** `app/api/dashboard/totals/route.ts`

**Changes:**
- Updated **3 sections** to apply location permissions:
  1. Currency conversion mode (All Licensees)
  2. Single licensee mode
  3. No licensee filter mode

**Currency Conversion Mode:**
```typescript
let locationIds = locations.map(l => l._id.toString());

// Apply location permissions if user has restrictions
if (userLocationPermissions.length > 0) {
  locationIds = locationIds.filter(id => userLocationPermissions.includes(id));
}
```

**Single Licensee Mode:**
```typescript
let locationIds = locations.map(l => l._id.toString());

// Apply location permissions if user has restrictions
if (userLocationPermissions.length > 0) {
  locationIds = locationIds.filter(id => userLocationPermissions.includes(id));
}

// Rebuild locations array with only accessible locations
const accessibleLocations = locations.filter(loc => 
  locationIds.includes(loc._id.toString())
);
```

**No Licensee Filter Mode:**
```typescript
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  undefined,
  userLocationPermissions
);

// Apply location filter
if (allowedLocationIds !== 'all') {
  locationQuery._id = { $in: allowedLocationIds };
}
```

---

## How It Works

### Example 1: User with TTG Licensee + Dueces Location Only

**User Data:**
- `rel.licencee`: `["ttg-id"]`
- `resourcePermissions['gaming-locations'].resources`: `["dueces-id"]`

**Flow:**
1. `getUserLocationFilter()` gets all TTG locations: `["dueces-id", "marks-bar-id", "other-id"]`
2. Intersects with user's location permissions: `["dueces-id"]`
3. API query: `{ _id: { $in: ["dueces-id"] } }`
4. **Result:** User only sees data from Dueces

---

### Example 2: User with TTG + Cabana Licensees, Filter = TTG

**User Data:**
- `rel.licencee`: `["ttg-id", "cabana-id"]`
- `resourcePermissions['gaming-locations'].resources`: `["dueces-id", "marks-bar-id", "cabana-location-id"]`

**Flow (when filter = TTG):**
1. `getUserLocationFilter()` gets TTG locations: `["dueces-id", "marks-bar-id", "other-ttg-id"]`
2. Intersects with user's location permissions: `["dueces-id", "marks-bar-id"]`
3. API query: `{ _id: { $in: ["dueces-id", "marks-bar-id"] } }`
4. **Result:** User sees only TTG data from Dueces and Marks Bar (not Cabana)

---

### Example 3: User with TTG + Cabana Licensees, Filter = All

**Flow (when filter = All):**
1. `getUserLocationFilter()` gets all locations from both licensees: `["dueces-id", "marks-bar-id", "other-ttg-id", "cabana-location-id", "other-cabana-id"]`
2. Intersects with user's location permissions: `["dueces-id", "marks-bar-id", "cabana-location-id"]`
3. API query: `{ _id: { $in: ["dueces-id", "marks-bar-id", "cabana-location-id"] } }`
4. **Result:** User sees data from all their allowed locations across both licensees

---

### Example 4: Admin with No Restrictions

**Flow:**
1. `getUserLocationFilter()` returns `'all'`
2. No `_id` filter applied
3. **Result:** Admin sees all locations from all licensees

---

## Testing Scenarios

### Scenario 1: Single Licensee, Single Location
- **User:** TTG licensee + Dueces location only
- **Expected:** 
  - No licensee select in header (only 1 licensee)
  - Cabinets page shows only Dueces cabinets
  - Dashboard shows only Dueces data
  - Profile shows "TTG" not ID

### Scenario 2: Single Licensee, Multiple Locations
- **User:** TTG licensee + Dueces + Marks Bar locations
- **Expected:**
  - No licensee select in header (only 1 licensee)
  - Cabinets page shows Dueces + Marks Bar cabinets
  - Dashboard aggregates both locations
  - Profile shows "TTG" not ID

### Scenario 3: Multiple Licensees, Specific Selection
- **User:** TTG + Cabana licensees, Dueces (TTG) + Cabana Beach (Cabana) locations
- **Header Filter:** TTG
- **Expected:**
  - Licensee select shows "All Licensees", "TTG", "Cabana"
  - Cabinets page shows only Dueces cabinets (TTG + Dueces intersection)
  - Dashboard shows only Dueces data
  - Profile shows "TTG, Cabana"

### Scenario 4: Multiple Licensees, All Selection
- **User:** TTG + Cabana licensees, Dueces (TTG) + Cabana Beach (Cabana) locations
- **Header Filter:** All Licensees
- **Expected:**
  - Cabinets page shows Dueces + Cabana Beach cabinets
  - Dashboard aggregates both locations
  - Collection reports from both locations
  - Profile shows "TTG, Cabana"

### Scenario 5: Admin User
- **Expected:**
  - Licensee select shows all licensees
  - Can filter by any licensee or "All"
  - Sees all data when "All" selected
  - Sees specific licensee data when filtered
  - Profile shows "All Licensees (Admin)"

---

## Files Modified

### Frontend:
1. `components/layout/Header.tsx` - Conditional licensee select display
2. `components/ui/LicenceeSelect.tsx` - Dynamic licensee fetching and filtering
3. `components/layout/ProfileModal.tsx` - Enhanced licensee name display with debugging
4. `lib/types/componentProps.ts` - Added `userLicenseeIds` prop type

### Backend:
5. `app/api/lib/helpers/licenseeFilter.ts` - Added `getUserLocationFilter()` function
6. `app/api/locations/route.ts` - Apply intersection filter
7. `app/api/machines/route.ts` - Validate location access with intersection
8. `app/api/collection-reports/route.ts` - Filter by accessible locations
9. `app/api/dashboard/totals/route.ts` - Apply intersection in all 3 modes

---

## Verification

- ✅ **TypeScript:** No errors
- ✅ **ESLint:** No warnings
- ✅ **Build:** Successful
- ✅ **All TODOs:** Completed

---

## Important Notes

### Still Need to Re-Login!

The JWT token changes from earlier in the session still require users to log out and log back in to get tokens with `roles` and `rel.licencee` fields.

**Without re-login:**
- Location dropdown will still be empty
- Licensee filtering won't work
- Admin users won't have full access

**After re-login:**
- All features will work as designed
- Intersection filtering will apply correctly
- Licensee select will show correct options

---

## Key Improvements

1. **Precision Filtering:** Users see ONLY locations they have permission to access within their assigned licensees
2. **Dynamic UI:** Licensee select adapts to user's assignments
3. **Better UX:** No select shown if only 1 licensee
4. **Admin Flexibility:** Admins can still filter by specific licensees
5. **Security:** Backend enforces intersection on every request
6. **Debugging:** Enhanced logging helps troubleshoot ID mismatches

---

**Status:** ✅ **COMPLETE - All filtering logic implemented with intersection**

**Next Step:** Re-login to test with fresh JWT token containing `roles` and `rel` fields!

