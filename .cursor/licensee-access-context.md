# Evolution CMS - Licensee & Location Access Control System

> **CRITICAL CONTEXT FOR AI ASSISTANTS**  
> This file defines how access control, data filtering, and queries MUST work in this codebase.  
> ALL code changes involving users, locations, machines, or data queries MUST follow these rules.

---

## 🎯 Core Principles

### 1. **Licensee-Based Data Isolation**
- Every user (except Developer/Admin) belongs to one or more **licensees**
- Users can ONLY see data for their assigned licensees
- Data MUST be completely isolated between licensees (NO data leakage)
- Licensee filter persists across page navigation via `localStorage`

### 2. **Location-Level Permissions**
- Users can have granular access to specific **locations** (gaming venues)
- Location access is determined by **intersection logic** (see below)
- Managers see ALL locations for their licensees
- Non-managers see ONLY specifically assigned locations

### 3. **Session Invalidation**
- When admin changes user permissions → `sessionVersion++`
- User's JWT becomes invalid → 401 Unauthorized → Auto-logout
- User must re-login to get new JWT with updated permissions

---

## 📊 Data Model Relationships

### User Schema
```typescript
{
  _id: string;                    // String ID (NOT ObjectId)
  username: string;
  emailAddress: string;
  roles: string[];                // ['developer', 'manager', 'collector', etc.]
  rel: {
    licencee: string[];           // ⭐ Array of licensee IDs user has access to
  };
  resourcePermissions: {
    'gaming-locations': {
      entity: 'gaming-locations';
      resources: string[];        // ⭐ Array of specific location IDs
    };
  };
  sessionVersion: number;         // ⭐ Incremented when permissions change
  loginCount: number;
  lastLoginAt: Date;
}
```

### Location Schema
```typescript
{
  _id: string;                    // String ID (NOT ObjectId)
  name: string;
  rel: {
    licencee: string;             // ⭐ Single licensee ID this location belongs to
  };
  gameDayOffset: number;          // Gaming day start hour (e.g., 8 = 8 AM)
}
```

### Machine Schema
```typescript
{
  _id: string;                    // String ID (NOT ObjectId)
  serialNumber: string;
  gamingLocation: string;         // ⭐ Location ID this machine belongs to
  // Machine inherits licensee from its location
}
```

---

## 🔐 Access Control Rules by Role

### Role Hierarchy (6 Roles)

#### **1. Developer**
- **Licensee Access**: ALL (no restrictions)
- **Location Access**: ALL (no restrictions)
- **Dropdown**: Always shown (filter only, not restriction)
- **Query Logic**: `licensee` parameter is optional filter
- **Use Case**: System administrators

#### **2. Admin**
- **Licensee Access**: ALL (no restrictions)
- **Location Access**: ALL (no restrictions)
- **Dropdown**: Always shown (filter only, not restriction)
- **Query Logic**: `licensee` parameter is optional filter
- **Use Case**: Senior administrators

#### **3. Manager**
- **Licensee Access**: ONLY assigned licensees (`rel.licencee` array)
- **Location Access**: ALL locations within assigned licensees
- **Dropdown**: Shown if 2+ assigned licensees
- **Query Logic**: `licensee` parameter must be in user's `rel.licencee`
- **Intersection**: Location permissions DON'T restrict managers
- **Use Case**: Regional managers

#### **4. Collector**
- **Licensee Access**: ONLY assigned licensees (`rel.licencee` array)
- **Location Access**: Intersection(licensee locations, assigned locations)
- **Dropdown**: Shown if assigned locations span 2+ licensees
- **Query Logic**: Auto-filtered to assigned locations
- **Intersection**: `licensee locations ∩ resourcePermissions.gaming-locations.resources`
- **Use Case**: Field collectors

#### **5. Location Admin**
- **Licensee Access**: ONLY assigned licensees (`rel.licencee` array)
- **Location Access**: Intersection(licensee locations, assigned locations)
- **Dropdown**: Never shown
- **Query Logic**: Auto-filtered to assigned locations
- **Intersection**: `licensee locations ∩ resourcePermissions.gaming-locations.resources`
- **Use Case**: Location managers

