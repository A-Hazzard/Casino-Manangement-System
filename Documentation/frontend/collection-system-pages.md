# Collection System Frontend Pages Documentation

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: August 29th, 2025

## Overview

The Collection System frontend consists of three main pages that work together to provide a complete collection management solution. Each page serves a specific purpose in the collection workflow.

---

## Page 1: Collection Report Main Page (`/collection-report`)

### Purpose
The main dashboard for viewing, filtering, and managing collection reports. This is the central hub where users can see all collection reports and access different views of the data.

### URL Structure
- Base URL: `/collection-report`
- With section: `/collection-report?section=monthly`
- With filters: `/collection-report?section=collection&timePeriod=7d`

### Tabs and Sections

#### 1. Collection Tab (Default)
**Purpose**: Lists all individual collection reports with filtering and search capabilities

**Data Source**: 
- Fetches from `/api/collectionReport` endpoint
- Shows collection reports from `collectionreport` database collection
- Displays machine counts in format "collected/total" (e.g., "5/50")

**Features**:
- **Date Filtering**: Today, Yesterday, Last 7 days, Last 30 days, Custom range
- **Location Filtering**: Dropdown to filter by specific locations
- **Search**: Text search across report data
- **Pagination**: Handles large datasets with page navigation
- **Create Button**: Opens modal to create new collection reports

**Display Format**:
- Desktop: Table view with columns for location, date, amounts, machine count
- Mobile: Card view with key information displayed

#### 2. Monthly Tab
**Purpose**: Shows monthly aggregated collection data across all locations

**Data Source**:
- Fetches from `/api/collectionReport` with date range parameters
- Aggregates data by month and location
- Shows summary totals and detailed breakdowns

**Features**:
- **Date Range Selection**: Custom date picker for monthly periods
- **Location Filtering**: Filter by specific locations
- **Summary Cards**: Total drop, gross, cancelled credits, SAS gross
- **Detailed Table**: Breakdown by location and date

**Display Format**:
- Summary cards at top showing totals
- Detailed table below with location breakdowns
- Pagination for large datasets

#### 3. Manager Tab
**Purpose**: Displays manager schedules and collection assignments

**Data Source**:
- Fetches scheduler data from `/api/schedulers`
- Shows collection assignments and schedules
- Displays collector assignments

**Features**:
- **Location Filtering**: Filter by specific locations
- **Collector Filtering**: Filter by assigned collectors
- **Status Filtering**: Filter by collection status
- **Reset Filters**: Clear all filters button

**Display Format**:
- Table showing schedules, assignments, and status
- Filter controls at top
- Responsive design for mobile

#### 4. Collector Tab
**Purpose**: Shows collector schedules and their assigned collections

**Data Source**:
- Fetches collector schedule data
- Shows individual collector assignments
- Displays collection status and progress

**Features**:
- **Location Filtering**: Filter by collection locations
- **Collector Filtering**: Filter by specific collectors
- **Status Filtering**: Filter by collection status
- **Reset Filters**: Clear all filters button

**Display Format**:
- Table showing collector assignments and status
- Filter controls for easy navigation
- Mobile-responsive design

### Navigation and State Management
- **URL Persistence**: Tab selection is saved in URL parameters
- **Browser Navigation**: Back/forward buttons work with tab state
- **Page Refresh**: Maintains current tab and filters on refresh
- **Loading States**: Shows loading indicators during data fetching

---

## Page 2: Collection Report Detail Page (`/collection-report/report/[reportId]`)

### Purpose
Detailed view of a specific collection report showing machine-level data, location metrics, and SAS comparisons.

### URL Structure
- Base URL: `/collection-report/report/[reportId]`
- With section: `/collection-report/report/[reportId]?section=location`

### Data Source
- **Report Data**: Fetches from `/api/collection-report/[reportId]`
- **Collections Data**: Individual collection records from `collections` collection
- **Machine Data**: Machine details and metrics
- **SAS Data**: SAS system metrics for comparison

### Tabs and Sections

#### 1. Machine Metrics Tab (Default)
**Purpose**: Shows individual machine collection data

**Data Displayed**:
- Machine ID and name
- Drop and cancelled amounts
- Meters gross vs SAS gross
- Variation between systems
- SAS time periods

**Features**:
- **Pagination**: Handles large numbers of machines
- **Search**: Find specific machines
- **Sorting**: Sort by various metrics
- **Export**: Export machine data

**Display Format**:
- Desktop: Table with detailed columns
- Mobile: Card layout with key metrics

#### 2. Location Metrics Tab
**Purpose**: Shows aggregated location-level financial data

**Data Displayed**:
- **Location Total**: Overall drop, gross, and variation
- **Financial Details**: 
  - Variance and variance reason
  - Amount to collect vs collected amount
  - Taxes, advance, and balance information
  - Location revenue and uncollected amounts
- **Machine Count**: Shows "collected/total" format (e.g., "5/50")
- **Balance Information**: Previous and current balance owed
- **Corrections**: Balance corrections and reasons

**Features**:
- **Financial Summary**: Key metrics at top
- **Detailed Breakdown**: Comprehensive financial data
- **Color Coding**: Visual indicators for positive/negative amounts

**Display Format**:
- Desktop: Grid layout with summary and details
- Mobile: Stacked cards with clear sections

