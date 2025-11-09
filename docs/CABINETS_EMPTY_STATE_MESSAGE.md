# Cabinets Empty State - Informative Messages

## Overview

Enhanced the cabinets page to show **informative messages** when no machines are found, specifically mentioning the user's assigned licensees instead of just showing a generic "No Data Available".

## Problem

When a user had no machines in their allowed locations (e.g., user assigned to "Barbados" but no machines exist in their allowed locations), the UI showed a generic empty state with no context about why they're seeing nothing.

**Before:**
- "No machines found for any licensee."
- User doesn't know if it's because of their licensee assignments or lack of data

## Solution

Updated the `CabinetContentDisplay` component to show **context-aware messages** based on:
1. User's assigned licensees (by name, not ID)
2. Whether they're an admin or regular user
3. Whether they applied filters or not

## Changes Made

### File: `components/cabinets/CabinetContentDisplay.tsx`

**Added Imports:**
```typescript
import { useUserStore } from '@/lib/store/userStore';
import { useState } from 'react';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
```

**Added State to Fetch Licensee Names:**
```typescript
const user = useUserStore(state => state.user);
const [licenseeNames, setLicenseeNames] = useState<string[]>([]);

useEffect(() => {
  const loadLicenseeNames = async () => {
    if (user?.rel?.licencee && user.rel.licencee.length > 0) {
      const allLicensees = await fetchLicensees();
      const names = user.rel.licencee
        .map(id => {
          const licensee = allLicensees.find(l => String(l._id) === String(id));
          return licensee?.name;
        })
        .filter((name): name is string => name !== undefined);
      setLicenseeNames(names);
    }
  };
  loadLicenseeNames();
}, [user]);
```

**Updated Empty State Logic:**
```typescript
// Determine the appropriate message based on user's licensee assignments
let emptyMessage = '';
const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('developer');

if (filteredCabinets.length === 0 && allCabinets.length > 0) {
  // User filtered and got no results
  emptyMessage = 'No machines match your search criteria.';
} else if (allCabinets.length === 0) {
  // No cabinets at all
  if (isAdmin) {
    emptyMessage = selectedLicencee && selectedLicencee !== 'all' && selectedLicencee !== ''
      ? `No machines found for ${licenseeName}.`
      : 'No machines found in the system.';
  } else if (licenseeNames.length > 0) {
    const licenseeList = licenseeNames.join(', ');
    emptyMessage = `No machines found in your allowed locations for ${licenseeList}.`;
  } else {
    emptyMessage = 'No machines found in your allowed locations.';
  }
}
```

## Example Messages

### For Regular User (e.g., "mkirton" with Barbados licensee):

**Scenario 1: No machines in allowed locations**
```
No Data Available
No machines found in your allowed locations for Barbados.
```

**Scenario 2: User with multiple licensees (TTG + Cabana)**
```
No Data Available
No machines found in your allowed locations for TTG, Cabana.
```

**Scenario 3: User filtered but no matches**
```
No Data Available
No machines match your search criteria.
```

### For Admin Users:

**Scenario 1: No machines in selected licensee**
```
No Data Available
No machines found for TTG.
```

**Scenario 2: No machines in entire system**
```
No Data Available
No machines found in the system.
```

## Benefits

1. **Clear Communication:** Users understand WHY they're not seeing data
2. **Shows Assigned Licensees:** Users see which licensees they're assigned to by name
3. **Context-Aware:** Different messages for:
   - Search filtering (no matches)
   - Licensee restrictions (no data in allowed locations)
   - Admin views (no data for selected licensee)
4. **Better UX:** Users know if it's a permission issue or genuine lack of data

## Testing

### Test Case 1: User with Barbados, No Machines
1. Login as user assigned to Barbados
2. User has specific allowed locations with no machines
3. Go to cabinets page
4. **Expected:** "No machines found in your allowed locations for Barbados."

### Test Case 2: User with Multiple Licensees
1. Login as user with TTG + Cabana
2. No machines in their allowed locations
3. **Expected:** "No machines found in your allowed locations for TTG, Cabana."

### Test Case 3: User Applies Search Filter
1. Search for "xyz" (non-existent)
2. **Expected:** "No machines match your search criteria."

### Test Case 4: Admin User
1. Login as admin
2. Select a licensee with no machines
3. **Expected:** "No machines found for {Licensee Name}."

## Related Changes

This complements the earlier fixes:
- ✅ `/api/machines/aggregation` - Filters by location permissions
- ✅ `/api/licensees` - Returns all licensees for name lookup
- ✅ `ProfileModal` - Shows licensee names not IDs
- ✅ `CabinetContentDisplay` - **NEW** - Shows informative empty state

## Verification

- ✅ **TypeScript:** No errors
- ✅ **ESLint:** No warnings
- ✅ **User-Friendly:** Clear messages about licensee restrictions

---

**Status:** ✅ **COMPLETE - Cabinets page now shows informative empty state messages**