#### **6. Technician**
- **Licensee Access**: ONLY assigned licensees (`rel.licencee` array)
- **Location Access**: Intersection(licensee locations, assigned locations)
- **Dropdown**: Never shown
- **Query Logic**: Auto-filtered to assigned locations
- **Intersection**: `licensee locations ∩ resourcePermissions.gaming-locations.resources`
- **Use Case**: Field technicians

---

## ⚙️ Backend Query Filtering - REQUIRED PATTERNS

### 1. **Get User's Accessible Licensees**

```typescript
import { getUserAccessibleLicenseesFromToken } from '@/app/api/lib/helpers/licenseeFilter';

const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
// Returns: string[] | 'all'
// - 'all' for Developer/Admin
// - string[] for other roles (array of licensee IDs)
```

### 2. **Get User's Accessible Locations**

```typescript
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

// selectedLicenseeFilter comes from query parameter (e.g., ?licensee=xxx)
const allowedLocationIds = await getUserLocationFilter(selectedLicenseeFilter);
// Returns: string[] | 'all'
// - 'all' for admins with no filter
// - string[] for filtered results
// - [] for users with no access
```

### 3. **Read Licensee Query Parameter (BOTH SPELLINGS)**

```typescript
// ⭐ ALWAYS support both spellings for backwards compatibility
const licensee = searchParams.get('licensee') || searchParams.get('licencee');
```

### 4. **Apply Location Filter to MongoDB Query**

```typescript
const matchStage: Record<string, unknown> = {};

// Apply location filter
if (allowedLocationIds !== 'all') {
  if (allowedLocationIds.length === 0) {
    // User has no access - return empty
    return NextResponse.json({ success: true, data: [] });
  }
  matchStage['_id'] = { $in: allowedLocationIds };
}

const locations = await GamingLocations.find(matchStage);
```

### 5. **Apply Filter to Machine Queries**

```typescript
// For machine queries, filter by their locations
if (allowedLocationIds !== 'all') {
  matchStage['gamingLocation'] = { $in: allowedLocationIds };
}

const machines = await Machine.find(matchStage);
```

### 6. **Apply Filter to Aggregation Pipelines**

```typescript
import { applyLicenseeFilterToAggregation } from '@/app/api/lib/helpers/licenseeFilter';

let pipeline: PipelineStage[] = [
  { $match: { /* your filters */ } },
  { $group: { /* your grouping */ } }
];

// Apply licensee filter
pipeline = applyLicenseeFilterToAggregation(
  pipeline,
  licensee,
  userAccessibleLicensees
);
```

---

## 🎨 Frontend Patterns - REQUIRED IMPLEMENTATIONS

### 1. **Check If User Should See Content**

```typescript
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';

// In page component
if (shouldShowNoLicenseeMessage(currentUser)) {
  return <NoLicenseeAssigned />;
}
```

### 2. **Use Licensee Dropdown**

```typescript
import { LicenceeSelect } from '@/components/ui/LicenceeSelect';

// Dropdown automatically:
// - Fetches user's accessible licensees
// - Filters to show only what user can access
// - Shows/hides based on role and licensee count
// - Persists selection to localStorage

<LicenceeSelect />
```

### 3. **Include Licensee in API Calls**

```typescript
import { useDashboardStore } from '@/lib/store/dashboardStore';

const { selectedLicencee } = useDashboardStore();

// ALWAYS include in data fetching
const { data } = useQuery({
  queryKey: ['data', selectedLicencee, timePeriod],
  queryFn: () => fetchData({
    licensee: selectedLicencee,  // ⭐ REQUIRED
    timePeriod
  })
});
```

### 4. **Update useEffect Dependencies**

```typescript
// ⭐ ALWAYS include selectedLicencee in dependency array
useEffect(() => {
  fetchData();
}, [selectedLicencee, timePeriod, otherDeps]); // Include selectedLicencee!
```

