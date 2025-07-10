# Collection Report Details Page

This page provides detailed breakdown and analysis of a specific collection report, including machine metrics, location metrics, and SAS metrics comparison with comprehensive filtering and pagination.

- **File:** `app/collection-report/report/[reportId]/page.tsx`
- **URL Pattern:** `/collection-report/report/[reportId]` where `[reportId]` is the report identifier

## Main Features
- **Report Overview:**
  - Display collection report details and summary information
  - Report validation and error handling
  - Back navigation to collection reports list
- **Multi-Tab Analytics:**
  - **Machine Metrics:** Detailed breakdown of individual machine performance
  - **Location Metrics:** Aggregated location-level performance data
  - **SAS Metrics Compare:** SAS protocol metrics comparison and analysis
- **Data Filtering and Pagination:**
  - Paginated display of machine and location data
  - Configurable items per page (default: 10)
  - Efficient data loading and display
- **Collection Data Integration:**
  - Integration with collection documents and reports
  - Real-time data validation and processing
  - Comprehensive error handling for missing or invalid data
- **Responsive Design:**
  - Optimized for both desktop and mobile devices
  - Touch-friendly controls and navigation
  - Adaptive layout for different screen sizes

## Technical Architecture

### Core Components
- **Main Page:** `app/collection-report/report/[reportId]/page.tsx` - Entry point with detailed report analysis
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation with licensee selector
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Report Display Components:**
  - `components/ui/skeletons/CollectionReportDetailSkeletons.tsx` - Loading and error states
  - Tab content components for different metrics views
- **Data Processing Components:**
  - Machine metrics generation and display
  - Location metrics aggregation and analysis
  - SAS metrics comparison and visualization
- **Navigation Components:**
  - Back button with navigation to collection reports
  - Error state handling with retry options

### State Management
- **Local State:** React `useState` hooks for complex UI state
- **Key State Properties:**
  - `reportData` - Collection report data and details
  - `loading`, `refreshing` - Loading states
  - `error` - Error handling state
  - `activeTab` - Current tab selection (Machine Metrics, Location Metrics, SAS Metrics Compare)
  - `collections` - Collection documents array
  - `machinePage` - Machine metrics pagination state
  - `ITEMS_PER_PAGE` - Pagination configuration (10 items per page)

### Data Flow
1. **Initial Load:** Fetches collection report data and associated collections
2. **Data Validation:** Validates report data and handles invalid reports
3. **Tab Navigation:** Switches between different metrics views
4. **Pagination:** Handles paginated display of large datasets
5. **Error Handling:** Graceful degradation with user feedback
6. **Refresh Operations:** Manual data refresh with loading states

### API Integration

#### Collection Report Endpoints
- **GET `/api/collection-reports/[reportId]`** - Fetches collection report details
  - Parameters: `reportId` (report identifier)
  - Returns: `CollectionReportData` with report information
- **GET `/api/collections/by-report/[reportId]`** - Fetches collections for report
  - Parameters: `reportId` (report identifier)
  - Returns: `CollectionDocument[]` with collection data

#### Data Processing
- **Collection Report Helper:** `lib/helpers/collectionReport.ts` - Core report utilities
  - `fetchCollectionReportById()` - Fetches report details by ID
- **Collections Helper:** `lib/helpers/collections.ts` - Collection management utilities
  - `fetchCollectionsByLocationReportId()` - Fetches collections for report
