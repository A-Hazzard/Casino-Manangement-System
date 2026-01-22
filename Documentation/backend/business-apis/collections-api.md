# Collections API - Backend Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2025  
**Version:** 1.1.0

## Overview

The Collections API (`/api/collections`) provides CRUD operations for collection documents, which represent individual machine meter readings during a collection event. This API is critical for the collection report workflow and implements strict security filters based on user permissions.

---

## Endpoints

### GET `/api/collections`

Retrieves collections based on various filter criteria with automatic permission-based filtering.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `locationReportId` | string | Filter by parent collection report ID |
| `location` | string | Filter by location name (also accepts `locationId`) |
| `collector` | string | Filter by collector name |
| `isCompleted` | boolean | Filter by completion status |
| `machineId` | string | Filter by machine ID |
| `incompleteOnly` | boolean | Only return incomplete collections (special filtering applies) |
| `beforeTimestamp` | ISO date | Get collections before a specific timestamp |
| `sortBy` | string | Field to sort by |
| `sortOrder` | 'asc' \| 'desc' | Sort direction |
| `limit` | number | Maximum number of results |

#### Security Filtering

The API automatically filters results based on the current user's permissions:

```typescript
// 1. Get user's accessible locations
const allowedLocationIds = await getUserLocationFilter(
  isAdmin ? 'all' : userAccessibleLicensees,
  licensee || undefined,
  userLocationPermissions,
  userRoles
);

// 2. Apply location filter
if (allowedLocationIds !== 'all') {
  if (allowedLocationIds.length === 0) {
    return []; // No access
  }
  filter.location = { $in: allowedLocationIds };
}
```

#### Special Handling: `incompleteOnly=true`

When querying for incomplete collections (used by collection report modals), the API applies location-based filtering:

**Why Location-Based?**
- Incomplete collections belong to a location, not a specific user
- Multiple collectors may work on the same location
- Collections should be visible to anyone with access to that location

**Implementation:**
```typescript
if (incompleteOnly === 'true') {
  filter.isCompleted = false;
  filter.locationReportId = '';
  
  // CRITICAL: Filter by location NAME (not collector)
  // Collection.location field stores the gaming location NAME, not ID
  if (allowedLocationIds !== 'all') {
    // Get location names from location IDs
    const locations = await GamingLocations.find({
      _id: { $in: allowedLocationIds },
    }).select('name').lean();
    
    const locationNames = locations.map(loc => loc.name);
    
    if (locationNames.length > 0) {
      filter.location = { $in: locationNames }; // Filter by location names
    } else {
      filter.location = 'IMPOSSIBLE_LOCATION_NAME'; // Force empty result
    }
  }
}
```

**Key Points:**
1. Collection's `location` field stores the **location name**, not the ID
2. User's `assignedLocations` stores **location IDs**
3. API converts IDs → names for filtering
4. Result: Users only see incomplete collections for their assigned locations

#### Example Request

```typescript
// Collector requesting incomplete collections
GET /api/collections?incompleteOnly=true

// API Flow:
// 1. User has assignedLocations: ['691166b455fe4b9b7ae3e702']
// 2. Query location: { _id: '691166b455fe4b9b7ae3e702' } → name: 'Test-Permission-Location'
// 3. Filter collections: { location: 'Test-Permission-Location', isCompleted: false }
// 4. Return only collections for that location
```

#### Example Response

```json
[
  {
    "_id": "69117167478e3344a885a871",
    "isCompleted": false,
    "location": "Test-Permission-Location",
    "machineId": "691166b455fe4b9b7ae3e704",
    "machineName": "TEST-PERM-2",
    "metersIn": 11000,
    "metersOut": 8400,
    "prevIn": 10000,
    "prevOut": 8000,
    "timestamp": "2025-11-10T04:56:23.941Z",
    "collector": "Test User",
    "locationReportId": "",
    "notes": "",
    "ramClear": false
  }
]
```

---

### POST `/api/collections`

Creates a new collection document.

#### Request Body

```typescript
{
  machineId: string;
  location: string;              // Location NAME, not ID
  collector: string;             // Display name of collector
  metersIn: number;
  metersOut: number;
  notes?: string;
  timestamp: string;             // ISO date string
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  locationReportId: string;      // Empty string for incomplete
  isCompleted: boolean;
}
```

#### Security

- No special filtering on POST (users can create collections for any location)
- Validation occurs when creating the parent report
- Incomplete collections are filtered on GET to prevent leakage

---

### PATCH `/api/collections`

