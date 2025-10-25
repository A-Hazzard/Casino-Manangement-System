# Role-Based Access Control - High Level Overview

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 5th, 2025

## System Overview

The Evolution One Casino Management System implements a hierarchical role-based access control (RBAC) system where users can have multiple roles, and their highest priority role determines their access level. This ensures proper security while maintaining operational efficiency.

## Role Hierarchy

The system uses seven distinct roles arranged in priority order:

1. **Evolution Admin** - Full platform access with all permissions
2. **Admin** - High-level administrative functions with most system access
3. **Manager** - Operational oversight with management-level permissions
4. **Location Admin** - Location-specific management within assigned locations
5. **Technician** - Technical operations focused on machines and systems
6. **Collector** - Collection operations focused on money collection
7. **Collector Meters** - Meter-specific collection operations

## Access Control Philosophy

### **Multi-Role Users**

- Users can have multiple roles assigned
- Access is determined by the highest priority role
- Example: A user with "Collector" + "Evolution Admin" gets full platform access
- Example: A user with "Technician" + "Location Admin" can access locations page

### **Progressive Access Model**

- Higher roles inherit permissions from lower roles
- Each role has specific restrictions and allowances
- Direct link access allows specific use cases without navbar exposure

## Page Access Strategy

### **Dashboard Access**

- **Allowed**: Evolution Admin, Admin, Manager, Location Admin
- **Restricted**: Technician, Collector, Collector Meters
- **Rationale**: Operational roles focus on specific tasks rather than overview

### **Machines Page**

- **Allowed**: All roles except basic restrictions
- **Rationale**: Machine data is needed for collections and technical operations
- **Special Access**: Technicians have full access as primary function

### **Locations Page**

- **Allowed**: Evolution Admin, Admin, Manager, Location Admin
- **Restricted**: Technician, Collector, Collector Meters
- **Direct Link Access**: Technicians can access location details via direct links
- **Rationale**: Location management is administrative, but technicians need access to specific locations

### **Members Page**

- **Allowed**: Evolution Admin, Admin, Manager
- **Restricted**: Location Admin, Technician, Collector, Collector Meters
- **Direct Link Access**: Location Admin and Technicians can access member details via direct links
- **Rationale**: Member management is high-level administrative function

### **Collection Reports Page**

- **Allowed**: Evolution Admin, Admin, Manager, Location Admin, Collector, Collector Meters
- **Restricted**: Technician
- **Rationale**: Collection operations are specialized functions

### **Sessions Page**

- **Allowed**: Evolution Admin, Admin, Manager, Location Admin, Technician
- **Restricted**: Collector, Collector Meters
- **Rationale**: Session monitoring is operational oversight function

### **Administration Page**

- **Allowed**: Evolution Admin, Admin only
- **Rationale**: System administration requires highest security clearance

## Tab-Level Access Control

### **Administration Page Tabs**

- **Users Tab**: Evolution Admin, Admin
- **Licensees Tab**: Evolution Admin only
- **Activity Logs Tab**: Evolution Admin only
- **Rationale**: Different administrative functions require different clearance levels

### **Collection Reports Page Tabs**

- **Collection Reports**: All roles with page access
- **Monthly Reports**: Evolution Admin, Admin, Manager, Location Admin
- **Manager Schedules**: Evolution Admin, Admin, Manager
- **Collector Schedules**: Evolution Admin, Admin, Manager, Location Admin
- **Rationale**: Different reporting functions serve different operational needs

## Licensee Filtering Strategy

### **Location-Based Access**

- Users can only see licensees for locations they have access to
- Multi-licensee users see "All" option for their accessible licensees
- Data filtering ensures users only see relevant information

### **Security Implementation**

- All data queries filtered by user's accessible locations
- Licensee selection limited to user's permissions
- "All" option shows data for all accessible licensees

## Navigation Strategy

### **Navbar Hiding**

- Navigation links hidden for roles without access
- Prevents confusion and unauthorized access attempts
- Clean interface based on user permissions

### **Direct Link Access**

- Specific pages accessible via direct links for certain roles
- Technicians can access location details when needed
- Location Admins and Technicians can access member details when needed
- Maintains security while allowing necessary access

## Security Considerations

### **Route Protection**

- All routes protected by permission middleware
- Unauthorized access attempts logged and redirected
- Proper error handling for restricted access

### **Data Filtering**

- All API responses filtered by user permissions
- Location-based data access enforced
- Licensee-based filtering implemented throughout

### **Multi-Role Security**

- Highest priority role determines access level
- No privilege escalation through multiple lower roles
- Proper permission inheritance maintained

## Operational Benefits

### **Role Clarity**

- Each role has clear, defined responsibilities
- Access permissions align with job functions
- Reduces confusion and unauthorized access

### **Security Compliance**

- Proper access control for sensitive operations
- Audit trail for all user actions
- Compliance with casino management regulations

### **Operational Efficiency**

- Users see only relevant information
- Streamlined interfaces based on roles
- Reduced cognitive load for specialized roles

## Future Flexibility

### **Configuration Options**

- Toggle switches for access level adjustments
- Easy modification of role permissions
- Scalable system for additional roles

### **Kevin's Feedback Integration**

- Members page access level toggles
- Location Admin permissions adjustable
- Easy configuration for business rule changes

## Implementation Approach

### **Phased Rollout**

- Core permission system first
- Navigation hiding implementation
- Tab-level access control
- Licensee filtering system
- Direct link access implementation

### **Testing Strategy**

- Role-based access testing
- Multi-role user testing
- Navigation hiding verification
- Data filtering validation
- Security penetration testing

## Current Implementation Details

### **Permission Checking System**

The system uses a dual-layer permission checking approach:

1. **Local Permission Checks** (`lib/utils/permissions.ts`):
   - Fast client-side permission validation
   - Role-based page and tab access control
   - Navigation link visibility control

2. **Database Permission Checks** (`lib/utils/permissionsDb.ts`):
   - Server-side permission validation
   - Real-time user role verification
   - Fallback for security-sensitive operations

### **Route Protection**

All pages are protected using the `ProtectedRoute` component with specific access requirements:

- **Dashboard**: `requiredPage="dashboard"`
- **Machines/Cabinets**: `requiredPage="machines"`
- **Locations**: `requiredPage="locations"`
- **Members**: `requiredPage="members"`
- **Member Details**: `requiredPage="member-details"`
- **Collection Reports**: `requiredPage="collection-report"`
- **Reports**: `requiredPage="reports"`
- **Sessions**: `requiredPage="sessions"`
- **Administration**: `requireAdminAccess={true}`

### **Navigation Control**

The `AppSidebar` component dynamically shows/hides navigation links based on user permissions using `shouldShowNavigationLinkDb()` function, ensuring users only see accessible pages.

### **Multi-Role Support**

Users can have multiple roles, and the system uses the highest priority role for access decisions. The `getHighestPriorityRole()` function determines the user's effective role level.

### **Security Features**

- JWT-based authentication with database context validation
- Automatic role loading and validation
- Graceful fallback for permission check failures
- Unauthorized access redirection to appropriate pages

This high-level overview provides the strategic framework for implementing a robust, secure, and user-friendly role-based access control system that meets the operational needs of the Evolution One Casino Management System.
