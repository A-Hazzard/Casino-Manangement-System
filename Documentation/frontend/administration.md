# Administration Page

**Author:** Aaron Hazzard - Senior Software Engineer

This page provides user and licensee management for the casino management system, including roles, permissions, and activity logs.

- **File:** `app/administration/page.tsx`
- **URL Pattern:** `/administration`

## Main Features
- **User Management:**
  - View, search, sort, add, edit, and delete users
  - Assign roles and permissions with granular control
  - Resource-based permissions (location and module access)
  - User profile management with detailed personal information
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
- **Security Features:**
  - Role-based access control (RBAC)
  - Resource permissions for location-specific access
  - Password complexity requirements
  - Account enable/disable functionality
  - Session management and authentication tracking
- **Responsive Interface:**
  - Desktop table views with sorting and filtering
  - Mobile card views for smaller screens
  - Modal-based forms for data entry
  - Real-time search and filtering
  - Pagination with configurable page sizes
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
  - `components/administration/UserDetailsModal.tsx` - User profile details
  - `components/administration/AddUserDetailsModal.tsx` - Add user step 1 (details)
  - `components/administration/AddUserRolesModal.tsx` - Add user step 2 (roles)
  - `components/administration/AddLicenseeModal.tsx` - Add licensee form
  - `components/administration/EditLicenseeModal.tsx` - Edit licensee form
  - `components/administration/DeleteLicenseeModal.tsx` - Licensee deletion confirmation
  - `components/administration/ActivityLogModal.tsx` - System activity logs
  - `components/administration/PaymentHistoryModal.tsx` - Licensee payment history
  - `components/administration/UserActivityLogModal.tsx` - User activity logs
  - `components/administration/LicenseeSuccessModal.tsx` - Licensee creation success
  - `components/administration/PaymentStatusConfirmModal.tsx` - Payment status change confirmation

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

### Data Flow
1. **Initial Load:** Fetches users and licensees on component mount
2. **Search/Filter:** Filters data based on search terms and criteria
3. **Sorting:** Sorts data based on selected columns
4. **Pagination:** Displays paginated results
5. **CRUD Operations:** Creates, updates, and deletes users/licensees
6. **Real-time Updates:** Refreshes data after operations

### API Integration

#### User Management Endpoints
- **GET `/api/users`** - Fetches all users with profile data
  - Returns: `{ users: User[] }` with complete user profiles
- **POST `/api/users`** - Creates new user
  - Body: `{ username, emailAddress, password, roles, profile, isEnabled, resourcePermissions }`
  - Returns: `{ success: true, user: User }`
- **PUT `/api/users`** - Updates existing user
  - Body: `{ _id, ...updateFields }`
  - Returns: `{ success: true, user: User }`
- **DELETE `/api/users`** - Deletes user
  - Body: `{ _id }`
  - Returns: `{ success: true }`

#### Licensee Management Endpoints
- **GET `/api/licensees`** - Fetches all licensees
  - Returns: `{ licensees: Licensee[] }`
- **POST `/api/licensees`** - Creates new licensee
  - Body: Licensee data without system fields
  - Returns: `{ success: true, licensee: Licensee }`
- **PUT `/api/licensees`** - Updates existing licensee
  - Body: `{ _id, ...updateFields }`
  - Returns: `{ success: true, licensee: Licensee }`
- **DELETE `/api/licensees`** - Deletes licensee
  - Body: `{ _id }`
  - Returns: `{ success: true }`

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

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useMemo` - State management and side effects
- **Next.js:** `usePathname`, `Image` - Navigation and image optimization
- **Axios:** HTTP client for API calls
- **Sonner:** Toast notifications for user feedback
- **Lucide React:** Various icons for UI elements

#### Type Definitions
- **Administration Types:** `lib/types/administration.ts` - User management types
  - `User`, `SortKey`, `ResourcePermissions`
- **Licensee Types:** `lib/types/licensee.ts` - Licensee management types
  - `Licensee` - Complete licensee data structure
- **Page Types:** `lib/types/pages.ts` - Form and page-specific types
  - `AddUserForm`, `AddLicenseeForm`
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Validation Utils:** `lib/utils/validation.ts` - Form validation
  - `validateEmail()` - Email format validation
  - `validatePassword()` - Password strength validation
- **Licensee Utils:** `lib/utils/licensee.ts` - Licensee-specific utilities
  - `getNext30Days()` - Date calculation for license expiry

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
│       ├── UserDetailsModal
│       ├── AddUserDetailsModal
│       └── AddUserRolesModal
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

### Security Features
- **Role-Based Access:** Granular permissions for different user types
- **Resource Permissions:** Location and module-specific access controls
- **Input Validation:** Comprehensive validation for all form inputs
- **Audit Trail:** Activity logging for security and compliance
- **Secure API Calls:** Authenticated requests with proper error handling

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Validation Errors:** Real-time feedback for form validation
- **Network Issues:** Retry logic and fallback error states
- **Loading States:** Skeleton loaders and loading indicators
- **Toast Notifications:** User feedback for all operations

### Performance Optimizations
- **Memoization:** `useMemo` for expensive computations (filtering, sorting, pagination)
- **Conditional Rendering:** Separate desktop/mobile layouts
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **Image Optimization:** Next.js Image component with SVG imports

## Notes Section

### How the Administration Page Works (Simple Explanation)

The administration page is like a **control center for managing people and businesses** in your casino system. Here's how it works:

#### **User Management Section**

**👥 What Users Are**
- **Collection**: Queries the `users` collection in the database
- **Fields Used**: `username`, `emailAddress`, `roles`, `profile`, `isEnabled`
- **Simple Explanation**: These are the people who can log into your casino management system - like managers, collectors, and administrators

**🔍 How User Search Works**
- **Collection**: Filters the `users` collection
- **Fields Used**: Searches by `username` or `emailAddress`
- **Simple Explanation**: Like searching through a phone book - you type a name or email and it shows matching users

**📝 Adding New Users**
- **Collection**: Creates new records in the `users` collection
- **Fields Used**: `username`, `emailAddress`, `password`, `roles`, `profile`
- **Simple Explanation**: Like creating a new employee account - you fill out their details and assign what they're allowed to do

**🔐 User Permissions System**
- **Collection**: Updates `resourcePermissions` field in `users` collection
- **Fields Used**: `roles`, `resourcePermissions`, `allowedLocations`
- **Simple Explanation**: Like giving someone keys to different rooms - you decide which parts of the system they can access

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

#### **Database Queries Explained**

**For User Management:**
```javascript
// Queries the users collection
// Filters by: licensee (optional)
// Returns: all users with their profiles and permissions
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

#### **Why This Matters for Casino Operations**

**👥 User Management Benefits:**
- **Security**: Control who can access your system
- **Roles**: Give different people different permissions (managers vs. collectors)
- **Audit Trail**: Know who made what changes and when
- **Multi-location**: Manage users across different casino locations

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

The administration page essentially **manages the people and businesses** that use your casino management system, ensuring proper access control, payment tracking, and security compliance. 