---

## 🚨 CRITICAL: Intersection Logic

### For Non-Managers (Collector, Location Admin, Technician)

**FORMULA:**
```
Accessible Locations = (Locations where rel.licencee IN user.rel.licencee)
                      ∩
                      (user.resourcePermissions.gaming-locations.resources)
```

**Code Implementation:**
```typescript
// app/api/lib/helpers/licenseeFilter.ts - getUserLocationFilter()

// Step 1: Get locations belonging to user's licensees
const licenseeLocations = await GamingLocations.find({
  'rel.licencee': { $in: userLicensees }
}).distinct('_id');

// Step 2: Get user's assigned location permissions
const userLocationPermissions = user.resourcePermissions?.['gaming-locations']?.resources || [];

// Step 3: Calculate intersection
if (isManager) {
  return licenseeLocations; // Managers see ALL licensee locations
} else {
  const intersection = licenseeLocations.filter(id => 
    userLocationPermissions.includes(id)
  );
  return intersection; // Non-managers see ONLY intersection
}
```

### For Managers

**NO INTERSECTION** - Managers see ALL locations for their assigned licensees, regardless of `resourcePermissions.gaming-locations.resources`.

**Code:**
```typescript
if (isManager) {
  // Return ALL locations for assigned licensees
  return licenseeLocations;
}
```

---

## 🔄 Session Invalidation Pattern

### When to Increment sessionVersion

**Trigger Conditions:**
```typescript
// ⚠️ CRITICAL: sessionVersion is ONLY incremented when permissions change
// It is NOT incremented on login - this allows multiple concurrent sessions

// Increment sessionVersion when changing ANY of these:
const permissionFieldsChanged = 
  licenseeChanged ||           // rel.licencee array modified
  locationsChanged ||          // resourcePermissions.gaming-locations.resources modified
  rolesChanged;                // roles array modified

if (permissionFieldsChanged) {
  await UserModel.findOneAndUpdate(
    { _id: userId },
    { $inc: { sessionVersion: 1 } }
  );
}

// On login, sessionVersion is NOT incremented:
// Only lastLoginAt and loginCount are updated
await UserModel.findOneAndUpdate(
  { _id: user._id },
  {
    $set: { lastLoginAt: now },
    $inc: { loginCount: 1 }
    // sessionVersion remains unchanged
  }
);
```

### JWT Validation on Every Request

```typescript
// app/api/lib/helpers/users.ts - getUserFromServer()

const payload = verifyJWT(token);
const dbUser = await UserModel.findOne({ _id: payload.userId });

// ⭐ CRITICAL: Check session version
if (dbUser.sessionVersion !== payload.sessionVersion) {
  return null; // Session invalid - user will be logged out
}
```

### Frontend Auto-Logout

```typescript
// lib/utils/axiosInterceptor.ts

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      toast.error('Your session has been invalidated. Please login again.');
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

---

## 🔍 Database Query Patterns

### Finding Users by ID (String IDs!)

```typescript
// ✅ CORRECT - Use findOne with _id string
const user = await UserModel.findOne({ _id: userId });

// ❌ WRONG - Don't use findById (expects ObjectId)
const user = await UserModel.findById(userId); // NEVER use this!
```

### Updating Users

```typescript
// ✅ CORRECT
await UserModel.findOneAndUpdate(
  { _id: userId },
  { $set: { 'rel.licencee': licensees }, $inc: { sessionVersion: 1 } },
  { new: true }
);

