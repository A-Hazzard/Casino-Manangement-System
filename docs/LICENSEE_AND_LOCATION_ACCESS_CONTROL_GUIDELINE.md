# Licensee and Location Access Control System - Implementation Guideline

## 📋 Overview

This document defines the comprehensive access control system for the Evolution CMS based on **licensees** and **location assignments**. All API endpoints MUST follow this guideline to ensure consistent access control across the entire application.

---

## 🎯 Core Principles

### 1. **Role-Based Access Control (RBAC)**

The system implements three tiers of access based on user roles:

#### **Tier 1: Admin / Developer**
- **Behavior**: Full system access
- **Licensee Restriction**: None (sees all licensees)
- **Location Restriction**: None by default
  - If location permissions are assigned to an admin, they see ONLY those locations
  - This allows limiting admin scope to specific locations if needed

#### **Tier 2: Manager**
- **Behavior**: Sees ALL locations for their assigned licensees
- **Licensee Restriction**: Limited to assigned licensee(s) in `rel.licencee` field
- **Location Restriction**: **IGNORED** - Managers don't need specific location assignments
- **Rationale**: Managers oversee entire licensee operations and need full visibility

#### **Tier 3: Collector / Technician / Other Roles**
- **Behavior**: Sees ONLY the intersection of licensee locations AND their assigned locations
- **Licensee Restriction**: Limited to assigned licensee(s) in `rel.licencee` field
- **Location Restriction**: Limited to specific locations in `resourcePermissions['gaming-locations'].resources`
- **Rationale**: Field workers only need access to their specific work locations

---

## 🔧 Core Helper Function

### `getUserLocationFilter()`

**Location**: `app/api/lib/helpers/licenseeFilter.ts`

This is the SINGLE SOURCE OF TRUTH for all location-based access control.

#### **Function Signature**:
```typescript
async function getUserLocationFilter(
  userAccessibleLicensees: string[] | 'all',    // From JWT token
  selectedLicenseeFilter: string | undefined,   // From query params (optional)
  userLocationPermissions: string[],            // From JWT token
  userRoles: string[] = []                      // From JWT token
): Promise<string[] | 'all'>
```

#### **Return Values**:
- `'all'`: User has unrestricted access (admins with no location restrictions)
- `string[]`: Array of location IDs the user can access
- `[]`: Empty array means NO ACCESS

#### **Logic Flow**:

```typescript
1. Check if user is Admin/Developer
   → If admin with NO location permissions → Return 'all'
   → If admin WITH location permissions → Return those locations only

2. Get locations from licensees
   → If specific licensee selected → Get that licensee's locations
   → Otherwise → Get all locations from user's assigned licensees

3. Check if user is Manager
   → If Manager → Return ALL licensee locations (ignore location permissions)

4. Check if non-manager has location permissions
   → If location permissions exist → Return INTERSECTION of:
      - Locations from assigned licensees
      - User's specific location permissions
   → If no location permissions → Return all licensee locations
```

---

## 📐 Implementation Pattern for ALL API Endpoints

### **Step 1: Import Required Helpers**

```typescript
import { getUserAccessibleLicenseesFromToken, getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
```

### **Step 2: Extract User Data from JWT**

```typescript
// Get user's accessible licensees, roles, and location permissions
const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
const userPayload = await getUserFromServer();
const userRoles = (userPayload?.roles as string[]) || [];
const userLocationPermissions = 
  (userPayload?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [];

console.log('[ENDPOINT_NAME] User accessible licensees:', userAccessibleLicensees);
console.log('[ENDPOINT_NAME] User roles:', userRoles);
console.log('[ENDPOINT_NAME] User location permissions:', userLocationPermissions);
```

### **Step 3: Get Allowed Locations**

```typescript
// Get allowed location IDs (handles all role-based logic internally)
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  licenceeFromQueryParams || undefined,  // Optional licensee filter from URL
  userLocationPermissions,
  userRoles
);

console.log('[ENDPOINT_NAME] Allowed location IDs:', allowedLocationIds);

// Check if user has no access
if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
  console.log('[ENDPOINT_NAME] No accessible locations - returning empty result');
  return NextResponse.json({ success: true, data: [] });
}
```

### **Step 4: Apply Filter to MongoDB Query**

```typescript
// Build base query
const matchStage: Record<string, unknown> = {
  $or: [
    { deletedAt: null },
    { deletedAt: { $lt: new Date('2020-01-01') } },
  ],
};

// Apply location filter based on user permissions
if (allowedLocationIds !== 'all') {
  matchStage._id = { $in: allowedLocationIds };
}

// Use matchStage in your MongoDB query
const locations = await GamingLocations.find(matchStage);
```

---

## ✅ Working Reference Implementations

### **1. Machines/Cabinets API** (GOLD STANDARD)

**File**: `app/api/machines/aggregation/route.ts`

**Why it works**:
- ✅ Extracts `userRoles` from JWT
- ✅ Passes `userRoles` to `getUserLocationFilter`
- ✅ Applies filter to LOCATIONS first, then fetches machines for those locations
- ✅ Handles both specific licensee filters and "All Licensees"

