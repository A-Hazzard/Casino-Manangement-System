# Cabinets Page

This page provides comprehensive management for gaming machines (cabinets), including viewing, filtering, sorting, and managing cabinet data, movement requests, and SMIB firmware.

- **File:** `app/cabinets/page.tsx`
- **URL Pattern:** `/cabinets`

## Main Features
- **Cabinet Management:**
  - View all cabinets with detailed metrics (money in/out, gross, jackpot, etc.).
  - Search cabinets by asset number, SMB ID, location, or serial number.
  - Sort by various metrics (money in, gross, asset number, game, last online).
  - Filter by location and date range.
  - Add, edit, and delete cabinets.
- **Movement Requests:**
  - View and manage cabinet movement requests between locations.
  - Create new movement requests.
- **SMIB Firmware:**
  - View and manage SMIB firmware versions.
  - Upload SMIB data and firmware updates.
- **Responsive Design:**
  - Desktop table view with sorting and filtering.
  - Mobile card view with touch-friendly controls.
- **Real-time Data:**
  - Refresh cabinet data with loading states.
  - Date range filtering for historical data.

## Technical Architecture

### Core Components
- **Main Page:** `app/cabinets/page.tsx` - Entry point with sectioned interface
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation with licensee selector
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Cabinet Management Components:**
  - `components/ui/cabinets/CabinetTable.tsx` - Desktop table view
  - `components/ui/cabinets/CabinetCard.tsx` - Mobile card view
  - `components/ui/cabinets/CabinetTableSkeleton.tsx` - Desktop loading skeleton
  - `components/ui/cabinets/CabinetCardSkeleton.tsx` - Mobile loading skeleton
  - `components/ui/cabinets/NewCabinetModal.tsx` - Add new cabinet modal
  - `components/ui/cabinets/EditCabinetModal.tsx` - Edit cabinet modal
  - `components/ui/cabinets/DeleteCabinetModal.tsx` - Delete confirmation modal
- **Movement Management Components:**
  - `components/cabinets/MovementRequests.tsx` - Movement requests section
  - `components/ui/movements/NewMovementRequestModal.tsx` - New movement request modal
- **SMIB Management Components:**
  - `components/cabinets/SMIBManagement.tsx` - SMIB management section
  - `components/ui/firmware/SMIBFirmwareSection.tsx` - SMIB firmware section
  - `components/ui/firmware/UploadSmibDataModal.tsx` - SMIB data upload modal
- **Shared Components:**
  - `components/dashboard/DashboardDateFilters.tsx` - Date range selection
  - `components/ui/RefreshButton.tsx` - Data refresh button
  - `components/ui/input.tsx` - Search input field

### State Management
- **Dashboard Store:** `lib/store/dashboardStore.ts` - Shared state for licensee and date filters
- **Cabinet Actions Store:** `lib/store/cabinetActionsStore.ts` - Modal state management
- **New Cabinet Store:** `lib/store/newCabinetStore.ts` - New cabinet form state
- **Local State:** React `useState` hooks for complex UI state
- **Key State Properties:**
  - `allCabinets`, `filteredCabinets` - Cabinet data arrays
  - `loading`, `initialLoading`, `refreshing` - Loading states
  - `searchTerm`, `selectedLocation` - Filter states
  - `sortOption`, `sortOrder` - Sorting configuration
  - `currentPage` - Pagination state
  - `activeSection` - Current section (cabinets/smib/movement/firmware)
  - Modal states for various operations

### Data Flow
1. **Initial Load:** Fetches cabinet locations and cabinet data
2. **Filtering:** Applies search, location, and date filters
3. **Sorting:** Sorts data based on selected column and order
4. **Pagination:** Displays paginated results
5. **Real-time Updates:** Refreshes data when filters change
6. **CRUD Operations:** Creates, updates, and deletes cabinets

### API Integration

#### Cabinet Management Endpoints
- **GET `/api/machines/aggregation`** - Fetches cabinet aggregation data
  - Parameters: `licensee`, `timePeriod`, `startDate`, `endDate`
  - Returns: `Cabinet[]` with aggregated metrics
- **GET `/api/machines`** - Fetches specific cabinet details
  - Parameters: `id` (cabinet ID)
  - Returns: `CabinetDetails` with complete cabinet information
- **POST `/api/machines`** - Creates new cabinet
  - Body: `NewCabinetFormData` or `CabinetFormData`
  - Returns: Created cabinet data
- **POST `/api/locations/[locationId]/cabinets`** - Creates cabinet at specific location
  - Body: Cabinet data
  - Returns: Created cabinet data
- **PUT `/api/machines`** - Updates existing cabinet
  - Body: `CabinetFormData`
  - Returns: Updated cabinet data
- **DELETE `/api/machines`** - Deletes cabinet
  - Body: `{ id: string }`
  - Returns: Success status

#### Location Management Endpoints
- **GET `/api/locations/cabinets`** - Fetches cabinet locations
  - Parameters: `licensee`
  - Returns: Location data for cabinet filtering

