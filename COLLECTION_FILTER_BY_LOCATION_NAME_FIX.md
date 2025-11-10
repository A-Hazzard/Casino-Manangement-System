# Collection Filter By Location Name Fix

## 🐛 The Bug
Incomplete collections were being filtered by `collector` field (user's display name), which had multiple issues:
1. Collector field is inconsistent (sometimes display name, sometimes username)
2. Wrong security model - collections should be filtered by **location access**, not who created them
3. When user's name changes, filter breaks

## ✅ The Correct Solution
Filter incomplete collections by **location name** based on user's `resourcePermissions`:

### Flow:
```
1. User has resourcePermissions.gaming-locations.resources: ['691166b455fe4b9b7ae3e702']
2. Query gaminglocations collection to get names: ['Test-Permission-Location']
3. Filter collections where location IN ['Test-Permission-Location']
```

### Why This is Correct:
- **Location-based security**: Users see collections for locations they have access to
- **Consistent**: Doesn't depend on who created the collection
- **Team collaboration**: Multiple collectors at same location see same incomplete work
- **Name-agnostic**: Doesn't break when user names change

## Implementation

### Before (BROKEN):
```typescript
// ❌ Filtered by collector display name
const userDisplayName = user.firstName && user.lastName
  ? `${user.firstName} ${user.lastName}`
  : user.username;
filter.collector = userDisplayName;
```

**Problems**:
- Inconsistent display name logic
- Breaks when names change
- Wrong security model

### After (FIXED):
```typescript
// ✅ Filter by location name
if (allowedLocationIds !== 'all') {
  // Get location names from location IDs
  const GamingLocations = (await import('./lib/models/gaminglocations')).GamingLocations;
  const locations = await GamingLocations.find({ 
    _id: { $in: allowedLocationIds } 
  }).select('name').lean();
  
  const locationNames = locations.map((loc: { name: string }) => loc.name);
  
  if (locationNames.length > 0) {
    filter.location = { $in: locationNames }; // ✅ Filter by location names
  } else {
    filter.location = 'IMPOSSIBLE_LOCATION_NAME'; // Force empty result
  }
}
```

**Benefits**:
- ✅ Secure: Respects user's location permissions
- ✅ Consistent: Always works
- ✅ Collaborative: Team members see same collections

## Example

### User:
```json
{
  "_id": "690ff137102fe0d1dc7a5079",
  "username": "testuser",
  "resourcePermissions": {
    "gaming-locations": {
      "resources": ["691166b455fe4b9b7ae3e702"]
    }
  }
}
```

### Location:
```json
{
  "_id": "691166b455fe4b9b7ae3e702",
  "name": "Test-Permission-Location"
}
```

### Collection:
```json
{
  "_id": "69117167478e3344a885a871",
  "location": "Test-Permission-Location",  // ✅ Matches location.name
  "isCompleted": false
}
```

### Result:
✅ User sees this collection because:
1. User has access to location ID `691166b455fe4b9b7ae3e702`
2. Location name is `Test-Permission-Location`
3. Collection location is `Test-Permission-Location`
4. **MATCH!**

## Files Modified
- `app/api/collections/route.ts` - Changed filter logic from collector to location names

## Security Impact
- **Before**: Collections filtered by who created them (easily bypassed)
- **After**: Collections filtered by user's assigned locations (proper RBAC)

