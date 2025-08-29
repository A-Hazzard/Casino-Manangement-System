# Cabinet Details Page

**Author:** Aaron Hazzard - Senior Software Engineer

This page provides comprehensive detailed information and configuration management for a single cabinet (slot machine), including SMIB settings, metrics, and real-time status monitoring.

- **File:** `app/cabinets/[slug]/page.tsx`
- **URL Pattern:** `/cabinets/[slug]` where `[slug]` is the cabinet ID

## Main Features
- **Cabinet Information:**
  - Display cabinet serial number, manufacturer, game type, and location
  - Real-time online/offline status with animated indicators
  - Last activity tracking and connectivity monitoring
- **SMIB Configuration:**
  - Expandable SMIB (Slot Machine Interface Board) configuration section
  - Communication mode settings (SAS, Non-SAS, IGT)
  - Firmware version management and display
  - Network settings and MQTT topic configuration
  - Advanced settings for machine-specific configurations
- **Metrics and Analytics:**
  - Time period filtering (Today, Yesterday, Last 7 days, 30 days, Custom)
  - Multiple metrics tabs: Metrics, Live Metrics, Bill Validator, Activity Log, Collection History
  - Real-time performance data and historical trends
  - Detailed accounting and financial metrics
- **Configuration Management:**
  - Edit cabinet information and settings
  - SMIB firmware updates and rollback capabilities
  - Network configuration and connectivity monitoring
  - Advanced communication protocol settings
- **Responsive Design:**
  - Separate desktop and mobile layouts
  - Touch-friendly controls for mobile devices
  - Adaptive tab navigation for different screen sizes

## Technical Architecture

### Core Components
- **Main Page:** `app/cabinets/[slug]/page.tsx` - Entry point with comprehensive cabinet management
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation with licensee selector
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Cabinet Information Components:**
  - `components/ui/skeletons/CabinetDetailSkeletons.tsx` - Loading and error states
  - `components/cabinetDetails/AccountingDetails.tsx` - Detailed metrics and analytics
- **SMIB Configuration Components:**
  - Expandable SMIB configuration section with network and communication settings
  - Firmware version display and management
  - MQTT topic configuration display
- **Modal Components:**
  - `components/ui/cabinets/EditCabinetModal.tsx` - Edit cabinet modal
  - `components/ui/cabinets/DeleteCabinetModal.tsx` - Delete cabinet modal
- **Shared Components:**
  - `components/ui/RefreshButton.tsx` - Data refresh button

### State Management
- **Dashboard Store:** `lib/store/dashboardStore.ts` - Shared state for licensee and date filters
- **Cabinet Actions Store:** `lib/store/cabinetActionsStore.ts` - Modal state management
- **Local State:** React `useState` hooks for complex UI state
- **Key State Properties:**
  - `cabinet` - Cabinet details and configuration data
  - `loading`, `metricsLoading`, `refreshing` - Loading states
  - `error` - Error handling state
  - `smibConfigExpanded` - SMIB configuration expansion state
  - `isOnline` - Real-time online status
  - `activeMetricsFilter` - Time period filter selection
  - `activeMetricsTabContent` - Metrics tab selection
  - `communicationMode`, `firmwareVersion` - SMIB configuration states
  - `isFilterChangeInProgress` - Filter change loading state

### Data Flow
1. **Initial Load:** Fetches cabinet details and configuration data
2. **Status Monitoring:** Real-time online/offline status updates
3. **Metrics Filtering:** Updates metrics data based on time period selection
4. **SMIB Configuration:** Manages expandable configuration section
5. **Real-time Updates:** Refreshes data and status when needed
6. **Error Handling:** Graceful degradation with retry mechanisms

### API Integration

#### Cabinet Management Endpoints
- **GET `/api/machines/[id]`** - Fetches cabinet details
  - Parameters: `id` (cabinet ID)
  - Returns: `CabinetDetail` with complete cabinet information
- **PUT `/api/machines/[id]`** - Updates cabinet metrics data
  - Parameters: `id`, `timePeriod`
  - Returns: Updated cabinet metrics data

#### Data Processing
- **Cabinets Helper:** `lib/helpers/cabinets.ts` - Core cabinet utilities
  - `fetchCabinetById()` - Fetches cabinet details by ID
  - `updateCabinetMetricsData()` - Updates cabinet metrics for time period
