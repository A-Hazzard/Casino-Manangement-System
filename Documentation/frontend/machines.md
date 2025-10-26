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
**Last Updated:** October 26th, 2025  
**Version:** 2.1.0

### File Information

- **File:** `app/cabinets/page.tsx`
- **URL Pattern:** `/cabinets`
- **Component Type:** Cabinet Management Page
- **Authentication:** Required

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
  - `components/cabinets/SMIBManagement.tsx` - SMIB configuration component
  - `components/ui/firmware/SMIBFirmwareSection.tsx` - Firmware management
  - `components/ui/firmware/UploadSmibDataModal.tsx` - Firmware upload
- **Movement Management Components:**
  - `components/cabinets/MovementRequests.tsx` - Movement request component
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
