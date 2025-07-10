# Locations Page

This page provides comprehensive management for casino locations, including viewing, filtering, sorting, and managing location data with machine status tracking.

- **File:** `app/locations/page.tsx`
- **URL Pattern:** `/locations`

## Main Features
- **Location Management:**
  - View all locations with aggregated metrics (money in/out, gross, machine counts).
  - Search locations by name or ID.
  - Sort by various metrics (money in, gross, total machines, online machines).
  - Filter by date range and licensee.
  - Add, edit, and delete locations.
- **Machine Status Tracking:**
  - Real-time online/offline machine counts.
  - Machine status widget with visual indicators.
  - Location-specific machine monitoring.
- **Location Details:**
  - Click to view detailed location information.
  - Navigate to location-specific cabinet views.
  - Location performance metrics.
- **Responsive Design:**
  - Desktop table view with sorting and filtering.
  - Mobile card view with touch-friendly controls.
- **Real-time Data:**
  - Date range filtering for historical data.
  - Live machine status updates.

## Technical Architecture

### Core Components
- **Main Page:** `app/locations/page.tsx` - Entry point with location management interface
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation with licensee selector
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Location Management Components:**
  - `components/ui/locations/LocationTable.tsx` - Desktop table view
  - `components/ui/locations/LocationCard.tsx` - Mobile card view
  - `components/ui/locations/LocationSkeleton.tsx` - Loading skeleton for cards
  - `components/ui/locations/CabinetTableSkeleton.tsx` - Loading skeleton for table
  - `components/ui/locations/NewLocationModal.tsx` - Add new location modal
  - `components/ui/locations/EditLocationModal.tsx` - Edit location modal
  - `components/ui/locations/DeleteLocationModal.tsx` - Delete confirmation modal
- **Status Components:**
  - `components/ui/MachineStatusWidget.tsx` - Machine status display widget
- **Shared Components:**
  - `components/dashboard/DashboardDateFilters.tsx` - Date range selection
  - `components/ui/input.tsx` - Search input field

### State Management
- **Dashboard Store:** `lib/store/dashboardStore.ts` - Shared state for licensee and date filters
- **Location Actions Store:** `lib/store/locationActionsStore.ts` - Modal state management
- **Local State:** React `useState` hooks for complex UI state
- **Key State Properties:**
  - `locationData` - Location data array
  - `loading` - Loading state
  - `searchTerm` - Search filter state
  - `sortOption`, `sortOrder` - Sorting configuration
  - `currentPage` - Pagination state
  - `selectedFilters` - Active filter states
  - Modal states for various operations

### Data Flow
1. **Initial Load:** Fetches location data based on licensee and date filters
2. **Filtering:** Applies search and filter criteria
3. **Sorting:** Sorts data based on selected column and order
4. **Pagination:** Displays paginated results
5. **Real-time Updates:** Refreshes data when filters change
6. **CRUD Operations:** Creates, updates, and deletes locations

### API Integration

#### Location Management Endpoints
- **GET `/api/locations`** - Fetches all locations
  - Parameters: `licencee`, `timePeriod`, `machineTypeFilter`, `startDate`, `endDate`
  - Returns: `AggregatedLocation[]` with location metrics
- **GET `/api/locations/[locationId]`** - Fetches specific location details
  - Parameters: `basicInfo=true` (optional)
  - Returns: Location details with basic information
- **GET `/api/locations/[locationId]/cabinets`** - Fetches cabinets for location
  - Parameters: `timePeriod`
  - Returns: `Cabinet[]` for the location
- **POST `/api/locations`** - Creates new location
  - Body: Location data
  - Returns: Created location data
- **PUT `/api/locations/[locationId]`** - Updates existing location
  - Body: Updated location data
  - Returns: Updated location data
- **DELETE `/api/locations/[locationId]`** - Deletes location
  - Returns: Success status

