# Reports Frontend Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Reports frontend system provides comprehensive analytics and reporting capabilities for gaming locations, machines, and revenue analysis. It includes interactive dashboards, data visualization, and export functionality with full mobile responsiveness.

## How the Reports System Works (Simple Explanation)

### **What the Reports System Does**
The reports system is like a **business intelligence dashboard** for your casino operations. It takes data from all your slot machines and locations and turns it into useful charts, tables, and insights that help you make business decisions.

### **Data Sources and Collections**

#### **1. Gaming Locations Collection (`gaminglocations`)**
**What it contains:**
- Information about each casino location
- Geographic coordinates for mapping
- Licensee information (which company owns the location)
- Location status and configuration

**Key fields:**
- `_id`: Unique location identifier
- `name`: Location name (e.g., "Main Casino", "Downtown Branch")
- `geoCoords`: Latitude and longitude for map display
- `rel.licencee`: Which company owns this location
- `isLocalServer`: Whether this location has a local server

#### **2. Machines Collection (`machines`)**
**What it contains:**
- Information about each slot machine
- Machine status and configuration
- Location assignment
- SMIB controller information

**Key fields:**
- `_id`: Unique machine identifier
- `gamingLocation`: Which location this machine is at
- `serialNumber`: Machine's serial number
- `assetStatus`: Whether machine is active, maintenance, etc.
- `isSasMachine`: Whether this machine has SAS (Slot Accounting System)

#### **3. Meters Collection (`meters`)**
**What it contains:**
- Raw financial data from each machine
- Historical performance readings
- Money in/out, jackpots, cancelled credits

**Key fields:**
- `machine`: Which machine this reading is from
- `readAt`: When this reading was taken
- `movement.totalCancelledCredits`: Money that was cancelled/refunded
- `movement.coinIn`: Money players put into the machine
- `movement.drop`: Money collected from the machine
- `movement.jackpot`: Jackpot amounts

### **How the Data Flow Works**

#### **Step 1: Location Data Gathering**
```javascript
// What the system does:
// 1. Gets all casino locations from the database
// 2. Filters by which company owns them (licensee)
// 3. Gets basic location info (name, coordinates, status)
// 4. Prepares this data for the map and location selection
```

#### **Step 2: Machine Data Aggregation**
```javascript
// What the system does:
// 1. For each location, finds all machines at that location
// 2. Counts how many machines are SAS vs non-SAS
// 3. Gets the current status of each machine (online/offline)
// 4. Calculates total machines and active machines per location
```

#### **Step 3: Financial Data Calculation**
```javascript
// What the system does:
// 1. For each machine, gets all meter readings for the selected time period
// 2. Adds up all the financial data:
//    - Total money put in (coinIn + drop)
//    - Total cancelled credits (totalCancelledCredits)
//    - Total jackpot amounts
// 3. Calculates gross revenue (money in minus cancelled credits)
// 4. Aggregates this data by location
```

#### **Step 4: Report Generation**
```javascript
// What the system does:
// 1. Combines location, machine, and financial data
// 2. Creates charts and tables for different views
// 3. Formats data for export (CSV files)
// 4. Displays results in the user UI
```

### **Three Main Report Types Explained**

#### **1. Overview Tab**
**What it shows:**
- Interactive map with all locations
- Top 5 performing locations
- Overall metrics summary

**How it works:**
```javascript
// Database query process:
// 1. Get all locations with their coordinates
// 2. For each location, calculate total revenue and machine count
// 3. Sort locations by performance
// 4. Return top 5 for the summary section
```

**Business Value:**
- **Quick Overview**: See your entire casino network at a glance
- **Performance Ranking**: Identify your best and worst performing locations
- **Geographic Distribution**: Understand your market coverage

#### **2. SAS Evaluation Tab**
**What it shows:**
- Performance analysis of SAS-enabled locations only
- Comparison of SAS vs non-SAS machines
- SAS-specific metrics and insights

**How it works:**
```javascript
// Database query process:
// 1. Filter locations to only include those with SAS machines
// 2. For each SAS location, separate SAS and non-SAS machine data
// 3. Calculate performance metrics for each type
// 4. Compare SAS vs non-SAS performance
```

**Business Value:**
- **SAS ROI Analysis**: See if SAS machines are performing better
- **Technology Investment**: Justify SAS implementation costs
- **Performance Optimization**: Identify which locations benefit most from SAS

