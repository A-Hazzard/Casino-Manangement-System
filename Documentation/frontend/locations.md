# Locations Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025  
**Version:** 2.0.0

## Table of Contents

1. [Overview](#overview)
2. [Main Features](#main-features)
3. [Technical Architecture](#technical-architecture)
4. [Location Management](#location-management)
5. [Performance Analytics](#performance-analytics)
6. [Cabinet Management](#cabinet-management)
7. [API Integration](#api-integration)
8. [State Management](#state-management)
9. [Security Features](#security-features)
10. [Performance Optimization](#performance-optimization)
11. [Error Handling](#error-handling)

## Overview

The Locations page provides comprehensive casino location management, including location overview, cabinet management, and performance analytics for each casino location. This page serves as the central hub for managing all casino locations and their associated operations with real-time monitoring and detailed analytics.

### Key Principles
- **Location Management**: Complete CRUD operations for casino locations
- **Performance Analytics**: Real-time location performance monitoring
- **Cabinet Integration**: Seamless cabinet management within locations
- **Financial Tracking**: Location-specific financial metrics and reporting

### File Information
- **File:** `app/locations/page.tsx`
- **URL Pattern:** `/locations`
- **Component Type:** Location Management Page
- **Authentication:** Required
- **Access Level:** All authenticated users

### System Integration
- **Location Management**: Complete location lifecycle management
- **Cabinet Operations**: Cabinet management within location context
- **Financial Analytics**: Location-specific financial performance tracking
- **Collection Systems**: Integration with collection and reporting systems

## Main Features
- **Location Management:**
  - View, search, sort, add, edit, and delete casino locations.
  - Real-time location performance metrics.
  - Location-specific cabinet management.
- **Performance Analytics:**
  - Financial metrics per location (money in/out, gross revenue).
  - Machine status tracking (online/offline machines).
  - Location comparison and ranking.
- **Cabinet Integration:**
  - View cabinets for each location.
  - Cabinet performance within location context.
  - Location-specific cabinet management.
- **Search and Filtering:**
  - Search locations by name or address.
  - Filter by licensee and date range.
  - Sort by various performance metrics.
- **Responsive Design:**
  - Desktop table view with detailed metrics.
  - Mobile card view with touch-friendly controls.
- **Sidebar Navigation:**
  - Persistent sidebar for navigation to other modules.

## Technical Architecture

### Core Components
- **Main Page:** `app/locations/page.tsx` - Entry point with location management
- **Layout Components:**
  - `components/layout/Header.tsx` - Top navigation header
  - `components/layout/Sidebar.tsx` - Persistent navigation sidebar
- **Location Management Components:**
  - `components/ui/locations/LocationTable.tsx` - Desktop location table view
  - `components/ui/locations/LocationCard.tsx` - Mobile location card view
  - `components/ui/locations/LocationSkeleton.tsx` - Loading skeleton
  - `components/ui/locations/NewLocationModal.tsx` - Add location form
  - `components/ui/locations/EditLocationModal.tsx` - Edit location form
  - `components/ui/locations/DeleteLocationModal.tsx` - Location deletion confirmation
- **Utility Components:**
  - `components/ui/MachineStatusWidget.tsx` - Machine status indicators
  - `components/dashboard/DashboardDateFilters.tsx` - Date filtering
  - `components/ui/CabinetTableSkeleton.tsx` - Cabinet loading skeleton

### State Management
- **Global Store:** `lib/store/dashboardStore.ts` - Licensee and filter state
- **Location Actions Store:** `lib/store/locationActionsStore.ts` - Location CRUD operations
- **Local State:** React `useState` hooks for UI state
- **Key State Properties:**
  - `locationData` - Location data array
  - `loading` - Loading state
  - `searchTerm`, `sortOrder`, `sortOption` - Search and sort states
  - `currentPage` - Pagination state
  - Modal states for various operations

### Data Flow
1. **Initial Load:** Fetches locations data on component mount
2. **Search/Filter:** Filters locations based on search terms and criteria
3. **Sorting:** Sorts locations based on selected columns and direction
4. **Pagination:** Displays paginated results
5. **CRUD Operations:** Creates, updates, and deletes locations
6. **Real-time Updates:** Refreshes data after operations

### API Integration

#### Location Management Endpoints
- **GET `/api/locations`** - Fetches all locations
  - Parameters: `licensee` (optional)
  - Returns: `{ locations: Location[] }`
- **GET `/api/locations/[locationId]`** - Fetches specific location details
  - Parameters: `locationId`, `basicInfo` (optional)
  - Returns: Detailed location information
- **POST `/api/locations`** - Creates new location
  - Body: Location creation data
  - Returns: `{ success: true, data: Location }`
- **PUT `/api/locations`** - Updates existing location
  - Body: Location update data
  - Returns: `{ success: true, data: Location }`
- **DELETE `/api/locations`** - Deletes location
  - Body: `{ _id }`
  - Returns: `{ success: true }`

#### Location Aggregation Endpoints
- **GET `/api/locationAggregation`** - Fetches aggregated location data
  - Parameters: `timePeriod`, `licensee`, `filters`
  - Returns: Array of aggregated location objects with metrics

#### Cabinet Management Endpoints
- **GET `/api/locations/[locationId]`** - Fetches cabinets for specific location
  - Parameters: `locationId`, `timePeriod`, `licensee`
  - Returns: Array of cabinet objects for the location

#### Data Processing
- **Locations Helper:** `lib/helpers/locations.ts` - Location management utilities
  - `fetchLocationsData()` - Fetches aggregated location data
  - `getAllGamingLocations()` - Fetches all gaming locations
  - `fetchLocationDetails()` - Fetches specific location details
  - `fetchLocationAndCabinets()` - Fetches location with its cabinets
  - `searchLocations()` - Searches locations by term
  - `fetchLocationMetricsForMap()` - Fetches location metrics for map display

### Key Dependencies

#### Frontend Libraries
- **React Hooks:** `useState`, `useEffect`, `useCallback`, `useMemo` - State management
- **Next.js:** `useRouter`, `usePathname` - Navigation and routing
- **Axios:** HTTP client for API calls
- **Radix UI Icons:** Various icons for UI elements
- **Lucide React:** `Plus` icon for add functionality
- **Sonner:** Toast notifications for user feedback

#### Type Definitions
- **Location Types:** `lib/types/location.ts` - Location management types
  - `AggregatedLocation`, `LocationData`, `LocationFilter`, `LocationSortOption`
- **Cabinet Types:** `lib/types/cabinets.ts` - Cabinet management types
  - `Cabinet` - Cabinet data structure
- **Shared Types:** `@shared/types` - Core type definitions

#### Utility Functions
- **Auth Utils:** `lib/utils/auth.ts` - Authentication utilities
  - `getAuthHeaders()` - Gets authentication headers for API calls
- **Number Utils:** `lib/utils/number.ts` - Number formatting
  - `formatCurrency()` - Currency formatting for financial data
- **Date Utils:** `react-day-picker` - Date range selection
  - `DateRange` - Date range type for filtering

### Component Hierarchy
```
LocationsPage (app/locations/page.tsx)
├── Sidebar (components/layout/Sidebar.tsx)
├── Header (components/layout/Header.tsx)
├── DashboardDateFilters (components/dashboard/DashboardDateFilters.tsx)
├── Search and Filter Controls
├── LocationTable (components/ui/locations/LocationTable.tsx) [Desktop]
├── LocationCard (components/ui/locations/LocationCard.tsx) [Mobile]
├── Pagination Controls
├── MachineStatusWidget (components/ui/MachineStatusWidget.tsx)
└── Location Modals
    ├── NewLocationModal (components/ui/locations/NewLocationModal.tsx)
    ├── EditLocationModal (components/ui/locations/EditLocationModal.tsx)
    └── DeleteLocationModal (components/ui/locations/DeleteLocationModal.tsx)
```

### Business Logic
- **Location Management:** Complete CRUD operations for casino locations
- **Performance Analytics:** Aggregated metrics per location
- **Cabinet Integration:** Location-specific cabinet management
- **Search & Filtering:** Real-time search across multiple fields
- **Sorting:** Multi-column sorting with direction indicators
- **Pagination:** Efficient data display with configurable page sizes

### Security Features
- **Authentication:** Secure API calls with authentication headers
- **Authorization:** Role-based access to location operations
- **Input Validation:** Comprehensive validation for all form inputs
- **Data Sanitization:** Safe handling of user input

### Error Handling
- **API Failures:** Graceful degradation with user-friendly error messages
- **Network Issues:** Retry logic and fallback error states
- **Loading States:** Skeleton loaders and loading indicators
- **Toast Notifications:** User feedback for all operations

### Performance Optimizations
- **Memoization:** `useMemo` for expensive computations (filtering, sorting, pagination)
- **Conditional Rendering:** Separate desktop/mobile layouts
- **Efficient Filtering:** Optimized search and filter algorithms
- **Pagination:** Reduces DOM size and improves performance
- **Image Optimization:** Next.js Image component with SVG imports

## Notes Section

### How the Locations Page Works (Simple Explanation)

The locations page is like a **map of all your casino locations** with performance data for each one. Here's how it works:

#### **Location Management Section**

**🏢 What Locations Are**
- **Collection**: Queries the `gaminglocations` collection in the database
- **Fields Used**: `_id`, `name`, `address`, `rel.licencee`, `geoCoords`, `profitShare`
- **Simple Explanation**: These are your casino locations - like different branches of a business, each with their own slot machines and performance data

**📊 Location Performance Metrics**
- **Collection**: Aggregates data from `meters` collection by location
- **Fields Used**: `coinIn`, `coinOut`, `drop`, `totalCancelledCredits`, `gross`
- **Simple Explanation**: Shows how much money each casino location is making - like a profit report for each branch

**🔍 How Location Search Works**
- **Collection**: Filters the `gaminglocations` collection
- **Fields Used**: Searches by `name`, `address.street`, `address.city`
- **Simple Explanation**: Like finding a specific store in a chain - you can search by location name or address

**📍 Location Details**
- **Collection**: Queries `gaminglocations` collection by ID
- **Fields Used**: `name`, `address`, `geoCoords`, `profitShare`, `collectionBalance`
- **Simple Explanation**: Shows detailed information about each casino location, including address and financial data

#### **Cabinet Integration**

**🎰 Cabinets per Location**
- **Collection**: Queries `machines` collection filtered by `gamingLocation`
- **Fields Used**: `gamingLocation` (references `gaminglocations._id`)
- **Simple Explanation**: Shows all the slot machines at each casino location - like inventory for each store

**📈 Cabinet Performance by Location**
- **Collection**: Aggregates `meters` data grouped by `gamingLocation`
- **Fields Used**: Groups by location, sums up financial metrics
- **Simple Explanation**: Shows how much money each location's machines are making collectively

#### **Performance Analytics**

**💰 Financial Metrics**
- **Collection**: Aggregates `meters` collection by location
- **Fields Used**: `coinIn`, `coinOut`, `drop`, `gross` per location
- **Simple Explanation**: Shows total revenue, expenses, and profit for each casino location

**🖥️ Machine Status**
- **Collection**: Queries `machines` collection with status filtering
- **Fields Used**: `lastActivity`, `assetStatus`, `deletedAt` per location
- **Simple Explanation**: Shows how many machines are working vs. offline at each location

**📊 Location Ranking**
- **Collection**: Aggregates and sorts `meters` data by location
- **Fields Used**: Sorts by `totalDrop` or other financial metrics
- **Simple Explanation**: Shows which locations are performing best financially

#### **Database Queries Explained**

**For Location List:**
```javascript
// Queries the gaminglocations collection
// Filters by: licensee (optional)
// Returns: all casino locations with basic info
```

**For Location Performance:**
```javascript
// Queries meters collection
// Groups by: gamingLocation
// Aggregates: financial metrics per location
// Returns: performance data for each location
```

**For Location Details:**
```javascript
// Queries gaminglocations collection by ID
// Joins with machines collection for cabinet count
// Returns: detailed location info with cabinet data
```

**For Location Search:**
```javascript
// Queries gaminglocations collection
// Filters by: name, address fields
// Returns: matching locations
```

#### **Why This Matters for Casino Operations**

**🏢 Location Management Benefits:**
- **Multi-location Oversight**: Manage multiple casino locations from one system
- **Performance Comparison**: See which locations are most profitable
- **Resource Allocation**: Decide where to invest in new machines or improvements
- **Geographic Planning**: Understand performance by region or market

**📊 Performance Analytics Benefits:**
- **Financial Tracking**: Know exactly how much each location is making
- **Machine Optimization**: See which locations need more or better machines
- **Market Analysis**: Compare performance across different markets
- **Investment Decisions**: Make data-driven decisions about location expansion

**🎰 Cabinet Integration Benefits:**
- **Inventory Management**: Know how many machines each location has
- **Maintenance Planning**: Track machine status across locations
- **Performance Analysis**: See which locations have the best-performing machines
- **Capacity Planning**: Know when locations need more machines

**📍 Operational Benefits:**
- **Centralized Management**: Control all locations from one dashboard
- **Real-time Monitoring**: See live performance data for all locations
- **Reporting**: Generate reports for management and regulators
- **Compliance**: Track performance for regulatory requirements

The locations page essentially **gives you a bird's-eye view of your entire casino empire**, showing you how each location is performing and helping you make strategic decisions about your business.

## Financial Calculations Analysis

### Location Performance Calculations vs Financial Metrics Guide

**Current Implementation Analysis:**

#### **Location Money In (Drop) ✅**
- **Current Implementation**: 
  ```javascript
  moneyIn: { $sum: "$movement.drop" }
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Total physical cash inserted across all machines at location
- **Aggregation**: Sums across all machines at location within date range

#### **Location Money Out (Total Cancelled Credits) ✅**
- **Current Implementation**: 
  ```javascript
  moneyOut: { $sum: "$movement.totalCancelledCredits" }
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Total credits paid out to players at location (vouchers + hand-paid)
- **Aggregation**: Sums across all machines at location within date range

#### **Location Gross Revenue ✅**
- **Current Implementation**: 
  ```javascript
  gross: { $subtract: ["$moneyIn", "$moneyOut"] }
  // Where: moneyIn = Σ(movement.drop), moneyOut = Σ(movement.totalCancelledCredits)
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: `gross = Σ(movement.drop) - Σ(movement.totalCancelledCredits)` per location

#### **Machine Count Calculations ✅**
- **Current Implementation**: 
  ```javascript
  // Total machines at location
  { $match: { gamingLocation: locationId, deletedAt: { $exists: false } } }
  // Online machines at location
  { $match: { lastActivity: { $gte: recentThreshold } } }
  ```
- **Business Logic**: 
  - **Total**: Count of non-deleted machines at location
  - **Online**: Count of machines with recent activity (< 3 minutes)
  - **Offline**: Total - Online
- ✅ **CONSISTENT** - Standard machine status calculation per location

#### **Location Search Logic ✅**
- **Current Implementation**: 
  ```javascript
  $or: [
    { name: { $regex: searchTerm, $options: 'i' } },
    { "address.street": { $regex: searchTerm, $options: 'i' } },
    { "address.city": { $regex: searchTerm, $options: 'i' } }
  ]
  ```
- **Business Logic**: Case-insensitive search across location name and address fields
- ✅ **COMPREHENSIVE** - Covers all relevant searchable location fields

#### **Location Ranking Logic ✅**
- **Current Implementation**: 
  ```javascript
  // Sort by performance metrics
  { $sort: { gross: -1 } }        // By gross revenue
  { $sort: { moneyIn: -1 } }      // By money in (drop)
  { $sort: { totalMachines: -1 } } // By machine count
  ```
- **Financial Guide**: Uses `drop` and `gross` for ranking ✅ **MATCHES**
- **Business Logic**: Ranks locations by financial performance

#### **Cabinet Performance by Location ✅**
- **Current Implementation**: 
  ```javascript
  // Aggregates cabinet data by location
  { $group: {
    _id: "$gamingLocation",
    totalCabinets: { $sum: 1 },
    totalDrop: { $sum: "$movement.drop" },
    totalGross: { $sum: { $subtract: ["$movement.drop", "$movement.totalCancelledCredits"] } }
  }}
  ```
- **Financial Guide**: Uses `movement.drop` and `movement.totalCancelledCredits` ✅ **MATCHES**
- **Business Logic**: Aggregates cabinet financial data at location level

### Mathematical Formulas Summary

#### **Core Location Metrics**
```
Location Money In = Σ(movement.drop) across all machines at location
Location Money Out = Σ(movement.totalCancelledCredits) across all machines at location
Location Gross Revenue = Location Money In - Location Money Out
```

#### **Machine Status by Location**
```
Total Machines = COUNT(machines WHERE gamingLocation = locationId AND deletedAt IS NULL)
Online Machines = COUNT(machines WHERE gamingLocation = locationId AND lastActivity >= currentTime - 3min)
Offline Machines = Total Machines - Online Machines
```

#### **Location Performance Ranking**
```
Top Performing Locations = ORDER BY gross DESC
Revenue Ranking = ORDER BY moneyIn DESC  
Machine Count Ranking = ORDER BY totalMachines DESC
```

#### **Cabinet Aggregation by Location**
```
Location Cabinet Count = COUNT(machines WHERE gamingLocation = locationId)
Location Cabinet Revenue = Σ(movement.drop) WHERE gamingLocation = locationId
Location Cabinet Gross = Σ(movement.drop - movement.totalCancelledCredits) WHERE gamingLocation = locationId
```

#### **Search Algorithm**
```
Location Search = FIND(locations WHERE 
  name CONTAINS searchTerm OR
  address.street CONTAINS searchTerm OR 
  address.city CONTAINS searchTerm
) CASE_INSENSITIVE
```

### Data Validation & Error Handling

#### **Input Validation ✅**
- **Location ID**: Validates MongoDB ObjectId format
- **Search Terms**: Sanitizes input to prevent injection attacks
- **Date Ranges**: Validates ISO date format for filtering
- **Pagination**: Validates numeric page and limit parameters

#### **Data Integrity ✅**
- **Null Handling**: Uses `$ifNull` operators to default missing values to 0
- **Deleted Locations**: Filters out soft-deleted locations (`deletedAt` exists)
- **Missing Coordinates**: Gracefully handles locations without geo coordinates
- **Financial Validation**: Prevents negative financial calculations 