// ❌ WRONG
await UserModel.findByIdAndUpdate(userId, ...); // NEVER use this!
```

### Querying Locations by Licensee

```typescript
// Get all locations for a licensee
const locations = await GamingLocations.find({
  'rel.licencee': licenseeId,
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2020-01-01') } }
  ]
});
```

### Querying Machines by Location

```typescript
// Get machines at specific locations
const machines = await Machine.find({
  gamingLocation: { $in: locationIds },
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2020-01-01') } }
  ]
});
```

---

## 🛠️ Helper Functions - ALWAYS USE THESE

### Core Filtering Functions

**File:** `app/api/lib/helpers/licenseeFilter.ts`

```typescript
// 1. Get user's accessible licensees from JWT token
export async function getUserAccessibleLicenseesFromToken(): Promise<string[] | 'all'>
// Returns: 'all' for admins, string[] for others

// 2. Get filtered location IDs based on role and licensees
export async function getUserLocationFilter(
  selectedLicenseeFilter?: string
): Promise<string[] | 'all'>
// Returns: 'all' for admins with no filter, string[] for filtered, [] for no access

// 3. Apply licensee filter to aggregation pipeline
export function applyLicenseeFilterToAggregation(
  pipeline: PipelineStage[],
  licenseeId?: string,
  userAccessibleLicensees?: string[] | 'all'
): PipelineStage[]
```

### Frontend Utility Functions

**File:** `lib/utils/licenseeAccess.ts`

```typescript
// Check if user should see "No Licensee Assigned" message
export function shouldShowNoLicenseeMessage(user: User | null): boolean
// Returns: true if non-admin user with no licensees

// Check if user has admin role
export function isUserAdmin(user: User | null): boolean

// Check if user has manager role
export function isUserManager(user: User | null): boolean

// Check if dropdown should be shown
export function shouldShowLicenseeDropdown(user: User | null): boolean
// Returns: true for admins OR users with 2+ licensees
```

---

## 🎯 API Endpoint Patterns - REQUIRED IMPLEMENTATION

### Standard API Route Structure

```typescript
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 1. ⭐ ALWAYS support both spellings
    const licensee = searchParams.get('licensee') || searchParams.get('licencee');
    
    // 2. Get filtered location IDs
    const allowedLocationIds = await getUserLocationFilter(licensee || undefined);
    
    // 3. Handle no access case
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    // 4. Build MongoDB query
    const matchStage: Record<string, unknown> = {};
    
    if (allowedLocationIds !== 'all') {
      matchStage['_id'] = { $in: allowedLocationIds }; // For locations
      // OR
      matchStage['gamingLocation'] = { $in: allowedLocationIds }; // For machines
    }
    
    // 5. Execute query
    const data = await Model.find(matchStage);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
```

### Aggregation Pipeline Pattern

```typescript
export async function GET(req: NextRequest) {
  const licensee = searchParams.get('licensee') || searchParams.get('licencee');
  const allowedLocationIds = await getUserLocationFilter(licensee || undefined);
  
  let pipeline: PipelineStage[] = [
    { $match: { readAt: { $gte: startDate, $lte: endDate } } }
  ];
  
  // Apply location filter to pipeline
  if (allowedLocationIds !== 'all') {
    pipeline.unshift({
      $match: { location: { $in: allowedLocationIds } }
    });
  }
  
  const results = await Meters.aggregate(pipeline);
  return NextResponse.json({ success: true, data: results });
}
```

---

## 🚫 NEVER DO THESE (Common Mistakes)

### ❌ 1. Using ObjectId Instead of String

```typescript
// ❌ WRONG
import { ObjectId } from 'mongodb';
const id = new ObjectId();

// ✅ CORRECT
const id = new mongoose.Types.ObjectId().toHexString();
```

### ❌ 2. Using findById Instead of findOne

```typescript
// ❌ WRONG
const user = await UserModel.findById(userId);

// ✅ CORRECT
const user = await UserModel.findOne({ _id: userId });
```

### ❌ 3. Ignoring Licensee Parameter

```typescript
// ❌ WRONG - Returns all data regardless of user's licensees
const locations = await GamingLocations.find({});