Updates an existing collection document. This is used when editing a machine's entry within a collection report.

**Critical Data Integrity Logic:**
- If `metersIn`, `metersOut`, or `ramClear` values are changed, the endpoint automatically recalculates `prevIn`, `prevOut`, and the `movement` object by finding the true previous collection from the database.
- If the `timestamp` is changed, it automatically recalculates the SAS time window and re-aggregates SAS metrics (`drop`, `totalCancelledCredits`, `gross`, etc.) for the new time period.
- This ensures data consistency and corrects any calculation errors that might arise from edits.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Collection document `_id` |

#### Request Body

Same fields as POST endpoint. Only provided fields are updated.

---

### DELETE `/api/collections`

Permanently deletes a collection document and reverts the associated machine's state.

**Behavior:**
- Performs a hard delete on the collection document.
- Reverts the machine's `collectionMeters` (`metersIn`, `metersOut`) to the values from before this collection was recorded.
- Removes the corresponding entry from the machine's `collectionMetersHistory` array to maintain data integrity.

---

## Security Model

### Permission-Based Filtering

The API implements a multi-layered security model:

#### 1. **Location-Based Access Control**

All GET requests are automatically filtered by user's accessible locations:

```typescript
// Example: Collector assigned to specific locations
User: {
  roles: ['collector'],
  assignedLocations: ['LOCATION_A_ID', 'LOCATION_B_ID'],
  assignedLicensees: ['TTG_ID']
}

// API automatically filters:
Collections.find({
  location: { $in: ['Location A Name', 'Location B Name'] }
})
```

#### 2. **Role-Based Logic**