#### Data Processing
- **Locations Helper:** `lib/helpers/locations.ts` - Core location utilities
  - `fetchLocationsData()` - Fetches aggregated location data
  - `fetchLocationAndCabinets()` - Fetches location with cabinet data
  - `getAllGamingLocations()` - Fetches all gaming locations
  - `fetchLocationDetails()` - Fetches specific location details
  - `fetchCabinets()` - Fetches cabinets for location
  - `fetchAllGamingLocations()` - Fetches formatted location list
  - `fetchLocationDetailsById()` - Fetches location by ID
  - `searchLocations()` - Searches locations with filters
  - `fetchLocationMetricsForMap()` - Fetches location metrics for mapping

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useCallback`, `useMemo` - State management
- **Next.js:** `useRouter`, `usePathname`, `Image` - Navigation and image optimization
- **GSAP:** Animation library for smooth transitions
- **Axios:** HTTP client for API calls
- **Radix UI Icons:** `ChevronLeftIcon`, `ChevronRightIcon`, etc. - UI icons
- **Lucide React:** `Plus` - Additional icons

#### Type Definitions
- **Location Types:** `lib/types/location.ts` - Location-related types
  - `AggregatedLocation`, `LocationData`, `LocationFilter`, `LocationSortOption`
- **Cabinet Types:** `lib/types/cabinets.ts` - Cabinet-related types
  - `Cabinet` - Cabinet data structure
- **API Types:** `lib/types/api.ts` - API-related types
  - `TimePeriod` - Time period definitions
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Number Utils:** `lib/utils/number.ts` - Number formatting
  - `formatCurrency()` - Currency formatting utility
- **Date Utils:** Date manipulation and formatting utilities

### Component Hierarchy
```
LocationsPage (app/locations/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── DashboardDateFilters (components/dashboard/DashboardDateFilters.tsx)
├── MachineStatusWidget (components/ui/MachineStatusWidget.tsx)
├── Search Controls
├── Desktop View
│   ├── LocationTable (components/ui/locations/LocationTable.tsx)
│   └── Pagination Controls
├── Mobile View
│   ├── LocationCard (components/ui/locations/LocationCard.tsx)
│   └── Pagination Controls
└── Modals
    ├── NewLocationModal (components/ui/locations/NewLocationModal.tsx)
    ├── EditLocationModal (components/ui/locations/EditLocationModal.tsx)
    └── DeleteLocationModal (components/ui/locations/DeleteLocationModal.tsx)
```

### Business Logic
- **Location Management:** Complete CRUD operations for casino locations
- **Data Filtering:** Multi-level filtering by search term, date range, and licensee
- **Sorting:** Multi-column sorting with direction indicators
- **Pagination:** Efficient data display with configurable page sizes
- **Machine Status Tracking:** Real-time monitoring of online/offline machines
- **Performance Metrics:** Aggregated financial and operational data

### Animation & UX Features
- **GSAP Animations:** Smooth transitions and loading states
- **Loading States:** Skeleton loaders for both desktop and mobile views
- **Responsive Design:** Separate mobile and desktop layouts
- **Search Animation:** Visual feedback during search operations
- **Sort Animation:** Animated sort icon rotation

### Error Handling
- **API Failures:** Graceful degradation with fallback data
- **Loading States:** Comprehensive loading indicators
- **Empty States:** User-friendly empty state messages
- **Network Issues:** Retry logic and error recovery
- **Data Validation:** Client-side validation for form inputs

### Performance Optimizations
- **Memoization:** `useMemo` for expensive computations (filtering, sorting, pagination)
- **Conditional Rendering:** Separate mobile/desktop components
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **Image Optimization:** Next.js Image component with SVG imports

### Security Features
- **Input Validation:** Comprehensive validation for all form inputs
- **API Authentication:** Secure API calls with proper error handling
- **Data Sanitization:** Safe handling of user input
- **Access Control:** Role-based access to location operations

## Data Flow
- Fetches location data from the backend based on filters, licensee, and date range.
- Uses Zustand stores for shared state (licensee, modals).
- Handles loading, searching, sorting, and pagination states.
- Provides real-time machine status updates.

## UI
- Clean, modern design with Tailwind CSS.
- Responsive layout with separate mobile and desktop experiences.
- Accessible controls and intuitive navigation.
- Visual feedback for all user interactions. 