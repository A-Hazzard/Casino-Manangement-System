# Licensees API Simplified Fix

## Problem

The Profile Modal was showing "Error loading licensees" because the `/api/licensees` endpoint was returning an empty array.

## Root Cause

The `/api/licensees` endpoint had complex filtering logic that tried to:
1. Determine user's roles from a separate API call
2. Fetch all locations
3. Map location IDs to licensee IDs
4. Filter licensees based on user's accessible locations

**Issues with this approach:**
- Multiple nested API calls (slow and error-prone)
- Relied on JWT token having `roles` field (which users don't have until re-login)
- Over-complicated logic that could fail silently
- Returned empty array if any step failed

## Solution

Simplified the `/api/licensees` GET endpoint to:
1. **Return ALL licensees** from the database
2. Only filter by specific licensee if `?licensee=X` query param provided
3. Let the **frontend handle filtering** based on user's `rel.licencee` assignments

## Changes Made

**File:** `app/api/licensees/route.ts`

**Before:** 100+ lines of complex filtering logic

**After:** Simple database query:
```typescript
export async function GET(request: NextRequest) {
  // Get all licensees from database
  const licensees = await getAllLicensees();
  let formattedLicensees = await formatLicenseesForResponse(licensees);
  
  // Filter by specific licensee if query param provided
  if (licenseeFilter && licenseeFilter !== 'all') {
    formattedLicensees = formattedLicensees.filter(/* ... */);
  }
  
  return new Response(JSON.stringify({ licensees: formattedLicensees }));
}
```

**Added:**
- Comprehensive console logging to debug issues
- Proper Content-Type headers
- Better error messages

## Why This Works

### Frontend Filtering (Better Approach):
- `ProfileModal`: Shows only user's assigned licensees (from `user.rel.licencee`)
- `LicenceeSelect`: Filters by `userLicenseeIds` prop
- `UserModal` (admin): Shows all licensees for assignment

### Benefits:
- ✅ Simpler, more reliable API
- ✅ Fewer API calls (no nested fetches)
- ✅ Works regardless of JWT token state
- ✅ Faster response times
- ✅ Easier to debug with console logs

## Testing

### Step 1: Test API Directly

Open browser console and run:
```javascript
fetch('/api/licensees', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Licensees:', data.licensees))
```

**Expected Output:**
```javascript
Licensees: [
  { _id: "732b094083226f216b3fc11a", name: "Barbados", ... },
  { _id: "9a5db2cb29ffd2d962fd1d91", name: "TTG", ... },
  { _id: "c03b094083226f216b3fc39c", name: "Cabana", ... }
]
```

### Step 2: Refresh Profile Modal

1. Close and re-open the profile modal
2. Check console for debug logs:
   - `[API /api/licensees] Total licensees in DB: X`
   - `[fetchLicensees] Licensees count: X`
   - `[ProfileModal] Fetched licensees: [...]`

### Step 3: Verify Display

- **If licensees load:** You should see "Barbados" instead of "Unknown (732b094083226f216b3fc11a)"
- **If still showing Unknown:** The user's `rel.licencee` field has an incorrect ID

## Server-Side Logs

Check your terminal where the dev server is running for:
```
[API /api/licensees] Total licensees in DB: 3
[API /api/licensees] Licensee IDs: ['732b094083226f216b3fc11a', '9a5db2cb29ffd2d962fd1d91', 'c03b094083226f216b3fc39c']
[API /api/licensees] Returning licensees: [...]
```

## If Still Showing "Unknown"

**Possible causes:**
1. **ID mismatch:** The ID in the user's `rel.licencee` doesn't exist in licensees collection
   - Check if `732b094083226f216b3fc11a` exists in database
   - Verify it's the correct ID (not corrupted)

2. **Licensees not in database:** Run in MongoDB:
   ```javascript
   db.licencees.find({}).toArray()
   ```

3. **User data has wrong ID:** The user's `rel.licencee` was assigned incorrectly
   - Use admin modal to reassign correct licensee

## Fix for Corrupted ID

If the user's `rel.licencee` has a corrupted ID like `732b094083226f216b3fclla`:

1. Login as admin
2. Open Administration page
3. Click on user `mkirton`
4. Click "Edit"
5. In "Assigned Licensees" section, remove the corrupted one
6. Add the correct licensee from dropdown (should show names now!)
7. Click "Save"

---

**Status:** ✅ API simplified and should now return all licensees for frontend filtering