#### **3. Revenue Analysis Tab**
**What it shows:**
- Comprehensive revenue analysis across all locations
- Revenue trends and patterns
- Detailed financial breakdowns

**How it works:**
```javascript
// Database query process:
// 1. Get all locations (both SAS and non-SAS)
// 2. Calculate total revenue, gross profit, and other financial metrics
// 3. Analyze trends over time
// 4. Provide detailed breakdowns by location and machine type
```

**Business Value:**
- **Financial Planning**: Understand revenue patterns and trends
- **Location Performance**: Compare profitability across locations
- **Investment Decisions**: Identify where to invest in new machines or locations

### **Database Queries in Plain English**

#### **Location Aggregation Query**
```javascript
// What the system does:
// 1. Start with all gaming locations in the database
// 2. Filter by which company owns them (if specified)
// 3. For each location:
//    - Count total machines
//    - Count SAS machines vs non-SAS machines
//    - Calculate total revenue and profit
//    - Get geographic coordinates for mapping
// 4. Return formatted data for display
```

#### **Machine Performance Query**
```javascript
// What the system does:
// 1. Find all machines at the selected locations
// 2. For each machine, get all meter readings for the time period
// 3. Calculate financial totals:
//    - Money in (coinIn + drop)
//    - Money out (cancelled credits)
//    - Gross profit (money in - money out)
//    - Jackpot amounts
// 4. Aggregate this data by location and machine type
```

#### **SAS vs Non-SAS Comparison Query**
```javascript
// What the system does:
// 1. Separate machines into SAS and non-SAS groups
// 2. Calculate performance metrics for each group:
//    - Average revenue per machine
//    - Total revenue
//    - Machine utilization rates
//    - Profit margins
// 3. Compare the two groups to show which performs better
```

### **Financial Calculations Explained**

#### **Revenue Calculation**
```javascript
// Formula: sum(coinIn + drop) for all machines in location
// Example: Location has 10 machines
// Machine 1: $1000 coinIn + $500 drop = $1500
// Machine 2: $800 coinIn + $400 drop = $1200
// ... (8 more machines)
// Total Revenue = Sum of all machines = $15,000
```

#### **Gross Profit Calculation**
```javascript
// Formula: Revenue - Cancelled Credits
// Example: Total Revenue = $15,000
// Total Cancelled Credits = $500
// Gross Profit = $15,000 - $500 = $14,500
```

#### **Machine Utilization Calculation**
```javascript
// Formula: (Active Machines / Total Machines) * 100
// Example: 8 active machines out of 10 total machines
// Utilization = (8/10) * 100 = 80%
```

### **Export Functionality**

#### **CSV Export Process**
```javascript
// What the system does:
// 1. Takes the current filtered data
// 2. Formats it into CSV structure with headers
// 3. Adds metadata (generation date, filters used)
// 4. Creates downloadable file
// 5. Triggers browser download
```

#### **Export Data Structure**
```csv
Location ID,Location Name,SAS Machines,Non-SAS Machines,Total Revenue,Gross Profit,Utilization %
loc_001,Main Casino,15,5,25000.00,24000.00,95.0
loc_002,Downtown Branch,8,12,18000.00,17200.00,88.0
```

### **Performance Optimizations**

#### **Data Loading Strategy**
- **Two-Phase Loading**: Fast location data first, then detailed metrics
- **Caching**: 5-minute cache for frequently accessed data
- **Pagination**: Load data in chunks to avoid overwhelming the system
- **Lazy Loading**: Charts and tables load only when needed

#### **Query Optimization**
- **Database Indexes**: Fast lookups by location, date, and machine type
- **Time Period Limits**: Only query relevant date ranges
- **Aggregation Pipelines**: Use MongoDB's built-in aggregation for efficiency
- **Result Caching**: Store results to avoid repeated expensive queries

### **Error Handling and Edge Cases**

#### **Missing Data Scenarios**
- **No Meter Readings**: Shows $0 for financial fields but still displays machine info
- **Offline Machines**: Clearly marked as offline with last known status
- **Invalid Coordinates**: Handles missing map data gracefully

#### **Data Validation**
- **Negative Values**: Flags and handles impossible financial data
- **Date Range Issues**: Validates date inputs and provides helpful error messages
- **Location Filtering**: Handles empty location lists gracefully

### **Business Intelligence Features**

#### **Trend Analysis**
- **Revenue Trends**: Shows how revenue changes over time
- **Machine Performance**: Tracks individual machine performance
- **Location Comparison**: Compares performance across locations

