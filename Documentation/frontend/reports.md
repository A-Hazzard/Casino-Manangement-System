# Reports Frontend Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Reports frontend system provides comprehensive analytics and reporting capabilities for gaming locations, machines, and revenue analysis. It includes interactive dashboards, data visualization, and export functionality with full mobile responsiveness.

## Core Components

### 1. LocationsTab Component
**File:** `components/reports/tabs/LocationsTab.tsx`

The main reports interface with three primary tabs:
- **Overview**: Interactive map, metrics overview, and top 5 locations
- **SAS Evaluation**: SAS-specific location analysis and filtering
- **Revenue Analysis**: Comprehensive revenue metrics and analysis

#### Key Features:
- **Interactive Location Selection**: Multi-select dropdown for filtering data
- **Real-time Data Visualization**: Charts and metrics using Recharts
- **Export Functionality**: CSV export for all report types
- **Responsive Design**: Mobile and desktop optimized layouts
- **Default All Locations**: Shows all locations with financial data by default before selection

### 2. SAS Evaluation and Revenue Analysis Tabs

### SAS Evaluation Tab
- **Purpose**: Evaluates performance of SAS-enabled locations only
- **Backend Filtering**: Uses `sasEvaluationOnly=true` parameter in API call to `/api/locationAggregation`
- **MongoDB Pipeline**: Filters locations at the database level using `$match: { "sasMachines": { $gt: 0 } }`
- **Location Selection**: Dropdown shows only locations with SAS machines (filtered by backend)
- **Selection Limit**: Maximum 5 locations can be selected
- **Data Display**: Shows all locations with financial data by default, then filters to selected locations
- **Default Behavior**: When no locations are selected, displays all SAS locations with financial data

### Revenue Analysis Tab
- **Purpose**: Analyzes revenue across all locations (both SAS and non-SAS)
- **Backend Filtering**: No filtering applied - returns all locations
- **Location Selection**: Dropdown shows all available locations
- **Selection Limit**: Maximum 5 locations can be selected
- **Data Display**: Shows all locations with financial data by default, then filters to selected locations
- **Default Behavior**: When no locations are selected, displays all locations with financial data

### SAS Determination Logic
- **Machine Level**: Each machine has an `isSasMachine` boolean field
- **Backend Aggregation**: 
  - `sasMachines`: Count of machines where `isSasMachine = true`
  - `nonSasMachines`: Count of machines where `isSasMachine = false`
- **Location Classification**: A location is considered SAS if `sasMachines > 0`
- **Database Query**: Uses MongoDB aggregation pipeline to filter at the database level for better performance

### 3. Data Flow Architecture

#### API Integration
```typescript
// Primary data source with default all locations behavior
const response = await axios.get("/api/locationAggregation", { 
  params: {
    ...otherParams,
    basicList: false,  // Ensures all locations with financial data are returned
    showAllLocations: true  // Default behavior for financial data
  }
});
const { data: allLocations, pagination } = response.data;

// Data normalization
const normalizedLocations = allLocations.map((loc: any) => ({
  ...loc,
  gross: loc.gross || 0,
  locationName: loc.locationName || loc.name || loc.location || "Unknown",
}));
```

#### State Management
```typescript
// Core state
const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
const [allLocationsForDropdown, setAllLocationsForDropdown] = useState<AggregatedLocation[]>([]);
const [paginatedLocations, setPaginatedLocations] = useState<AggregatedLocation[]>([]);

// Loading states
const [metricsLoading, setMetricsLoading] = useState(true);
const [locationsLoading, setLocationsLoading] = useState(true);
const [paginationLoading, setPaginationLoading] = useState(true);
```

### 4. Location Selection System

#### Multi-Select Component
**File:** `components/ui/common/LocationMultiSelect.tsx`

Features:
- **Searchable Dropdown**: Filter locations by name
- **Multi-Selection**: Select up to 5 locations
- **Visual Feedback**: Selected locations highlighted
- **Validation**: Prevents selection beyond limit

#### Selection Logic
```typescript
// SAS Evaluation: Only SAS locations
const sasLocations = allLocationsForDropdown.filter((loc) => loc.sasMachines > 0);

// Revenue Analysis: All locations
const allLocations = allLocationsForDropdown;

// Selection validation
onSelectionChange={(newSelection) => {
  if (newSelection.length <= 5) {
    setSelectedLocations(newSelection);
  } else {
    toast.error("Maximum 5 locations can be selected");
  }
}}

// Default behavior: Show all locations with financial data
const displayLocations = selectedLocations.length > 0 
  ? filteredData 
  : allLocations.filter(loc => loc.gross > 0 || loc.moneyIn > 0);
```

### 5. Data Visualization Components

#### Charts
- **HandleChart**: Revenue trends over time
- **WinLossChart**: Win/loss analysis
- **JackpotChart**: Jackpot trends
- **PlaysChart**: Game play analysis
- **SimpleChart**: Generic chart component

#### Tables
- **EnhancedLocationTable**: Comprehensive location metrics with mobile card view
- **RevenueAnalysisTable**: Revenue-focused data display with mobile responsiveness
- **TopMachinesTable**: Top performing machines with mobile card layout

### 6. Export System

#### Export Utilities
**File:** `lib/utils/exportUtils.ts`

Features:
- **CSV Export**: Structured data export
- **Multiple Formats**: Support for different export types
- **Metadata**: Export includes generation timestamp and filters

#### Export Functions
```typescript
const handleExportSASEvaluation = async () => {
  const exportDataObj = {
    title: "SAS Evaluation Report",
    headers: ["Location ID", "Location Name", "SAS Machines", "Non-SAS Machines", ...],
    data: filteredData.map((loc) => [...]),
    summary: [...],
    metadata: {...}
  };
  await exportData(exportDataObj, "csv");
};
```

