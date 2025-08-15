# Cabinets Page

**Author:** Aaron Hazzard - Senior Software Engineer

This page provides comprehensive cabinet (slot machine) management for the casino system, including real-time monitoring, configuration, and operational controls.

- **File:** `app/cabinets/page.tsx`
- **URL Pattern:** `/cabinets`

## Main Features
- **Cabinet Management:**
  - View, search, sort, add, edit, and delete cabinets.
  - Real-time cabinet status monitoring.
  - Cabinet performance metrics and analytics.
- **SMIB Management:**
  - SMIB (Slot Machine Interface Board) configuration.
  - Communication settings and firmware management.
  - Device status monitoring.
- **Movement Requests:**
  - Create and manage cabinet movement requests.
  - Track cabinet relocations between locations.
  - Approval workflow for movements.
- **Firmware Management:**
  - Upload and manage SMIB firmware.
  - Version control and deployment.
  - Firmware update tracking.
- **Multi-section Interface:**
  - Tabs for different management areas.
  - Responsive desktop and mobile layouts.
- **Sidebar Navigation:**
  - Persistent sidebar for navigation to other modules.

## Technical Architecture

### Core Components
- **Main Page:** `app/cabinets/page.tsx` - Entry point with multi-section management
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation header
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Cabinet Management Components:**
  - `components/ui/cabinets/CabinetTable.tsx` - Desktop cabinet table view
  - `components/ui/cabinets/CabinetCard.tsx` - Mobile cabinet card view
  - `components/ui/cabinets/CabinetSkeletonLoader.tsx` - Loading skeletons
  - `components/ui/cabinets/NewCabinetModal.tsx` - Add cabinet form
  - `components/ui/cabinets/EditCabinetModal.tsx` - Edit cabinet form
  - `components/ui/cabinets/DeleteCabinetModal.tsx` - Cabinet deletion confirmation
- **SMIB Management Components:**
  - `components/cabinets/SMIBManagement.tsx` - SMIB configuration interface
  - `components/ui/firmware/SMIBFirmwareSection.tsx` - Firmware management
  - `components/ui/firmware/UploadSmibDataModal.tsx` - Firmware upload
- **Movement Management Components:**
  - `components/cabinets/MovementRequests.tsx` - Movement request interface
  - `components/ui/movements/NewMovementRequestModal.tsx` - New movement form
- **Utility Components:**
  - `components/ui/RefreshButton.tsx` - Data refresh functionality
  - `components/dashboard/DashboardDateFilters.tsx` - Date filtering

### State Management
- **Global Store:** `lib/store/dashboardStore.ts` - Licensee and filter state
- **Cabinet Actions Store:** `lib/store/cabinetActionsStore.ts` - Cabinet CRUD operations
- **New Cabinet Store:** `lib/store/newCabinetStore.ts` - Cabinet creation state
- **Local State:** React `useState` hooks for UI state
- **Key State Properties:**
  - `allCabinets`, `filteredCabinets` - Cabinet data arrays
  - `loading`, `refreshing` - Loading states
  - `searchTerm`, `sortOrder`, `sortOption` - Search and sort states
  - `selectedLocation`, `locations` - Location filtering
  - `activeSection` - Current section (cabinets/smib/movement/firmware)

### Data Flow
1. **Initial Load:** Fetches cabinets and locations on component mount
2. **Search/Filter:** Filters cabinets based on search terms and location
3. **Sorting:** Sorts cabinets based on selected columns and direction
4. **Pagination:** Displays paginated results
5. **CRUD Operations:** Creates, updates, and deletes cabinets
6. **Real-time Updates:** Refreshes data after operations

### API Integration

#### Cabinet Management Endpoints
- **GET `/api/machines/aggregation`** - Fetches aggregated cabinet data
  - Parameters: `licensee`, `timePeriod`, `startDate`, `endDate`
  - Returns: Array of cabinet objects with metrics
- **GET `/api/machines`** - Fetches individual cabinet details
  - Parameters: `id` (cabinet ID)
  - Returns: Detailed cabinet information
- **POST `/api/machines`** - Creates new cabinet
  - Body: Cabinet creation data
  - Returns: `{ success: true, data: Cabinet }`
- **PUT `/api/machines`** - Updates existing cabinet
  - Body: Cabinet update data
  - Returns: `{ success: true, data: Cabinet }`
- **DELETE `/api/machines`** - Deletes cabinet
  - Body: `{ id }`
  - Returns: `{ success: true }`

