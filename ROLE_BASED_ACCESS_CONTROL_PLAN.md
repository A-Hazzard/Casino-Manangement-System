# Role-Based Access Control Implementation Plan

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** December 19th, 2024

## Overview

This document outlines the comprehensive role-based access control (RBAC) implementation for the Evolution One Casino Management System. The system uses a hierarchical permission model where users can have multiple roles, and the highest priority role determines their access level.

## Role Hierarchy & Priority (Highest to Lowest)

1. **Evolution Admin** - Full platform access
2. **Admin** - High-level administrative functions  
3. **Manager** - Operational oversight
4. **Location Admin** - Location-specific management
5. **Technician** - Technical operations
6. **Collector** - Collection operations
7. **Collector Meters** - Meter-specific collections

## Page Access Matrix

### **Dashboard** 
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access  
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ❌ **Technician** - No access (focused on technical tasks)
- ❌ **Collector** - No access (focused on collection reports)
- ❌ **Collector Meters** - No access (focused on meter collections)

### **Machines Page**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ✅ **Technician** - Full access (primary function)
- ✅ **Collector** - Full access (needed for collection reports)
- ✅ **Collector Meters** - Full access (needed for collection reports)

### **Locations Page**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ❌ **Technician** - No access (except location details via direct link)
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

### **Location Details Page** (`/locations/[slug]`)
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ✅ **Technician** - Access via direct link only (not in navbar)
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

### **Members Page**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ❌ **Location Admin** - No access
- ❌ **Technician** - No access
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

### **Member Details Page** (`/members/[slug]`)
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Access via direct link only (not in navbar)
- ✅ **Technician** - Access via direct link only (not in navbar)
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

### **Collection Reports Page**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ✅ **Collector** - Full access (primary function)
- ✅ **Collector Meters** - Full access (primary function)
- ❌ **Technician** - No access

### **Sessions Page**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ✅ **Technician** - Full access
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

### **Administration Page**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ❌ **Manager** - No access
- ❌ **Location Admin** - No access
- ❌ **Technician** - No access
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

## Administration Page Tab Access

### **Users Tab**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access

### **Licensees Tab**
- ✅ **Evolution Admin** - Full access
- ❌ **Admin** - No access

### **Activity Logs Tab**
- ✅ **Evolution Admin** - Full access
- ❌ **Admin** - No access

## Collection Reports Page Tab Access

### **Collection Reports Tab**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ✅ **Collector** - Full access
- ✅ **Collector Meters** - Full access

### **Monthly Reports Tab**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

### **Manager Schedules Tab**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ❌ **Location Admin** - No access
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

### **Collector Schedules Tab**
- ✅ **Evolution Admin** - Full access
- ✅ **Admin** - Full access
- ✅ **Manager** - Full access
- ✅ **Location Admin** - Full access
- ❌ **Collector** - No access
- ❌ **Collector Meters** - No access

## Licensee Filter Logic

### **Location-Based Licensee Filtering**
- Users can only see licensees for locations they have access to
- If user belongs to locations under multiple licensees, show all relevant licensees
- "All" option shows data for all licensees the user has access to

### **Implementation Logic**
```typescript
// Get user's accessible locations
const userLocations = user.resourcePermissions?.["gaming-locations"]?.resources || [];

// Get licensees for those locations
const accessibleLicensees = getLicenseesForLocations(userLocations);

// Show licensee filter with only accessible licensees
// If user has access to multiple licensees, show "All" option
```

## Multi-Role Access Logic

### **Highest Priority Rule**
- Users with multiple roles get access based on their highest priority role
- Example: User with "Collector" + "Evolution Admin" = Full platform access
- Example: User with "Manager" + "Admin" = Full administrative access
- Example: User with "Technician" + "Location Admin" = Can access locations page

### **Permission Check Implementation**
```typescript
// Check user's highest priority role first
const hasAccess = (userRoles: string[], requiredRoles: string[]) => {
  // Check for Evolution Admin first (highest priority)
  if (userRoles.includes('evolution admin')) return true;
  
  // Check for Admin
  if (userRoles.includes('admin')) return true;
  
  // Check other roles in priority order
  return requiredRoles.some(role => userRoles.includes(role));
};
```

## Implementation Tasks

### **1. Update Role Options**
- Add "Evolution Admin" role to `ROLE_OPTIONS` in `UserModal.tsx`
- Update role hierarchy in authentication system