### 7. Responsive Design

#### Breakpoint Strategy
- **Mobile (< md)**: Stacked layout, simplified navigation, card-based tables
- **Tablet (md-lg)**: Grid layouts, enhanced navigation
- **Desktop (lg+)**: Full feature set, side-by-side layouts, traditional tables

#### Mobile-First Responsive Tables
All table components implement mobile card views:

```typescript
// Desktop Table View
<div className="hidden md:block">
  <Table>
    {/* Traditional table structure */}
  </Table>
</div>

// Mobile Card View
<div className="md:hidden space-y-4">
  {/* Tiny screens: Single column */}
  <div className="block sm:hidden">
    {data.map(item => (
      <Card key={item.id} className="p-4">
        {/* Single column card layout */}
      </Card>
    ))}
  </div>
  
  {/* Small screens: Two column grid */}
  <div className="hidden sm:grid sm:grid-cols-2 gap-4">
    {data.map(item => (
      <Card key={item.id} className="p-4">
        {/* Two column card layout */}
      </Card>
    ))}
  </div>
</div>
```

#### Navigation Patterns
```typescript
// Desktop: Tab-based navigation
<TabsList className="hidden md:grid w-full grid-cols-3">
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="location-evaluation">SAS Evaluation</TabsTrigger>
  <TabsTrigger value="location-revenue">Revenue Analysis</TabsTrigger>
</TabsList>

// Mobile: Dropdown navigation
<select className="md:hidden" value={activeTab} onChange={...}>
  <option value="overview">Overview</option>
  <option value="location-evaluation">SAS Evaluation</option>
  <option value="location-revenue">Revenue Analysis</option>
</select>
```

#### Status Icons
**File:** `components/ui/common/StatusIcon.tsx`

Replaces text-based online/offline badges with visual icons:
```typescript
<StatusIcon isOnline={machine.isOnline} size="sm" />
```

Features:
- **Visual Indicators**: Green circle for online, red circle for offline
- **Multiple Sizes**: sm, md, lg variants
- **Accessibility**: Screen reader support with sr-only text
- **Consistent Styling**: Used across all machine status displays

### 8. Mobile Responsiveness Implementation

#### Machines Tab Responsiveness
**File:** `components/reports/tabs/MachinesTab.tsx`

All subtabs (Overview, Performance Analysis, Evaluation, Offline Machines) implement:

- **Desktop Tables**: `hidden md:block` breakpoint
- **Mobile Cards**: `md:hidden` with responsive layouts
- **Tiny Screens**: Single column layout (`block sm:hidden`)
- **Small Screens**: Two column grid (`hidden sm:grid sm:grid-cols-2`)
- **Action Buttons**: Responsive compare/export/refresh buttons with condensed text
- **Status Icons**: Visual online/offline indicators instead of text badges

#### Meters Tab Responsiveness
**File:** `components/reports/tabs/MetersTab.tsx`

- **Consistent Breakpoints**: Uses `md:` breakpoint for desktop/mobile views
- **Mobile Card View**: Responsive card layout for meter data
- **Skeleton Loading**: Responsive skeleton loaders

#### Sidebar Responsiveness
**File:** `components/layout/AppSidebar.tsx`

- **Text Visibility**: Fixed white text on white background issue
- **Dark Mode Support**: Proper contrast in both light and dark themes
- **Mobile Navigation**: Collapsible sidebar with proper text colors

### 9. Performance Optimization

#### Caching Strategy
- **API Response Caching**: 5-minute cache for location data
- **Component Memoization**: React.memo for expensive components
- **Lazy Loading**: Charts and tables load on demand

#### Data Loading
```typescript
// Two-phase loading for better UX
const fetchAllLocationDataAsync = async () => {
  // Phase 1: Fast gaming locations (for map)
  await fetchGamingLocationsAsync();
  
  // Phase 2: Comprehensive metrics (slower)
  const response = await axios.get("/api/locationAggregation", { params });
  // Process and set data...
};
```

### 10. Error Handling

#### Graceful Degradation
- **API Failures**: Fallback to empty data with error messages
- **Loading States**: Skeleton loaders during data fetch
- **Validation**: Input validation with user feedback

#### Error Boundaries
```typescript
// Toast notifications for user feedback
try {
  await exportData(exportDataObj, "csv");
  toast.success("Report exported successfully");
} catch (error) {
  toast.error("Failed to export report");
  console.error("Export error:", error);
}
```

### 11. Testing Considerations

#### Component Testing
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Data flow between components
- **E2E Tests**: Complete user workflows

#### Data Validation
- **Type Safety**: TypeScript interfaces for all data structures
- **Runtime Validation**: Zod schemas for API responses
- **Error Boundaries**: Catch and handle unexpected errors

## Related Documentation

- [Reports Backend API](backend/reports-api.md)
- [Location Aggregation](backend/locations-machines-api.md)
- [Analytics API](backend/analytics-api.md)
- [Export Utilities](../lib/utils/exportUtils.md)

## Development Guidelines

### Code Organization
- **Component Structure**: Single responsibility principle
- **State Management**: Local state for UI, global state for data
- **Type Safety**: Strict TypeScript usage throughout
- **Performance**: Optimize for large datasets and real-time updates

### Best Practices
- **Accessibility**: ARIA labels and keyboard navigation
- **Internationalization**: Prepare for multi-language support
- **Security**: Input sanitization and output encoding
- **Maintainability**: Clear component interfaces and documentation
- **Mobile-First**: Design for mobile devices first, then enhance for desktop
- **Responsive Breakpoints**: Use consistent `md:` breakpoints for desktop/mobile views
- **Visual Status Indicators**: Use icons instead of text for status displays
