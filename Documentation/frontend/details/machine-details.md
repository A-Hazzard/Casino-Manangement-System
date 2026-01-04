# Machine Details Page

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Cabinet Summary Section](#cabinet-summary-section)
  - [Accounting Section](#accounting-section)
  - [Chart Section](#chart-section)
  - [SMIB Management Section](#smib-management-section)
  - [Collection History Section](#collection-history-section)
  - [Activity Log Section](#activity-log-section)
  - [Issue Detection Section](#issue-detection-section)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Machine Details page provides comprehensive management of individual slot machines/cabinets, including real-time monitoring, financial tracking, collection management, SMIB configuration, and system diagnostics. Each cabinet is a complete gaming terminal with bill validation, collection capabilities, and communication systems.

Key features include:

- Real-time machine status and monitoring
- Financial metrics and calculations
- Collection history and settings
- SMIB communication management
- Bill validator tracking
- Activity logging and event monitoring
- Issue detection and troubleshooting

## File Information

- **File:** `app/cabinets/[slug]/page.tsx`
- **URL Pattern:** `/cabinets/[slug]` where `[slug]` is the machine/cabinet ID
- **Authentication:** Required (ProtectedRoute)
- **Access Level:** All authenticated users (role-based features may vary)
- **Main Component:** `CabinetsDetailsPageContent` (`components/cabinets/CabinetsDetailsPageContent.tsx`)

## Page Sections

### Cabinet Summary Section

**Purpose:** Display basic cabinet information, status, and key metrics.

**Components Used:**

- `CabinetsDetailsSummarySection` (`components/cabinets/details/CabinetsDetailsSummarySection.tsx`)
- Status indicators, location information, basic metrics

**API Endpoints:**

- `GET /api/cabinets/[cabinetId]` - Fetch cabinet data

**Data Flow:**

1. Component fetches cabinet data on mount
2. Displays machine serial number, custom name, location, status
3. Shows key metrics like online status, last seen, etc.

**Key Functions:**

- Cabinet data fetching and display

**Notes:**

- Shows machine identifier, location, and current status
- Includes navigation buttons (back, edit, copy ID)
- Status indicators for online/offline state

---

### Accounting Section

**Purpose:** Display financial metrics and accounting data for the machine.

**Components Used:**

- `CabinetsDetailsAccountingSection` (`components/cabinets/details/CabinetsDetailsAccountingSection.tsx`)
- Financial metrics display, calculations

**API Endpoints:**

- `GET /api/cabinets/[cabinetId]/metrics` - Fetch accounting metrics

**Data Flow:**

1. Fetches financial data including handle, jackpot, points, etc.
2. Calculates win/loss ratios and financial performance
3. Displays formatted currency values

**Key Functions:**

- `formatCurrency` - Currency formatting
- Financial calculations and display

**Notes:**

- Shows handle, jackpot, cancelled credits, points
- Calculates win/loss percentages
- Real-time financial tracking

---

### Chart Section

**Purpose:** Display performance charts and historical data visualization.

**Components Used:**

- `CabinetsDetailsChartSection` (`components/cabinets/details/CabinetsDetailsChartSection.tsx`)
- Chart components, date filters

**API Endpoints:**

- `GET /api/cabinets/[cabinetId]/chart` - Fetch chart data

**Data Flow:**

1. Integrates with dashboard date filters
2. Fetches historical performance data
3. Renders charts showing trends and patterns

**Key Functions:**

- Chart data fetching and rendering
- Date range filtering

**Notes:**

- Shows performance trends over time
- Supports various time periods (Today, Yesterday, Last 7 days, etc.)
- Interactive chart visualization

---

### SMIB Management Section

**Purpose:** Manage SMIB (Slot Machine Interface Board) communication and configuration.

**Components Used:**

- `CabinetsDetailsSMIBManagementSection` (`components/cabinets/details/CabinetsDetailsSMIBManagementSection.tsx`)
- Configuration forms, status displays

**API Endpoints:**

- `GET /api/cabinets/[cabinetId]/smib-config` - Fetch SMIB configuration
- `PUT /api/cabinets/[cabinetId]/smib-config` - Update SMIB configuration
- `POST /api/cabinets/[cabinetId]/smib-config/test` - Test SMIB connection

**Data Flow:**

1. Fetches current SMIB configuration
2. Allows configuration updates
3. Tests connectivity and communication
4. Displays real-time status

**Key Functions:**

- `fetchSmibConfiguration` - Fetch SMIB config
- `saveConfiguration` - Save configuration changes
- Connection testing and validation

**State Management:**

- `smibConfigExpanded` - Section expansion state
- `mqttConfigData` - MQTT configuration data
- `isConnectedToMqtt` - Connection status
- `formData` - Configuration form data
- `isEditMode` - Edit mode toggle

**Notes:**

- Supports MQTT communication configuration
- Real-time connection status monitoring
- Configuration validation and error handling
- Expandable/collapsible section

---

### Collection History Section

**Purpose:** Display collection history and settings for the machine.

**Components Used:**

- Collection history table, collection settings forms

**API Endpoints:**

- `GET /api/collections?machineId=[machineId]` - Fetch collection history
- `GET /api/collection-settings/[machineId]` - Fetch collection settings

**Data Flow:**

1. Fetches historical collection data
2. Displays collection records with dates, amounts, collectors
3. Shows collection settings and configurations

**Key Functions:**

- Collection history retrieval and display
- Settings management

**Notes:**

- Shows past collections with financial data
- Includes collection settings management
- Historical tracking for auditing

---

### Activity Log Section

**Purpose:** Display machine activity logs and event tracking.

**Components Used:**

- Activity log table, event filters

**API Endpoints:**

- `GET /api/cabinets/[cabinetId]/activity` - Fetch activity logs

**Data Flow:**

1. Fetches machine events and activities
2. Filters events by type and date
3. Displays chronological activity log

**Key Functions:**

- Activity log fetching and filtering
- Event type categorization

**Notes:**

- Shows machine events, commands, and activities
- Timestamp-based chronological display
- Event type filtering (errors, status changes, etc.)

---

### Issue Detection Section

**Purpose:** Detect and display potential issues with the machine.

**Components Used:**

- Issue detection components, warning displays

**API Endpoints:**

- `GET /api/cabinets/[cabinetId]/issues` - Check for machine issues

**Data Flow:**

1. Analyzes machine data for potential problems
2. Identifies configuration issues, communication problems
3. Displays warnings and recommendations

**Key Functions:**

- Issue detection algorithms
- Problem identification and reporting

**Notes:**

- Automated issue detection
- Configuration validation
- Communication status monitoring

---

## API Endpoints

### Cabinet Data

- **GET `/api/cabinets/[cabinetId]`**
  - **Purpose:** Fetch detailed cabinet/machine information
  - **Response:** `{ success: true, data: Cabinet }`
  - **Used By:** Main cabinet data loading

### Metrics and Charts

- **GET `/api/cabinets/[cabinetId]/metrics`**
  - **Purpose:** Fetch accounting and performance metrics
  - **Response:** `{ success: true, data: CabinetMetrics }`
  - **Used By:** Accounting section

- **GET `/api/cabinets/[cabinetId]/chart`**
  - **Purpose:** Fetch chart data for visualization
  - **Query Parameters:** `startDate`, `endDate`, `timePeriod`
  - **Response:** `{ success: true, data: ChartData[] }`
  - **Used By:** Chart section

### SMIB Configuration

- **GET `/api/cabinets/[cabinetId]/smib-config`**
  - **Purpose:** Fetch SMIB configuration settings
  - **Response:** `{ success: true, data: SmibConfig }`
  - **Used By:** SMIB management section

- **PUT `/api/cabinets/[cabinetId]/smib-config`**
  - **Purpose:** Update SMIB configuration
  - **Body:** Updated configuration object
  - **Response:** `{ success: true }`
  - **Used By:** SMIB configuration updates

- **POST `/api/cabinets/[cabinetId]/smib-config/test`**
  - **Purpose:** Test SMIB connectivity
  - **Response:** `{ success: true, connected: boolean }`
  - **Used By:** Connection testing

### Collections and History

- **GET `/api/collections?machineId=[machineId]`**
  - **Purpose:** Fetch collection history for machine
  - **Query Parameters:** `page`, `limit`, `startDate`, `endDate`
  - **Response:** `{ success: true, data: Collection[], pagination: PaginationData }`
  - **Used By:** Collection history section

- **GET `/api/collection-settings/[machineId]`**
  - **Purpose:** Fetch collection settings
  - **Response:** `{ success: true, data: CollectionSettings }`
  - **Used By:** Collection settings management

### Activity and Events

- **GET `/api/cabinets/[cabinetId]/activity`**
  - **Purpose:** Fetch machine activity logs
  - **Query Parameters:** `page`, `limit`, `startDate`, `endDate`, `eventType`
  - **Response:** `{ success: true, data: ActivityLog[], pagination: PaginationData }`
  - **Used By:** Activity log section

### Bill Validator

- **GET `/api/bill-validator/[machineId]`**
  - **Purpose:** Fetch bill validator data and denominations
  - **Query Parameters:** `timePeriod`, `startDate`, `endDate`
  - **Response:** `{ success: true, data: BillValidatorData }`
  - **Used By:** Bill validator tracking

### Issues and Diagnostics

- **GET `/api/cabinets/[cabinetId]/issues`**
  - **Purpose:** Check for machine issues and problems
  - **Response:** `{ success: true, data: MachineIssue[] }`
  - **Used By:** Issue detection section

---

## State Management

### Hooks

- **`useCabinetPageData`** (`lib/hooks/cabinets/useCabinetPageData.ts`)
  - Main data fetching and state management hook
  - Coordinates all cabinet data, metrics, charts, SMIB config
  - Provides: `cabinet`, `loading`, `error`, `chartData`, `smibHook`, handlers

### Stores

- **`useDashBoardStore`** (`lib/store/dashboardStore.ts`) - Zustand store
  - `selectedLicencee` - Current licensee filter
  - `setSelectedLicencee` - Licensee selection setter

### State Properties

**From `useCabinetPageData` hook:**

- `cabinet` - Cabinet/machine data object
- `locationName` - Associated location name
- `error` - Error state
- `isOnline` - Machine online status
- `activeTab` - Currently active tab/section
- `refreshing` - Refresh operation state
- `editingSection` - Currently editing section
- `chartData` - Chart visualization data
- `loadingChart` - Chart loading state
- `chartGranularity` - Chart time granularity
- `activeMetricsFilter` - Current date filter
- `canAccessSmibConfig` - Permission for SMIB access
- `canEditMachines` - Permission for machine editing

**SMIB State (from `smibHook`):**

- `smibConfigExpanded` - SMIB section expansion
- `mqttConfigData` - MQTT configuration
- `isConnectedToMqtt` - MQTT connection status
- `formData` - SMIB configuration form data
- `isManuallyFetching` - Manual fetch state
- `isEditMode` - Edit mode toggle
- `editingSection` - Current editing section

---

## Key Functions

### Data Fetching

- **`fetchCabinetData`** (`useCabinetPageData` hook)
  - Fetches complete cabinet information
  - Loads associated location data

- **`fetchCabinetMetrics`** (metrics functions)
  - Fetches financial and performance metrics
  - Calculates accounting data

- **`fetchChartData`** (chart functions)
  - Fetches historical chart data
  - Applies date filtering

### SMIB Management

- **`fetchSmibConfiguration`** (`smibHook`)
  - Fetches current SMIB configuration
  - Loads MQTT settings and connection status

- **`saveConfiguration`** (`smibHook`)
  - Saves SMIB configuration changes
  - Validates configuration before saving

- **`testConnection`** (`smibHook`)
  - Tests SMIB connectivity
  - Returns connection status

### Collection Management

- **`fetchCollectionHistory`** (collection functions)
  - Fetches collection records for the machine
  - Supports pagination and filtering

- **`updateCollectionSettings`** (collection functions)
  - Updates collection configuration
  - Validates settings before saving

### Activity Monitoring

- **`fetchActivityLogs`** (activity functions)
  - Fetches machine activity and events
  - Filters by event type and date range

### Issue Detection

- **`detectMachineIssues`** (issue functions)
  - Analyzes machine data for problems
  - Identifies configuration and communication issues

### Utility Functions

- **`formatCurrency`** (`lib/utils/currency.ts`)
  - Formats currency values for display
  - Handles different currency types

- **`calculateMachineMetrics`** (calculation helpers)
  - Calculates financial metrics and ratios
  - Processes raw machine data

- **`handleRefresh`** (`useCabinetPageData` hook)
  - Refreshes all cabinet data
  - Updates charts and metrics

---

## Additional Notes

### Bill Validator System

The bill validator system supports both legacy (V1) and current (V2) data structures:

- **V1 (Legacy)**: Uses `movement` object with denomination fields in meters collection
- **V2 (Current)**: Uses `acceptedBills` collection with individual bill records
- **Automatic Detection**: System detects data structure version and adapts accordingly

### SMIB Communication

- SMIB (Slot Machine Interface Board) manages communication with gaming machines
- Supports MQTT protocol for real-time data exchange
- Configuration includes network settings, polling intervals, and error handling
- Real-time status monitoring and connection testing

### Collection History

- Tracks all collection events with financial data
- Includes collection time, amounts, collector information
- Supports historical analysis and auditing
- Links to collection reports for detailed financial reconciliation

### Activity Logging

- Comprehensive event logging for machine activities
- Includes status changes, errors, maintenance events
- Timestamp-based chronological tracking
- Event type filtering and search capabilities

### Issue Detection

- Automated analysis of machine data for potential problems
- Configuration validation and communication checks
- Warning system for maintenance and troubleshooting
- Integration with collection report issue detection

### Performance Considerations

- Optimized data loading with selective fetching
- Chart data aggregation for large date ranges
- Real-time updates with connection status monitoring
- Efficient pagination for large datasets

### Security Features

- Role-based access control for SMIB configuration
- Encrypted communication for sensitive data
- Audit trails for configuration changes
- Secure API authentication and authorization