#### **Operational Insights**
- **High Cancelled Credits**: Identifies machines with frequent refunds
- **Low Utilization**: Finds underperforming machines
- **Revenue Patterns**: Shows peak hours and days

#### **Strategic Planning**
- **Investment Decisions**: Data to support new machine purchases
- **Location Expansion**: Performance data for new location planning
- **Technology Upgrades**: SAS vs non-SAS performance comparison

This reports system essentially **transforms raw casino data into actionable business intelligence** that helps you understand your operations, identify opportunities, and make informed decisions about your casino business.

## Core Components

### 1. LocationsTab Component
**File:** `components/reports/tabs/LocationsTab.tsx`

The main reports page with three primary tabs:
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

### 11. MetersTab Component

**File:** `components/reports/tabs/MetersTab.tsx`

The MetersTab displays machine-level meter readings and performance data with specific field mappings that differ from other financial reports.

#### Key Features:
- **Machine-level data**: Individual machine meter readings
- **Pagination**: Server-side pagination for large datasets  
- **Search functionality**: Search by machine ID or location
- **Export capabilities**: Export meter data to Excel/CSV
- **Location filtering**: Filter by selected gaming locations
- **Date range filtering**: Filter data by date range
- **Licensee filtering**: Filter by licensee (if applicable)
- **Financial color coding**: Green for positive values, red for negative values

#### Column Structure & Field Mappings:

⚠️ **Important**: The Meters Report uses **specific field mappings** that differ from other financial reports:

| Column | Display Name | Data Source | Casino Context |
|--------|--------------|-------------|----------------|
| **Machine ID** | "Machine ID" | `machine.serialNumber \|\| machine.custom.name \|\| machine._id` | Unique machine identifier |
| **Location** | "Location" | Location name via `gamingLocation` lookup | Physical location of machine |
| **Meters In** | "Meters In" | `machine.sasMeters.coinIn` | **Total bets placed by players** |
| **Money Won** | "Money Won" | `machine.sasMeters.coinOut` | **Automatic winnings paid to players** |
| **Jackpot** | "Jackpot" | `machine.sasMeters.jackpot` | **Special jackpot payouts** |
| **Bill In** | "Bill In" | `machine.sasMeters.drop` | **Physical cash inserted into machine** |
| **Voucher Out** | "Voucher Out" | `machine.sasMeters.totalCancelledCredits - machine.sasMeters.totalHandPaidCancelledCredits` | **Net cancelled credits (voucher-only payouts)** |
| **Hand Paid Cancelled Credits** | "Hand Paid Cancelled Credits" | `machine.sasMeters.totalHandPaidCancelledCredits` | **Manual attendant payouts** |
| **Games Played** | "Games Played" | `machine.sasMeters.gamesPlayed` | **Total number of games played** |
| **Date** | "Date" | `machine.lastActivity` | **Last machine activity timestamp** |

#### Casino Machine Context:

1. **Coin In (Meters In)**: Electronic tracking of all bets placed through SAS system (`sasMeters.coinIn`)
2. **Coin Out (Money Won)**: Automatic payouts dispensed by machine (`sasMeters.coinOut`) - excludes manual payouts
3. **Drop (Bill In)**: Physical currency inserted into bill acceptors (`sasMeters.drop`) - actual cash flow from bill validator
4. **Total Cancelled Credits**: All credits removed from machine (`sasMeters.totalCancelledCredits`) - includes vouchers + hand-paid
5. **Hand Paid Cancelled Credits**: Manual payouts by casino attendants (`sasMeters.totalHandPaidCancelledCredits`) for large wins/malfunctions
6. **Voucher Out**: Automatic ticket/voucher dispensing (calculated as `totalCancelledCredits - totalHandPaidCancelledCredits`) - excludes hand-paid credits

#### Data Processing:
- **API Endpoint**: `/api/reports/meters`
- **Data Validation**: All numeric values validated for non-negative numbers
- **Latest Meter Lookup**: Uses most recent meter reading per machine
- **Financial Formatting**: Color-coded values using `getFinancialColorClass`

#### Mobile Responsiveness:
- **Desktop**: Traditional table layout with all columns visible
- **Mobile**: Card-based layout with responsive grid
- **Pagination**: Responsive pagination controls
- **Search**: Mobile-friendly search input

### 12. Financial Calculations Analysis

