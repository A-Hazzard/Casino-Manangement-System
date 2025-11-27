# Cabinets Page

## Table of Contents

- [Overview](#overview)
- [Main Features](#main-features)
- [Technical Architecture](#technical-architecture)
- [Cabinet Management](#cabinet-management)
- [SMIB Management](#smib-management)
- [Movement Requests](#movement-requests)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Security Features](#security-features)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Related Documentation](#related-documentation)

## Overview

The Cabinets page provides comprehensive cabinet (slot machine) management for the casino system, including real-time monitoring, SMIB configuration with live MQTT updates, and operational controls. This page serves as the central hub for managing all gaming cabinets across casino locations.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 27, 2025  
**Version:** 2.4.0

## Recent Critical Fixes & Optimizations (November 11th, 2025)

### Gaming Day Offset Bug - FIXED! ✅

**Problem:** Cabinets page showed $0 for "Today" when viewed before 8 AM Trinidad time.

**The Fix:** Gaming day calculation now checks current hour before determining date range.

**Result:**

- ✅ Shows correct data 24/7 (was $0 before 8 AM)
- ✅ All 2,077 machines display data
- ✅ Top machine: GMID4 ($3,919 gross)

### Performance Optimization - TIMEOUT FIXED! 🚀

**API:** `GET /api/machines/aggregation`

**Problem:**

- ALL filters completely broken (TIMEOUT >60s)
- No data could be retrieved for any time period

**Solution:**

1. Single aggregation for ALL machines (7d/30d periods)
2. Parallel batch processing for Today/Yesterday
3. Index hints to force optimal index usage
4. Field projection before grouping

**Performance:**

- Today: TIMEOUT → 6.70s (FIXED!)
- Yesterday: 59.5s → 6.16s (90% faster!)
- 7 Days: TIMEOUT → 6.89s (FIXED!)
- 30 Days: TIMEOUT → 20.37s (FIXED, but slow)

**Implementation:** `app/api/machines/aggregation/route.ts`

### Recent Updates (October 29th, 2025)

### Filter Improvements

- **Mobile Filter Layout**: All filters are now horizontally scrollable on mobile devices, improving UX on small screens
- **Online/Offline Status Filter**: Fixed status filter logic to correctly filter cabinets by online/offline status (previously showed "No data available")
- **Desktop Filter Layout**: Maintained clean desktop layout without horizontal scrolling
- **Select Component Overflow**: Fixed CustomSelect component to prevent Y-axis overflow with max-height: 240px (max-h-60) constraint
- **Filter Consistency**: Both cabinets page and location details page now use identical filter layouts and logic

### File Information

- **File:** `app/cabinets/page.tsx`
- **URL Pattern:** `/cabinets`
- **Component Type:** Cabinet Management Page
- **Authentication:** Required
- **Access Level:** All authenticated users (with role-based restrictions)
- **Licensee Filtering:** ✅ Supported

## Main Features

- **Cabinet Management:**
  - View, search, sort, add, edit, and delete cabinets.
  - Real-time cabinet status monitoring.
  - Cabinet performance metrics and analytics.
  - **Machine Status Widget**: Displays online/total machine count (e.g., "37/40 Online") with offline count on the Cabinets tab
- **SMIB Management:**
  - **SMIB Device Selection**: Search and select SMIB devices by relay ID, serial number, or location
  - **Network Configuration**: WiFi/network settings (SSID, password, channel)
  - **MQTT Configuration**: MQTT broker settings, topics, and connection parameters
  - **COMS Configuration**: Communication protocol settings (SAS/non-SAS/IGT, polling rates, RTE, GPC)
  - **SMIB Operations**: Restart devices, request meter data, reset meters (non-SAS only)
  - **OTA Updates**: Over-the-air firmware updates with version tracking
  - **Location-wide Operations**: Batch restart all SMIBs at a location
  - **Real-time Status**: Live connection status via MQTT/SSE streams
  - **Offline Support**: Save configurations to database when SMIB is offline
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
- **Licensee Filtering & Currency Conversion:**
  - **Licensee Dropdown**: Filter machines by licensee (role-dependent)
    - **Developer/Admin**: Can view "All Licensees" or specific licensee
    - **Manager**: Only sees assigned licensees
  - **Currency Selector** (Admin/Developer only):
    - Visible ONLY when "All Licensees" is selected
    - Converts financial data from native currencies to selected display currency
    - Hidden when viewing specific licensee (shows native currency)
    - Manager users NEVER see currency selector (always native currency)

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
  - `components/cabinets/SMIBManagementTab.tsx` - Main SMIB management tab component
  - `components/cabinets/smibManagement/NetworkConfigSection.tsx` - Network/WiFi configuration section
  - `components/cabinets/smibManagement/MqttTopicsSection.tsx` - MQTT topics and settings section
  - `components/cabinets/smibManagement/ComsConfigSection.tsx` - Communication protocol configuration section
  - `components/cabinets/smibManagement/RestartSection.tsx` - SMIB restart operations section
  - `components/cabinets/smibManagement/MeterDataSection.tsx` - Meter data request and reset section
  - `components/cabinets/smibManagement/OTAUpdateSection.tsx` - Over-the-air firmware update section
  - `components/ui/firmware/SMIBFirmwareSection.tsx` - Firmware management section (separate tab)
  - `components/ui/firmware/UploadSmibDataModal.tsx` - Firmware upload modal
  - `components/ui/smib/SMIBSearchSelect.tsx` - SMIB device search and selection component
- **Movement Management Components:**
  - `components/cabinets/MovementRequests.tsx` - Movement request component
  - `components/ui/movements/NewMovementRequestModal.tsx` - New movement form
- **Utility Components:**
  - `components/ui/RefreshButton.tsx` - Data refresh functionality
  - `components/dashboard/DashboardDateFilters.tsx` - Date filtering
  - `components/ui/FinancialMetricsCards.tsx` - Financial totals display
  - `components/ui/MachineStatusWidget.tsx` - Machine status indicators
  - `components/ui/NoLicenseeAssigned.tsx` - Message for users without licensees
  - `components/ui/errors/PageErrorBoundary.tsx` - Error boundary wrapper

### State Management

- **Global Store:** `lib/store/dashboardStore.ts` - Zustand store for licensee and filter state
  - **Store Hook:** `useDashBoardStore` (note: capital B in "Board")
  - **Key Properties:** `selectedLicencee`, `activeMetricsFilter`, `customDateRange`
- **Cabinet Actions Store:** `lib/store/cabinetActionsStore.ts` - Cabinet CRUD operations
- **New Cabinet Store:** `lib/store/newCabinetStore.ts` - Cabinet creation state
- **Currency Hook:** `useCurrencyFormat()` - Provides `displayCurrency` for currency conversion
- **Custom Hooks:**
  - `useCabinetData()` - Manages cabinet data fetching, filtering, and pagination with debouncing
  - `useCabinetFilters()` - Manages filter state (search, location, game type, status)
  - `useCabinetSorting()` - Handles sorting and pagination logic
  - `useCabinetModals()` - Manages modal state for movement requests and SMIB data upload
  - `useCabinetNavigation()` - Manages active section state (cabinets/smib/movement/firmware)
- **Local State:** React `useState` hooks for UI state
- **Key State Properties:**
  - `allCabinets`, `filteredCabinets` - Cabinet data arrays
  - `initialLoading`, `loading`, `refreshing` - Loading states
  - `searchTerm`, `sortOrder`, `sortOption` - Search and sort states
  - `selectedLocation`, `locations` - Location filtering
  - `activeSection` - Current section (cabinets/smib/movement/firmware)
  - `loadedBatches` - Tracks which batches have been loaded for pagination

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
  - Parameters: `licencee`, `timePeriod`, `startDate`, `endDate`, `currency`
  - Returns: Array of cabinet objects with metrics
  - Supports batching for performance (50 items per batch)
  - Includes currency conversion for admin/developer viewing "All Licensees"
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

#### Custom Hooks

- **Cabinet Data Hook:** `lib/hooks/data/useCabinetData.ts`
  - Manages cabinet data fetching, filtering, and pagination
  - Handles search debouncing
  - Manages batch loading for pagination
  - Returns: `allCabinets`, `filteredCabinets`, `locations`, `gameTypes`, `financialTotals`, `loading`, `error`, `loadCabinets`

- **Cabinet Filters Hook:** `lib/hooks/data/useCabinetFilters.ts`
  - Manages filter state (search, location, game type, status)
  - Returns: `searchTerm`, `selectedLocation`, `selectedGameType`, `selectedStatus`, and their setters

- **Cabinet Sorting Hook:** `lib/hooks/data/useCabinetSorting.ts`
  - Manages sorting and pagination logic
  - Handles column sorting
  - Returns: `sortOrder`, `sortOption`, `currentPage`, `paginatedCabinets`, `totalPages`, `handleColumnSort`, `setCurrentPage`, `transformCabinet`

- **Cabinet Modals Hook:** `lib/hooks/data/useCabinetModals.ts`
  - Manages modal state for movement requests and SMIB data upload
  - Returns: modal open/close states and handlers

- **Cabinet Navigation Hook:** `lib/hooks/navigation/useCabinetNavigation.ts`
  - Manages active section state (cabinets/smib/movement/firmware)
  - Returns: `activeSection`, `handleSectionChange`

- **SMIB Discovery Hook:** `lib/hooks/data/useSMIBDiscovery.ts`
  - Discovers available SMIB devices via MQTT
  - Returns: `availableSmibs`, `loading`, `error`, `refreshSmibs`

- **SMIB Configuration Hook:** `lib/hooks/data/useSmibConfiguration.ts`
  - Manages SSE connection for live MQTT updates
  - Handles configuration state and form data
  - Provides methods for updating Network, MQTT, and COMS configs
  - Returns: `formData`, `isConnectedToMqtt`, `connectToConfigStream`, `updateNetworkConfig`, `updateMqttConfig`, `updateComsConfig`, etc.

#### SMIB Management API Endpoints

- **SMIB Discovery**: MQTT-based discovery (no direct API endpoint)
- **SMIB Configuration**:
  - `GET /api/mqtt/config?cabinetId=[id]` - Get formatted MQTT configuration
  - `POST /api/mqtt/config/request` - Request live config from SMIB device
  - `POST /api/mqtt/config/publish` - Publish config updates to SMIB
  - `GET /api/mqtt/config/subscribe?relayId=[relayId]` - SSE stream for live updates
  - `POST /api/mqtt/update-machine-config` - Update machine config in database
- **SMIB Operations**:
  - `POST /api/smib/restart` - Restart single SMIB device
  - `POST /api/smib/meters` - Request meter data from SMIB
  - `POST /api/smib/reset-meters` - Reset meters (non-SAS only)
  - `POST /api/smib/ota-update` - Initiate OTA firmware update
- **Location-wide Operations**:
  - `POST /api/locations/[locationId]/smib-restart` - Restart all SMIBs at location
  - `POST /api/locations/[locationId]/smib-meters` - Request meters from all SMIBs
  - `POST /api/locations/[locationId]/smib-ota` - Push firmware to all SMIBs
- **Firmware Management**:
  - `GET /api/firmwares` - List all firmware versions
  - `POST /api/firmwares` - Upload firmware to GridFS
  - `DELETE /api/firmwares/[id]` - Delete firmware
  - `GET /api/firmwares/[filename]` - Serve firmware to SMIB device

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
├── Section Navigation (CabinetsNavigation)
│   └── Tabs: Cabinets | SMIB | Movement | Firmware
├── Cabinets Section (activeSection === 'cabinets')
│   ├── Financial Metrics Cards (FinancialMetricsCards)
│   ├── Machine Status Widget (MachineStatusWidget)
│   ├── Date Filters (DashboardDateFilters)
│   ├── Search and Filter Controls (CabinetSearchFilters)
│   │   ├── Search Input
│   │   ├── Location Filter
│   │   ├── Game Type Filter
│   │   ├── Status Filter (Online/Offline)
│   │   └── Sort Options
│   ├── Cabinet Content Display (CabinetContentDisplay)
│   │   ├── CabinetTable (components/ui/cabinets/CabinetTable.tsx) [Desktop]
│   │   ├── CabinetCard (components/ui/cabinets/CabinetCard.tsx) [Mobile]
│   │   └── Pagination Controls
│   └── Cabinet Modals
│       ├── NewCabinetModal (components/ui/cabinets/NewCabinetModal.tsx)
│       ├── EditCabinetModal (components/ui/cabinets/EditCabinetModal.tsx)
│       └── DeleteCabinetModal (components/ui/cabinets/DeleteCabinetModal.tsx)
├── SMIB Management Section (activeSection === 'smib')
│   └── SMIBManagementTab (components/cabinets/SMIBManagementTab.tsx)
│       ├── SMIB Device Selection Header
│       │   ├── SMIBSearchSelect (search and select SMIB)
│       │   ├── Location Filter
│       │   └── Restart All SMIBs Button (location-specific)
│       ├── Configuration Sections (Grid Layout)
│       │   ├── NetworkConfigSection (Network/WiFi settings)
│       │   ├── ComsConfigSection (Communication protocol settings)
│       │   └── MqttTopicsSection (MQTT broker and topic settings)
│       └── SMIB Operations & Management
│           ├── RestartSection (restart individual SMIB)
│           ├── MeterDataSection (request/reset meter data)
│           └── OTAUpdateSection (firmware updates)
├── Movement Requests Section (activeSection === 'movement')
│   ├── MovementRequests (components/cabinets/MovementRequests.tsx)
│   │   ├── Search and Location Filter
│   │   ├── MovementRequestsTable [Desktop]
│   │   ├── MovementRequestCard [Mobile]
│   │   └── Pagination Controls
│   └── Movement Request Modals
│       ├── NewMovementRequestModal (components/ui/movements/NewMovementRequestModal.tsx)
│       ├── EditMovementRequestModal (components/ui/movements/EditMovementRequestModal.tsx)
│       └── DeleteMovementRequestModal (components/ui/movements/DeleteMovementRequestModal.tsx)
└── Firmware Management Section (activeSection === 'firmware')
    └── SMIBFirmwareSection (components/ui/firmware/SMIBFirmwareSection.tsx)
        ├── Firmware List
        │   ├── SMIBFirmwareTable [Desktop]
        │   └── SMIBFirmwareCard [Mobile]
        └── Firmware Modals
            ├── SMIBFirmwareModal (upload new firmware)
            ├── DeleteFirmwareModal (delete firmware)
            └── DownloadFirmwareModal (download firmware)
```

### Business Logic

- **Cabinet Management:** Complete CRUD operations for slot machines
- **Real-time Monitoring:** Live status tracking of cabinet connectivity
- **Performance Analytics:** Metrics aggregation and analysis
- **Location Management:** Multi-location cabinet organization
- **Movement Tracking:** Cabinet relocation workflow management
- **Firmware Management:** SMIB software version control

### Security Features

- **Authentication:** JWT-based authentication with `sessionVersion` validation
- **Authorization:** Role-based access to cabinet operations
  - **Full Access**: Developer, Admin, Manager
  - **Restricted Access**: Collector, Location Admin, Technician (see only assigned locations)
- **Licensee-Based Filtering:** Users only see cabinets for their assigned licensees/locations
  - **Developer/Admin**: Can view all cabinets or filter by specific licensee
  - **Manager**: Can view all cabinets for assigned licensees, dropdown filters between them
  - **Collector/Location Admin/Technician**: See ONLY cabinets at their assigned locations (no licensee dropdown)
- **Location Permission Validation:**
  - Server validates user has access to cabinet's location before returning data
  - Complete isolation between licensees
  - Machines filtered by intersection of licensee access and location permissions
- **Audit Trail:** Movement request tracking and approval workflow
- **Input Validation:** Comprehensive validation for all form inputs (SMIB board hex validation, serial number format, etc.)
- **Session Invalidation**: Auto-logout when admin changes permissions

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

## Page Sections and Tabs

### Cabinets Tab

**Purpose**: Main cabinet management interface with listing, search, filtering, and CRUD operations.

**Components**:

- `CabinetContentDisplay` - Main content area with table/card views
- `CabinetSearchFilters` - Search and filter controls
- `FinancialMetricsCards` - Financial totals display
- `MachineStatusWidget` - Online/offline machine count
- `DashboardDateFilters` - Date range filtering

**Features**:

- Search cabinets by name, serial number, or game type
- Filter by location, game type, and online/offline status
- Sort by financial metrics, asset number, location, or last online
- Pagination with batch loading (50 items per batch, 10 per page)
- Desktop table view and mobile card view
- Create, edit, and delete cabinets
- Real-time status indicators
- Financial metrics aggregation

**Data Flow**:

1. Initial load fetches first batch of 50 cabinets
2. Search/filter triggers API call with debouncing
3. Pagination loads additional batches as needed
4. CRUD operations refresh data automatically

### SMIB Management Tab

**Purpose**: Comprehensive SMIB device configuration and management interface.

**Components**:

- `SMIBManagementTab` - Main container component
- `SMIBSearchSelect` - SMIB device search and selection
- `NetworkConfigSection` - Network/WiFi configuration
- `MqttTopicsSection` - MQTT broker and topic settings
- `ComsConfigSection` - Communication protocol configuration
- `RestartSection` - SMIB restart operations
- `MeterDataSection` - Meter data requests and resets
- `OTAUpdateSection` - Firmware update management

**Features**:

- Search and select SMIB devices by relay ID, serial number, or location
- Filter SMIBs by location
- Real-time configuration updates via SSE/MQTT
- Network configuration (WiFi SSID, password, channel)
- MQTT configuration (broker, topics, QOS, TLS)
- COMS configuration (protocol mode, polling rate, RTE, GPC)
- SMIB restart with countdown and auto-refresh
- Meter data requests and resets
- OTA firmware updates
- Location-wide batch operations (restart all SMIBs)
- Offline support (saves to database when SMIB offline)

**Data Flow**:

1. SMIB discovery via MQTT (`useSMIBDiscovery` hook)
2. Device selection triggers SSE connection for live updates
3. Configuration changes sent via MQTT when online
4. Database updated regardless of online/offline status
5. Real-time updates received via SSE stream

### Movement Requests Tab

**Purpose**: Manage cabinet movement requests between locations.

**Components**:

- `MovementRequests` - Main movement requests component
- `MovementRequestsTable` - Desktop table view
- `MovementRequestCard` - Mobile card view
- `NewMovementRequestModal` - Create new movement request
- `EditMovementRequestModal` - Edit existing request
- `DeleteMovementRequestModal` - Delete request confirmation

**Features**:

- Search movement requests by creator, locations, cabinet, or status
- Filter by location (from/to)
- View request details (locations, cabinet, status, dates)
- Create new movement requests
- Edit pending requests
- Delete requests
- Approval workflow tracking
- Pagination support

**Data Flow**:

1. Fetch all movement requests on load
2. Filter and search client-side
3. CRUD operations update database
4. Refresh trigger from parent component

### Firmware Management Tab

**Purpose**: Upload, manage, and deploy SMIB firmware versions.

**Components**:

- `SMIBFirmwareSection` - Main firmware management component
- `SMIBFirmwareTable` - Desktop table view
- `SMIBFirmwareCard` - Mobile card view
- `SMIBFirmwareModal` - Upload new firmware
- `DeleteFirmwareModal` - Delete firmware confirmation
- `DownloadFirmwareModal` - Download firmware

**Features**:

- Upload firmware binaries to GridFS
- List all available firmware versions
- View firmware details (product, version, file size, date)
- Delete firmware versions
- Download firmware files
- Desktop table and mobile card views
- Responsive design

**Data Flow**:

1. Fetch firmware list from API
2. Upload stores in GridFS
3. Delete removes from GridFS
4. Download serves from GridFS temporarily

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

**💰 Financial Data Flow (Recent Fix)**

- **Money In**: Shows how much money players put into the machine (`drop`)
- **Money Out (Cancelled Credits)**: Shows how much money was cancelled/refunded (`totalCancelledCredits`)
- **Gross Revenue**: Money In minus Money Out - the actual profit
- **Data Source**: The API calculates these from the `meters` collection and returns them as `moneyIn`, `moneyOut`, and `gross`

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
- **Fields Used**: `smibConfig`, `smibVersion`, `smibBoard`, `relayId`
- **Simple Explanation**: SMIB (Slot Machine Interface Board) is the "brain" of each slot machine - it controls how the machine communicates and operates. It handles network connectivity, MQTT messaging, communication protocols, and firmware updates.

**📡 SMIB Device Selection & Discovery**

- **Component**: `components/cabinets/SMIBManagementTab.tsx`
- **Hook**: `useSMIBDiscovery()` - Discovers available SMIB devices via MQTT
- **Features**:
  - Search SMIBs by relay ID, serial number, or location name
  - Filter SMIBs by location
  - Display online/offline status
  - URL parameter support (`?smib=relayId`) for direct SMIB access
  - Location-wide operations (restart all SMIBs at a location)
- **Data Source**: MQTT discovery service + database machine records

**🌐 Network Configuration Section**

- **Component**: `components/cabinets/smibManagement/NetworkConfigSection.tsx`
- **Fields Managed**:
  - `netStaSSID` - WiFi network name
  - `netStaPwd` - WiFi password
  - `netStaChan` - WiFi channel (1-11)
  - `netMode` - Network mode (0 = Ethernet, 1 = WiFi client)
- **Features**:
  - Edit mode for updating network settings
  - Live updates when SMIB is online (via MQTT)
  - Database fallback when SMIB is offline
  - Last configured timestamp display
- **API**: `POST /api/mqtt/update-machine-config` - Updates network config

**📨 MQTT Topics Configuration Section**

- **Component**: `components/cabinets/smibManagement/MqttTopicsSection.tsx`
- **Fields Managed**:
  - `mqttPubTopic` - Publish topic (e.g., "sas/gy/server")
  - `mqttCfgTopic` - Configuration topic (e.g., "smib/config")
  - `mqttSubTopic` - Subscribe topic prefix (e.g., "sas/relay/")
  - `mqttURI` - Full MQTT broker URI with credentials
  - `mqttHost` - MQTT broker hostname
  - `mqttPort` - MQTT broker port
  - `mqttTLS` - TLS encryption (0 = off, 1 = on)
  - `mqttQOS` - Quality of Service level (0, 1, or 2)
  - `mqttIdleTimeout` - Idle timeout in seconds
  - `mqttUsername` / `mqttPassword` - Broker credentials
- **Features**:
  - Topic configuration management
  - Connection settings (host, port, TLS, QOS)
  - Live updates when SMIB is online
  - Database persistence when offline
- **API**: `POST /api/mqtt/update-machine-config` - Updates MQTT config

**🔌 COMS (Communication) Configuration Section**

- **Component**: `components/cabinets/smibManagement/ComsConfigSection.tsx`
- **Fields Managed**:
  - `comsMode` - Communication mode (0 = SAS, 1 = non-SAS, 2 = IGT)
  - `comsAddr` - Communication address
  - `comsRateMs` - Polling rate in milliseconds
  - `comsRTE` - Real-time events (0 = disabled, 1 = enabled)
  - `comsGPC` - Game protocol configuration
- **Features**:
  - Protocol mode selection
  - Polling rate configuration
  - Real-time event enable/disable
  - Live updates when SMIB is online
  - Database persistence when offline
- **API**: `POST /api/mqtt/update-machine-config` - Updates COMS config

**🔄 SMIB Restart Section**

- **Component**: `components/cabinets/smibManagement/RestartSection.tsx`
- **Features**:
  - Individual SMIB restart with confirmation
  - 15-second countdown before restart
  - Automatic data refresh after restart
  - Online/offline status checking
  - Error handling and user feedback
- **API**: `POST /api/smib/restart` - Sends restart command via MQTT
- **MQTT Command**: `{ "typ": "rst" }`

**📊 Meter Data Section**

- **Component**: `components/cabinets/smibManagement/MeterDataSection.tsx`
- **Features**:
  - Request meter data from SMIB device
  - Reset meters (non-SAS machines only)
  - Online/offline status checking
  - Real-time meter data retrieval
- **API**:
  - `POST /api/smib/meters` - Request meter data
  - `POST /api/smib/reset-meters` - Reset meters (non-SAS only)
- **MQTT Commands**: Meter request and reset commands sent via MQTT

**🚀 OTA (Over-The-Air) Update Section**

- **Component**: `components/cabinets/smibManagement/OTAUpdateSection.tsx`
- **Features**:
  - Select firmware version from available firmwares
  - Initiate OTA update to SMIB device
  - Track firmware update status
  - Display last firmware update timestamp
  - Automatic refresh after update completion
- **API**: `POST /api/smib/ota-update` - Initiates firmware update
- **Process**:
  1. Download firmware from GridFS to `/public/firmwares/`
  2. Configure OTA URL on SMIB
  3. Send update command with firmware filename
  4. SMIB downloads and installs firmware
  5. Auto-cleanup after 30 minutes

**🔄 Firmware Management Tab**

- **Component**: `components/ui/firmware/SMIBFirmwareSection.tsx`
- **Features**:
  - Upload new firmware versions to GridFS
  - List all available firmware versions
  - Delete firmware versions
  - Download firmware files
  - Desktop table view and mobile card view
- **API**:
  - `GET /api/firmwares` - List all firmwares
  - `POST /api/firmwares` - Upload firmware
  - `DELETE /api/firmwares/[id]` - Delete firmware
  - `GET /api/firmwares/[filename]` - Serve firmware to SMIB

**📡 Real-time Configuration Updates**

- **Technology**: Server-Sent Events (SSE) for live MQTT updates
- **Hook**: `useSmibConfiguration()` - Manages SSE connection and config state
- **Features**:
  - Live configuration updates from SMIB device
  - Automatic form synchronization
  - Connection status monitoring
  - Fallback to database values when offline
- **SSE Endpoint**: `GET /api/mqtt/config/subscribe?relayId=[relayId]`
- **Request Endpoint**: `POST /api/mqtt/config/request` - Request live config from SMIB

#### **Movement Requests Section**

**🚚 What Movement Requests Are**

- **Collection**: Uses `movementrequests` collection
- **Fields Used**: `locationFrom`, `locationTo`, `machineId`, `status`, `createdBy`
- **Simple Explanation**: Like moving furniture between rooms - these are requests to move slot machines between different casino locations

**✅ Approval Workflow**

- **Collection**: Updates `status` field in `movementrequests` collection
- **Fields Used**: `status`, `approvedBy`, `approvedBySecond`
- **Simple Explanation**: Like getting permission to move expensive equipment - requires approval before machines can be moved

#### **Database Queries Explained (In Plain English)**

**For Cabinet List:**

```javascript
// What the system does:
// 1. Looks up all slot machines in the database
// 2. Filters them by: which company owns them, which location they're at, what time period you want
// 3. Adds up all the money data from each machine's meter readings
// 4. Returns: a list of machines with their financial performance and current status
```

**For Cabinet Details:**

```javascript
// What the system does:
// 1. Finds a specific machine by its ID number
// 2. Gets all the historical money data for that machine
// 3. Returns: detailed information about that specific machine including its settings and history
```

**For Movement Requests:**

```javascript
// What the system does:
// 1. Looks up all requests to move machines between locations
// 2. Filters by: whether they're approved, which locations are involved, what dates
// 3. Returns: a list of pending and approved machine movement requests
```

**For SMIB Configuration:**

```javascript
// What the system does:
// 1. Finds all machines that have SMIB controllers installed
// 2. Gets their current communication settings and software versions
// 3. Returns: machines with their SMIB configuration data
```

#### **Financial Data Calculation (Recent Fix Explained)**

**The Problem We Fixed:**

- **Before**: The system was looking for a field called `cancelledCredits` that didn't exist in the database
- **After**: The system now correctly uses `moneyOut` which contains the cancelled credits data

**How the Money Data Works:**

1. **Database Storage**: Each time a machine is read, it records:
   - `coinIn`: Money players put in
   - `drop`: Money collected from the machine
   - `totalCancelledCredits`: Money that was cancelled/refunded
2. **API Processing**: The backend adds up all these readings for the time period you select and returns:
   - `moneyIn`: Total money put into the machine
   - `moneyOut`: Total cancelled credits (money refunded)
   - `gross`: Money In minus Money Out (actual profit)

3. **Frontend Display**: The page shows these values in the table and cards, with proper formatting and sorting

**Why This Matters:**

- **Accurate Financial Reporting**: You can see exactly how much each machine is making
- **Profit Analysis**: Gross revenue shows the real profit after refunds
- **Operational Insights**: High cancelled credits might indicate machine problems
- **Compliance**: Accurate financial tracking is required for casino regulations

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

## Financial Calculations Analysis

### Cabinet Financial Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

#### **Cabinet Money In (Drop) ✅**

- **Current Implementation**:
  ```javascript
  moneyIn: {
    $sum: '$movement.drop';
  }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Total physical cash inserted into individual cabinet
- **Aggregation**: Sums across all meter readings for cabinet within date range

#### **Cabinet Money Out (Total Cancelled Credits) ✅**

- **Current Implementation**:
  ```javascript
  moneyOut: {
    $sum: '$movement.totalCancelledCredits';
  }
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Total credits cancelled/paid out from individual cabinet
- **Aggregation**: Sums across all meter readings for cabinet within date range

#### **Cabinet Gross Revenue ✅**

- **Current Implementation**:
  ```javascript
  gross: {
    $subtract: ['$moneyIn', '$moneyOut'];
  }
  // Where: moneyIn = Σ(movement.drop), moneyOut = Σ(movement.totalCancelledCredits)
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: `gross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)` per cabinet

#### **Cabinet Status Calculation ✅**

- **Current Implementation**:
  ```javascript
  // Online status
  lastActivity: {
    $gte: new Date(Date.now() - 3 * 60 * 1000);
  }
  // Asset status
  assetStatus: 'active' | 'maintenance' | 'offline';
  ```
- **Business Logic**:
  - **Online**: `lastActivity >= (currentTime - 3 minutes)`
  - **Status**: Based on `assetStatus` field
- ✅ **CONSISTENT** - Standard cabinet status calculation

#### **Cabinet Collection Meters ❌**

- **Current Implementation**:
  ```javascript
  collectionMeters: {
    metersIn: Number,  // Not clearly defined
    metersOut: Number  // Not clearly defined
  }
  ```
- **Financial Guide**: No specific definition for collection meters
- ❌ **NOT IN GUIDE** - Collection meters calculation not defined in financial metrics guide

#### **Cabinet Performance Ranking ✅**

- **Current Implementation**:
  ```javascript
  // Sort by performance metrics
  {
    $sort: {
      gross: -1;
    }
  } // By gross revenue
  {
    $sort: {
      moneyIn: -1;
    }
  } // By money in (drop)
  {
    $sort: {
      gamesPlayed: -1;
    }
  } // By activity level
  ```
- **Financial Guide**: Uses `drop` and `gross` for ranking ✅ **MATCHES**
- **Business Logic**: Ranks cabinets by financial performance

### Mathematical Formulas Summary

#### **Core Cabinet Metrics**

```
Cabinet Money In = Σ(movement.drop) for individual cabinet
Cabinet Money Out = Σ(movement.totalCancelledCredits) for individual cabinet
Cabinet Gross Revenue = Cabinet Money In - Cabinet Money Out
```

#### **Cabinet Status Calculations**

```
Cabinet Online = lastActivity >= (currentTime - 3 minutes)
Cabinet Active = assetStatus = "active" AND deletedAt IS NULL
Cabinet Performance = gross revenue ranking
```

#### **Cabinet Performance Ranking**

```
Top Cabinets by Revenue = ORDER BY gross DESC
Top Cabinets by Activity = ORDER BY gamesPlayed DESC
Top Cabinets by Drop = ORDER BY moneyIn DESC
```

#### **Collection Meters (Not in Guide)**

```
Collection Meters In = collectionMeters.metersIn   // Definition unclear
Collection Meters Out = collectionMeters.metersOut // Definition unclear
```

#### **Cabinet Search Logic**

```
Cabinet Search = FIND(machines WHERE
  Custom.name CONTAINS searchTerm OR
  game CONTAINS searchTerm OR
  serialNumber CONTAINS searchTerm
) CASE_INSENSITIVE
```

### Data Validation & Error Handling

#### **Input Validation ✅**

- **Cabinet ID**: Validates MongoDB ObjectId format
- **Search Terms**: Sanitizes input to prevent injection attacks
- **Date Ranges**: Validates ISO date format for filtering
- **SMIB Config**: Validates configuration parameters

#### **Data Integrity ✅**

- **Null Handling**: Uses `$ifNull` operators to default missing values to 0
- **Deleted Cabinets**: Filters out soft-deleted cabinets (`deletedAt` exists)
- **Financial Validation**: Prevents negative financial calculations
- **Status Validation**: Validates cabinet status against allowed values

### Required Verification

**The following calculations need to be verified against the financial metrics guide:**

1. **Collection Meters**: Clarify definition and calculation of `collectionMeters.metersIn/metersOut`
2. **Cabinet Aggregation**: Verify cabinet-level aggregation matches standard meter calculations
3. **Performance Metrics**: Confirm cabinet ranking algorithms use appropriate financial metrics

**Note**: Most cabinet calculations align with the financial metrics guide, but collection meters require clarification.

## Related Documentation

- [Cabinet Details](./machine-details.md) - Individual cabinet management and configuration
- [MQTT Integration](./mqtt-integration.md) - Real-time SMIB configuration with SSE
- [Cabinets API](../backend/cabinets-api.md) - Backend cabinet API documentation
- [MQTT Architecture](../backend/mqtt-architecture.md) - MQTT system architecture
- [SMIB Management](./machine-details.md#smib-configuration) - SMIB configuration details
- [Financial Metrics Guide](../financial-metrics-guide.md) - Financial calculations reference
