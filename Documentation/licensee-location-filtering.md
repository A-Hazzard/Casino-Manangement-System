# Licensee and Location-Based Filtering System

**Last Updated:** November 9, 2025  
**Status:** ✅ Fully Implemented and Tested

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Roles & Access Levels](#user-roles--access-levels)
4. [Implementation Details](#implementation-details)
5. [API Integration](#api-integration)
6. [Frontend Components](#frontend-components)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Evolution CMS implements a comprehensive **licensee and location-based filtering system** that restricts data access based on user roles, assigned licensees, and location permissions. This ensures data isolation, security, and compliance across multi-licensee operations.

### Key Features

- ✅ **Multi-Licensee Support**: Users can belong to multiple licensees
- ✅ **Granular Location Permissions**: Fine-grained access control at the location level
- ✅ **Role-Based Access**: Different access levels for Developer, Admin, Manager, Collector, Location Admin, and Technician
- ✅ **Dynamic Filtering**: Real-time filtering across all pages (Dashboard, Locations, Cabinets, Collection Reports)
- ✅ **Session Invalidation**: Automatic logout when permissions change
- ✅ **No Data Leakage**: Complete isolation between licensees

---

## Architecture

### Data Model

#### User Schema
```typescript
{
  _id: string;
  username: string;
  roles: string[]; // e.g., ['developer', 'manager', 'collector']
  rel: {
    licencee: string[]; // Array of licensee IDs the user has access to
  };
  resourcePermissions: {
    'gaming-locations': {
      entity: 'gaming-locations';
      resources: string[]; // Array of specific location IDs
    };
  };
  sessionVersion: number; // Incremented when permissions change
}
```

#### Licensee Schema
```typescript
{
  _id: string;
  name: string; // e.g., "Barbados", "Cabana", "TTG"
  // ... other fields
}
```

#### Location Schema
```typescript
{
  _id: string;
  name: string;
  rel: {
    licencee: string; // The licensee this location belongs to
  };
  // ... other fields
}
```

---

## User Roles & Access Levels

### Access Matrix

| Role | Dashboard | Locations | Cabinets | Collection Reports | Sessions | Members | Reports | Admin | Licensee Dropdown |
|------|-----------|-----------|----------|-------------------|----------|---------|---------|-------|-------------------|
| **Developer** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ | ✅ | ✅ | ✅ | ✅ All licensees |
| **Admin** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ | ✅ | ✅ | ✅ | ✅ All licensees |
| **Manager** | ✅ Filtered | ✅ Filtered | ✅ Filtered | ✅ Filtered | ❌ | ❌ | ❌ | ❌ | ✅ Assigned licensees |
| **Collector** | ❌ | ❌ | ✅ Filtered | ✅ Filtered | ❌ | ❌ | ❌ | ❌ | ✅ Assigned licensees (if >1) |
| **Location Admin** | ❌ | ✅ Filtered | ✅ Filtered | ✅ Filtered | ❌ | ❌ | ❌ | ❌ | ❌ No dropdown |
| **Technician** | ❌ | ❌ | ✅ Filtered | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ No dropdown |

### Role Descriptions

#### Developer / Admin
- **Full Access**: Can view and manage ALL data across ALL licensees
- **Licensee Dropdown**: Optional filter to view specific licensee data
- **Location Access**: All locations across all licensees
- **Use Case**: System administrators, senior management

#### Manager
- **Filtered Access**: Can view ALL locations within their assigned licensees
- **Licensee Dropdown**: Shows only assigned licensees (can have multiple)
- **Location Access**: All locations for assigned licensees (no location-specific restrictions)
- **Use Case**: Regional managers overseeing multiple licensees

#### Collector
- **Highly Restricted**: Can only view their specifically assigned locations
- **Licensee Dropdown**: Shows if they have locations in multiple licensees
- **Location Access**: ONLY their assigned locations (intersection of licensees and location permissions)
- **Use Case**: Field collectors responsible for specific locations

#### Location Admin
- **Location-Specific**: Can manage specific locations
- **Licensee Dropdown**: Not shown (implicitly filtered by assigned locations)
- **Location Access**: ONLY their assigned locations
- **Use Case**: Location managers, site administrators

#### Technician
- **Minimal Access**: Can only view machines at assigned locations
- **Licensee Dropdown**: Not shown
- **Location Access**: ONLY their assigned locations
- **Use Case**: Field technicians performing maintenance

---

## Implementation Details

### Backend Filtering

#### 1. JWT Token Structure

The JWT token includes licensee and location permissions:

```typescript
interface JwtPayload {
  userId: string;
  username: string;
  roles: string[];
  rel: {
    licencee: string[]; // Assigned licensees
  };
  resourcePermissions: {
    'gaming-locations': {
      resources: string[]; // Assigned location IDs
    };
  };
  sessionVersion: number;
}
```

#### 2. Server-Side Filtering Functions

**File:** `app/api/lib/helpers/licenseeFilter.ts`

**Key Functions:**

```typescript
// Get user's accessible licensees from JWT
export async function getUserAccessibleLicenseesFromToken(): Promise<string[] | 'all'>

// Get filtered location IDs based on role, licensees, and permissions
export async function getUserLocationFilter(
  selectedLicenseeFilter?: string
): Promise<string[] | 'all'>

// Apply licensee filter to MongoDB aggregation pipelines
export function applyLicenseeFilterToAggregation(
  pipeline: PipelineStage[],
  licenseeId?: string,
  userAccessibleLicensees?: string[] | 'all'
): PipelineStage[]
```

**Filtering Logic:**

1. **Developer / Admin**:
   - If `selectedLicenseeFilter` is provided → Filter by that licensee
   - If no filter → Return `'all'` (access to everything)

2. **Manager**:
   - If `selectedLicenseeFilter` is provided → Return locations for that licensee (if user has access)
   - If no filter → Return locations for ALL assigned licensees

3. **Collector / Location Admin / Technician**:
   - **ALWAYS** return intersection of:
     - Locations belonging to their assigned licensees
     - Their specifically assigned location permissions
   - `selectedLicenseeFilter` can further narrow results but NEVER expand

#### 3. API Parameter Handling

**Important:** All API endpoints support both `licensee` and `licencee` spellings for backwards compatibility:

```typescript
const licensee = searchParams.get('licensee') || searchParams.get('licencee');
```

**Modified Endpoints:**
- `app/api/reports/locations/route.ts`
- `app/api/machines/aggregation/route.ts`
- `app/api/dashboard/totals/route.ts`
- `app/api/locations/route.ts`
- `app/api/metrics/top-performing/route.ts`
- `app/api/collection-reports/route.ts`

#### 4. MongoDB Query Filtering

**Example: Location Filtering**

```typescript
const matchStage: Record<string, unknown> = {
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2020-01-01') } }
  ]
};

// Apply licensee filter
if (allowedLocationIds !== 'all') {
  if (allowedLocationIds.length === 0) {
    return []; // No access
  }
  matchStage['_id'] = { $in: allowedLocationIds };
}

const locations = await GamingLocations.find(matchStage);
```

#### 5. Session Invalidation

When an admin changes user permissions (licensees, locations, or roles), the user's `sessionVersion` is incremented:

```typescript
await UserModel.findOneAndUpdate(
  { _id: userId },
  {
    $inc: { sessionVersion: 1 }, // Invalidate existing sessions
    $set: {
      'rel.licencee': updatedLicensees,
      'resourcePermissions.gaming-locations.resources': updatedLocations
    }
  }
);
```

**JWT Validation:**
```typescript
// app/api/lib/helpers/users.ts
const dbUser = await UserModel.findOne({ _id: payload.userId });
if (dbUser.sessionVersion !== payload.sessionVersion) {
  // Session invalid - user will be logged out
  return null;
}
```

---

## API Integration

### Request Flow

1. **Client** makes API request with `licensee` query parameter:
   ```
   GET /api/locations?licensee=732b094083226f216b3fc11a&timePeriod=Today
   ```

2. **Server** extracts JWT token and validates session version

3. **Server** calls `getUserLocationFilter(selectedLicenseeFilter)`:
   - Returns `'all'` for admins with no filter
   - Returns array of allowed location IDs for filtered users

4. **Server** applies filter to MongoDB query

5. **Server** returns filtered data

### API Response Examples

**Success Response:**
```json
{
  "success": true,
  "data": [...], // Filtered data
  "pagination": { ... }
}
```

**Debug Mode (`?debug=true`):**
```json
{
  "success": true,
  "data": [...],
  "debug": {
    "userAccessibleLicensees": ["732b094083226f216b3fc11a", "c03b094083226f216b3fc39c"],
    "userRoles": ["manager"],
    "userLocationPermissions": [],
    "licenseeParam": "732b094083226f216b3fc11a",
    "allowedLocationIds": ["690ff12e92ddaffbc0c36022", "690ff12e92ddaffbc0c3602d"],
    "locationsFound": 5,
    "machinesReturned": 56
  }
}
```

---

## Frontend Components

### 1. Licensee Dropdown

**File:** `components/ui/LicenceeSelect.tsx`

**Features:**
- Dynamically fetches user's accessible licensees
- Only shown to users with 2+ licensees OR admin/developer roles
- Persists selection in `localStorage`
- Triggers data refresh on change

**Visibility Logic:**
```typescript
const shouldShowLicenseeDropdown = (user: User | null): boolean => {
  if (!user) return false;
  
  const hasAdminRole = user.roles?.some(role => 
    ['developer', 'admin'].includes(role.toLowerCase())
  );
  
  const licenseeCount = user.rel?.licencee?.length || 0;
  
  return hasAdminRole || licenseeCount >= 2;
};
```

### 2. No Licensee Assigned Component

**File:** `components/ui/NoLicenseeAssigned.tsx`

**Purpose:** Display message when non-admin users have no licensees assigned

**Usage:**
```tsx
{shouldShowNoLicenseeMessage(currentUser) ? (
  <NoLicenseeAssigned />
) : (
  <PageContent />
)}
```

### 3. Access Control Integration

**All protected pages include:**

```tsx
// Check if user should see content
if (shouldShowNoLicenseeMessage(currentUser)) {
  return <NoLicenseeAssigned />;
}

// Fetch data with licensee filter
const { data } = useQuery({
  queryKey: ['data', selectedLicencee, timePeriod],
  queryFn: () => fetchData({ licensee: selectedLicencee, timePeriod })
});
```

**Protected Pages:**
- Dashboard (`app/page.tsx`)
- Locations (`app/locations/page.tsx`)
- Location Details (`app/locations/[slug]/page.tsx`)
- Cabinets (`app/cabinets/page.tsx`)
- Cabinet Details (`app/cabinets/[slug]/page.tsx`)
- Collection Reports (`app/collection-report/page.tsx`)
- Collection Report Details (`app/collection-report/report/[reportId]/page.tsx`)

---

## Testing & Verification

### Test Users

Created test users for each role:

| Username | Password | Role | Licensees | Locations |
|----------|----------|------|-----------|-----------|
| `ahzzard` | `Decrypted12!` | Developer | None (All Access) | All |
| `test_manager` | `Test123!` | Manager | Barbados, Cabana, TTG | All for licensees |
| `test_collector` | `Test123!` | Collector | Barbados, Cabana | 3 specific locations |
| `test_location_admin` | `Test123!` | Location Admin | Cabana | 2 Cabana locations |
| `test_technician` | `Test123!` | Technician | TTG | 2 TTG locations |

### Test Results

**✅ All tests passed:**

1. **Developer**: Can filter by any licensee or view all data
2. **Manager with 3 licensees**: Dropdown shows all 3, filtering works correctly
3. **Collector with 2 licensees**: Sees only assigned locations, dropdown filters correctly
4. **Location Admin**: No dropdown, sees only assigned locations
5. **Technician**: No dropdown, sees only assigned location machines

### Manual Testing Checklist

- [ ] Developer can view all licensees
- [ ] Developer can filter by specific licensee
- [ ] Manager sees only assigned licensees in dropdown
- [ ] Manager can filter between assigned licensees
- [ ] Manager sees all locations for selected licensee
- [ ] Collector sees only assigned locations
- [ ] Collector cannot see locations outside their permissions
- [ ] Location Admin cannot access Dashboard
- [ ] Technician can only access Cabinets page
- [ ] Licensee filter persists across page navigation
- [ ] Session invalidation works when admin changes permissions
- [ ] No data leakage between licensees

---

## Troubleshooting

### Common Issues

#### Issue: User sees "No Licensee Assigned" message

**Cause:** User has no licensees in `rel.licencee` array and is not an admin

**Solution:**
1. Login as admin
2. Go to Administration page
3. Edit user
4. Assign at least one licensee in the "Licensees" multi-select
5. Save changes
6. User will be automatically logged out and must re-login

#### Issue: User sees locations from other licensees

**Cause:** Licensee filter not being applied correctly

**Debug Steps:**
1. Add `?debug=true` to API URL
2. Check `allowedLocationIds` in response
3. Verify `userAccessibleLicensees` matches user's assigned licensees
4. Check server console for `[MACHINES AGGREGATION]` or `[REPORTS/LOCATIONS]` logs

**Common Causes:**
- Frontend sending wrong `licensee` parameter
- Server not reading `licensee` parameter (check spelling: `licensee` vs `licencee`)
- User's `rel.licencee` field is empty or incorrect

#### Issue: Manager cannot see any data

**Cause:** No location permissions AND no licensees assigned

**Solution:**
- Managers should have `rel.licencee` populated (array of licensee IDs)
- Managers should NOT have location-specific restrictions (`resourcePermissions.gaming-locations.resources` should be empty or not filter them)

#### Issue: Dropdown not showing for user with multiple licensees

**Cause:** Frontend logic not detecting multiple licensees

**Solution:**
1. Verify user has `rel.licencee` with 2+ elements
2. Check browser console for errors
3. Clear `localStorage` and refresh
4. Verify `LicenceeSelect` component is rendered

#### Issue: User not logged out after permission change

**Cause:** `sessionVersion` not incremented

**Solution:**
1. Check admin code increments `sessionVersion`:
   ```typescript
   await UserModel.findOneAndUpdate(
     { _id: userId },
     { $inc: { sessionVersion: 1 } }
   );
   ```
2. Verify JWT middleware checks `sessionVersion`
3. Check Axios interceptor handles 401 responses

---

## Best Practices

### For Administrators

1. **Always assign licensees to non-admin users**
   - Managers: Assign licensees they oversee
   - Collectors/Technicians: Assign licensees they work in

2. **Use location permissions for granular control**
   - Managers: Leave empty (they get all locations for their licensees)
   - Collectors/Location Admins/Technicians: Assign specific locations

3. **Verify changes take effect**
   - User should be auto-logged out
   - Upon re-login, verify they see correct data

4. **Regular audits**
   - Review user permissions quarterly
   - Remove access for inactive users
   - Audit session logs for unauthorized access attempts

### For Developers

1. **Always use helper functions**
   ```typescript
   // ✅ Good
   const allowedLocations = await getUserLocationFilter(selectedLicensee);
   
   // ❌ Bad
   const allowedLocations = user.rel?.licencee || [];
   ```

2. **Support both parameter spellings**
   ```typescript
   const licensee = searchParams.get('licensee') || searchParams.get('licencee');
   ```

3. **Add console logs for debugging**
   ```typescript
   console.log('[API_NAME] User accessible licensees:', userAccessibleLicensees);
   console.log('[API_NAME] Filtered location IDs:', allowedLocationIds);
   ```

4. **Test with multiple roles**
   - Create test users for each role
   - Verify filtering works correctly
   - Test edge cases (no licensees, multiple licensees, etc.)

---

## Migration Guide

### Adding Licensee Filtering to New Pages

1. **Frontend:**
   ```tsx
   // Import helpers
   import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
   import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
   
   // Add conditional rendering
   if (shouldShowNoLicenseeMessage(currentUser)) {
     return <NoLicenseeAssigned />;
   }
   
   // Pass licensee filter to API calls
   const { data } = useQuery({
     queryKey: ['data', selectedLicencee],
     queryFn: () => api.getData({ licensee: selectedLicencee })
   });
   ```

2. **Backend:**
   ```typescript
   // Import helpers
   import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
   
   // Get licensee parameter
   const licensee = searchParams.get('licensee') || searchParams.get('licencee');
   
   // Get filtered location IDs
   const allowedLocationIds = await getUserLocationFilter(licensee || undefined);
   
   // Apply to MongoDB query
   if (allowedLocationIds !== 'all') {
     matchStage['_id'] = { $in: allowedLocationIds };
   }
   ```

---

## Appendix

### Database Queries

**Get all users with licensee assignments:**
```javascript
db.users.find({ 'rel.licencee': { $exists: true, $ne: [] } })
```

**Get all locations for a licensee:**
```javascript
db.gaminglocations.find({ 'rel.licencee': '732b094083226f216b3fc11a' })
```

**Update user licensees:**
```javascript
db.users.updateOne(
  { _id: '68a6195a0c156b25a3cedd84' },
  { 
    $set: { 'rel.licencee': ['732b094083226f216b3fc11a', 'c03b094083226f216b3fc39c'] },
    $inc: { sessionVersion: 1 }
  }
)
```

### Related Documentation

- [Role Based Permissions](./Role%20Based%20Permissions.md)
- [Database Models](./database-models.md)
- [Frontend Pages Overview](./frontend/pages-overview.md)
- [Administration Page](./frontend/administration.md)

---

**Document Version:** 1.0  
**Last Reviewed:** November 9, 2025  
**Next Review:** February 2026