#### Dashboard Tab Calculations

**Current Implementation Analysis:**

##### **Dashboard Financial Overview ✅**
- **Current Implementation**: Aggregates data from all locations and machines
- **Data Source**: `/api/metrics/meters` endpoint aggregating meter data
- **Time Period Filtering**: Today, Yesterday, Last 7 days, 30 days, Custom
- **Financial Guide**: Uses standard meter aggregation ✅ **MATCHES**

##### **Total Drop (Money In) ✅**
- **Current Implementation**: 
  ```javascript
  totalDrop = Σ(movement.drop) across all machines and locations
  ```
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Business Context**: Total physical cash collected across entire operation
- **Display**: Main dashboard card showing total money in

##### **Total Money Out (Cancelled Credits) ✅**
- **Current Implementation**: 
  ```javascript
  totalMoneyOut = Σ(movement.totalCancelledCredits) across all machines and locations
  ```
- **Financial Guide**: Uses `movement.totalCancelledCredits` field ✅ **MATCHES**
- **Business Context**: Total credits cancelled/paid out across entire operation
- **Display**: Main dashboard card showing total money out

##### **Total Gross Revenue ✅**
- **Current Implementation**: 
  ```javascript
  totalGross = totalDrop - totalMoneyOut
  ```
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Mathematical Formula**: Standard gross calculation for entire operation
- **Display**: Main dashboard card showing total gross revenue

##### **Machine Status Aggregation ✅**
- **Current Implementation**: 
  ```javascript
  totalMachines = COUNT(machines WHERE deletedAt IS NULL)
  onlineMachines = COUNT(machines WHERE lastActivity >= currentTime - 3min)
  offlineMachines = totalMachines - onlineMachines
  ```
- **Business Logic**: Real-time machine status across all locations
- ✅ **CONSISTENT** - Standard machine status calculation

##### **Location Performance Summary ✅**
- **Current Implementation**: 
  ```javascript
  // Top performing locations by gross revenue
  topLocations = ORDER BY gross DESC LIMIT 5
  ```
- **Financial Guide**: Uses `gross` for ranking ✅ **MATCHES**
- **Business Logic**: Identifies top performing locations
- **Display**: Dashboard shows top locations with performance metrics

##### **Active Players ❌**
- **Current Implementation**: Static sample data (`currentPlayers: 1847`)
- **Data Source**: Hardcoded in `sampleKpiMetrics` array
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: Real-time player count across all locations
- **Display**: KPI card showing current active players

##### **Total Games Played ❌**
- **Current Implementation**: Static sample data (`value: 45678`)
- **Data Source**: Hardcoded in `sampleKpiMetrics` array  
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: Total games played across all machines
- **Display**: KPI card with trend indicator

##### **Active Locations Count ✅**
- **Current Implementation**: 
  ```javascript
  activeLocations = COUNT(locations WHERE hasActiveMachines = true)
  ```
- **Business Logic**: Locations with at least one online machine
- **Financial Guide**: Standard location counting ✅ **CONSISTENT**
- **Display**: KPI card showing operational locations

##### **Top Performing Machines Ranking ❌**
- **Current Implementation**: Static sample data in `topPerformingMachines` array
- **Expected Logic**: 
  ```javascript
  topMachines = ORDER BY revenue DESC LIMIT 5
  // Should aggregate from actual machine data
  ```
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: Highest revenue generating machines
- **Display**: List showing top 5 machines with revenue

##### **Location Performance Map Metrics ❌**
- **Current Implementation**: Static sample data in `dashboardLocations` array
- **Expected Calculations**:
  ```javascript
  locationMetrics = {
    grossRevenue: drop - totalCancelledCredits,
    actualHoldPercentage: (grossRevenue / drop) * 100,
    onlineMachines: COUNT(machines WHERE lastActivity >= now - 3min),
    totalMachines: COUNT(machines WHERE deletedAt IS NULL)
  }
  ```
- **Financial Guide**: Uses standard gross and hold calculations ✅ **MATCHES**
- **Business Context**: Geographic performance visualization
- **Display**: Interactive map with performance indicators

##### **Real-time Metrics Update Logic ❌**
- **Current Implementation**: Static timeout-based updates (`setTimeout(..., 1000)`)
- **Expected Logic**: Should connect to live data streams or periodic API calls
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: Live operational dashboard updates
- **Display**: Real-time badges and metrics refresh

#### Machines Tab Comprehensive Calculations

