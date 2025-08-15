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

## UI
- Clean, modern design with Tailwind CSS
- Expandable configuration sections for detailed management
- Responsive design optimized for all device types
- Animated status indicators and smooth transitions
- Accessible controls and intuitive navigation
- Visual feedback for all user interactions 