#### Data Processing
- **Cabinets Helper:** `lib/helpers/cabinets.ts` - Core cabinet utilities
  - `fetchCabinets()` - Fetches cabinet aggregation data
  - `fetchCabinetById()` - Fetches specific cabinet details
  - `createCabinet()` - Creates new cabinets
  - `updateCabinet()` - Updates existing cabinets
  - `deleteCabinet()` - Deletes cabinets
  - `fetchCabinetLocations()` - Fetches cabinet locations
  - `fetchCabinetsForLocation()` - Fetches cabinets for specific location
  - `fetchCabinetDetails()` - Fetches detailed cabinet information
  - `updateCabinetMetrics()` - Updates cabinet metrics
  - `fetchCollectionMetersHistory()` - Fetches meter history
  - `fetchMachineEvents()` - Fetches machine events

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useRef`, `useCallback` - State management
- **Next.js:** `usePathname`, `Image` - Navigation and image optimization
- **GSAP:** Animation library for smooth transitions
- **Axios:** HTTP client for API calls
- **Radix UI Icons:** `ArrowDownIcon`, `ChevronLeftIcon`, etc. - UI icons
- **Lucide React:** `Plus` - Additional icons

#### Type Definitions
- **Cabinet Types:** `lib/types/cabinets.ts` - Cabinet-related types
  - `Cabinet`, `CabinetProps`, `CabinetSortOption`, `NewCabinetFormData`, `CabinetFormData`
- **Helper Types:** `lib/helpers/cabinets.ts` - Cabinet helper types
  - `CabinetDetails`, `CabinetMetrics`
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Validation Utils:** `lib/utils/validation.ts` - Form validation
- **Date Utils:** Date manipulation and formatting utilities

### Component Hierarchy
```
CabinetsPage (app/cabinets/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── DashboardDateFilters (components/dashboard/DashboardDateFilters.tsx)
├── Section Navigation (Mobile: Dropdown, Desktop: Buttons)
└── Section Content
    ├── Cabinets Section
    │   ├── Search and Filter Controls
    │   ├── Desktop View
    │   │   ├── CabinetTable (components/ui/cabinets/CabinetTable.tsx)
    │   │   └── Pagination Controls
    │   └── Mobile View
    │       ├── CabinetCard (components/ui/cabinets/CabinetCard.tsx)
    │       └── Pagination Controls
    ├── SMIB Management Section
    │   └── SMIBManagement (components/cabinets/SMIBManagement.tsx)
    ├── Movement Requests Section
    │   └── MovementRequests (components/cabinets/MovementRequests.tsx)
    └── SMIB Firmware Section
        └── SMIBFirmwareSection (components/ui/firmware/SMIBFirmwareSection.tsx)
└── Modals
    ├── NewCabinetModal (components/ui/cabinets/NewCabinetModal.tsx)
    ├── EditCabinetModal (components/ui/cabinets/EditCabinetModal.tsx)
    ├── DeleteCabinetModal (components/ui/cabinets/DeleteCabinetModal.tsx)
    ├── NewMovementRequestModal (components/ui/movements/NewMovementRequestModal.tsx)
    └── UploadSmibDataModal (components/ui/firmware/UploadSmibDataModal.tsx)
```

### Business Logic
- **Cabinet Management:** Complete CRUD operations for gaming machines
- **Data Filtering:** Multi-level filtering by location, search term, and date range
- **Sorting:** Multi-column sorting with direction indicators
- **Pagination:** Efficient data display with configurable page sizes
- **Real-time Updates:** Refresh functionality with loading states
- **Movement Tracking:** Cabinet movement between locations
- **SMIB Management:** Firmware and configuration management

### Animation & UX Features
- **GSAP Animations:** Smooth transitions and loading states
- **Loading States:** Skeleton loaders for both desktop and mobile views
- **Responsive Design:** Separate mobile and desktop layouts
- **Search Animation:** Visual feedback during search operations
- **Refresh Animation:** Loading indicators during data refresh

### Error Handling
- **API Failures:** Graceful degradation with fallback data
- **Loading States:** Comprehensive loading indicators
- **Empty States:** User-friendly empty state messages
- **Network Issues:** Retry logic and error recovery
- **Data Validation:** Client-side validation for form inputs

### Performance Optimizations
- **Memoization:** `useCallback` for expensive operations (filtering, sorting)
- **Conditional Rendering:** Separate mobile/desktop components
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **Image Optimization:** Next.js Image component with SVG imports

### Security Features
- **Input Validation:** Comprehensive validation for all form inputs
- **API Authentication:** Secure API calls with proper error handling
- **Data Sanitization:** Safe handling of user input
- **Access Control:** Role-based access to cabinet operations

## Data Flow
- Fetches cabinet data from the backend based on filters, licensee, and date range.
- Uses Zustand stores for shared state (licensee, modals, new cabinet form).
- Handles loading, searching, sorting, and pagination states.
- Provides real-time data refresh capabilities.

## UI
- Clean, modern design with Tailwind CSS.
- Responsive layout with separate mobile and desktop experiences.
- Accessible controls and intuitive navigation.
- Visual feedback for all user interactions. 