#### 3. SAS Metrics Compare Tab
**Purpose**: Compares SAS system data with meter data

**Data Displayed**:
- SAS drop total
- SAS cancelled total
- SAS gross total
- Comparison with meter data

**Features**:
- **Side-by-side Comparison**: SAS vs meter data
- **Variance Analysis**: Shows differences between systems
- **Time Period Display**: SAS data time ranges

**Display Format**:
- Simple table showing SAS totals
- Clear comparison with meter data

### Navigation and State Management
- **URL Persistence**: Tab selection saved in URL parameters
- **Sync Functionality**: Button to sync meter data
- **Loading States**: Shows loading during data operations
- **Error Handling**: Displays errors with retry options

---

## Page 3: New Collection Modal

### Purpose
Interface for creating new collection reports. This modal allows users to collect money from multiple machines and generate a comprehensive report.

### Data Flow
1. **Location Selection**: User selects a gaming location
2. **Machine Selection**: User selects machines from that location
3. **Data Entry**: User enters meter readings and financial data
4. **Collection Creation**: System creates individual collections
5. **Report Generation**: System generates collection report

### Sections

#### 1. Location and Machine Selection
**Purpose**: Select location and machines for collection

**Features**:
- **Location Dropdown**: Select from available locations
- **Machine List**: Shows machines available at selected location
- **Machine Status**: Indicates which machines are already collected
- **Search**: Search for specific machines

**Data Source**:
- Locations from `gaminglocations` collection
- Machines from `machines` collection
- Existing collections to show status

#### 2. Machine Data Entry
**Purpose**: Enter meter readings and collection data for each machine

**Fields**:
- **Collection Time**: When the collection was performed
- **Meters In**: Current meter reading for money in
- **Meters Out**: Current meter reading for money out
- **Previous Readings**: Shows previous meter readings
- **Notes**: Additional notes about the collection
- **RAM Clear**: Checkbox for RAM clear status

**Features**:
- **Validation**: Ensures meter readings are valid numbers
- **Previous Data**: Shows previous collection data
- **Auto-calculation**: Calculates movement from previous readings
- **Edit Mode**: Edit existing collections in the list

#### 3. Financial Data Entry
**Purpose**: Enter shared financial data for the collection report

**Fields**:
- **Taxes**: Tax amount
- **Advance**: Advance payment amount
- **Variance**: Variance amount and reason
- **Previous Balance**: Previous balance owed
- **Collected Amount**: Actual amount collected
- **Balance Correction**: Correction amount and reason
- **Shortage Reason**: Reason for any shortage

**Features**:
- **Auto-calculation**: Amount to collect and balance correction calculated automatically
- **Validation**: Ensures all required fields are filled
- **Real-time Updates**: Calculations update as you type

#### 4. Collected Machines List
**Purpose**: Shows machines that have been added to the collection

**Features**:
- **Machine Summary**: Shows key data for each collected machine
- **Edit/Delete**: Edit or remove machines from the list
- **Status Indicators**: Shows completion status
- **Loading States**: Shows processing status

### State Management
- **Processing States**: Disables inputs during processing
- **Validation**: Real-time validation of all inputs
- **Error Handling**: Shows errors with clear messages
- **Success Feedback**: Confirms successful operations

---

## Common Features Across All Pages

### 1. Responsive Design
- **Desktop**: Full-featured layouts with tables and detailed views
- **Mobile**: Optimized card layouts and touch-friendly interfaces
- **Tablet**: Adaptive layouts that work on medium screens

### 2. Loading States
- **Skeleton Loaders**: Show while data is loading
- **Progress Indicators**: Show during long operations
- **Error States**: Clear error messages with retry options

### 3. Data Filtering and Search
- **Date Filters**: Consistent date filtering across pages
- **Location Filters**: Filter by gaming locations
- **Text Search**: Search across relevant data
- **Advanced Filters**: Additional filtering options where needed

### 4. Navigation
- **URL State**: All pages maintain state in URL parameters
- **Breadcrumbs**: Clear navigation paths
- **Back Buttons**: Easy navigation back to previous pages
- **Tab Persistence**: Tab selection maintained across page refreshes

### 5. Data Export and Actions
- **Export Functions**: Export data in various formats
- **Bulk Actions**: Perform actions on multiple items
- **Print Views**: Print-friendly layouts
- **Share Functions**: Share reports and data

---

## Data Flow Summary

### Collection Creation Flow
1. **User opens modal** → Location and machine data loaded
2. **User selects machines** → Machine details displayed
3. **User enters data** → Validation and calculations performed
4. **User submits** → Collections created, report generated
5. **Success** → Modal closes, main page refreshes

### Report Viewing Flow
1. **User navigates to main page** → Collection reports loaded
2. **User filters/searches** → Data filtered and displayed
3. **User clicks report** → Detail page loads with report data
4. **User switches tabs** → Different views of same data shown
5. **User refreshes** → Current tab and filters maintained

### Data Synchronization
- **Real-time Updates**: Data updates automatically when changes occur
- **Manual Refresh**: Users can manually refresh data
- **Sync Functions**: Special sync functions for meter data
- **Error Recovery**: Automatic retry and error handling

---

This documentation provides a comprehensive understanding of how the collection system frontend works, from individual page functionality to overall data flow and user experience.