**The Machines Tab contains 3 subtabs with different calculation methods:**

##### **Machines Tab Statistics Cards (All Subtabs) ✅**
- **Total Net Win (Gross)**: 
  ```javascript
  totalGross = Σ(machine.netWin) across all machines
  ```
- **Total Drop**: 
  ```javascript
  totalDrop = Σ(machine.drop) across all machines
  ```
- **Total Cancelled Credits**: 
  ```javascript
  totalCancelledCredits = Σ(machine.totalCancelledCredits) across all machines
  ```
- **Online Machines Count**: 
  ```javascript
  onlineCount = COUNT(machines WHERE isOnline = true)
  totalCount = COUNT(machines WHERE deletedAt IS NULL)
  ```
- **Financial Guide**: Uses standard aggregation methods ✅ **MATCHES**

#### Machine Overview Subtab Calculations

##### **Overview Machine Data Processing ✅**
- **Current Implementation**: 
  ```javascript
  // Frontend calculation for actual hold
  actualHold = machine.coinIn > 0 ? ((machine.coinIn - machine.coinOut) / machine.coinIn) * 100 : 0
  ```
- **Financial Guide**: `actualHold = ((coinIn - coinOut) / coinIn) * 100` ✅ **MATCHES**
- **Business Context**: Real-time hold percentage calculation
- **Display**: Overview table showing machine performance

##### **Overview Net Win Display ✅**
- **Current Implementation**: `machine.netWin` from backend aggregation
- **Financial Guide**: Uses `netWin` field ✅ **MATCHES**
- **Display**: Green/red colored based on positive/negative values

##### **Overview Drop Display ✅**
- **Current Implementation**: `machine.drop` from backend aggregation  
- **Financial Guide**: Uses `drop` field ✅ **MATCHES**
- **Display**: Yellow colored financial metric

##### **Overview Games Played ✅**
- **Current Implementation**: `machine.gamesPlayed` from backend aggregation
- **Financial Guide**: Uses `gamesPlayed` field ✅ **MATCHES**
- **Display**: Formatted with thousand separators

##### **Overview Machine ID Resolution ✅**
- **Current Implementation**: 
  ```javascript
  displayId = machine.serialNumber?.trim() || 
             machine.origSerialNumber?.trim() || 
             machine.custom?.name?.trim() || 
             machine.machineId
  ```
- **Business Logic**: Priority-based ID display with fallback
- ✅ **CONSISTENT** - Standard ID resolution pattern

#### Machine Overview Subtab Calculations

##### **Overview Statistics Cards ✅**
- **Total Net Win (Gross)**: `Σ(machine.netWin)` across filtered machines
- **Total Drop**: `Σ(machine.drop)` across filtered machines  
- **Total Cancelled Credits**: `Σ(machine.totalCancelledCredits)` across filtered machines
- **Online Machines**: `onlineCount/totalCount` ratio display
- **Financial Guide**: Uses standard aggregation methods ✅ **MATCHES**

##### **Overview Actual Hold Frontend Calculation ✅**
- **Current Implementation**: 
  ```javascript
  actualHold = machine.coinIn > 0 ? 
    ((machine.coinIn - machine.coinOut) / machine.coinIn) * 100 : 0
  ```
- **Financial Guide**: `actualHold = ((coinIn - coinOut) / coinIn) * 100` ✅ **MATCHES**
- **Business Context**: Frontend recalculation for display consistency
- **Display**: Percentage with 1 decimal place

##### **Overview Machine Table Display ✅**
- **Machine Info**: `machineName`, `manufacturer`, `serialNumber` resolution
- **Location**: `locationName` from aggregation
- **Financial Metrics**: `netWin`, `drop`, `actualHold`, `gamesPlayed`
- **Status**: `isOnline` boolean with StatusIcon component
- **Financial Guide**: Uses standard fields ✅ **MATCHES**

##### **Overview Pagination Logic ✅**
- **Current Implementation**: Backend pagination with 10 items per page
- **API Parameters**: `page`, `limit`, `search`, `locationId`, `onlineStatus`
- **Business Logic**: Server-side pagination for performance
- ✅ **CONSISTENT** - Standard pagination pattern

#### Machine Evaluation Subtab Calculations

