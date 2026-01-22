# Members Page

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Navigation Tabs](#navigation-tabs)
  - [Members List Tab](#members-list-tab)
  - [Members Summary Tab](#members-summary-tab)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Members page provides comprehensive member management for the casino system, including member profiles, session tracking, and analytics. This page serves as the central hub for managing casino members and their gaming activities.

The page features a tabbed interface with two main views:

- **Members List Tab**: Primary member management with search, filtering, sorting, and CRUD operations
- **Members Summary Tab**: Analytics and reporting view with KPI cards, date filtering, and CSV export

## File Information

- **File:** `app/members/page.tsx`
- **URL Pattern:** `/members`
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** All authenticated users
- **Main Component:** `MembersPageContent` (`components/CMS/members/MembersPageContent.tsx`)

## Page Sections

### Navigation Tabs

**Purpose:** Tab navigation between Members List and Summary Report views.

**Components Used:**

- `MembersNavigation` (`components/members/common/MembersNavigation.tsx`) - Tab navigation component
- `Tabs`, `TabsList`, `TabsTrigger` from UI components

**Data Flow:**

- Tabs are configured via `MEMBERS_TABS_CONFIG` constant from `lib/constants/members`
- Active tab state is managed by `useMembersNavigation` hook
- Tab changes trigger content re-rendering with Framer Motion animations

**Key Functions:**

- `useMembersNavigation` (`lib/hooks/navigation`) - Tab navigation state management
- `handleTabClick` - Tab change handler

**Notes:**

- Tab navigation includes refresh button and new member button (if permissions allow)
- Tabs use icons from Lucide React (Users, BarChart3)
- Active tab state persists across component re-renders

---

### Members List Tab

**Purpose:** Primary member management interface with listing, search, filtering, sorting, and CRUD operations.

**Components Used:**

- `MembersListTab` (`components/members/tabs/MembersListTab.tsx`) - Main list tab component
- `MembersMemberTable` (`components/members/tabs/MembersMemberTable.tsx`) - Desktop table view
- `MembersMemberCard` (`components/members/common/MembersMemberCard.tsx`) - Mobile card view
- `MembersMemberTableSkeleton` (`components/members/tabs/MembersMemberTableSkeleton.tsx`) - Loading skeleton
- `MembersMemberSkeleton` (`components/members/common/MembersMemberSkeleton.tsx`) - Loading skeleton for cards
- `PaginationControls` (`components/ui/PaginationControls.tsx`) - Pagination component
- `LocationSingleSelect` (`components/ui/common/LocationSingleSelect.tsx`) - Location filter dropdown
- `MembersEditMemberModal` (`components/members/modals/MembersEditMemberModal.tsx`) - Edit member modal
- `MembersDeleteMemberModal` (`components/members/modals/MembersDeleteMemberModal.tsx`) - Delete member modal
- `MembersNewMemberModal` (`components/members/modals/MembersNewMemberModal.tsx`) - Create member modal

**API Endpoints:**

- `GET /api/members` - Fetch members list with pagination, search, sorting, and filtering
  - Query parameters: `page`, `limit`, `search`, `sortBy`, `sortOrder`, `licencee`, `locationFilter`
- `GET /api/machines/locations?membershipOnly=true` - Fetch membership-enabled locations for filter
- `GET /api/members/summary` - Fetch summary statistics

**Data Flow:**

1. Component mounts and fetches initial member data via `GET /api/members`
2. User can search, filter by location, sort by various columns
3. Search uses debounced input (400ms delay) to reduce API calls
4. Pagination handles page changes
5. Member actions (edit, delete) open respective modals
6. After CRUD operations, data is refreshed automatically

**Key Functions:**

- `fetchMembers` - Fetch members data with current filters/pagination
- `handleSort` - Handle column sorting
- `handleSearch` - Handle search input changes
- `handleLocationFilter` - Handle location filter changes
- `handleMemberClick` - Navigate to member details page
- `handleMemberUpdated` - Refresh data after member update
- `handleMemberCreated` - Refresh data after member creation
- `handleTableAction` - Handle edit/delete actions from table

**State Management:**

- `allMembers` - Complete member list
- `loading` - Loading state
- `searchTerm` - Search input value
- `debouncedSearchTerm` - Debounced search term (400ms)
- `sortOption` - Current sort column
- `sortOrder` - Sort direction ('asc' | 'desc')
- `currentPage` - Current page number
- `locationFilter` - Selected location filter
- `locations` - Available locations for filter
- `summaryStats` - Summary statistics (total members, active members)
- `isNewMemberModalOpen` - New member modal open state
- `useMemberActionsStore` - Zustand store for modal states (edit, delete)
- `canEditMembers` - Permission check (admin/developer only)

**Notes:**

- Supports forced location filtering via `forcedLocationId` prop (used in location details page)
- Member table shows: Location, Full Name, Player ID, Points, Sessions, Total Handle, Total Won, Total Lost, Win/Loss, Last Session, Status
- Win/Loss column color-coded (green for house profit, red for house loss)
- Mobile view uses card layout with key information
- Edit/Delete permissions restricted to admin and developer roles

---

### Members Summary Tab

**Purpose:** Analytics and reporting view with summary statistics, date filtering, location filtering, and CSV export.

**Components Used:**

- `MembersSummaryTab` (`components/members/tabs/MembersSummaryTab.tsx`) - Main summary tab component
- `MembersKPICards` (`components/members/summary/MembersKPICards.tsx`) - KPI summary cards
- `MembersKPICardsSkeleton` (`components/members/summary/MembersKPICardsSkeleton.tsx`) - KPI cards loading skeleton
- `MembersTable` (`components/members/summary/MembersTable.tsx`) - Summary table component
- `MembersTableSkeleton` (`components/members/summary/MembersTableSkeleton.tsx`) - Table loading skeleton
- `DateFilters` (`components/ui/common/DateFilters.tsx`) - Date range filter component
- `LocationSingleSelect` (`components/ui/common/LocationSingleSelect.tsx`) - Location filter
- `PaginationControls` (`components/ui/PaginationControls.tsx`) - Pagination
- `MemberDetailsModal` (`components/members/MemberDetailsModal.tsx`) - Member details view modal

**API Endpoints:**

- `GET /api/members/summary` - Fetch summary data with analytics
  - Query parameters: `licensee`, `page`, `limit`, `search`, `location`, `dateFilter`, `startDate`, `endDate`
- `GET /api/members/demographics` - Fetch demographic data (optional, may return 404)
- `GET /api/members/trends` - Fetch activity trends (optional, may return 404)
- `GET /api/machines/locations?membershipOnly=true` - Fetch membership-enabled locations

**Data Flow:**

1. Component uses `useMembersSummaryData` hook to fetch summary data
2. Summary data includes: members list, statistics, pagination info
3. Optional demographics and trends data fetched in parallel (errors ignored if 404)
4. User can filter by date range using `DashboardDateFilters`
5. User can filter by location
6. User can search members
7. CSV export generates file with current filtered data

**Key Functions:**

- `useMembersSummaryData` (`lib/hooks/members/useMembersSummaryData.ts`) - Summary data fetching hook
- `fetchSummaryData` - Fetch summary data with current filters
- `handleRefresh` - Refresh summary data
- `handleViewMember` - Open member details modal or navigate to member page
- `handlePageChange` - Handle pagination
- `handleExportCSV` - Export filtered data to CSV

**State Management:**

- `searchTerm` - Search input value
- `debouncedSearchTerm` - Debounced search (400ms)
- `locationFilter` - Selected location filter
- `currentPage` - Current page number
- `locations` - Available locations list
- `isLoading` - Loading state (from `useMembersSummaryData`)
- `summaryData` - Summary data object (members, stats, pagination)
- `demographicsData` - Demographic analytics (optional)
- `activityTrends` - Activity trend data (optional)

**Notes:**

- KPI cards show: Total Members, Active Members
- Summary table shows: Full Name, Address, Phone, Last Login, Joined, Location, Win/Loss, Actions
- CSV export includes all visible columns from the summary table
- Date filtering integrated with dashboard date filter component
- Supports forced location filtering via `forcedLocationId` prop

---

## API Endpoints

### Member Management

- **GET `/api/members`**
  - **Purpose:** Fetch paginated member list with search, sorting, and filtering
  - **Query Parameters:**
    - `page` - Page number (default: 1)
    - `limit` - Items per page (default: 10)
    - `search` - Search term (searches name, playerId, username)
    - `sortBy` - Sort column (name, playerId, createdAt, lastSession, locationName, winLoss, lastLogin, etc.)
    - `sortOrder` - Sort direction (asc, desc)
    - `licencee` - Licensee filter
    - `locationFilter` - Location ID filter
    - `winLossFilter` - Win/loss filter (positive, negative, all)
    - `startDate` - Date filter start
    - `endDate` - Date filter end
  - **Response:** `{ success: true, data: { members: Member[], pagination: PaginationData } }`
  - **Used By:** `MembersListTab`

- **GET `/api/members/summary`**
  - **Purpose:** Fetch member summary data with analytics
  - **Query Parameters:**
    - `licensee` - Licensee filter (required)
    - `page` - Page number
    - `limit` - Items per page
    - `search` - Search term
    - `location` - Location ID filter
    - `dateFilter` - Date filter type
    - `startDate` - Date range start
    - `endDate` - Date range end
  - **Response:** `{ success: true, data: { members: Member[], summary: Stats, pagination: PaginationData } }`
  - **Used By:** `MembersSummaryTab`, `useMembersSummaryData` hook

- **GET `/api/members/[id]`**
  - **Purpose:** Fetch individual member details
  - **Response:** `{ success: true, data: Member }`
  - **Used By:** Member details page (`app/members/[id]/page.tsx`)

- **PUT `/api/members/[id]`**
  - **Purpose:** Update member information
  - **Body:** Member update payload
  - **Used By:** `EditMemberModal`, `MemberDetailsModal`

- **POST `/api/members`**
  - **Purpose:** Create new member
  - **Body:** New member data
  - **Used By:** `NewMemberModal`

- **DELETE `/api/members/[id]`**
  - **Purpose:** Delete member
  - **Used By:** `DeleteMemberModal`

- **GET `/api/members/check-unique`**
  - **Purpose:** Check if username/email is unique
  - **Query Parameters:** `field` (username, emailAddress), `value`
  - **Used By:** `NewMemberModal`, `EditMemberModal` (validation)

- **GET `/api/members/count`**
  - **Purpose:** Get member count statistics
  - **Used By:** Summary statistics (if applicable)

### Member Sessions

- **GET `/api/members/[id]/sessions`**
  - **Purpose:** Fetch member sessions with pagination
  - **Query Parameters:** `page`, `limit`, `filter` (session, day, week, month)
  - **Response:** `{ success: true, data: { sessions: MemberSession[], pagination: PaginationData } }`
  - **Used By:** Member details page

- **GET `/api/members/[id]/sessions/[machineId]/events`**
  - **Purpose:** Fetch machine events for a specific session
  - **Query Parameters:** `page`, `limit`, `eventType`, `event`, `game`
  - **Response:** `{ success: true, data: { events: MachineEvent[], pagination: PaginationData, filters: FilterData } }`
  - **Used By:** Machine events page

### Demographics & Trends (Optional Endpoints)

- **GET `/api/members/demographics`**
  - **Purpose:** Fetch demographic analytics
  - **Query Parameters:** `licensee`
  - **Note:** May return 404 if endpoint not implemented
  - **Used By:** `useMembersSummaryData` hook (optional)

- **GET `/api/members/trends`**
  - **Purpose:** Fetch activity trends
  - **Query Parameters:** `licensee`
  - **Note:** May return 404 if endpoint not implemented
  - **Used By:** `useMembersSummaryData` hook (optional)

### Locations

- **GET `/api/machines/locations?membershipOnly=true`**
  - **Purpose:** Fetch membership-enabled locations
  - **Response:** `{ locations: Array<{ _id: string, name: string }> }`
  - **Used By:** `MembersListTab`, `MembersSummaryTab` (location filters)

---

## State Management

### Hooks

- **`useMembersNavigation`** (`lib/hooks/navigation`)
  - Manages active tab state
  - Provides `activeTab` and `handleTabClick` function

- **`useMembersTabContent`** (`lib/hooks/data`)
  - Manages tab content rendering with animations
  - Provides tab animation props

- **`useMembersHandlers`** (`components/members/context/MembersHandlersContext`)
  - Provides refresh and new member handlers
  - Context-based handlers accessible across components

- **`useMembersSummaryData`** (`lib/hooks/members/useMembersSummaryData.ts`)
  - Fetches and manages summary data
  - Handles demographics and trends data (optional)
  - Provides loading state, summary data, demographics, trends, and refresh function

- **`useDashBoardStore`** (`lib/store/dashboardStore.ts`) - Zustand store
  - `selectedLicencee` - Selected licensee for filtering
  - `setSelectedLicencee` - Licensee selection setter

- **`useMemberActionsStore`** (`lib/store/memberActionsStore.ts`) - Zustand store
  - `selectedMember` - Currently selected member
  - `isEditModalOpen` - Edit modal open state
  - `isDeleteModalOpen` - Delete modal open state
  - `openEditModal` - Open edit modal function
  - `openDeleteModal` - Open delete modal function
  - `closeEditModal` - Close edit modal function
  - `closeDeleteModal` - Close delete modal function

- **`useUserStore`** (`lib/store/userStore.ts`) - Zustand store
  - `user` - Current user object
  - Used for permission checks (canEditMembers)

### Context Providers

- **`MembersHandlersProvider`** (`components/members/context/MembersHandlersContext.tsx`)
  - Provides refresh and new member handlers via context
  - Wraps `MembersContent` component

---

## Key Functions

### Data Fetching

- **`fetchMembersData`** (`lib/helpers/membersPageData.ts`)
  - Fetches members with pagination and filtering
  - Handles query parameter construction
  - Returns members and pagination data

- **`fetchMemberById`** (`lib/helpers/membersPageData.ts`)
  - Fetches individual member by ID
  - Returns complete member object

- **`fetchSummaryData`** (`lib/hooks/members/useMembersSummaryData.ts`)
  - Fetches summary data with parallel requests
  - Handles optional endpoints gracefully (404 ignored)
  - Manages loading and error states

### Member Operations

- **`createNewMember`** (`lib/helpers/membersPageData.ts` or modal handler)
  - Creates new member via POST `/api/members`
  - Validates input data
  - Handles success/error responses

- **`updateMember`** (`lib/helpers/membersPageData.ts` or modal handler)
  - Updates member via PUT `/api/members/[id]`
  - Tracks changes for activity logging
  - Validates input data

- **`deleteMember`** (`lib/helpers/membersPageData.ts` or modal handler)
  - Deletes member via DELETE `/api/members/[id]`
  - Confirms deletion before proceeding

### Validation

- **`checkUnique`** (validation functions)
  - Checks username/email uniqueness via `/api/members/check-unique`
  - Used in create/edit member modals

- **`validateMemberForm`** (modal validation)
  - Validates member form inputs
  - Real-time validation feedback

### Utilities

- **`formatMemberData`** (`lib/helpers/membersPageData.ts`)
  - Formats member data for display
  - Handles currency formatting, date formatting

- **`filterAndSortMembers`** (`lib/helpers/membersPageData.ts`)
  - Client-side filtering and sorting (if needed)
  - Used for client-side operations

- **`handleExportCSV`** (`MembersSummaryTab`)
  - Exports filtered member data to CSV
  - Includes all visible columns
  - Generates downloadable file

---

## Additional Notes

### Member Details Page

The members page links to member details pages:

- **`app/members/[id]/page.tsx`** - Individual member profile with sessions
- **`app/members/[id]/[machineId]/events/page.tsx`** - Machine events for a session

These are separate pages but related to the main members page functionality.

### Win/Loss Calculation

- **Positive Win/Loss**: Member lost money (displayed in green - house profit)
- **Negative Win/Loss**: Member won money (displayed in red - house loss)
- Win/Loss is calculated from machine sessions data (totalMoneyIn - totalMoneyOut)

### Permissions

- **View Members**: All authenticated users
- **Edit/Delete Members**: Admin and Developer roles only
- **Create Members**: Admin and Developer roles only (if button enabled)

### Responsive Design

- Desktop: Table view with all columns visible
- Mobile: Card view with essential information
- Horizontal scrolling available for wide tables on smaller screens