**Key Pattern**:
```typescript
// Lines 38-56
const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
const userPayload = await getUserFromServer();
const userRoles = (userPayload?.roles as string[]) || [];
const userLocationPermissions = /* ... */;

const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  licensee || undefined,  // From query params
  userLocationPermissions,
  userRoles  // ← CRITICAL: Pass roles
);

// Apply to location query
if (allowedLocationIds !== 'all') {
  matchStage._id = { $in: allowedLocationIds };
}
```

### **2. Machines Locations API**

**File**: `app/api/machines/locations/route.ts`

**Purpose**: Returns list of locations for dropdown filters

**Key Pattern**: Same as Machines API, but returns location documents instead of machines

### **3. Collection Reports API**

**File**: `app/api/collection-reports/route.ts`

**Purpose**: Returns collection reports based on location access

**Key Pattern**: Filters reports by `locationId` field using allowed locations

### **4. Locations API**

**File**: `app/api/locations/route.ts`

**Purpose**: Returns locations list and details

**Key Pattern**: Applies filter directly to location queries

### **5. Dashboard Totals API**

**File**: `app/api/dashboard/totals/route.ts`

**Purpose**: Aggregates financial data across accessible locations

**Key Pattern**: Uses allowed locations to filter meters aggregation

---

## 🚫 Common Mistakes to Avoid

### **❌ WRONG: Not passing `userRoles`**

```typescript
// BAD - Missing userRoles parameter
const allowedLocationIds = await getUserLocationFilter(
  userAccessibleLicensees,
  licencee,
  userLocationPermissions
  // ❌ Missing userRoles!
);
```

**Result**: Managers will have location restrictions applied incorrectly

### **❌ WRONG: Applying role logic outside `getUserLocationFilter`**

```typescript
// BAD - Duplicating role logic in endpoint
if (isManager) {
  // Custom logic for managers
} else {
  const allowedLocationIds = await getUserLocationFilter(...);
}
```

**Result**: Inconsistent behavior across endpoints, harder to maintain

### **❌ WRONG: Filtering final data instead of locations**

```typescript
// BAD - Filtering machines directly
const machines = await Machine.find({ 'rel.licencee': userLicensees });
```

**Result**: Doesn't respect location permissions or role-based rules

### **✅ CORRECT: Filter locations first, then fetch data**

```typescript
// GOOD - Filter locations, then get machines for those locations
const allowedLocationIds = await getUserLocationFilter(...);
const locations = await GamingLocations.find({ _id: { $in: allowedLocationIds } });
const machines = await Machine.find({ gamingLocation: { $in: allowedLocationIds } });
```

---

## 🎯 Testing Checklist for New Endpoints

When implementing or modifying an API endpoint, verify:

- [ ] **1. JWT Token Data Extraction**
  - [ ] `userAccessibleLicensees` extracted
  - [ ] `userRoles` extracted (don't forget this!)
  - [ ] `userLocationPermissions` extracted

- [ ] **2. Call `getUserLocationFilter` Correctly**
  - [ ] All 4 parameters passed
  - [ ] Result checked for `'all'` vs `string[]` vs `[]`

- [ ] **3. Handle Empty Access**
  - [ ] Return empty result if `allowedLocationIds.length === 0`

- [ ] **4. Apply Filter Correctly**
  - [ ] Filter applied to LOCATIONS or location-related queries
  - [ ] NOT filtering licensees or final data directly

- [ ] **5. Test All Roles**
  - [ ] Admin without location restrictions → Sees everything
  - [ ] Admin with location restrictions → Sees only those locations
  - [ ] Manager with licensee → Sees all locations for that licensee
  - [ ] Collector with licensee + location → Sees only that location

---

## 📊 User Data Structure Reference

### **JWT Token Payload** (`JwtPayload` type)

```typescript
{
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  roles: string[];  // ['admin', 'manager', 'collector', 'technician', 'developer']
  rel: {
    licencee: string[];  // Array of licensee IDs user is assigned to
  };
  resourcePermissions: {
    'gaming-locations': {
      resources: string[];  // Array of location IDs user can access
    };
  };
  // ... other fields
}
```

### **Access Control Fields**

1. **`roles`**: Determines privilege level (admin/manager/collector/etc.)
2. **`rel.licencee`**: Which licensees the user belongs to
3. **`resourcePermissions['gaming-locations'].resources`**: Specific locations assigned (ignored for managers)

---

## 🔄 When to Update This Guideline

This guideline should be updated when:

1. New roles are added to the system
2. Access control logic changes
3. New types of resources need filtering (beyond locations)
4. New API endpoints are created that need access control

---

## 📝 Summary

**✅ DO**:
- Always extract `userRoles` from JWT
- Always pass `userRoles` to `getUserLocationFilter`
- Filter locations first, then fetch related data
- Log access control decisions for debugging
- Handle empty access gracefully

**❌ DON'T**:
- Don't implement custom role logic in endpoints
- Don't filter final data directly
- Don't forget to pass `userRoles` parameter
- Don't apply location permissions to managers
- Don't skip access control checks

---

**Document Version**: 1.0  
**Last Updated**: November 8, 2025  
**Maintainer**: Evolution CMS Development Team

