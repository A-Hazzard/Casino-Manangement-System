# Administration Page

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** January 2026
**Version:** 3.1.0

## Table of Contents

1. [Overview](#overview)
2. [File Information](#file-information)
3. [Page Sections](#page-sections)
   - [Navigation Tabs](#navigation-tabs)
   - [Users Section](#users-section)
     - [User Summary Cards](#user-summary-cards)
     - [Search and Filter Bar](#search-and-filter-bar)
     - [User Table/Cards](#user-tablecards)
     - [User Modals](#user-modals)
   - [Licensees Section](#licensees-section)
     - [Licensee Search Bar](#licensee-search-bar)
     - [Licensee Table/Cards](#licensee-tablecards)
     - [Licensee Modals](#licensee-modals)
   - [Countries Section](#countries-section)
     - [Country Search Bar](#country-search-bar)
     - [Country Table/Cards](#country-tablecards)
     - [Country Modals](#country-modals)
   - [Activity Logs Section](#activity-logs-section)
   - [Feedback Section](#feedback-section)
4. [API Endpoints](#api-endpoints)
5. [State Management](#state-management)
6. [Key Functions](#key-functions)

## Overview

The Administration page provides comprehensive user and licensee management functionality, along with activity log viewing and feedback management. It is organized into four main sections accessible via tab navigation.

## File Information

- **Main File:** `app/administration/page.tsx`
- **URL Pattern:** `/administration`
- **Authentication:** Required (ProtectedRoute with `requiredPage="administration"`)
- **Access Level:** Developer, Admin, Manager, Location Admin (role-based section access)
- **Licensee Filtering:** Supported for Users section
- **Licensee Filtering:** Supported for Users section
- **Responsive:** Desktop (table) and Mobile (card) views
- **Global Refresh:** Header refresh button updates the data for the currently active tab.

## Page Sections

### Navigation Tabs

**Purpose:** Allows switching between four main administration sections: Users, Licensees, Activity Logs, and Feedback.

**Components:**

- `components/CMS/administration/AdministrationNavigation.tsx` - Tab navigation component

**Tab Configuration:**

- Defined in `lib/constants/administration.ts` as `ADMINISTRATION_TABS_CONFIG`
- Tabs: Users, Licensees, Activity Logs, Feedback

**Access Control:**

- Role-based access checks using `hasTabAccess` utility
- Users without access see `AccessRestricted` component

**State Management:**

- `activeSection` - Current active section (managed by `useAdministrationNavigation` hook)
- Section switching handled via `handleSectionChange` callback

---

## Users Section

### User Summary Cards

**Purpose:** Displays summary statistics for users by role (Total Users, Collectors, Admins, Location Admins, Managers).

**Components:**

- `components/CMS/administration/AdministrationUserSummaryCards.tsx` - Grid of 5 summary cards

**API Endpoint:**

- `GET /api/users/counts` - Returns user counts grouped by role

**Data Flow:**

1. `useAdministrationUserCounts` hook fetches counts on mount
2. Data filtered by `selectedLicencee` query parameter
3. Excludes users with `deletedAt >= 2025-01-01`
4. Includes disabled users (`isEnabled: false`)
5. Counts displayed in 5 cards: Total, Collectors, Admins, Location Admins, Managers

**Key Functions:**

- `useAdministrationUserCounts` - Hook managing counts fetch and state
- API route: `app/api/users/counts/route.ts`

**Notes:**

- Loading skeleton shown during fetch
- Cards update when `selectedLicencee` changes

---

### Search and Filter Bar

**Purpose:** Allows users to search and filter the user list by role and status.

**Components:**

- `components/CMS/administration/AdministrationSearchFilterBar.tsx` - Search input and filter dropdowns

**Functionality:**

- **Search Input:** Text search across username, email, firstName, lastName
- **Role Filter:** Dropdown to filter by role (All, Developer, Admin, Manager, Location Admin, Technician, Collector)
- **Status Filter:** Dropdown to filter by status (All, Active, Disabled, Deleted)
- **Visibility:** Only displayed when the total number of users exceeds 20.

**State Management:**

- `searchValue` - Current search text
- `selectedRole` - Selected role filter
- `selectedStatus` - Selected status filter
- All managed by `useAdministrationUsers` hook

**Filtering Logic:**

- Client-side filtering applied to user list
- Debounced search input to prevent excessive filtering
- Multiple filters combined with AND logic

---

### User Table/Cards

**Purpose:** Displays the list of users in table format (desktop) or card format (mobile).

**Components:**

- `components/CMS/administration/tables/AdministrationUserTable.tsx` - Desktop table view
- `components/CMS/administration/cards/AdministrationUserCard.tsx` - Mobile card view
  - `components/CMS/administration/skeletons/AdministrationUserTableSkeleton.tsx` - Loading skeleton for table
  - `components/CMS/administration/skeletons/AdministrationUserCardSkeleton.tsx` - Loading skeleton for cards

**API Endpoint:**

- `GET /api/users` - Returns paginated user list

**Query Parameters:**

- `licensee` - Filter by licensee
- `page` - Current page number
- `limit` - Items per page
- `search` - Search query
- `role` - Role filter
- `status` - Status filter
- `sortBy` - Sort column
- `sortOrder` - Sort direction (asc/desc)

**Data Flow:**

1. `useAdministrationUsers` hook fetches users on mount and when filters change
2. Data processed and sorted client-side
3. Current user (viewing the page) automatically excluded from list
4. Pagination handled server-side

**Key Functions:**

- `useAdministrationUsers` - Main hook managing users state and operations
- `fetchUsers` - Function fetching users from API
- `refreshUsers` - Function to manually refresh user list

**Sorting:**

- Clickable column headers in table view
- Supported columns: username, email, roles, assignedLicensees, lastLoginAt
- Sort state managed via `sortConfig` and `requestSort` function

**Pagination:**

- Server-side pagination with configurable page size
- `PaginationControls` component shown when `totalPages > 1`
- Page state managed via `currentPage` and `setCurrentPage`

---

### User Modals

**Purpose:** Provides modals for creating, editing, and deleting users.

**Components:**

- `components/CMS/administration/modals/AdministrationAddUserModal.tsx` - Create new user modal
- `components/CMS/administration/modals/AdministrationUserModal.tsx` - Edit existing user modal
- `components/CMS/administration/modals/AdministrationDeleteUserModal.tsx` - Delete confirmation modal

**Add User Modal Features:**

- Profile picture upload with circular cropping
- Account information (username, email, password, roles)
- Personal information (firstName, lastName, gender, phoneNumber)
- Address and identification details
- Licensee and location permissions assignment
- Form validation with real-time error messages
- Password strength validation

**Edit User Modal Features:**



-   **Comprehensive Profile Management:** Edit personal details (firstName, lastName, gender, phoneNumber), address (street, town, region, country, postalCode), and identification details (dateOfBirth, idType, idNumber, notes).

-   **Profile Picture Management:** Upload, crop, and remove profile pictures using a `CircleCropModal`.

-   **Account Information:**

    *   **Username & Email:** Edit username and email address with asynchronous uniqueness validation (including debounce) and real-time feedback.

    *   **Password Management:** Set a new password with real-time password strength validation, feedback on requirements (length, uppercase, lowercase, number, special character), and confirmation field.

    *   **Account Status Toggle:** For Developer/Admin/Manager roles, toggle `isEnabled` to activate/deactivate the user account.

-   **Roles & Permissions:**

    *   **Dynamic Role Options:** Available roles for assignment are filtered based on the editing user's permissions (e.g., Managers cannot assign Admin or Developer roles).

    *   **Role Assignment:** Assign/unassign multiple roles to the user via checkboxes.

    *   **Role Information Dialog:** View a dialog showing pages accessible to each specific role.

-   **Assigned Licensees:**

    *   Assign multiple licensees to the user using a `MultiSelectDropdown`.

    *   Includes an "All Licensees" toggle for easy assignment.

    *   Role-based restrictions apply (e.g., Managers cannot change licensee assignments, Location Admins' licensees are pre-filled).

-   **Assigned Locations:**

    *   Assign multiple specific locations to the user using a `MultiSelectDropdown`.

    *   Includes an "All Locations for selected licensee(s)" toggle.

    *   Dynamic filtering of available locations based on selected licensees.

    *   If a licensee is deselected, locations belonging only to that licensee are automatically removed from assigned locations.

-   **Change Detection:** Only sends changed fields to the API on save.

-   **Validation:** Client-side validation for all fields, matching backend rules.

-   **Session Version Increment:** Automatically increments `sessionVersion` when roles or assignments change to invalidate old sessions.

**Delete User Modal Features:**

- Confirmation dialog with user details
- Soft delete (sets `deletedAt` timestamp)
- Activity log entry created on deletion

**API Endpoints:**

- `POST /api/users` - Create new user
- `PUT /api/users` - Update existing user
- `DELETE /api/users` - Delete user (soft delete)
- `GET /api/users/:id` - Fetch user details for editing
- `POST /api/activity-logs` - Create activity log entry

**Key Functions:**

- `administrationUtils.userManagement.createNewUser` - Helper for creating users
- `handleEditUser` - Opens edit modal with user data
- `handleSaveUser` - Saves user changes
- `handleDeleteUser` - Opens delete confirmation modal
- `handleDeleteUserConfirm` - Confirms and executes deletion

**Validation:**

- Client-side validation matching backend User model schema
- Real-time validation feedback
- Email and username uniqueness checks
- Password strength requirements

---

## Licensees Section

### Licensee Search Bar

**Purpose:** Allows users to search for licensees by name.

**Components:**

- `components/CMS/administration/AdministrationLicenseeSearchBar.tsx` - Search input component

**Functionality:**

- Text search across licensee name
- Client-side filtering of licensee list
- Real-time search as user types
- **Visibility:** Only displayed when the total number of licensees exceeds 20.

**State Management:**

- `licenseeSearchValue` - Current search text
- Managed by `useAdministrationLicensees` hook

---

### Licensee Table/Cards

**Purpose:** Displays the list of licensees in table format (desktop) or card format (mobile).

**Components:**

- `components/CMS/administration/tables/AdministrationLicenseeTable.tsx` - Desktop table view
- `components/CMS/administration/cards/AdministrationLicenseeCard.tsx` - Mobile card view
- `components/CMS/administration/skeletons/AdministrationLicenseeTableSkeleton.tsx` - Loading skeleton
- `components/CMS/administration/skeletons/AdministrationLicenseeCardSkeleton.tsx` - Loading skeleton

**API Endpoint:**

- `GET /api/licensees` - Returns licensee list

**Data Flow:**

1. `useAdministrationLicensees` hook fetches licensees on mount
2. Data filtered client-side by search value
3. Licensees displayed with payment status, expiry date, country

**Key Functions:**

- `useAdministrationLicensees` - Main hook managing licensees state
- `refreshLicensees` - Function to manually refresh licensee list

**Actions Available:**

- Edit licensee
- Delete licensee
- View payment history
- Toggle payment status

---

### Licensee Modals

**Purpose:** Provides modals for managing licensees.

**Components:**

- `components/CMS/administration/modals/AdministrationAddLicenseeModal.tsx` - Create new licensee modal
- `components/CMS/administration/modals/AdministrationEditLicenseeModal.tsx` - Edit existing licensee modal
- `components/CMS/administration/modals/AdministrationDeleteLicenseeModal.tsx` - Delete confirmation modal
- `components/CMS/administration/modals/AdministrationPaymentHistoryModal.tsx` - View payment history
- `components/CMS/administration/modals/AdministrationLicenseeSuccessModal.tsx` - Success message with license key
- `components/CMS/administration/modals/AdministrationPaymentStatusConfirmModal.tsx` - Confirm payment status change

**Add/Edit Licensee Modal Features:**

- Name, country, currency selection
- License key generation (auto-generated on create)
- Payment status and expiry date
- Form validation

**Payment History Modal:**

- Displays payment history entries
- Payment dates and amounts
- Payment status changes

**API Endpoints:**

- `POST /api/licensees` - Create new licensee
- `PUT /api/licensees` - Update existing licensee
- `DELETE /api/licensees` - Delete licensee
- `GET /api/licensees/:id/payments` - Fetch payment history

**Key Functions:**

- `handleOpenAddLicensee` - Opens add modal
- `handleSaveAddLicensee` - Saves new licensee
- `handleOpenEditLicensee` - Opens edit modal with licensee data
- `handleSaveEditLicensee` - Saves licensee changes
- `handleDeleteLicensee` - Deletes licensee
- `handlePaymentHistory` - Opens payment history modal
- `handleTogglePaymentStatus` - Opens payment status confirmation modal

   - `handleTogglePaymentStatus` - Opens payment status confirmation modal
   - `handleConfirmPaymentStatusChange` - Confirms payment status change

---

## Countries Section

### Country Search Bar

**Purpose:** Allows users to search for countries by name or alpha code.

**Components:**

- `components/CMS/administration/AdministrationCountrySearchBar.tsx` - Search input component

**Functionality:**

- Text search across country name, alpha-2, and alpha-3 codes
- Client-side filtering of country list
- Real-time search as user types

**State Management:**

- `searchValue` - Current search text
- Managed by `useAdministrationCountries` hook

---

### Country Table/Cards

**Purpose:** Displays the list of countries in table format (desktop) or card format (mobile).

**Components:**

- `components/CMS/administration/tables/AdministrationCountryTable.tsx` - Desktop table view
- `components/CMS/administration/cards/AdministrationCountryCard.tsx` - Mobile card view
- `components/CMS/administration/skeletons/AdministrationCountryTableSkeleton.tsx` - Loading skeleton
- `components/CMS/administration/skeletons/AdministrationCountryCardSkeleton.tsx` - Loading skeleton

**API Endpoint:**

- `GET /api/countries` - Returns country list

**Data Flow:**

1. `fetchCountries` (inside `AdministrationCountriesSection`) fetches countries on mount
2. Data filtered client-side by search value
3. Countries displayed with name
4. Alpha-2, Alpha-3, and ISO Numeric codes are used for search but not displayed in the simplified table view

**Actions Available:**

- Edit country
- Delete country

---

### Country Modals

**Purpose:** Provides modals for managing countries.

**Components:**

- `components/CMS/administration/modals/AdministrationAddCountryModal.tsx` - Create new country modal
- `components/CMS/administration/modals/AdministrationEditCountryModal.tsx` - Edit existing country modal
- `components/CMS/administration/modals/AdministrationDeleteCountryModal.tsx` - Delete confirmation modal

**Add/Edit Country Modal Features:**

- Name, Alpha-2, Alpha-3, ISO Numeric code fields
- Form validation
- GSAP animations for smooth user experience

**API Endpoints:**

- `POST /api/countries` - Create new country
- `PUT /api/countries` - Update existing country
- `DELETE /api/countries` - Delete country

**Key Functions:**

- `openAddModal` - Opens add modal
- `openEditModal` - Opens edit modal
- `openDeleteModal` - Opens delete modal
- `fetchCountries` - Refreshes the list after save/delete

---

## Activity Logs Section

**Purpose:** Displays system activity logs for auditing and tracking user actions.

**Components:**

- `components/CMS/administration/tables/AdministrationActivityLogsTable.tsx` - Activity logs table

**API Endpoint:**

- `GET /api/activity-logs` - Returns paginated activity logs

**Features:**

- Filterable by date range, user, action type, resource
- Pagination support
- Detailed log entries with before/after values
- IP address logging
- Filterable by date range, user, action type, resource
- Pagination support
- Detailed log entries with before/after values
- IP address logging
- Timestamp information
- **Search Bar:** Only displayed when the total number of logs exceeds 20.

**Access Control:**

- Role-based access check using `hasTabAccess('administration', 'activity-logs')`
- Shows `AccessRestricted` component if user lacks access

---

## Feedback Section

**Purpose:** Manages user feedback submissions (bugs, suggestions, reviews).

**Components:**

- `components/CMS/administration/AdministrationFeedbackManagement.tsx` - Main feedback management component

**API Endpoint:**

- `GET /api/feedback` - Returns feedback list
- `PUT /api/feedback/:id` - Update feedback status
- `POST /api/feedback/:id/archive` - Archive/unarchive feedback

**Features:**

- Filter by category (bug, suggestion, general-review, etc.)
- Filter by status (pending, reviewed, resolved)
- Search by email
- Archive/unarchive functionality
- Status management
- Archive/unarchive functionality
- Status management
- Notes and review tracking
- **Filters/Search:** Only displayed when the total number of feedback items exceeds 20.

**Access Control:**

- Role-based access check using `hasTabAccess('administration', 'feedback')`
- Shows `AccessRestricted` component if user lacks access

---

## API Endpoints

### Users Endpoints

1. **`GET /api/users`**
   - Returns paginated user list
   - Parameters: `licensee`, `page`, `limit`, `search`, `role`, `status`, `sortBy`, `sortOrder`
   - Used by: `useAdministrationUsers` hook

2. **`GET /api/users/counts`**
   - Returns user counts by role
   - Parameters: `licensee`
   - Used by: `useAdministrationUserCounts` hook

3. **`GET /api/users/:id`**
   - Returns single user details
   - Used by: `handleEditUser` function

4. **`POST /api/users`**
   - Creates new user
   - Body: User creation payload
   - Used by: `AddUserModal` component

5. **`PATCH /api/users/:id`**
   - Updates existing user
   - Body: User update payload (only changed fields)
   - Used by: `UserModal` component

6. **`DELETE /api/users`**
   - Soft deletes user (sets `deletedAt`)
   - Body: `{ _id: string }`
   - Used by: `DeleteUserModal` component

### Licensees Endpoints

1. **`GET /api/licensees`**
   - Returns licensee list
   - Used by: `useAdministrationLicensees` hook

2. **`POST /api/licensees`**
   - Creates new licensee
   - Body: Licensee creation payload
   - Used by: `AddLicenseeModal` component

3. **`PUT /api/licensees`**
   - Updates existing licensee
   - Body: Licensee update payload
   - Used by: `EditLicenseeModal` component

4. **`DELETE /api/licensees`**
   - Deletes licensee
   - Used by: `DeleteLicenseeModal` component

5. **`GET /api/licensees/:id/payments`**
   - Returns payment history for licensee
   - Used by: `PaymentHistoryModal` component

### Activity Logs Endpoint

1. **`GET /api/activity-logs`**
   - Returns paginated activity logs
   - Parameters: `page`, `limit`, `startDate`, `endDate`, `userId`, `action`, `resource`
   - Used by: `ActivityLogsTable` component

2. **`POST /api/activity-logs`**
   - Creates activity log entry
   - Body: Activity log payload
   - Used by: Various operations (user deletion, etc.)

### Feedback Endpoints

1. **`GET /api/feedback`**
   - Returns feedback list
   - Parameters: `category`, `status`, `email`, `archived`, `page`, `limit`
   - Used by: `FeedbackManagement` component

2. **`PUT /api/feedback/:id`**
   - Updates feedback status
   - Body: Update payload
   - Used by: `FeedbackManagement` component

3. **`POST /api/feedback/:id/archive`**
   - Archives or unarchives feedback
   - Used by: `FeedbackManagement` component

### Countries Endpoint

1. **`GET /api/countries`**
   - Returns list of countries
   - Used by: Administration Countries section and Licensee modals

2. **`POST /api/countries`**
   - Creates new country
   - Body: Country creation payload
   - Used by: `AdministrationAddCountryModal`

3. **`PUT /api/countries`**
   - Updates existing country
   - Body: Country update payload
   - Used by: `AdministrationEditCountryModal`

4. **`DELETE /api/countries`**
   - Deletes country (soft delete)
   - Parameters: `id`, `name` (in body)
   - Used by: `AdministrationDeleteCountryModal`

---

## State Management

### Users State

**Hook:** `useAdministrationUsers`

**Key State Properties:**

- `isLoading` - Loading state for user list
- `isSearching` - Search/filter operation in progress
- `processedUsers` - Filtered and sorted user list
- `totalPages` - Total number of pages
- `currentPage` - Current page number
- `searchValue` - Current search text
- `selectedRole` - Selected role filter
- `selectedStatus` - Selected status filter
- `sortConfig` - Sort configuration object
- `isUserModalOpen` - Edit modal open state
- `isDeleteModalOpen` - Delete modal open state
- `isAddUserModalOpen` - Add modal open state
- `selectedUser` - Currently selected user for editing
- `selectedUserToDelete` - User selected for deletion

**Key Functions:**

- `fetchUsers` - Fetches users from API
- `refreshUsers` - Refreshes user list
- `handleEditUser` - Opens edit modal
- `handleDeleteUser` - Opens delete modal
- `handleSaveUser` - Saves user changes
- `handleDeleteUserConfirm` - Confirms and executes deletion
- `openAddUserModal` - Opens add user modal
- `closeAddUserModal` - Closes add user modal
- `requestSort` - Handles column sorting

### Licensees State

**Hook:** `useAdministrationLicensees`

**Key State Properties:**

- `isLicenseesLoading` - Loading state
- `filteredLicensees` - Filtered licensee list
- `licenseeSearchValue` - Current search text
- `isAddLicenseeModalOpen` - Add modal open state
- `isEditLicenseeModalOpen` - Edit modal open state
- `isDeleteLicenseeModalOpen` - Delete modal open state
- `isPaymentHistoryModalOpen` - Payment history modal open state
- `isLicenseeSuccessModalOpen` - Success modal open state
- `isPaymentConfirmModalOpen` - Payment status confirmation modal open state
- `countries` - List of countries for selection
- `isCountriesLoading` - Countries loading state
- `selectedLicensee` - Currently selected licensee
- `licenseeForm` - Form state for add/edit modals
- `selectedLicenseeForPayment` - Licensee selected for payment history
- `selectedLicenseeForPaymentChange` - Licensee selected for payment status change
- `createdLicensee` - Newly created licensee data (for success modal)

**Key Functions:**

- `refreshLicensees` - Refreshes licensee list
- `handleOpenAddLicensee` - Opens add modal
- `handleSaveAddLicensee` - Saves new licensee
- `handleOpenEditLicensee` - Opens edit modal
- `handleSaveEditLicensee` - Saves licensee changes
- `handleOpenDeleteLicensee` - Opens delete modal
- `handleDeleteLicensee` - Deletes licensee
- `handlePaymentHistory` - Opens payment history modal
- `handleTogglePaymentStatus` - Opens payment status confirmation
- `handleConfirmPaymentStatusChange` - Confirms payment status change

### Countries State

**Hook:** `useAdministrationCountries`

**Key State Properties:**

- `isAddModalOpen` - Add modal open state
- `isEditModalOpen` - Edit modal open state
- `isDeleteModalOpen` - Delete modal open state
- `isAddModalOpen` - Add modal open state
- `isEditModalOpen` - Edit modal open state
- `isDeleteModalOpen` - Delete modal open state
- `selectedCountry` - Currently selected country (for edit/delete)
- `countries` - List of all countries
- `isLoading` - Loading state for country list

**Key Functions:**

- `setIsAddModalOpen` - Sets add modal state
- `setIsEditModalOpen` - Sets edit modal state and selected country
- `setIsDeleteModalOpen` - Sets delete modal state and selected country
- `closeAddModal` - Closes add modal
- `closeEditModal` - Closes edit modal
- `closeAddModal` - Closes add modal
- `closeEditModal` - Closes edit modal
- `closeDeleteModal` - Closes delete modal
- `refreshCountries` - Refreshes country list from API

### Navigation State

**Hook:** `useAdministrationNavigation`

**Key State Properties:**

- `activeSection` - Current active section ('users', 'licensees', 'activity-logs', 'feedback')

**Key Functions:**

- `handleSectionChange` - Changes active section

---

## Key Functions

### Helper Functions

**File:** `lib/helpers/administrationPage.ts`

1. **`administrationUtils.userManagement.createNewUser`**
   - Creates new user via API
   - Parameters: `addUserForm`, `onClose`, `onSuccess`
   - Validates form data before submission
   - Handles profile picture upload

2. **`administrationUtils.userManagement.updateUser`**
   - Updates existing user via API
   - Parameters: `userId`, `updates`, `onSuccess`
   - Only sends changed fields to API

3. **`administrationUtils.userManagement.deleteUser`**
   - Soft deletes user via API
   - Creates activity log entry

### Utility Functions

1. **`hasTabAccess`** (`lib/utils/permissions.ts`)
   - Checks if user has access to a specific administration tab
   - Parameters: `userRoles`, `section`, `tab`
   - Returns: boolean

2. **Role-Based Filtering Logic**
   - Managers: Can only view/edit users in their assigned licensees
   - Location Admins: Can only view/edit users in their assigned locations
   - Developers/Admins: Can view/edit all users

---

## Access Control

### Role-Based Access Rules

**Users Section:**

- **Developer/Admin:** Full access to all users
- **Manager:** Access to users in assigned licensees only
- **Location Admin:** Access to users in assigned locations only (cannot edit developers/admins/managers)

**Licensees Section:**

- **Developer/Admin:** Full access
- **Manager:** View-only access to assigned licensees
- **Location Admin:** No access

**Activity Logs Section:**

- Access controlled via `hasTabAccess('administration', 'activity-logs')`
- Typically: Developer/Admin only

**Feedback Section:**

- Access controlled via `hasTabAccess('administration', 'feedback')`
- Typically: Developer/Admin only

### Licensee Filtering

- Users section supports licensee filtering via `selectedLicencee` from dashboard store
- Filter applies to user list and user counts
- Managers automatically filtered to assigned licensees only

---

## Responsive Design

### Desktop View

- Table layouts for Users and Licensees
- Full-width modals
- Side-by-side form layouts

### Mobile View

- Card layouts for Users and Licensees
- Full-screen modals
- Stacked form layouts
- Touch-optimized interactions

---

## Recent Updates

### User Summary Cards (December 2024)

- Added summary cards showing user counts by role
- Filters by selected licensee
- Excludes deleted users (deletedAt >= 2025)
- Includes disabled users

### Add User Modal Enhancements

- Comprehensive form with all user fields
- Profile picture upload with circular cropping
- Licensee and location permissions management
- Real-time validation
- Password strength validation
