# Reports Page

**Author:** Aaron Hazzard - Senior Software Engineer

This page provides comprehensive reporting and analytics capabilities for the casino management system, offering real-time insights across locations, machines, meters, and dashboard metrics.

- **File:** `app/reports/page.tsx`
- **URL Pattern:** `/reports`

## Main Features

- **Multi-Tab Interface:**
  - Dashboard: Real-time overview of casino operations and KPIs
  - Locations: Location performance analysis and comparisons
  - Machines: Individual machine performance and revenue tracking  
  - Meters: Meter readings and financial data by location

- **Advanced Filtering:**
  - Date range filtering with predefined periods (Today, Yesterday, Last 7 days, Last 30 days)
  - Custom date range picker with calendar interface
  - Licensee-based filtering for multi-tenant support
  - Location-specific filtering across all tabs

- **Permission-Based Access:**
  - Role-based tab visibility (admin, manager, user permissions)
  - Resource-level permissions for specific locations and data
  - Graceful access denial with user-friendly messaging

- **Real-Time Data Updates:**
  - Live metrics with automatic refresh capabilities
  - Real-time player counts and terminal status
  - WebSocket integration for live data streaming
  - Manual refresh controls with loading states

- **Export Capabilities:**
  - CSV and Excel export functionality
  - Filtered data export based on current view settings
  - Comprehensive data export with all relevant metrics

## Tab Overview

### Dashboard Tab
**Component:** `components/reports/tabs/DashboardTab.tsx`

**Features:**
- **KPI Metrics Grid:**
  - Total Revenue with trend indicators
  - Active Players count with percentage changes
  - Games Played statistics
  - Active Locations tracking
  - Performance trend arrows (up/down)

- **Interactive Location Map:**
  - Geographic visualization of casino locations
  - Performance indicators by location
  - Click-to-select location functionality
  - Real-time status updates (online/offline machines)

- **Top Performing Machines:**
  - Ranked list of highest revenue-generating machines
  - Machine location and performance metrics
  - Revenue comparison charts

- **Time Period Controls:**
  - Quick filter buttons (Today, Week, Month, Year)
  - Real-time data refresh capabilities
  - Loading states with spinner animations

### Locations Tab
**Component:** `components/reports/tabs/LocationsTab.tsx`

**Features:**
- **Location Performance Analysis:**
  - Comprehensive location metrics (revenue, machines, utilization)
  - Location comparison capabilities
  - Performance ranking and sorting

- **Machine Summary by Location:**
  - Online/offline machine counts
  - SAS-enabled machine tracking
  - Machine type distribution

- **Financial Metrics:**
  - Revenue per location
  - Hold percentage calculations
  - Average revenue per machine

- **Data Visualization:**
  - Interactive charts and graphs
  - Performance trend analysis
  - Geographic distribution maps

### Machines Tab
**Component:** `components/reports/tabs/MachinesTab.tsx`

**Sub-tabs:**
1. **Overview:**
   - Paginated machine listing with search
   - Machine status indicators (online/offline)
   - Basic performance metrics
   - Location and machine type filtering

2. **Performance Analysis:**
   - Detailed machine performance comparisons
   - Revenue analysis and trending
   - Machine efficiency metrics
   - Performance ranking tables

3. **Evaluation:**
   - Machine evaluation and rating system
   - Performance vs. target analysis
   - Recommendation engine for machine placement
   - ROI calculations and projections

4. **Offline Machines:**
   - Dedicated view for offline machines
   - Downtime tracking and analysis
   - Maintenance scheduling integration
   - Service history and logs

**Features:**
- **Machine Management:**
  - Individual machine editing capabilities
  - Machine deletion with confirmation
  - Bulk operations support
  - Status updates and configuration

- **Advanced Filtering:**
  - Location-based filtering (single location select)
  - Online/offline status filtering
  - Machine type and manufacturer filtering
  - Date range filtering for performance data

- **Performance Analytics:**
  - Revenue tracking and trending
  - Games played statistics
  - Hold percentage calculations
  - Utilization metrics

### Meters Tab
**Component:** `components/reports/tabs/MetersTab.tsx`

**Features:**
- **Meter Data Management:**
  - Comprehensive meter reading display
  - Historical meter data tracking
  - Meter synchronization capabilities
  - Data validation and verification

- **Location-Based Filtering:**
  - Multi-location selection
  - Location comparison capabilities
  - Drill-down to specific machines

- **Financial Calculations:**
  - Coin in/out tracking
  - Drop calculations
  - Net win computations
  - Hold percentage analysis

- **Data Export:**
  - Meter data export to CSV/Excel
  - Filtered export based on selections
  - Historical data export capabilities

## Technical Architecture

### Core Components

- **Main Page:** `app/reports/page.tsx` - Entry point with tab navigation
- **Tab Components:** `components/reports/tabs/` - Individual tab implementations
- **Shared Components:**
  - `components/reports/common/LocationMap.tsx` - Interactive map visualization
  - `components/ui/common/LocationSingleSelect.tsx` - Location selection component
  - `components/ui/ModernDateRangePicker.tsx` - Date range picker