##### **Evaluation Performance Rating Algorithm ❌**
- **Current Implementation**: 
  ```javascript
  holdDifference = actualHold - theoreticalHold
  performanceRating = {
    excellent: holdDifference >= 1,
    good: holdDifference >= 0,  
    average: holdDifference >= -1,
    poor: holdDifference < -1
  }
  ```
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: Machine performance categorization
- **Display**: Color-coded performance indicators

##### **Evaluation Average Bet Calculation ✅**
- **Current Implementation**: `avgBet = machine.coinIn / machine.gamesPlayed`
- **Financial Guide**: `avgWagerPerGame = handle / gamesPlayed` ✅ **MATCHES**
- **Mathematical Formula**: Standard average calculation
- **Display**: Dollar amount with 2 decimal places

##### **Evaluation Machine ID Resolution ✅**
- **Current Implementation**: 
  ```javascript
  displayId = machine.serialNumber?.trim() || 
             machine.origSerialNumber?.trim() || 
             machine.custom?.name?.trim() || 
             machine.machineId
  ```
- **Business Logic**: Priority-based ID display with fallback
- ✅ **CONSISTENT** - Standard ID resolution pattern

##### **Money In (Drop) ✅**
- **Current Implementation**: `machine.drop` from `$sum: { $ifNull: ["$movement.drop", 0] }`
- **Financial Guide**: Uses `movement.drop` field ✅ **MATCHES**
- **Calculation**: `drop = Σ(movement.drop)` for all meter readings in date range
- **Frontend Display**: Shows as "Money In" column with `${(machine.drop || 0).toLocaleString()}`

##### **Handle (Coin In) ✅**
- **Current Implementation**: `machine.coinIn` from `$sum: { $ifNull: ["$movement.coinIn", 0] }`
- **Financial Guide**: Uses `movement.coinIn` field ✅ **MATCHES**
- **Calculation**: `handle = Σ(movement.coinIn)` for all meter readings in date range
- **Usage**: Used for average wager calculation and hold percentage

##### **Actual Hold Percentage ✅**
- **Current Implementation**: 
  ```javascript
  holdPct: {
    $cond: [
      { $gt: [{ $ifNull: ["$meterData.coinIn", 0] }, 0] },
      { $multiply: [
        { $divide: [
          { $subtract: [
            { $ifNull: ["$meterData.coinIn", 0] }, 
            { $ifNull: ["$meterData.coinOut", 0] }
          ] }, 
          { $ifNull: ["$meterData.coinIn", 0] }
        ] }, 
        100
      ] },
      0
    ]
  }
  ```
- **Financial Guide Formula**: `actualHold% = (1 - (coinOut / coinIn)) * 100`
- **Mathematical Verification**: 
  - Current: `((coinIn - coinOut) / coinIn) * 100`
  - Guide: `(1 - (coinOut / coinIn)) * 100 = ((coinIn - coinOut) / coinIn) * 100`
  - ✅ **MATCHES** (algebraically equivalent)

##### **Theoretical Hold Percentage ✅**
- **Current Implementation**: `(1 - Number(gameConfig.theoreticalRtp)) * 100`
- **Financial Guide**: `theoreticalHoldPercent = (1 - gameConfig.theoreticalRtp) * 100`
- ✅ **MATCHES**

##### **Average Wager Per Game ✅**
- **Current Implementation**: `coinIn / gamesPlayed`
- **Financial Guide**: `avgWagerPerGame = handle / gamesPlayed`
- ✅ **MATCHES** (handle = coinIn)