// ✅ CORRECT - Filters by user's accessible locations
const allowedLocationIds = await getUserLocationFilter(licensee);
if (allowedLocationIds !== 'all') {
  matchStage['_id'] = { $in: allowedLocationIds };
}
const locations = await GamingLocations.find(matchStage);
```

### ❌ 4. Only Supporting 'licencee' Spelling

```typescript
// ❌ WRONG - Only reads one spelling
const licencee = searchParams.get('licencee');

// ✅ CORRECT - Supports both spellings
const licensee = searchParams.get('licensee') || searchParams.get('licencee');
```

### ❌ 5. Forgetting to Increment sessionVersion

```typescript
// ❌ WRONG - User's session stays valid even with new permissions
await UserModel.findOneAndUpdate(
  { _id: userId },
  { $set: { 'rel.licencee': newLicensees } }
);

// ✅ CORRECT - Invalidate session when permissions change
await UserModel.findOneAndUpdate(
  { _id: userId },
  { 
    $set: { 'rel.licencee': newLicensees },
    $inc: { sessionVersion: 1 } // ⭐ Force re-login
  }
);
```

### ❌ 6. Not Including selectedLicencee in useEffect

```typescript
// ❌ WRONG - Won't refresh when licensee changes
useEffect(() => {
  fetchData();
}, [timePeriod]);

// ✅ CORRECT - Refreshes when licensee selection changes
useEffect(() => {
  fetchData();
}, [selectedLicencee, timePeriod]);
```

---

## 🧪 Testing Requirements

### Test Each Role

When implementing licensee filtering:
1. ✅ Test as Developer (can view all + filter)
2. ✅ Test as Manager with 3 licensees (dropdown filters correctly)
3. ✅ Test as Manager with 1 licensee (no dropdown)
4. ✅ Test as Collector with multi-location (sees only assigned)
5. ✅ Test as Location Admin (no dropdown, sees only assigned)
6. ✅ Test as Technician (minimal access)

### Verify No Data Leakage

```bash
# For each licensee (Barbados, Cabana, TTG):
# 1. Select licensee in dropdown
# 2. Verify ONLY that licensee's data shows
# 3. Verify NO other licensee data visible
# 4. Check all pages: Dashboard, Locations, Cabinets, Collection Reports
```

### Test Session Invalidation

```bash
# 1. Login as test user
# 2. Admin changes their licensees/locations/roles
# 3. User makes next API call
# 4. Should receive 401 Unauthorized
# 5. Should be redirected to /login
# 6. Should see toast message
```

---

## 📋 API Checklist for New Endpoints

When creating or modifying an API endpoint that returns licensee/location/machine data:

- [ ] Import `getUserLocationFilter` from `licenseeFilter.ts`
- [ ] Read `licensee` parameter (support both spellings)
- [ ] Call `getUserLocationFilter(licensee)` to get allowed locations
- [ ] Handle `allowedLocationIds === 'all'` case (admins)
- [ ] Handle `allowedLocationIds.length === 0` case (no access)
- [ ] Apply filter to MongoDB query (`_id` for locations, `gamingLocation` for machines)
- [ ] Add console.log for debugging: `[ENDPOINT_NAME] Allowed locations:`, `allowedLocationIds`
- [ ] Test with different roles (admin, manager, collector)
- [ ] Verify no data leakage between licensees

---

## 📋 Frontend Checklist for New Pages

When creating a page that displays licensee/location/machine data:

- [ ] Import `shouldShowNoLicenseeMessage` and `NoLicenseeAssigned`
- [ ] Check if user should see content (return `<NoLicenseeAssigned />` if not)
- [ ] Import `useDashboardStore` and get `selectedLicencee`
- [ ] Include `selectedLicencee` in ALL data fetching queries
- [ ] Add `selectedLicencee` to useEffect dependencies
- [ ] Import and render `<LicenceeSelect />` in header (conditional visibility handled automatically)
- [ ] Test page access for all roles
- [ ] Verify filtering works correctly
- [ ] Check licensee dropdown shows/hides correctly

---

## 🗄️ Important Files Reference

### Backend
- `app/api/lib/helpers/licenseeFilter.ts` - Core filtering logic
- `app/api/lib/helpers/users.ts` - User fetching with session validation
- `app/api/lib/models/user.ts` - User schema with licensee fields

### Frontend
- `lib/utils/licenseeAccess.ts` - Client-side access checks
- `lib/store/dashboardStore.ts` - Licensee selection state
- `components/ui/LicenceeSelect.tsx` - Licensee dropdown component
- `components/ui/NoLicenseeAssigned.tsx` - No access message

### Types
- `shared/types/entities.ts` - User, Location types
- `shared/types/auth.ts` - JWT payload with licensee info
- `lib/types/administration.ts` - Admin types with licensee

---

## 💡 Quick Decision Tree

### "Should this user see this data?"

```
Is user Developer or Admin?
├─ YES → Show all data (licensee dropdown is optional filter)
└─ NO → Does user have assigned licensees?
    ├─ NO → Show "No Licensee Assigned" message
    └─ YES → Is user a Manager?
        ├─ YES → Show ALL locations for assigned licensees
        │        (dropdown filters between licensees if 2+)
        └─ NO → Show ONLY locations in intersection:
                 (licensee locations ∩ assigned location permissions)
                 (dropdown shown if locations span 2+ licensees)
