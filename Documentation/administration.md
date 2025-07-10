# Administration Page

This page provides user and licensee management for the casino management system, including roles, permissions, and activity logs.

- **File:** `app/administration/page.tsx`
- **URL Pattern:** `/administration`

## Main Features
- **User Management:**
  - View, search, sort, add, edit, and delete users.
  - Assign roles and permissions.
  - View and edit user details.
  - Activity logs for user actions.
- **Licensee Management:**
  - View, search, add, edit, and delete licensees.
  - Manage licensee payment status and expiry.
  - View payment history and activity logs.
- **Modals:**
  - Add/Edit/Delete users and licensees.
  - View activity logs and payment history.
- **Pagination:**
  - Paginated views for both users and licensees.
- **Sidebar Navigation:**
  - Persistent sidebar for navigation to other modules.

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
- **Image Optimization:** Next.js Image component with SVG imports
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance

## Data Flow
- Fetches users and licensees from the backend.
- Uses local and global state for managing UI and data.
- Handles loading, error, and success states with feedback.

## UI
- Modern, responsive design with Tailwind CSS.
- Accessible controls and mobile-friendly layouts.
- Animated transitions for modals and data updates. 