| Role | Access Level |
|------|-------------|
| **Developer/Admin** | All collections across all locations |
| **Manager** | All collections for assigned licensees |
| **Collector/Location Admin/Technician** | Only collections for assigned locations (intersection of licensee locations ∩ user's location permissions) |

#### 3. **Incomplete Collections Isolation**

When `incompleteOnly=true`:
- Collections are filtered by location access only
- `collector` field is NOT used for filtering
- Ensures proper team collaboration at shared locations
- Prevents cross-location data leakage

**Why Not Filter by Collector?**
1. **Inconsistent Data**: `collector` field stores display names which can change
2. **Wrong Security Model**: Multiple users should see incomplete work at their shared locations
3. **Collaboration**: Team members need to see each other's incomplete collections

---

## Data Model

### Collection Document Structure

```typescript
{
  _id: string;
  machineId: string;                    // Machine document ID
  machineName: string;                  // Machine serial number
  machineCustomName?: string;           // Custom machine name
  serialNumber: string;                 // Machine serial number
  game?: string;                        // Game name
  
  // Location & Ownership
  location: string;                     // Location NAME (not ID!)
  collector: string;                    // Collector display name
  locationReportId: string;             // Parent report ID (empty if incomplete)
  
  // Status
  isCompleted: boolean;                 // false = incomplete, true = part of report
  
  // Meter Readings
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  softMetersIn: number;
  softMetersOut: number;
  
  // RAM Clear
  ramClear: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  
  // SAS Metrics
  sasMeters: {
    machine: string;
    drop: number;
    totalCancelledCredits: number;
    gross: number;
    gamesPlayed: number;
    jackpot: number;
    sasStartTime: string;
    sasEndTime: string;
  };
  
  // Movement
  movement: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  
  // Metadata
  notes: string;
  timestamp: Date;
  collectionTime: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Key Field Notes

#### `location` Field ⚠️
**CRITICAL**: This field stores the **location name** (e.g., "DevLabTuna"), NOT the location ID!

This is why filtering logic must:
1. Get user's accessible location IDs from `assignedLocations` field
2. Query `gaminglocations` collection to get location names
3. Filter collections by location names

#### `collector` Field ℹ️
Stores the collector's display name (e.g., "Test User" or "testuser"):
- Not used for permission filtering
- Used for display purposes and audit trails
- May be inconsistent (display name vs username)

#### `isCompleted` & `locationReportId` Fields 🔄
State machine for collection lifecycle:
- **Incomplete**: `isCompleted: false`, `locationReportId: ''`
- **Completed**: `isCompleted: true`, `locationReportId: 'report-uuid'`

---

## Common Use Cases

### 1. Fetch Incomplete Collections for Modal

Used by collection report create/edit modals:

```typescript
GET /api/collections?incompleteOnly=true

// Returns collections where:
// - isCompleted: false
// - locationReportId: ''
// - location IN [user's accessible location names]
```

### 2. Fetch Collections for a Report

Used when viewing/editing an existing report:

```typescript
GET /api/collections?locationReportId=<reportId>

// Returns all collections belonging to that report
// Still filtered by user's accessible locations
```

### 3. Fetch Machine History

Used for calculating previous meter readings:

```typescript
GET /api/collections?machineId=<machineId>&beforeTimestamp=<date>&sortBy=timestamp&sortOrder=desc&limit=1

// Returns most recent collection before the timestamp
// Used to get prevIn/prevOut values
```

---

## Security Vulnerabilities Fixed

### November 10, 2025 - Location Permission Bypass 🔒

**Issue**: The GET endpoint was not checking user's `assignedLocations`, allowing any user with a valid token to view collections from any location by manipulating URL parameters.

**Fix**: Implemented `getUserLocationFilter` to:
1. Get user's role, licensees, and location permissions
2. Calculate allowed location IDs based on role hierarchy
3. Convert location IDs to location names
4. Filter collections by those names

**Impact**: Complete data isolation between users based on assigned locations.

### November 10, 2025 - Incomplete Collections Cross-User Visibility 🔒

**Issue**: Initially attempted to filter incomplete collections by `collector` field, but:
1. Field stores inconsistent data (display name vs username)
2. Wrong security model (collections should be location-based)
3. Prevented team collaboration

**Fix**: Filter incomplete collections by location names (same as completed collections):
- Collectors see incomplete work for their assigned locations
- Team members at same location can collaborate
- No cross-location data leakage

**Impact**: Proper team collaboration while maintaining location-based security.

---

## Related APIs

- **POST `/api/collectionReport`** - Creates collection reports (parent documents)
- **GET `/api/collectionReport?locationsWithMachines=1`** - Lists locations with machines for modal dropdown (also implements location filtering)
- **POST `/api/collection-reports/fix-report`** - Fixes SAS times and collection history
- **GET `/api/collection-report/[reportId]/check-sas-times`** - Detects SAS time issues

---

## Best Practices

### 1. Always Use Location Names, Not IDs
```typescript
// ✅ DO:
collection.location = "DevLabTuna";

// ❌ DON'T:
collection.location = "2691c7cb97750118b3ec290e";
```

### 2. Leverage Permission Filtering
The API automatically filters by user permissions - don't bypass it:
```typescript
// ✅ DO: Let API handle filtering
const collections = await fetch('/api/collections?incompleteOnly=true');

// ❌ DON'T: Try to manually filter on frontend
const allCollections = await fetch('/api/collections');
const filtered = allCollections.filter(c => userLocations.includes(c.location));
```

### 3. Incomplete Collections Are Location-Scoped
```typescript
// ✅ DO: Query by location for incomplete collections
GET /api/collections?location=<locationName>&incompleteOnly=true

// ❌ DON'T: Query by collector
GET /api/collections?collector=<userName>&incompleteOnly=true
```

---

## Troubleshooting

### Issue: User Can't See Incomplete Collections

**Check:**
1. User has `assignedLocations` array assigned
2. Location exists in `gaminglocations` collection
3. Collection's `location` field matches the location's `name` field exactly
4. Collection has `isCompleted: false` and `locationReportId: ''`

**Debug Query:**
```javascript
// Check user's accessible locations
const user = await Users.findOne({ username: 'testuser' });
const locationIds = user.assignedLocations || [];

// Check location names
const locations = await GamingLocations.find({ _id: { $in: locationIds } });
console.log('Location names:', locations.map(l => l.name));

// Check collections
const collections = await Collections.find({
  location: { $in: locations.map(l => l.name) },
  isCompleted: false,
  locationReportId: ''
});
console.log('Incomplete collections:', collections.length);
```

### Issue: Collections Showing for Wrong Location

**Check:**
1. `collection.location` is the **location name**, not ID
2. API is querying location names from user's permission IDs
3. Name matching is exact (case-sensitive)

---

## Version History

### 1.0.0 - November 10, 2025
- ✅ Implemented location-based permission filtering
- ✅ Fixed incomplete collections security model
- ✅ Added proper TypeScript types (no `any`)
- ✅ Documented location name vs ID distinction
- ✅ Added comprehensive security filtering

---

## Related Documentation

- [Collection Report System](./collection-report.md) - Parent report system
- [Licensee & Location Access Control](./../licensee-location-filtering.md) - Permission system
- [Database Models](./../database-models.md) - Collection schema
- [API Overview](./api-overview.md) - General API patterns

