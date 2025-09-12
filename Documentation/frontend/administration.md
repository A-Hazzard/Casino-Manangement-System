# Administration Page

## Table of Contents
- [Overview](#overview)
- [Main Features](#main-features)
- [Technical Architecture](#technical-architecture)
- [User Management](#user-management)
- [Licensee Management](#licensee-management)
- [Security Features](#security-features)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Overview

The Administration page provides comprehensive user and licensee management for the casino management system, including role-based access control, permissions management, and activity logging.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 6th, 2025  
**Version:** 2.0.0

### File Information
- **File:** `app/administration/page.tsx`
- **URL Pattern:** `/administration`
- **Component Type:** Administrative Management Page
- **Authentication:** Required (Admin Role)

## Main Features
- **User Management:**
  - View, search, sort, add, edit, and delete users
  - Assign roles and permissions with granular control
  - Resource-based permissions (location and module access)
  - User profile management with detailed personal information
  - **Profile Picture Management:** Upload, crop (circular format), and remove profile pictures
  - Password reset and account status management
  - Activity logs for user actions and system events
- **Licensee Management:**
  - View, search, add, edit, and delete licensees
  - Manage licensee payment status and expiry dates
  - License key generation and management
  - Payment history tracking and reminders
  - Country-based licensing information
  - Automatic license expiry notifications
- **Activity Logging:**
  - Comprehensive audit trail for all system changes
  - User action tracking with timestamps
  - Change history with before/after values
  - Filterable activity logs by date, user, and action type
  - IP address logging for security tracking
  - **Enhanced API Logging:** All endpoints include structured logging with duration, timestamps, and context
- **Security Features:**
  - Role-based access control (RBAC)
  - Resource permissions for location-specific access
  - Password complexity requirements with real-time validation
  - Account enable/disable functionality
  - Session management and authentication tracking
- **Responsive Interface:**
  - Desktop table views with sorting and filtering
  - Mobile card views for smaller screens
  - Modal-based forms for data entry
  - Real-time search and filtering
  - Pagination with configurable page sizes
  - **Enhanced Mobile Responsiveness:** Optimized layouts, responsive text sizing, and mobile-friendly navigation
- **Data Export:**
  - Export user and licensee lists
  - Activity log export for compliance
  - Formatted reports for auditing

## Technical Architecture

### Core Components
- **Main Page:** `app/administration/page.tsx` - Entry point with dual-section management
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation header
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **User Management Components:**
  - `components/administration/UserTable.tsx` - Desktop user table view
  - `components/administration/UserCard.tsx` - Mobile user card view
  - `components/administration/UserTableSkeleton.tsx` - Loading skeleton for table
  - `components/administration/UserCardSkeleton.tsx` - Loading skeleton for cards
  - `components/administration/SearchFilterBar.tsx` - Search and filter controls
- **Licensee Management Components:**
  - `components/administration/LicenseeTable.tsx` - Desktop licensee table view
  - `components/administration/LicenseeCard.tsx` - Mobile licensee card view
  - `components/administration/LicenseeSearchBar.tsx` - Licensee search controls
- **Modal Components:**
  - `components/administration/RolesPermissionsModal.tsx` - User roles and permissions
  - `components/administration/DeleteUserModal.tsx` - User deletion confirmation
  - `components/administration/UserDetailsModal.tsx` - User profile details with profile picture management
  - `components/administration/AddUserDetailsModal.tsx` - Add user step 1 (details with profile picture upload)
  - `components/administration/AddUserRolesModal.tsx` - Add user step 2 (roles with enhanced location selection)
  - `components/administration/AddLicenseeModal.tsx` - Add licensee form
  - `components/administration/EditLicenseeModal.tsx` - Edit licensee form
  - `components/administration/DeleteLicenseeModal.tsx` - Licensee deletion confirmation
  - `components/administration/ActivityLogModal.tsx` - System activity logs
  - `components/administration/PaymentHistoryModal.tsx` - Licensee payment history
  - `components/administration/UserActivityLogModal.tsx` - User activity logs with mobile-responsive design
  - `components/administration/LicenseeSuccessModal.tsx` - Licensee creation success
  - `components/administration/PaymentStatusConfirmModal.tsx` - Payment status change confirmation
- **Profile Picture Components:**
  - `components/ui/image/CircleCropModal.tsx` - Circular image cropping functionality
  - `components/ui/image/ImageUpload.tsx` - Image upload with preview

### State Management
- **Local State:** React `useState` hooks for complex form and UI state
- **Key State Properties:**
  - `allUsers`, `allLicensees` - Data arrays
  - `isLoading`, `isLicenseesLoading` - Loading states
  - `currentPage` - Pagination state
  - `activeSection` - Current section (users/licensees)
  - `searchValue`, `searchMode` - Search and filter states
  - `sortConfig` - Table sorting configuration
  - Modal states for various operations
  - Form states for user and licensee creation/editing
  - Profile picture states (upload, crop, preview)

### Data Flow
1. **Initial Load:** Fetches users and licensees on component mount
2. **Search/Filter:** Filters data based on search terms and criteria
3. **Sorting:** Sorts data based on selected columns
4. **Pagination:** Displays paginated results
5. **CRUD Operations:** Creates, updates, and deletes users/licensees with comprehensive logging
6. **Real-time Updates:** Refreshes data after operations
7. **Profile Picture Management:** Handles upload, cropping, and storage of user profile images

### API Integration

#### User Management Endpoints
- **GET `/api/users`** - Fetches all users with profile data
  - Returns: `{ users: User[] }` with complete user profiles including profile pictures
  - **Logging:** Comprehensive API logging with duration and context
- **POST `/api/users`** - Creates new user
  - Body: `{ username, email, password, roles, profile, isEnabled, resourcePermissions, profilePicture }`
  - Returns: `{ success: true, user: User }`
  - **Logging:** Success/failure logging with user creation details
- **PUT `/api/users`** - Updates existing user
  - Body: `{ _id, ...updateFields }`
  - Returns: `{ success: true, user: User }`
  - **Logging:** Change tracking with before/after values
- **DELETE `/api/users`** - Deletes user
  - Body: `{ _id }`
  - Returns: `{ success: true }`
  - **Logging:** Deletion confirmation with user context

#### Licensee Management Endpoints
- **GET `/api/licensees`** - Fetches all licensees
  - Returns: `{ licensees: Licensee[] }`
  - **Logging:** Access logging with filtering context
- **POST `/api/licensees`** - Creates new licensee
  - Body: Licensee data without system fields
  - Returns: `{ success: true, licensee: Licensee }`
  - **Logging:** Creation logging with licensee details
- **PUT `/api/licensees`** - Updates existing licensee
  - Body: `{ _id, ...updateFields }`
  - Returns: `{ success: true, licensee: Licensee }`
  - **Logging:** Update logging with change tracking
- **DELETE `/api/licensees`** - Deletes licensee
  - Body: `{ _id }`
  - Returns: `{ success: true }`
  - **Logging:** Deletion logging with licensee context

#### Activity Logging Endpoints
- **GET `/api/activity-logs`** - Retrieves activity logs with filtering
  - Query Parameters: `entityType`, `actionType`, `actor`, `startDate`, `endDate`
  - Returns: `{ activityLogs: ActivityLog[] }`
  - **Logging:** Access logging for audit trail queries
- **POST `/api/activity-logs`** - Creates new activity log entry
  - Body: `{ actor, actionType, entityType, entity, changes, timestamp }`
  - Returns: `{ success: true, activityLog: ActivityLog }`
  - **Logging:** Creation logging for audit trail entries

#### Data Processing
- **Administration Helper:** `lib/helpers/administration.ts` - User management utilities
  - `fetchUsers()` - Fetches user data from API
  - `updateUser()` - Updates user via API
  - `createUser()` - Creates new user
  - `filterAndSortUsers()` - Filters and sorts user data
- **Licensees Helper:** `lib/helpers/licensees.ts` - Licensee management utilities
  - `fetchLicensees()` - Fetches licensee data
  - `createLicensee()` - Creates new licensee
  - `updateLicensee()` - Updates existing licensee
  - `deleteLicensee()` - Deletes licensee
- **API Logging Utility:** `app/api/lib/utils/logger.ts` - Comprehensive API logging
  - `APILogger` class for structured logging
  - `withLogging` decorator for endpoint wrapping
  - Context creation with user identification and request details

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useMemo` - State management and side effects
- **Next.js:** `usePathname`, `Image` - Navigation and image optimization
- **Axios:** HTTP client for API calls
- **Sonner:** Toast notifications for user feedback
- **Lucide React:** Various icons for UI elements
- **React Image Crop:** Image cropping functionality for profile pictures

#### Type Definitions
- **Administration Types:** `lib/types/administration.ts` - User management types
  - `User`, `SortKey`, `ResourcePermissions`, `UserDetailsModalProps`
- **Licensee Types:** `lib/types/licensee.ts` - Licensee management types
  - `Licensee` - Complete licensee data structure
- **Page Types:** `lib/types/pages.ts` - Form and page-specific types
  - `AddUserForm`, `AddLicenseeForm`
- **Shared Types:** `@shared/types` - Core type definitions
- **API Logging Types:** `app/api/lib/utils/logger.ts` - Logging type definitions
  - `LogContext`, `LogResult`

#### Utility Functions
- **Validation Utils:** `lib/utils/validation.ts` - Form validation
  - `validateEmail()` - Email format validation
  - `validatePassword()` - Password strength validation
- **Licensee Utils:** `lib/utils/licensee.ts` - Licensee-specific utilities
  - `getNext30Days()` - Date calculation for license expiry
- **Image Utils:** `lib/utils/image.ts` - Image processing utilities
  - `compressImage()` - Image compression for uploads
  - `validateImageFile()` - Image file validation

### Component Hierarchy
```
AdministrationPage (app/administration/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Section Tabs (Users/Licensees)
├── Users Section
│   ├── SearchFilterBar (components/administration/SearchFilterBar.tsx)
│   ├── UserTable (components/administration/UserTable.tsx) [Desktop]
│   ├── UserCard (components/administration/UserCard.tsx) [Mobile]
│   ├── PaginationControls (components/ui/PaginationControls.tsx)
│   └── User Modals
│       ├── RolesPermissionsModal
│       ├── DeleteUserModal
│       ├── UserDetailsModal (with profile picture management)
│       ├── AddUserDetailsModal (with profile picture upload)
│       └── AddUserRolesModal (with enhanced location selection)
└── Licensees Section
    ├── LicenseeSearchBar (components/administration/LicenseeSearchBar.tsx)
    ├── LicenseeTable (components/administration/LicenseeTable.tsx) [Desktop]
    ├── LicenseeCard (components/administration/LicenseeCard.tsx) [Mobile]
    ├── PaginationControls (components/ui/PaginationControls.tsx)
    └── Licensee Modals
        ├── AddLicenseeModal
        ├── EditLicenseeModal
        ├── DeleteLicenseeModal
        ├── ActivityLogModal
        ├── PaymentHistoryModal
        ├── LicenseeSuccessModal
        └── PaymentStatusConfirmModal
```

### Business Logic
- **User Management:** Complete CRUD operations with role-based permissions
- **Licensee Management:** Licensee lifecycle management with payment tracking
- **Search & Filtering:** Real-time search across multiple fields
- **Sorting:** Multi-column sorting with direction indicators
- **Pagination:** Efficient data display with configurable page sizes
- **Form Validation:** Client and server-side validation for data integrity
- **Activity Logging:** Comprehensive audit trail for all operations
- **Profile Picture Management:** Upload, crop, and storage of user profile images
- **Enhanced Location Selection:** Improved location management with "Select All" functionality

### Security Features
- **Role-Based Access:** Granular permissions for different user types
- **Resource Permissions:** Location and module-specific access controls
- **Input Validation:** Comprehensive validation for all form inputs
- **Audit Trail:** Activity logging for security and compliance
- **Secure API Calls:** Authenticated requests with proper error handling
- **Profile Picture Security:** Secure image upload and storage with validation

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Validation Errors:** Real-time feedback for form validation
- **Network Issues:** Retry logic and fallback error states
- **Loading States:** Skeleton loaders and loading indicators
- **Toast Notifications:** User feedback for all operations
- **Image Upload Errors:** Validation and error handling for profile pictures

### Performance Optimizations
- **Memoization:** `useMemo` for expensive computations (filtering, sorting, pagination)
- **Conditional Rendering:** Separate desktop/mobile layouts
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **Image Optimization:** Next.js Image component with SVG imports
- **API Logging:** Non-blocking logging operations to prevent performance impact
- **Responsive Design:** Optimized layouts for different screen sizes

## Recent Enhancements

### Profile Picture Management (Latest)
- **Circular Image Cropping:** Industry-standard circular profile picture cropping
- **Upload Functionality:** Drag-and-drop and file picker support
- **Image Validation:** File type, size, and format validation
- **Preview System:** Real-time preview of uploaded and cropped images
- **Storage Integration:** Secure storage and retrieval of profile pictures

### Enhanced API Logging (Latest)
- **Structured Logging:** Comprehensive logging for all API endpoints
- **Performance Tracking:** Request duration and timing information
- **Context Capture:** User identification, IP addresses, and request details
- **Audit Trail:** Complete audit trail for compliance and security
- **Error Tracking:** Detailed error logging with context

### Mobile Responsiveness Improvements (Latest)
- **Responsive Text Sizing:** Adaptive font sizes for different screen sizes
- **Mobile Navigation:** Optimized navigation for mobile devices
- **Touch-Friendly Controls:** Improved touch targets and interactions
- **Responsive Layouts:** Flexible layouts that adapt to screen size
- **Performance Optimization:** Optimized rendering for mobile devices

## Notes Section

### How the Administration Page Works (Simple Explanation)

The administration page is like a **control center for managing people and businesses** in your casino system. Here's how it works:

#### **User Management Section**

**👥 What Users Are**
- **Collection**: Queries the `users` collection in the database
- **Fields Used**: `username`, `email`, `roles`, `profile`, `isEnabled`, `profilePicture`
- **Simple Explanation**: These are the people who can log into your casino management system - like managers, collectors, and administrators

**🔍 How User Search Works**
- **Collection**: Filters the `users` collection
- **Fields Used**: Searches by `username` or `email`
- **Simple Explanation**: Like searching through a phone book - you type a name or email and it shows matching users

**📝 Adding New Users**
- **Collection**: Creates new records in the `users` collection
- **Fields Used**: `username`, `email`, `password`, `roles`, `profile`, `profilePicture`
- **Simple Explanation**: Like creating a new employee account - you fill out their details, upload a profile picture, and assign what they're allowed to do

**🔐 User Permissions System**
- **Collection**: Updates `resourcePermissions` field in `users` collection
- **Fields Used**: `roles`, `resourcePermissions`, `allowedLocations`
- **Simple Explanation**: Like giving someone keys to different rooms - you decide which parts of the system they can access

**🖼️ Profile Picture Management**
- **Collection**: Stores profile pictures in the `users` collection
- **Fields Used**: `profilePicture` - URL or base64 encoded image
- **Simple Explanation**: Like adding a photo to an employee ID - users can upload, crop, and manage their profile pictures

#### **Licensee Management Section**

**🏢 What Licensees Are**
- **Collection**: Queries the `licencees` collection
- **Fields Used**: `name`, `country`, `licenseKey`, `isPaid`, `expiryDate`
- **Simple Explanation**: These are the casino businesses that pay to use your system - like different casino locations or companies

**💰 Payment Tracking**
- **Collection**: Updates `isPaid` and `expiryDate` fields in `licencees` collection
- **Fields Used**: `isPaid`, `expiryDate`, `prevExpiryDate`
- **Simple Explanation**: Tracks whether each casino business has paid their monthly fee and when their license expires

**📅 License Management**
- **Collection**: Manages `startDate`, `expiryDate` in `licencees` collection
- **Fields Used**: `startDate`, `expiryDate`, `prevStartDate`, `prevExpiryDate`
- **Simple Explanation**: Like managing subscription dates - tracks when each casino's license starts and ends

#### **Activity Logging System**

**📋 What Gets Logged**
- **Collection**: Creates records in `activityLogs` collection
- **Fields Used**: `actor`, `actionType`, `entityType`, `entity`, `changes`, `timestamp`
- **Simple Explanation**: Like a security camera that records everything - who did what, when, and what changed

**🔍 How Activity Logs Work**
- **Collection**: Queries `activityLogs` collection with filters
- **Fields Used**: Filters by `entityType`, `actionType`, `actor.id`, `timestamp`
- **Simple Explanation**: Like reviewing security footage - you can see who made changes, when, and what they changed

**📊 API Logging**
- **Collection**: Logs all API requests and responses
- **Fields Used**: `timestamp`, `duration`, `method`, `endpoint`, `status`, `user`, `ip`
- **Simple Explanation**: Like a detailed logbook - records every system interaction with timing and context

#### **Database Queries Explained**

**For User Management:**
```javascript
// Queries the users collection
// Filters by: licensee (optional)
// Returns: all users with their profiles, permissions, and profile pictures
```

**For Licensee Management:**
```javascript
// Queries the licencees collection
// Filters by: licensee (optional)
// Returns: all licensees with payment status and expiry dates
```

**For Activity Logs:**
```javascript
// Queries the activityLogs collection
// Filters by: entity type, action type, actor, date range
// Returns: filtered activity records with change details
```

**For API Logging:**
```javascript
// Logs all API requests and responses
// Includes: timing, user context, request details, response status
// Purpose: audit trail, performance monitoring, security tracking
```

#### **Why This Matters for Casino Operations**

**👥 User Management Benefits:**
- **Security**: Control who can access your system
- **Roles**: Give different people different permissions (managers vs. collectors)
- **Audit Trail**: Know who made what changes and when
- **Multi-location**: Manage users across different casino locations
- **Profile Pictures**: Visual identification and professional appearance

**🏢 Licensee Management Benefits:**
- **Revenue Tracking**: Know which casinos have paid their fees
- **License Compliance**: Track when licenses expire
- **Business Relationships**: Manage multiple casino clients
- **Payment History**: See payment patterns and overdue accounts

**📋 Activity Logging Benefits:**
- **Security**: Track all system changes for security
- **Compliance**: Meet regulatory requirements for audit trails
- **Troubleshooting**: See what went wrong and who was involved
- **Accountability**: Hold people responsible for their actions
- **Performance Monitoring**: Track system performance and usage patterns

**📊 API Logging Benefits:**
- **Audit Compliance**: Complete audit trail for regulatory requirements
- **Security Monitoring**: Track suspicious activity and access patterns
- **Performance Optimization**: Identify slow operations and bottlenecks
- **Troubleshooting**: Detailed logs for debugging and issue resolution
- **Operational Transparency**: Full visibility into system operations

The administration page essentially **manages the people and businesses** that use your casino management system, ensuring proper access control, payment tracking, security compliance, and operational transparency through comprehensive logging and audit trails. 