##### **Gross Revenue ✅**
- **Current Implementation**: `drop - totalCancelledCredits`
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits`
- ✅ **MATCHES**

##### **Net Win ✅**
- **Current Implementation**: Same as gross (`drop - totalCancelledCredits`)
- **Financial Guide**: Primary gross calculation method
- ✅ **MATCHES**

#### Machine Offline Subtab Calculations

##### **Offline Duration Calculation ❌**
- **Current Implementation**: 
  ```javascript
  offlineDurationMs = now.getTime() - new Date(machine.lastActivity).getTime()
  offlineDurationHours = Math.max(0, offlineDurationMs / (1000 * 60 * 60))
  ```
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: How long each machine has been offline
- **Display**: Formatted as "X days Y hours Z minutes"

##### **Offline Duration Formatting ❌**
- **Current Implementation**: 
  ```javascript
  formatOfflineDuration(hours) {
    if (hours < 1) return "Less than 1 hour"
    if (hours < 24) return "X hours Y minutes"  
    return "X days Y hours Z minutes"
  }
  ```
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: Human-readable offline duration display
- **Display**: Text description of downtime

##### **Offline Machine Filtering ✅**
- **Current Implementation**: 
  ```javascript
  offlineMachines = machines.filter(machine => !machine.isOnline)
  // Backend filters by: lastActivity < (currentTime - 3 minutes)
  ```
- **Business Logic**: Standard offline detection threshold
- ✅ **CONSISTENT** - Standard machine status logic

##### **Offline Pagination Logic ✅**
- **Current Implementation**: 
  ```javascript
  paginatedOffline = offlineMachines.slice(startIndex, endIndex)
  totalPages = Math.ceil(totalCount / limit)
  ```
- **Business Logic**: Client-side pagination for offline machines
- ✅ **CONSISTENT** - Standard pagination pattern

#### Meters Tab Calculations

**Current Implementation Analysis vs Financial Metrics Guide:**

##### **Meters In (Coin In) ✅**
- **Current Implementation**: `machine.sasMeters.coinIn`
- **Financial Guide**: For recent data, use `machine.sasMeters.coinIn` ✅ **MATCHES**
- **Context**: Total bets placed by players

##### **Money Won (Coin Out) ✅**
- **Current Implementation**: `machine.sasMeters.coinOut`
- **Financial Guide**: For recent data, use `machine.sasMeters.coinOut` ✅ **MATCHES**
- **Context**: Automatic winnings paid to players

##### **Bill In (Drop) ✅**
- **Current Implementation**: `machine.sasMeters.drop`
- **Financial Guide**: For recent data, use `machine.sasMeters.drop` ✅ **MATCHES**
- **Context**: Physical cash inserted into machine

##### **Voucher Out ✅**
- **Current Implementation**: `totalCancelledCredits - totalHandPaidCancelledCredits`
- **Financial Guide**: `totalCancelledCredits - totalHandPaidCancelledCredits` ✅ **MATCHES**
- **Context**: Net cancelled credits (voucher-only payouts)

##### **Hand Paid Cancelled Credits ✅**
- **Current Implementation**: `machine.sasMeters.totalHandPaidCancelledCredits`
- **Financial Guide**: `machine.sasMeters.totalHandPaidCancelledCredits` ✅ **MATCHES**
- **Context**: Manual attendant payouts

##### **Jackpot ✅**
- **Current Implementation**: `machine.sasMeters.jackpot`
- **Financial Guide**: `machine.sasMeters.jackpot` ✅ **MATCHES**
- **Context**: Special jackpot payouts

##### **Games Played ✅**
- **Current Implementation**: `machine.sasMeters.gamesPlayed`
- **Financial Guide**: `machine.sasMeters.gamesPlayed` ✅ **MATCHES**
- **Context**: Total number of games played

##### **Meters Tab Machine ID Resolution ✅**
- **Current Implementation**: 
  ```javascript
  displayId = item.serialNumber?.trim() || 
             item.custom?.name?.trim() || 
             item.machineId
  ```
- **Business Logic**: Priority-based ID display (serialNumber > custom.name > machineId)
- ✅ **CONSISTENT** - Standard ID resolution pattern

##### **Meters Tab Date Display ✅**
- **Current Implementation**: `new Date(item.createdAt).toLocaleDateString()`
- **Data Source**: Meter reading timestamp
- **Business Context**: When the meter reading was recorded
- **Display**: Localized date format

##### **Meters Tab Pagination Logic ✅**
- **Current Implementation**: Backend pagination with 10 items per page
- **API Parameters**: `page`, `limit`, `search`, `locations`, `startDate`, `endDate`
- **Business Logic**: Server-side pagination for large datasets
- ✅ **CONSISTENT** - Standard pagination pattern

##### **Meters Tab Search Logic ✅**
- **Current Implementation**: 
  ```javascript
  // Backend search covers: serialNumber, custom.name, location name
  searchParams.append("search", searchTerm)
  ```
- **Business Logic**: Multi-field search with backend processing
- ✅ **COMPREHENSIVE** - Covers all relevant searchable fields

#### Locations Tab Comprehensive Calculations

**Current Implementation Analysis vs Financial Metrics Guide:**

##### **Location Metrics Overview Cards ✅**
- **Total Gross Revenue**: 
  ```javascript
  totalGross = locations.reduce((sum, loc) => sum + (loc.gross || 0), 0)
  ```
- **Total Drop (Money In)**: 
  ```javascript
  totalDrop = locations.reduce((sum, loc) => sum + (loc.moneyIn || 0), 0)
  ```
- **Total Cancelled Credits**: 
  ```javascript
  totalCancelledCredits = locations.reduce((sum, loc) => sum + (loc.moneyOut || 0), 0)
  ```
- **Financial Guide**: Uses standard aggregation ✅ **MATCHES**

##### **Individual Location Gross Revenue ✅**
- **Current Implementation**: `moneyIn - moneyOut` where:
  - `moneyIn = Σ(movement.drop)` across all machines at location
  - `moneyOut = Σ(movement.totalCancelledCredits)` across all machines at location
- **Financial Guide**: `Gross = Drop - Total Cancelled Credits` ✅ **MATCHES**
- **Aggregation**: Sums across all machines within the location for the time period

##### **Location Hold Percentage Calculation ✅**
- **Current Implementation**: 
  ```javascript
  holdPercentage = (loc.moneyIn > 0) ? (loc.gross / loc.moneyIn) * 100 : 0
  ```
- **Financial Guide**: `holdPercent = (gross / drop) * 100` ✅ **MATCHES**
- **Mathematical Formula**: Standard hold percentage calculation
- **Display**: Percentage with decimal precision

##### **Top 5 Locations Ranking Algorithm ✅**
- **Current Implementation**: 
  ```javascript
  topLocations = locations
    .sort((a, b) => (b.gross || 0) - (a.gross || 0))
    .slice(0, 5)
  ```
- **Financial Guide**: Uses `gross` for ranking ✅ **MATCHES**
- **Business Context**: Identifies highest performing locations
- **Display**: Sorted list with performance metrics

##### **Location Machine Status Aggregation ✅**
- **Current Implementation**: 
  ```javascript
  onlineMachines = COUNT(machines WHERE lastActivity >= now - 3min AND locationId = location.id)
  totalMachines = COUNT(machines WHERE deletedAt IS NULL AND locationId = location.id)
  ```
- **Business Logic**: Real-time machine status per location
- ✅ **CONSISTENT** - Standard machine status calculation

##### **Location Charts Data Processing ❌**
- **Current Implementation**: Uses filtered location data for chart visualization
- **Chart Types**: Revenue trends, SAS vs Non-SAS comparison, performance analysis
- **Data Source**: Same location aggregation data used for tables
- **Financial Guide**: Not defined in guide ❌ **NOT IN GUIDE**
- **Business Context**: Visual representation of location performance
- **Display**: Interactive charts with revenue and machine data

##### **Location Top Machines per Location ❌**
- **Current Implementation**: 
  ```javascript
  topMachinesPerLocation = machines
    .filter(machine => machine.locationId === selectedLocation)
    .sort((a, b) => (b.netWin || 0) - (a.netWin || 0))
    .slice(0, 5)
  ```
- **Financial Guide**: Uses `netWin` for ranking ✅ **MATCHES**
- **Business Context**: Best performing machines within each location
- **Display**: Table showing top machines with revenue metrics

##### **Location Search and Filtering Logic ✅**
- **Current Implementation**: 
  ```javascript
  filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.locationName.toLowerCase().includes(searchTerm.toLowerCase())
  )
  ```
- **Business Logic**: Text-based location search
- ✅ **COMPREHENSIVE** - Covers multiple name fields

##### **Location SAS Machine Classification ✅**
- **Current Implementation**: 
  ```javascript
  sasEnabled = loc.hasSasMachines || (loc.sasMachines > 0)
  ```
- **Business Logic**: Location has SAS capability if any machines are SAS-enabled
- ✅ **CONSISTENT** - Standard SAS classification logic

### 13. Testing Considerations

#### Component Testing
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Data flow between components
- **E2E Tests**: Complete user workflows

#### Data Validation
- **Type Safety**: TypeScript types for all data structures
- **Runtime Validation**: Zod schemas for API responses
- **Error Boundaries**: Catch and handle unexpected errors

#### Financial Calculation Testing
- **Formula Verification**: All calculations match financial metrics guide
- **Edge Cases**: Handle division by zero, missing data
- **Data Integrity**: Validate calculations against source data

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
- **Maintainability**: Clear component APIs and documentation
- **Mobile-First**: Design for mobile devices first, then enhance for desktop
- **Responsive Breakpoints**: Use consistent `md:` breakpoints for desktop/mobile views
- **Visual Status Indicators**: Use icons instead of text for status displays
