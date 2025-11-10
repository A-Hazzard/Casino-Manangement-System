# Collector Permissions Fix Summary

## 🐛 Bug Report
**User**: testuser (Collector, TTG, Test-Permission-Location)
**Issues**:
1. ❌ Not seeing "Locations" link in sidebar
2. ❌ Not seeing any locations in collection modal dropdown

## 🔍 Root Cause
**Permission Mismatch** between two permission utility files:

### `lib/utils/permissions.ts` (Client-side) ✅
```typescript
locations: [
  'developer', 'admin', 'manager', 'location admin',
  'collector', 'collector meters' // ✅ Collectors included
],
```

### `lib/utils/permissionsDb.ts` (Server-side) ❌
```typescript
locations: ['developer', 'admin', 'manager', 'location admin'],
// ❌ Missing 'collector' and 'collector meters'!
```

The **AppSidebar** component uses `shouldShowNavigationLinkDb()` which calls the database-based permission check (`permissionsDb.ts`), so collectors were denied access.

## ✅ Fix Applied

Updated `lib/utils/permissionsDb.ts` line 79-95:

```typescript
// BEFORE (BROKEN)
locations: ['developer', 'admin', 'manager', 'location admin'],
'location-details': ['developer', 'admin', 'manager', 'location admin', 'technician'],

// AFTER (FIXED)
locations: [
  'developer',
  'admin',
  'manager',
  'location admin',
  'collector',        // ✅ Added
  'collector meters', // ✅ Added
],
'location-details': [
  'developer',
  'admin',
  'manager',
  'location admin',
  'technician',
  'collector',        // ✅ Added
  'collector meters', // ✅ Added
],
```

## ✅ Test Results

### Before Fix ❌
- Sidebar: No locations link visible
- Modal: Empty location dropdown

### After Fix ✅
- **Sidebar**: Locations link now visible
- **Modal**: Test-Permission-Location appears in dropdown
- **Filtering**: Modal correctly shows only testuser's assigned location

## Related Security Fixes
This session also fixed:
1. **Collection Modal Location Filter** - Locations now filtered by user's `resourcePermissions`
2. **User Isolation for Incomplete Collections** - Incomplete collections now filtered by `collector` field

## Files Modified
- `lib/utils/permissionsDb.ts` - Added collector permissions for locations and location-details pages

## Impact
All collectors can now:
- ✅ Access the Locations page
- ✅ View locations in collection modal (filtered by their assignments)
- ✅ Navigate to location details pages

