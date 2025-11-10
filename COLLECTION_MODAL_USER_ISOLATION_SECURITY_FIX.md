# Collection Modal User Isolation Security Fix

## 🚨 Critical Security Issue: Cross-User Collection Leakage

### Problem
Incomplete collections (collections added to the modal list but not yet submitted as a report) are being shared across all users with access to the same location. This creates multiple issues:

1. **Data Confusion**: Multiple collectors can see and modify each other's incomplete work
2. **Data Loss**: One user's incomplete collections can be deleted by another user
3. **Privacy**: Users can see which machines other collectors are working on

### Current Behavior (BROKEN)
```yaml
testuser (Collector, TTG, Test-Permission-Location):
  - Opens modal
  - Selects Test-Permission-Location
  - Adds TEST-PERM-1 (Meters In: 5500, Meters Out: 4200)
  - Adds TEST-PERM-2 (Meters In: 11000, Meters Out: 8400)
  - Closes modal WITHOUT creating report

mkirton (Admin, Barbados):
  - Logs in
  - Opens modal
  - Sees TEST-PERM-1 and TEST-PERM-2 ❌ SHOULD NOT SEE THESE
  - Can edit/delete testuser's work ❌ MAJOR SECURITY ISSUE
```

### Root Cause
Incomplete collections are stored in `collections` DB with:
- `isCompleted: false`
- `locationReportId: ''`
- **NO `collector` field** ❌

When the modal queries `/api/collections?incompleteOnly=true&location=X`, it returns ALL incomplete collections for that location, regardless of who created them.

### Expected Behavior (FIXED)
```yaml
testuser (Collector, TTG, Test-Permission-Location):
  - Opens modal
  - Selects Test-Permission-Location
  - Adds TEST-PERM-1 (saved as incomplete with collector: testuser._id)
  - Adds TEST-PERM-2 (saved as incomplete with collector: testuser._id)
  - Closes modal WITHOUT creating report

mkirton (Admin, Barbados):
  - Logs in
  - Opens modal
  - Sees ONLY their own incomplete collections (empty) ✅
  - Cannot see/edit testuser's incomplete work ✅
```

## Fix Implementation

### 1. Database Schema
Ensure `collector` field is ALWAYS populated for incomplete collections:
```typescript
// When creating incomplete collection in modal
const collection = await Collections.create({
  machineId: machine._id,
  location: location._id,
  collector: currentUser._id, // ✅ CRITICAL
  isCompleted: false,
  locationReportId: '',
  // ... other fields
});
```

### 2. API Query Filter
Update `/api/collections` GET endpoint to filter by collector for incomplete collections:
```typescript
// app/api/collections/route.ts
if (incompleteOnly === 'true') {
  filter.isCompleted = false;
  filter.locationReportId = '';
  filter.collector = user._id; // ✅ Only return current user's incomplete collections
}
```

### 3. Modal Frontend
Modal should never need to filter - API returns only user's collections:
```typescript
// components/collectionReport/NewCollectionModal.tsx
const fetchExistingCollections = async (locationId?: string) => {
  // API automatically filters by current user for incomplete collections
  const url = `/api/collections?incompleteOnly=true${locationId ? `&location=${locationId}` : ''}`;
  const response = await axios.get(url);
  // These are guaranteed to be ONLY current user's collections
  setStoreCollectedMachines(response.data);
};
```

## Testing
1. Login as testuser (collector)
2. Open collection modal
3. Add 2 machines to list
4. Close modal WITHOUT creating report
5. Logout
6. Login as mkirton (admin)
7. Open collection modal
8. **VERIFY**: Should see 0 collected machines ✅
9. Logout
10. Login as testuser again
11. Open collection modal
12. **VERIFY**: Should see the same 2 machines from step 3 ✅

## Security Impact
- **Before**: Any user with access to a location could see/edit ALL incomplete collections
- **After**: Users can ONLY see their OWN incomplete collections

## Related Files
- `app/api/collections/route.ts` - API filter
- `components/collectionReport/NewCollectionModal.tsx` - Frontend
- `components/collectionReport/mobile/MobileCollectionModal.tsx` - Mobile frontend
- `lib/types/collection.ts` - TypeScript types