```

### "Should this page show licensee dropdown?"

```
Is user Developer or Admin?
├─ YES → Always show
└─ NO → Is user a Manager?
    ├─ YES → Show if 2+ assigned licensees
    └─ NO → Is user a Collector with 2+ licensees?
        ├─ YES → Show dropdown
        └─ NO → Don't show (single licensee or location-only access)
```

---

## 🎓 Examples from Codebase

### Example 1: Dashboard Totals API

**File:** `app/api/dashboard/totals/route.ts`

```typescript
const licensee = searchParams.get('licensee') || searchParams.get('licencee');
const allowedLocationIds = await getUserLocationFilter(licensee || undefined);

// Filter meters by allowed locations
if (allowedLocationIds !== 'all') {
  meterMatch['location'] = { $in: allowedLocationIds };
}
```

### Example 2: Locations Page

**File:** `app/locations/page.tsx`

```typescript
if (shouldShowNoLicenseeMessage(currentUser)) {
  return <NoLicenseeAssigned />;
}

const { data } = useLocationData({
  licensee: selectedLicencee,
  timePeriod,
  search: searchTerm
});
```

### Example 3: User Modal with Licensee Assignment

**File:** `components/administration/UserModal.tsx`

```typescript
// Multi-select for licensees
<MultiSelect
  options={availableLicensees}
  selected={formData.rel?.licencee || []}
  onChange={(licensees) => setFormData({
    ...formData,
    rel: { ...formData.rel, licencee: licensees }
  })}
/>

// On save - increment sessionVersion if licensees changed
const hasLicenseeChanges = !arraysEqual(
  initialData.rel?.licencee || [],
  formData.rel?.licencee || []
);

if (hasLicenseeChanges) {
  updateData.$inc = { sessionVersion: 1 };
}
```

---

## 🔗 Related Documentation

- [Complete System Guide](../Documentation/licensee-location-filtering.md)
- [Role Based Permissions](../Documentation/Role%20Based%20Permissions.md)
- [API Overview](../Documentation/backend/api-overview.md)
- [Pages Overview](../Documentation/frontend/pages-overview.md)

---

## ⚡ Quick Commands

```bash
# Find all API endpoints with licensee filtering
grep -r "getUserLocationFilter" app/api

# Find all pages using licensee dropdown
grep -r "LicenceeSelect" app components

# Find all session version increments
grep -r "sessionVersion.*1" app

# Check user's licensees in DB
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI).then(async () => { const user = await mongoose.connection.db.collection('users').findOne({ username: 'username_here' }); console.log('Licensees:', user?.rel?.licencee); process.exit(0); });"
```

---

**Remember:** When in doubt, check the comprehensive guide at `Documentation/licensee-location-filtering.md`

**Last Updated:** November 9, 2025