### **2. Create Permission Utility Functions**
```typescript
// lib/utils/permissions.ts
export const hasPageAccess = (userRoles: string[], page: string): boolean => {
  const pagePermissions = {
    dashboard: ['evolution admin', 'admin', 'manager', 'location admin'],
    machines: ['evolution admin', 'admin', 'manager', 'location admin', 'technician', 'collector', 'collector meters'],
    locations: ['evolution admin', 'admin', 'manager', 'location admin'],
    'location-details': ['evolution admin', 'admin', 'manager', 'location admin', 'technician'],
    members: ['evolution admin', 'admin', 'manager'],
    'member-details': ['evolution admin', 'admin', 'manager', 'location admin', 'technician'],
    'collection-report': ['evolution admin', 'admin', 'manager', 'location admin', 'collector', 'collector meters'],
    sessions: ['evolution admin', 'admin', 'manager', 'location admin', 'technician'],
    administration: ['evolution admin', 'admin']
  };
  
  return pagePermissions[page]?.some(role => userRoles.includes(role)) || false;
};

export const hasTabAccess = (userRoles: string[], page: string, tab: string): boolean => {
  const tabPermissions = {
    'administration-users': ['evolution admin', 'admin'],
    'administration-licensees': ['evolution admin'],
    'administration-activity-logs': ['evolution admin'],
    'collection-reports-monthly': ['evolution admin', 'admin', 'manager', 'location admin'],
    'collection-reports-manager-schedules': ['evolution admin', 'admin', 'manager'],
    'collection-reports-collector-schedules': ['evolution admin', 'admin', 'manager', 'location admin']
  };
  
  return tabPermissions[`${page}-${tab}`]?.some(role => userRoles.includes(role)) || false;
};
```

### **3. Update Header Component**
- Hide navigation links based on user permissions
- Implement location-based licensee filtering
- Show only relevant licensees in `LicenceeSelect` component

### **4. Update Page Components**
- Add permission checks to all page components
- Hide tabs based on user permissions
- Show appropriate error messages for restricted access

### **5. Update Administration Page**
- Hide Users tab for non-admin users
- Hide Licensees and Activity Logs tabs for non-evolution-admin users
- Implement proper access control for each tab

### **6. Update Collection Reports Page**
- Hide Monthly Reports tab for collectors
- Hide Manager Schedules tab for location admins and collectors
- Hide Collector Schedules tab for collectors

### **7. Licensee Filter Implementation**
- Update `LicenceeSelect` component to filter based on user's accessible locations
- Implement "All" option logic for users with multiple licensee access
- Ensure data filtering works correctly with licensee selection

## Navigation Hiding Strategy

### **Navbar Links to Hide**
- **Dashboard**: Hide for Technician, Collector, Collector Meters
- **Locations**: Hide for Technician, Collector, Collector Meters
- **Members**: Hide for Location Admin, Technician, Collector, Collector Meters
- **Collection Reports**: Hide for Technician
- **Sessions**: Hide for Collector, Collector Meters
- **Administration**: Hide for Manager, Location Admin, Technician, Collector, Collector Meters

### **Direct Link Access**
- **Location Details**: Technicians can access via direct link
- **Member Details**: Location Admins and Technicians can access via direct link
- These pages should not be accessible through navbar for restricted roles

## Configuration Variables

```typescript
// lib/config/permissions.ts
export const PERMISSION_CONFIG = {
  // Toggle for Kevin's decision on Members page access
  MEMBERS_PAGE_ADMIN_ONLY: false,
  
  // Toggle for Location Admin Members access
  LOCATION_ADMIN_MEMBERS_ACCESS: false,
  
  // Toggle for Collector machine access
  COLLECTOR_MACHINE_ACCESS: true,
  
  // Toggle for Technician location access
  TECHNICIAN_LOCATION_ACCESS: false
};
```

## TODO Items for Kevin

### **Members Page Access Review**
- **Question**: Should Members page be restricted to only Evolution Admin and Admin roles?
- **Current Plan**: Allow Manager access, deny Location Admin access
- **Implementation**: Add configuration variable to toggle access levels
- **Code**: `const MEMBERS_PAGE_ADMIN_ONLY = false; // Toggle for Kevin's decision`

### **Location Admin Permissions**
- **Question**: Should Location Admins have access to Members page?
- **Current Plan**: No, but they can access member details via direct link
- **Implementation**: Add configuration variable for future adjustment

## Testing Checklist

- [ ] Test each role's page access
- [ ] Test tab access within administration page
- [ ] Test tab access within collection reports page
- [ ] Test licensee filtering for different user types
- [ ] Test multi-role users (highest priority access)
- [ ] Test navigation hiding for restricted users
- [ ] Test direct link access for restricted roles
- [ ] Test error messages for unauthorized access
- [ ] Test "All" licensee option for multi-licensee users
- [ ] Test location-based data filtering

## Security Considerations

### **Route Protection**
- Implement middleware to check permissions before page access
- Redirect unauthorized users to appropriate pages
- Log unauthorized access attempts

### **API Protection**
- Ensure API endpoints respect user permissions
- Filter data based on user's accessible locations
- Implement proper error handling for unauthorized requests

### **Data Filtering**
- Filter all data based on user's accessible locations
- Ensure users only see data for their assigned locations
- Implement proper licensee filtering throughout the system

This plan ensures proper role-based access control while maintaining flexibility for future adjustments based on Kevin's feedback.