#### Location Management Endpoints
- **GET `/api/locations`** - Fetches available locations
  - Parameters: `licensee` (optional)
  - Returns: Array of location objects

#### Movement Request Endpoints
- **GET `/api/movement-requests`** - Fetches movement requests
  - Returns: Array of movement request objects
- **POST `/api/movement-requests`** - Creates movement request
  - Body: Movement request data
  - Returns: `{ success: true, data: MovementRequest }`

#### Data Processing
- **Cabinets Helper:** `lib/helpers/cabinets.ts` - Cabinet management utilities
  - `fetchCabinets()` - Fetches cabinet data with filtering
  - `fetchCabinetById()` - Fetches individual cabinet details
  - `createCabinet()` - Creates new cabinet
  - `updateCabinet()` - Updates existing cabinet
  - `deleteCabinet()` - Deletes cabinet
  - `fetchCabinetLocations()` - Fetches available locations
  - `fetchCabinetsForLocation()` - Fetches cabinets for specific location
  - `fetchCabinetDetails()` - Fetches detailed cabinet information
  - `updateCabinetMetrics()` - Updates cabinet metrics
  - `fetchCollectionMetersHistory()` - Fetches collection history
  - `fetchMachineEvents()` - Fetches machine events

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useCallback`, `useMemo` - State management
- **Next.js:** `usePathname`, `Image` - Navigation and image optimization
- **Axios:** HTTP client for API calls with cancel tokens
- **Radix UI Icons:** Various icons for UI elements
- **Lucide React:** `Plus` icon for add functionality
- **Sonner:** Toast notifications for user feedback

#### Type Definitions
- **Cabinet Types:** `lib/types/cabinets.ts` - Cabinet management types
  - `Cabinet`, `CabinetProps`, `CabinetSortOption`, `CabinetDetails`, `CabinetMetrics`
- **Report Types:** `lib/types/reports.ts` - Movement request types
  - `MachineMovementRecord`
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Auth Utils:** `lib/utils/auth.ts` - Authentication utilities
  - `getAuthHeaders()` - Gets authentication headers for API calls
- **Date Utils:** `react-day-picker` - Date range selection
  - `DateRange` - Date range type for filtering

### Component Hierarchy
```
CabinetsPage (app/cabinets/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Section Tabs (Cabinets/SMIB/Movement/Firmware)
├── Cabinets Section
│   ├── Search and Filter Controls
│   ├── CabinetTable (components/ui/cabinets/CabinetTable.tsx) [Desktop]
│   ├── CabinetCard (components/ui/cabinets/CabinetCard.tsx) [Mobile]
│   ├── Pagination Controls
│   └── Cabinet Modals
│       ├── NewCabinetModal
│       ├── EditCabinetModal
│       └── DeleteCabinetModal
├── SMIB Section
│   ├── SMIBManagement (components/cabinets/SMIBManagement.tsx)
│   └── SMIBFirmwareSection (components/ui/firmware/SMIBFirmwareSection.tsx)
├── Movement Section
│   ├── MovementRequests (components/cabinets/MovementRequests.tsx)
│   └── NewMovementRequestModal (components/ui/movements/NewMovementRequestModal.tsx)
└── Firmware Section
    └── UploadSmibDataModal (components/ui/firmware/UploadSmibDataModal.tsx)
```

### Business Logic
- **Cabinet Management:** Complete CRUD operations for slot machines
- **Real-time Monitoring:** Live status tracking of cabinet connectivity
- **Performance Analytics:** Metrics aggregation and analysis
- **Location Management:** Multi-location cabinet organization
- **Movement Tracking:** Cabinet relocation workflow management
- **Firmware Management:** SMIB software version control

### Security Features
- **Authentication:** Secure API calls with authentication headers
- **Authorization:** Role-based access to cabinet operations
- **Audit Trail:** Movement request tracking and approval workflow
- **Input Validation:** Comprehensive validation for all form inputs

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Network Issues:** Cancel token support for request cancellation
- **Loading States:** Skeleton loaders and loading indicators
- **Toast Notifications:** User feedback for all operations

### Performance Optimizations
- **Memoization:** `useMemo` for expensive computations (filtering, sorting)
- **Cancel Tokens:** Prevents race conditions in API calls
- **Conditional Rendering:** Separate desktop/mobile layouts
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance

## Notes Section

### How the Cabinets Page Works (Simple Explanation)

The cabinets page is like a **control room for managing all your slot machines**. Here's how it works:

#### **Cabinet Management Section**

**🎰 What Cabinets Are**
- **Collection**: Queries the `machines` collection in the database
- **Fields Used**: `_id`, `gamingLocation`, `game`, `Custom.name`, `lastActivity`, `assetStatus`
- **Simple Explanation**: These are your slot machines - each cabinet is a physical slot machine that players use

**📊 Cabinet Performance Metrics**
- **Collection**: Aggregates data from `meters` collection
- **Fields Used**: `coinIn`, `coinOut`, `drop`, `totalCancelledCredits`, `gross`
- **Simple Explanation**: Shows how much money each machine is making - like a profit report for each slot machine

**🔍 How Cabinet Search Works**
- **Collection**: Filters the `machines` collection
- **Fields Used**: Searches by `Custom.name`, `game`, `serialNumber`
- **Simple Explanation**: Like finding a specific machine in a large casino - you can search by name, game type, or serial number

**📍 Location Filtering**
- **Collection**: Filters by `gamingLocation` field in `machines` collection
- **Fields Used**: `gamingLocation` (references `gaminglocations._id`)
- **Simple Explanation**: Shows only machines from a specific casino location

#### **SMIB Management Section**

**🔧 What SMIB Is**
- **Collection**: Uses `machines` collection with SMIB configuration
- **Fields Used**: `smibConfig`, `smibVersion`, `smibBoard`
- **Simple Explanation**: SMIB is the "brain" of each slot machine - it controls how the machine communicates and operates

**📡 Communication Settings**
- **Collection**: Updates `smibConfig` field in `machines` collection
- **Fields Used**: `mqtt`, `net`, `coms` configuration objects
- **Simple Explanation**: Like setting up WiFi for your slot machines - controls how they connect to your system

**🔄 Firmware Management**
- **Collection**: Uses `firmware` collection for SMIB software
- **Fields Used**: `product`, `version`, `fileId`, `fileName`
- **Simple Explanation**: Like updating the operating system on your slot machines - keeps them running the latest software

#### **Movement Requests Section**

**🚚 What Movement Requests Are**
- **Collection**: Uses `movementrequests` collection
- **Fields Used**: `locationFrom`, `locationTo`, `machineId`, `status`, `createdBy`
- **Simple Explanation**: Like moving furniture between rooms - these are requests to move slot machines between different casino locations

**✅ Approval Workflow**
- **Collection**: Updates `status` field in `movementrequests` collection
- **Fields Used**: `status`, `approvedBy`, `approvedBySecond`
- **Simple Explanation**: Like getting permission to move expensive equipment - requires approval before machines can be moved

#### **Database Queries Explained**

**For Cabinet List:**
```javascript
// Queries the machines collection
// Filters by: licensee, location, time period
// Aggregates with meters collection for performance data
// Returns: cabinets with financial metrics and status
```

**For Cabinet Details:**
```javascript
// Queries the machines collection by ID
// Joins with meters collection for historical data
// Returns: detailed cabinet information with configuration
```

**For Movement Requests:**
```javascript
// Queries the movementrequests collection
// Filters by: status, location, date range
// Returns: pending and approved movement requests
```

**For SMIB Configuration:**
```javascript
// Queries the machines collection
// Filters by: smibBoard field (SMIB-equipped machines)
// Returns: machines with SMIB configuration data
```

#### **Why This Matters for Casino Operations**

**🎰 Cabinet Management Benefits:**
- **Real-time Monitoring**: Know which machines are working and which need attention
- **Performance Tracking**: See which machines are making the most money
- **Maintenance Planning**: Identify machines that need service or upgrades
- **Financial Analysis**: Track revenue per machine and location

**🔧 SMIB Management Benefits:**
- **Remote Control**: Configure machines without physical access
- **Software Updates**: Keep all machines running the latest software
- **Communication**: Ensure machines can send data to your system
- **Troubleshooting**: Diagnose connection and software issues remotely

**🚚 Movement Management Benefits:**
- **Asset Tracking**: Know where every machine is located
- **Approval Process**: Ensure proper authorization for machine moves
- **Audit Trail**: Track who moved what and when
- **Location Planning**: Optimize machine placement across locations

**📊 Performance Analytics Benefits:**
- **Revenue Optimization**: Identify your best-performing machines
- **Maintenance Scheduling**: Plan service based on machine usage
- **Capacity Planning**: Know when you need more machines
- **Financial Reporting**: Generate reports for management and regulators

The cabinets page essentially **manages your slot machine fleet** like a fleet manager would manage a company's vehicles - tracking location, performance, maintenance, and movements of each machine. 