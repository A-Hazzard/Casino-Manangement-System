# Location Cabinets Page

**Author:** Aaron Hazzard - Senior Software Engineer

This page displays all cabinets (slot machines) assigned to a specific casino location with comprehensive filtering, sorting, and management capabilities.

- **File:** `app/locations/[slug]/page.tsx`
- **URL Pattern:** `/locations/[slug]` where `[slug]` is the location ID

## Main Features
- **Location Selection:**
  - Dropdown to switch between different locations without page reload
  - Dynamic location switching with real-time data updates
  - Location name display in header
- **Cabinet Management:**
  - View all cabinets for the selected location
  - Search cabinets by asset number, SMID, serial number, or game type
  - Sort by various metrics (money in, gross, asset number, game, last online)
  - Filter by status (All, Online, Offline)
  - Add new cabinets to the location
- **Real-time Data:**
  - Live cabinet status updates (online/offline)
  - Refresh functionality with loading states
  - Date range filtering for historical data
- **Responsive Design:**
  - Desktop table view with advanced sorting and filtering
  - Mobile card view with touch-friendly controls
  - Separate mobile and desktop pagination controls

## Technical Architecture

### Core Components
- **Main Page:** `app/locations/[slug]/page.tsx` - Entry point with location-specific cabinet management
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation with licensee selector
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Cabinet Display Components:**
  - `components/locationDetails/CabinetGrid.tsx` - Main cabinet grid component
  - `components/ui/locations/CabinetCardsSkeleton.tsx` - Mobile loading skeleton
  - `components/ui/locations/CabinetTableSkeleton.tsx` - Desktop loading skeleton
- **Modal Components:**
  - `components/ui/cabinets/NewCabinetModal.tsx` - Add new cabinet modal
- **Shared Components:**
  - `components/ui/RefreshButton.tsx` - Data refresh button
  - `components/ui/input.tsx` - Search input field

### State Management
- **Dashboard Store:** `lib/store/dashboardStore.ts` - Shared state for licensee and date filters
- **Local State:** React `useState` hooks for complex UI state
- **Key State Properties:**
  - `allCabinets`, `filteredCabinets` - Cabinet data arrays
  - `loading`, `cabinetsLoading`, `refreshing` - Loading states
  - `searchTerm` - Search filter state
  - `sortOption`, `sortOrder` - Sorting configuration
  - `currentPage` - Pagination state
  - `selectedStatus` - Status filter (All/Online/Offline)
  - `locations`, `selectedLocation`, `selectedLocationId` - Location management
  - `isLocationDropdownOpen` - Location dropdown state
  - `error` - Error handling state

### Data Flow
1. **Initial Load:** Fetches locations and cabinet data for the URL location
2. **Location Switching:** Updates cabinet data when location changes
3. **Filtering:** Applies search, status, and sort filters
4. **Pagination:** Displays paginated results
5. **Real-time Updates:** Refreshes data when filters change
6. **Error Handling:** Graceful degradation with user feedback

### API Integration

#### Cabinet Management Endpoints
- **GET `/api/locations/[locationId]/cabinets`** - Fetches cabinets for specific location
  - Parameters: `licensee`, `timePeriod`
  - Returns: `Cabinet[]` with cabinet data for the location
- **GET `/api/locations`** - Fetches all gaming locations
  - Returns: Location list for dropdown selection

#### Data Processing
- **Cabinets Helper:** `lib/helpers/cabinets.ts` - Core cabinet utilities
  - `fetchCabinetsForLocation()` - Fetches cabinets for specific location
- **Locations Helper:** `lib/helpers/locations.ts` - Location management utilities
  - `fetchAllGamingLocations()` - Fetches formatted location list
  - `fetchLocationDetailsById()` - Fetches location details by ID
- **UI Utils:** `lib/utils/ui.ts` - Animation and UI utilities
  - `animateTableRows()` - Table row animations
  - `animateSortDirection()` - Sort direction animations
  - `animateColumnSort()` - Column sort animations
  - `filterAndSortCabinets()` - Cabinet filtering and sorting logic

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useCallback`, `useRef` - State management
- **Next.js:** `useParams`, `useRouter`, `usePathname` - Navigation and routing
- **Framer Motion:** Animation library for smooth transitions
- **GSAP:** Advanced animations for search feedback
- **Radix UI Icons:** `ChevronLeftIcon`, `ChevronRightIcon`, etc. - UI icons
- **Lucide React:** `Search`, `Filter`, `ArrowUpDown` - Additional icons

#### Type Definitions
- **Cabinet Types:** `lib/types/cabinets.ts` - Cabinet-related types
  - `Cabinet`, `CabinetSortOption`
- **Page Types:** `lib/types/pages.ts` - Page-specific types
  - `ExtendedCabinetDetail` - Extended cabinet data structure
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Validation Utils:** `lib/utils/validation.ts` - Form validation
- **Date Utils:** Date manipulation and formatting utilities

### Component Hierarchy
```
LocationPage (app/locations/[slug]/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Back Button and Title
├── Search and Location Controls
│   ├── Search Input
│   └── Location Dropdown
├── Mobile Controls
│   ├── Sort Dropdown
│   ├── Filter Radio Buttons
│   └── Sort/Filter Buttons
├── Loading States
│   ├── CabinetTableSkeleton (Desktop)
│   └── CabinetCardsSkeleton (Mobile)
├── Cabinet Display
│   └── CabinetGrid (components/locationDetails/CabinetGrid.tsx)
├── Pagination Controls
└── NewCabinetModal (components/ui/cabinets/NewCabinetModal.tsx)
```

### Business Logic
- **Location Management:** Dynamic location switching with URL synchronization
- **Cabinet Filtering:** Multi-level filtering by search term, status, and sort criteria
- **Real-time Status:** Live online/offline status tracking
- **Search Functionality:** Real-time search across multiple cabinet fields
- **Sorting:** Multi-column sorting with direction indicators
- **Pagination:** Efficient data display with configurable page sizes
- **Error Recovery:** Graceful error handling with retry mechanisms

### Animation & UX Features
- **GSAP Animations:** Search feedback animations with highlight pulse
- **Framer Motion:** Smooth transitions for location switching and data updates
- **Loading States:** Skeleton loaders for both desktop and mobile views
- **Responsive Design:** Separate mobile and desktop layouts
- **Search Animation:** Visual feedback during search operations
- **Sort Animation:** Animated sort icon rotation and column highlighting

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Loading States:** Comprehensive loading indicators
- **Empty States:** User-friendly empty state messages
- **Network Issues:** Retry logic and error recovery
- **Invalid Locations:** Fallback handling for invalid location IDs

### Performance Optimizations
- **Memoization:** `useCallback` for expensive operations (filtering, sorting)
- **Conditional Rendering:** Separate mobile/desktop components
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **Debounced Search:** Prevents excessive API calls during typing

### Security Features
- **Input Validation:** Comprehensive validation for all form inputs
- **API Authentication:** Secure API calls with proper error handling
- **Data Sanitization:** Safe handling of user input
- **Access Control:** Role-based access to cabinet operations

## Data Flow
- Fetches cabinet data from the backend based on selected location, licensee, and date filters
- Uses Zustand for shared state (licensee, filters)
- Handles loading, searching, sorting, and pagination states
- Provides real-time cabinet status updates and location switching

## UI
- Clean, modern design with Tailwind CSS
- Responsive layout with separate mobile and desktop experiences
- Accessible controls and intuitive navigation
- Visual feedback for all user interactions
- Smooth animations and transitions 