- **Cabinet Details Helper:** `lib/helpers/cabinetDetails.ts` - Cabinet-specific utilities
  - Cabinet metrics calculation and formatting
  - SMIB configuration processing

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useCallback`, `useRef` - State management
- **Next.js:** `useRouter`, `usePathname` - Navigation and routing
- **Framer Motion:** Animation library for smooth transitions
- **GSAP:** Advanced animations for UI interactions
- **Radix UI Icons:** `ArrowLeftIcon`, `ChevronDownIcon`, `Pencil2Icon` - UI icons
- **Lucide React:** Additional UI icons
- **Date-fns:** `differenceInMinutes` - Date calculations for online status

#### Type Definitions
- **Cabinet Types:** `lib/types/cabinets.ts` - Cabinet-related types
  - `CabinetDetail`, `TimePeriod`
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Date Utils:** Date manipulation and formatting utilities
- **Animation Utils:** GSAP and Framer Motion utilities for smooth animations

### Component Hierarchy
```
CabinetDetailPage (app/cabinets/[slug]/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Refresh Button
├── Back Button
├── Cabinet Info Header
│   ├── Cabinet Name and Edit Button
│   ├── Manufacturer and Game Type
│   └── Location and Online Status
├── SMIB Configuration Section
│   ├── Expandable Configuration Panel
│   ├── Communication Mode Settings
│   ├── Firmware Version Display
│   ├── Network Settings
│   └── MQTT Topic Configuration
├── Time Period Filters
│   ├── Desktop Filter Buttons
│   └── Mobile Filter Dropdown
├── Metrics Tabs (Mobile)
│   └── Horizontal Tab Slider
├── Accounting Details
│   └── AccountingDetails (components/cabinetDetails/AccountingDetails.tsx)
└── Modals
    ├── EditCabinetModal (components/ui/cabinets/EditCabinetModal.tsx)
    └── DeleteCabinetModal (components/ui/cabinets/DeleteCabinetModal.tsx)
```

### Business Logic
- **Cabinet Management:** Complete cabinet information and configuration management
- **Real-time Monitoring:** Live status tracking and connectivity monitoring
- **SMIB Configuration:** Advanced SMIB settings and firmware management
- **Metrics Analytics:** Comprehensive performance metrics and historical data
- **Time-based Filtering:** Flexible time period selection for metrics analysis
- **Error Recovery:** Graceful error handling with retry mechanisms

### Animation & UX Features
- **Framer Motion Animations:** Smooth transitions for all UI interactions
- **GSAP Animations:** Advanced animations for configuration sections
- **Loading States:** Comprehensive loading indicators and skeleton loaders
- **Responsive Design:** Separate mobile and desktop layouts
- **Status Animations:** Animated online/offline status indicators
- **Expandable Sections:** Smooth expand/collapse animations for SMIB configuration

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Loading States:** Comprehensive loading indicators
- **Network Issues:** Retry logic and error recovery
- **Invalid Data:** Validation and fallback handling
- **Status Monitoring:** Automatic retry for connectivity issues

### Performance Optimizations
- **Memoization:** `useCallback` for expensive operations
- **Conditional Rendering:** Efficient component rendering based on data availability
- **Debounced Filtering:** Prevents excessive API calls during filter changes
- **Efficient Animations:** Optimized animation performance
- **Data Caching:** Client-side caching of frequently accessed data

### Security Features
- **Input Validation:** Comprehensive validation for all form inputs
- **API Authentication:** Secure API calls with proper error handling
- **Data Sanitization:** Safe handling of user input
- **Access Control:** Role-based access to cabinet operations
- **Configuration Security:** Secure SMIB configuration management

## Data Flow
- Fetches cabinet details and configuration from the backend
- Uses Zustand for shared state (licensee, modals)
- Handles real-time status monitoring and metrics updates
- Provides comprehensive SMIB configuration management
- Supports time-based metrics filtering and analysis

## Financial Calculations Analysis

### Cabinet Details Metrics vs Financial Metrics Guide

**Current Implementation Analysis (via AccountingDetails.tsx):**

#### **Cabinet Financial Metrics ✅**
- **Current Implementation**: Uses `AccountingDetails` component with meter data
- **Data Source**: Individual cabinet meter readings from `meters` collection
- **Time Period Filtering**: Today, Yesterday, Last 7 days, 30 days, Custom
- **Financial Guide**: Uses standard meter fields ✅ **MATCHES**

#### **Cabinet Money In (Drop) ✅**
- **Current Implementation**: 
  ```javascript
  moneyIn = Σ(movement.drop) for cabinet within time period
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Total physical cash inserted into specific cabinet
- **Display**: AccountingDetails shows formatted money in values

#### **Cabinet Money Out (Cancelled Credits) ✅**
- **Current Implementation**: 
  ```javascript
  moneyOut = Σ(movement.totalCancelledCredits) for cabinet within time period
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Total credits cancelled/paid out from specific cabinet
- **Display**: AccountingDetails shows formatted money out values

#### **Cabinet Gross Revenue ✅**
- **Current Implementation**: 
  ```javascript
  gross = moneyIn - moneyOut
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: Standard gross calculation for individual cabinet

#### **Cabinet Live Metrics ✅**
- **Current Implementation**: Real-time SAS meter data from `machine.sasMeters`
- **Data Source**: Live meter readings from machine's SAS connection
- **Fields**: `coinIn`, `coinOut`, `drop`, `totalCancelledCredits`, `jackpot`, `gamesPlayed`
- **Financial Guide**: Uses standard SAS meter fields ✅ **MATCHES**

#### **Cabinet Collection History ✅**
- **Current Implementation**: Historical collection data from `collectionMetersHistory`
- **Data Source**: Collection-to-collection meter changes
- **Calculation**: Shows meter deltas between collection periods
- **Financial Guide**: Uses standard collection methodology ✅ **MATCHES**

#### **Cabinet Activity Log ✅**
- **Current Implementation**: Machine events from `machineevents` collection
- **Data Source**: Event logs for specific cabinet
- **Business Logic**: Detailed audit trail of cabinet activity
- ✅ **OPERATIONAL** - Standard event logging (not financial calculation)

### Mathematical Formulas Summary

#### **Cabinet Time-Period Metrics**
```
Cabinet Money In = Σ(movement.drop) WHERE machine = cabinetId AND readAt BETWEEN startDate AND endDate
Cabinet Money Out = Σ(movement.totalCancelledCredits) WHERE machine = cabinetId AND readAt BETWEEN startDate AND endDate
Cabinet Gross Revenue = Cabinet Money In - Cabinet Money Out
```

#### **Cabinet Live Metrics**
```
Live Money In = machine.sasMeters.drop (current reading)
Live Money Out = machine.sasMeters.totalCancelledCredits (current reading)
Live Coin In = machine.sasMeters.coinIn (current reading)
Live Coin Out = machine.sasMeters.coinOut (current reading)
Live Games Played = machine.sasMeters.gamesPlayed (current reading)
Live Jackpot = machine.sasMeters.jackpot (current reading)
```

#### **Cabinet Collection Calculations**
```
Collection Period Drop = End Collection Drop - Start Collection Drop
Collection Period Cancelled = End Collection Cancelled - Start Collection Cancelled
Collection Net Win = Collection Period Drop - Collection Period Cancelled
```

#### **Cabinet Status Calculation**
```
Cabinet Online = lastActivity >= (currentTime - 3 minutes)
Cabinet Status = assetStatus field value
Cabinet Last Activity = lastActivity timestamp
```

### Data Validation & Error Handling

#### **Input Validation ✅**
- **Cabinet ID**: Validates MongoDB ObjectId format
- **Time Period**: Validates date range selections
- **Meter Data**: Validates numeric meter values
- **Configuration**: Validates SMIB configuration parameters

#### **Data Integrity ✅**
- **Null Handling**: Uses fallback values for missing meter data
- **Historical Data**: Maintains meter reading history integrity
- **Real-time Sync**: Ensures live metrics reflect current cabinet state
- **Collection Validation**: Validates collection period calculations

### Required Verification

**Cabinet details calculations align with the financial metrics guide:**

1. **Meter Aggregations**: Use standard drop and cancelled credits fields ✅
2. **Gross Revenue**: Standard calculation (drop - cancelled credits) ✅
3. **Live Metrics**: Use standard SAS meter fields ✅
4. **Collection History**: Standard collection methodology ✅
5. **Time Period Filtering**: Standard date range aggregation ✅

**Note**: Cabinet details calculations correctly implement the financial metrics guide for individual cabinet analysis.

## UI
- Clean, modern design with Tailwind CSS
- Expandable configuration sections for detailed management
- Responsive design optimized for all device types
- Animated status indicators and smooth transitions
- Accessible controls and intuitive navigation
- Visual feedback for all user interactions 