### State Management

- **Reports Store:** `lib/store/reportsStore.ts`
  - Active view management
  - Loading states
  - Date range selection
  - Real-time metrics

- **Dashboard Store:** `lib/store/dashboardStore.ts`
  - Licensee selection
  - Date filter preferences
  - Custom date ranges

- **Analytics Store:** `lib/store/reportsDataStore.ts`
  - Machine comparison data
  - Chart data caching
  - Performance metrics

### Data Flow

1. **Page Load:**
   - Authentication check and permission validation
   - Default tab selection based on URL parameters
   - Initial data fetch for active tab

2. **Tab Switching:**
   - Loading state activation
   - Data fetch for selected tab
   - URL update with new section parameter
   - Success notification

3. **Filtering:**
   - Filter state update
   - API call with new parameters
   - Data refresh for current view
   - Export capability update

4. **Real-Time Updates:**
   - WebSocket connection for live data
   - Periodic refresh for critical metrics
   - User-initiated refresh controls

### API Integration

**Primary Endpoints:**
- `/api/analytics/dashboard` - Dashboard KPI metrics
- `/api/reports/locations` - Location performance data
- `/api/reports/machines` - Machine performance and status
- `/api/reports/meters` - Meter readings and financial data
- `/api/analytics/charts` - Chart data for visualizations

**Data Types:**
- Machine performance metrics
- Location aggregated data
- Financial calculations (revenue, hold %, etc.)
- Real-time status indicators

### User Experience

#### Responsive Design
- **Desktop:** Full table layouts with comprehensive data
- **Mobile:** Card-based layouts with essential information
- **Tablet:** Adaptive layouts with collapsible sections
- **Enhanced Mobile Navigation:** Select dropdown navigation for tabs on mobile devices (before `md:` breakpoint)
- **Responsive Metric Cards:** Adaptive text sizing and responsive layouts for KPI cards and metrics
- **Mobile-First Approach:** Optimized layouts that prioritize mobile experience
- **Touch-Friendly Controls:** Improved touch targets and interactions for mobile devices

#### Mobile-Specific Features
- **Select Dropdown Navigation:** Tab navigation converted to select dropdowns on mobile for better usability
- **Responsive Text Sizing:** Adaptive font sizes (`text-lg sm:text-xl lg:text-2xl`) for different screen sizes
- **Break-Word Handling:** Prevents text overflow on small screens with `break-words` utility
- **Responsive Spacing:** Optimized padding, margins, and gaps for mobile devices
- **Mobile-Optimized Filters:** Date filters and navigation controls adapted for mobile screens

#### Loading States
- **Skeleton loading** for initial page load
- **Spinner indicators** for data refresh
- **Progressive loading** for large datasets
- **Error boundaries** with retry mechanisms

#### Navigation
- **URL-based tab state** for bookmarking and sharing
- **Breadcrumb navigation** for deep-linking
- **Back button support** for browser navigation
- **Keyboard navigation** for accessibility

## Performance Optimizations

### Data Loading
- **Lazy loading** for tab content
- **Pagination** for large datasets
- **Debounced search** to prevent excessive API calls
- **Caching strategies** for frequently accessed data

### Component Optimization
- **React.memo** for expensive components
- **useMemo** for complex calculations
- **useCallback** for event handlers
- **Code splitting** for tab components

### Memory Management
- **Cleanup on unmount** for subscriptions and timers
- **Efficient re-renders** with proper dependency arrays
- **State normalization** for complex data structures

## Security & Permissions

### Access Control
- **Role-based permissions** (admin, manager, user)
- **Resource-level permissions** for specific locations
- **Tab visibility** based on user permissions
- **Data filtering** based on user access rights

### Data Protection
- **Input sanitization** for all user inputs
- **API endpoint protection** with authentication
- **Sensitive data masking** for unauthorized users
- **Audit logging** for all report access

## Error Handling

### User-Friendly Errors
- **Clear error messages** for common issues
- **Retry mechanisms** for failed requests
- **Fallback content** for missing data
- **Progress indicators** for long-running operations

### Developer Experience
- **Comprehensive logging** for debugging
- **Error boundaries** to prevent crashes
- **Development warnings** for common mistakes
- **Performance monitoring** for optimization opportunities

## Future Enhancements

### Planned Features
- **Scheduled reports** with email delivery
- **Custom dashboard creation** for users
- **Advanced analytics** with ML predictions
- **Mobile app** for on-the-go reporting

### Performance Improvements
- **Server-side rendering** for faster initial load
- **CDN integration** for static assets
- **Database optimization** for complex queries
- **Caching layers** for frequently accessed data

## Related Documentation

- [Dashboard](dashboard.md) - Main dashboard functionality
- [Locations](locations.md) - Location management
- [Cabinets](cabinets.md) - Machine/cabinet management
- [Members](members.md) - Member management system

## Dependencies

- **React 18+** for component architecture
- **Next.js 15** for SSR and routing
- **TypeScript** for type safety
- **Zustand** for state management
- **Framer Motion** for animations
- **Chart.js/Recharts** for data visualization
- **Sonner** for toast notifications