- **Collection Report Detail Helper:** `lib/helpers/collectionReportDetailPage.ts` - Detail page utilities
  - `animateDesktopTabTransition()` - Tab transition animations
  - `generateMachineMetricsData()` - Machine metrics data generation
  - `calculateLocationTotal()` - Location metrics calculation
  - `calculateSasMetricsTotals()` - SAS metrics aggregation

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useRef` - State management
- **Next.js:** `useParams`, `usePathname` - Navigation and routing
- **Radix UI Icons:** `ChevronLeftIcon`, `ChevronRightIcon`, `DoubleArrowLeftIcon`, `DoubleArrowRightIcon` - Navigation icons
- **Lucide React:** `ArrowLeft` - Additional navigation icons

#### Type Definitions
- **Collection Report Types:** `lib/types/index.ts` - Report-related types
  - `CollectionReportData` - Collection report data structure
- **Collection Types:** `lib/types/collections.ts` - Collection-related types
  - `CollectionDocument` - Collection document structure
- **API Types:** `lib/types/api.ts` - API-related types

#### Utility Functions
- **Validation Utils:** `lib/utils/validation.ts` - Data validation utilities
  - `validateCollectionReportData()` - Report data validation
- **Format Utils:** `lib/utils/currency.ts` - Currency formatting utilities
  - `formatCurrency()` - Currency formatting utility

### Component Hierarchy
```
CollectionReportPage (app/collection-report/report/[reportId]/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── Loading State
│   └── CollectionReportSkeleton
├── Error State
│   ├── Error Message
│   └── Back to Collections Button
├── Report Not Found State
│   ├── Not Found Message
│   └── Back to Collections Button
├── Main Content
│   ├── Tab Navigation
│   │   ├── Machine Metrics Tab
│   │   ├── Location Metrics Tab
│   │   └── SAS Metrics Compare Tab
│   ├── Tab Content
│   │   ├── Machine Metrics Content
│   │   │   ├── Mobile Card View
│   │   │   └── Desktop Table View
│   │   ├── Location Metrics Content
│   │   │   ├── Mobile Card View
│   │   │   └── Desktop Table View
│   │   └── SAS Metrics Compare Content
│   │       ├── Mobile Card View
│   │       └── Desktop Table View
│   └── Pagination Controls
│       ├── Page Navigation
│       └── Items Per Page Display
└── Back Navigation
    └── Back to Collections Link
```

### Business Logic
- **Report Analysis:** Comprehensive collection report data analysis
- **Multi-level Metrics:** Machine, location, and SAS protocol metrics
- **Data Aggregation:** Automatic calculation of totals and summaries
- **Pagination Management:** Efficient handling of large datasets
- **Error Recovery:** Graceful error handling with retry mechanisms
- **Data Validation:** Comprehensive validation of report and collection data

### Animation & UX Features
- **Tab Transitions:** Smooth transitions between different metrics views
- **Loading States:** Comprehensive loading indicators and skeleton loaders
- **Responsive Design:** Separate mobile and desktop layouts
- **Pagination Animation:** Smooth page transitions and data updates
- **Error States:** User-friendly error messages and recovery options

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Loading States:** Comprehensive loading indicators
- **Invalid Reports:** Handling of missing or invalid report data
- **Network Issues:** Retry logic and error recovery
- **Data Validation:** Validation of report and collection data integrity

### Performance Optimizations
- **Pagination:** Reduces DOM size and improves performance for large datasets
- **Conditional Rendering:** Efficient component rendering based on data availability
- **Data Processing:** Optimized metrics calculation and aggregation
- **Memory Management:** Efficient handling of large collection datasets
- **Caching:** Client-side caching of processed metrics data

### Security Features
- **Input Validation:** Comprehensive validation for all data inputs
- **API Authentication:** Secure API calls with proper error handling
- **Data Sanitization:** Safe handling of report and collection data
- **Access Control:** Role-based access to collection report data
- **Error Information:** Safe error message handling without data exposure

## Data Flow
- Fetches collection report data and associated collections from the backend
- Validates report data and handles invalid or missing reports
- Processes and aggregates metrics data for different views
- Handles pagination and efficient data display
- Provides comprehensive error handling and recovery options

## UI
- Clean, modern design with Tailwind CSS
- Tab-based navigation for different metrics views
- Responsive design optimized for all device types
- Pagination controls for efficient data browsing
- Accessible controls and intuitive navigation
- Visual feedback for all user interactions 