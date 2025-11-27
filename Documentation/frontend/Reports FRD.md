# Reports Module Functional Requirements

## Table of Contents

- [Overview](#overview)
- [Functional Requirements](#functional-requirements)
- [Report Types](#report-types)
- [Current Implementation](#current-implementation)
- [Business Logic and Calculations](#business-logic-and-calculations)
  - [Locations Tab Table Structure](#521-location-overview-table-structure)
  - [Locations Tab Export Functionality](#522-locations-tab-export-functionality)
- [Data Flow and Processing](#data-flow-and-processing)
- [Technical Architecture](#technical-architecture)
- [Performance Considerations](#performance-considerations)
- [Future Enhancements](#future-enhancements)

## Overview

This document outlines the core functional requirements for the Reports Module within the Evolution One Casino Management System. The module provides comprehensive reporting capabilities for financial monitoring, machine performance analysis, customer data insights, and operational oversight across all casino locations.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 27, 2025  
**Version:** 2.2.0

### Purpose

Enable efficient monitoring of financials, machine performance, customer data, and site operations across all locations through comprehensive reporting tools.

## 2. Functional Requirements

Each report listed below should support the ability to:

- Filter by date range, location, licensee, and other relevant parameters
- View on screen with pagination and sorting
- Export to CSV and Excel formats with real-time data fetching
- Interactive date range selection with custom calendar picker
- Real-time data updates and refresh capabilities
- Responsive design for desktop and mobile viewing
  2.1. Daily Counts and Voucher Reports
  • Summarize daily meter readings and physical cash counts
  • Include voucher issuance and redemptions
  • Track variances between expected vs actual counts
  2.2. Active Customer Count
  • Display how many customers are currently registered and/or active
  • Include filters for date range and location (e.g., by sign-in records)
  • Optionally show trends over time (weekly/monthly)
  2.3. Location Statistics Summary
  • Show performance metrics per location:
  o Machine count
  o Online/offline breakdown
  o Total daily intake and payouts
  o Net revenue and uptime
  2.4. Bar & Concession Performance
  • Generate revenue tracking for bar/concession POS areas (if integrated)
  • Support daily, weekly, and monthly views
  • Display trends over selected periods
  2.5. Machine Cash Intake and Performance
  • Show performance metrics for each machine:
  o Money in/out
  o Play count
  o Average play duration
  o Total income generated
  • Allow comparisons across locations and types
  2.6. Location Cash Balances
  • Display cash on hand per location
  • Include both opening and closing balances
  • Support reconciliation with machine counts and collection entries
  2.7. Daily Cash Snapshot (Needs Further Planning)
  • Framework for defining and capturing daily start/end cash flows
  • May require new input screens or syncing with collection data
  • Stakeholder planning session needed to finalize flow
  2.8. Financial Performance of Machines and Games
  • Breakdown revenue and net performance by:
  o Machine ID
  o Game type or game name
  • Include payout ratio, hold percentage, and earnings per game
  2.9. Terminal Counts by Manufacturer and Game Type
  • Show how many terminals exist per:
  o Manufacturer (e.g., Novomatic, IGT)
  o Machine type (e.g., Roulette, Fruit, Video Slots)
  • Support grouping and exporting by type

---

3. Design Notes & Next Steps
   • Reports will be accessible under the redesigned Reports tab
   • Each report will include responsive layouts for desktop and mobile
   • Data should update in near real-time where possible
   • Stakeholders (Vanessa, Sylvia, Kevin) will review and prioritize report types for MVP delivery
   • Further feedback will be gathered during QA and beta testing to iterate layout and filtering

## 4. Current Implementation Status

### 4.1. Implemented Features (✅)

• **Multi-Tab Report Interface**: Dashboard, Locations, Machines, and Meters tabs
• **Date Filtering System**: Predefined periods (Today, Yesterday, Last 7 days, 30 days) and custom date range picker
• **Licensee Filtering**: Filter all reports by specific licensee or view all licensees
• **Export Functionality**: CSV and Excel export with real-time data fetching from API
• **Responsive Design**: Desktop and mobile optimized layouts
• **Real-time Data**: Live data updates and manual refresh capabilities
• **Permission-based Access**: Role-based access control for different report types
• **Interactive Navigation**: Tab-based navigation with URL state management

### 4.2. Report Types Currently Available

• **Dashboard Tab**: Overview metrics and KPIs across all operations
• **Locations Tab**: Location-specific performance analysis and comparisons
• **Machines Tab**: Individual machine performance and revenue tracking  
• **Meters Tab**: Meter readings and financial data by location

### 4.3. Export Implementation Details

• **Data Source**: Direct API calls to `/api/reports/locations` endpoint (Locations Tab) and other report-specific endpoints
• **Export Formats**: PDF and Excel (XLSX) with proper file naming
• **Data Scope**: Exports all data matching current filters (date range, licensee, report type, selected locations)
• **File Naming**: Automatic naming with report type and date (e.g., `Location Overview Report - Today - 2025-01-20`)
• **Error Handling**: Comprehensive error handling with user feedback via toast notifications
• **Performance**: Optimized for large datasets with loading state management
• **Detailed Documentation**: See [Locations Tab Export Functionality](#522-locations-tab-export-functionality) for comprehensive export details

### 4.4. Technical Architecture

• **Frontend**: React-based UI with Zustand state management
• **API Integration**: RESTful API calls with proper authentication
• **Data Processing**: Server-side data aggregation and formatting
• **File Generation**: Client-side file creation and download handling
• **State Management**: Synchronized state between dashboard and reports modules

## 5. Business Logic and Calculations

### 5.1. Dashboard Tab Calculations

**Financial Metrics:**

- **Total Revenue**: Sum of all machine revenue across selected locations and time period
- **Average Revenue per Machine**: Total revenue divided by active machine count
- **Revenue Growth**: Percentage change compared to previous period
- **Top Performing Machines**: Ranked by revenue with location context

**Operational Metrics:**

- **Machine Uptime**: Percentage of time machines are online vs offline
- **Collection Efficiency**: Ratio of collected amounts to expected amounts
- **Location Performance**: Revenue comparison across different gaming locations

### 5.2. Locations Tab Calculations

**Location Performance Metrics:**

- **Total Revenue per Location**: Aggregated revenue from all machines at each location
- **Machine Count**: Total machines vs active machines per location
- **Revenue per Machine**: Average revenue generated per machine at each location
- **Uptime Percentage**: Percentage of time machines are operational

**SAS Evaluation:**

- **Variance Analysis**: Difference between SAS system data and meter readings
- **Accuracy Percentage**: How closely SAS data matches actual meter data
- **Discrepancy Tracking**: Identification of locations with significant variances

**Revenue Analysis:**

- **Hourly Revenue Patterns**: Revenue distribution throughout the day
- **Peak Performance Times**: Identification of highest revenue periods
- **Trend Analysis**: Revenue growth or decline over time periods

#### 5.2.1. Location Overview Table Structure

The Locations Tab (`/reports?section=locations`) displays a comprehensive table showing location performance metrics. The table structure is as follows:

**Table Columns:**

1. **Location Name** - The name of the gaming location
2. **Total Machines** - Total number of machines at the location (including offline)
3. **Online Machines** - Number of machines currently online (active within last 3 minutes)
4. **Drop** - Total money in (physical cash inserted) across all machines at the location
   - Formula: `Σ(movement.drop)` for all machines at location
   - Also referred to as "Money In"
5. **Cancelled Credits** - Total money out (credits paid to players) across all machines
   - Formula: `Σ(movement.totalCancelledCredits)` for all machines at location
   - Also referred to as "Money Out"
6. **Gross Revenue** - Net revenue after payouts
   - Formula: `Drop - Cancelled Credits`
   - Color-coded in green for visual emphasis
7. **Hold %** - Hold percentage indicating profitability
   - Formula: `(Gross Revenue / Drop) × 100`
   - Color-coded based on performance:
     - Green: ≥ 10% (excellent)
     - Yellow: 5-9.99% (good)
     - Red: < 5% (needs attention)

**Table Features:**

- **Pagination**: Displays 10 locations per page with pagination controls
- **Summary Metrics**: Shows totals row at the bottom of exported reports
- **Currency Support**: Displays amounts in selected currency (USD, TTD, GYD, BBD) with proper formatting
- **Responsive Design**: Adapts to mobile and desktop viewports
- **Data Source**: Fetches from `/api/reports/locations` endpoint with licensee and date filtering

**Location Filtering:**

- **Licensee Filter**: Filters locations by selected licensee (or shows all if "All Licensees" selected)
- **Date Range Filter**: Filters financial metrics by selected time period (Today, Yesterday, 7d, 30d, Custom)
- **Location Selection**: Users can select specific locations for detailed analysis in other tabs
- **Auto-Display**: When no specific locations are selected, all accessible locations are displayed

#### 5.2.2. Locations Tab Export Functionality

The Locations Tab provides three distinct export functions, each supporting PDF and Excel formats:

**1. Location Overview Export** (`handleExportLocationOverview`)

- **Scope**: Exports the main Location Overview table data
- **Data Included**:
  - All location rows with: Location Name, Total Machines, Online Machines, Drop, Cancelled Credits, Gross Revenue, Hold %
  - Summary totals row with aggregated metrics
  - Metadata: Report title, date range, generation timestamp, total location count
- **Export Formats**: PDF and Excel (XLSX)
- **File Naming**: `Location Overview Report - [Date Range] - [Timestamp]`
- **Summary Section**: Includes:
  - Total Gross Revenue
  - Total Drop
  - Total Cancelled Credits
  - Online Machines count (X/Y format)
  - Overall Hold Percentage

**2. SAS Evaluation Export** (`handleExportSASEvaluation`)

- **Scope**: Exports SAS evaluation data for selected locations
- **Data Source**: Uses helper function `handleExportSASEvaluationHelper` from `lib/helpers/reportsPage`
- **Location Selection**: Exports only locations selected in the SAS Evaluation tab
- **Export Formats**: PDF and Excel (XLSX)
- **Use Case**: Variance analysis between SAS system data and meter readings

**3. Revenue Analysis Export** (`handleExportRevenueAnalysis`)

- **Scope**: Exports revenue analysis data for selected locations
- **Data Included**:
  - Location performance metrics
  - Revenue trends and patterns
  - Financial breakdowns
- **Location Selection**: Exports only locations selected in the Revenue Analysis tab
- **Export Formats**: PDF and Excel (XLSX)
- **Use Case**: Detailed revenue analysis and trend reporting

**Export Implementation Details:**

- **Data Processing**: All exports use the `ExtendedLegacyExportData` type from `lib/utils/exportUtils`
- **Currency Formatting**: Exports respect the selected display currency and format amounts accordingly
- **Error Handling**: Comprehensive error handling with user-friendly toast notifications
- **Loading States**: Export buttons are disabled during data fetching to prevent duplicate exports
- **Data Freshness**: Exports use current filter state (date range, licensee, selected locations) to ensure data accuracy

**Export Button Behavior:**

- **Location**: Export dropdown menu in the header of each tab section
- **Disabled State**: Buttons are disabled when:
  - No location data is available
  - Data is currently loading
  - No locations are selected (for SAS Evaluation and Revenue Analysis exports)
- **User Feedback**: Success/error toast notifications after export completion

### 5.3. Machines Tab Calculations

**Machine Performance Metrics:**

- **Revenue per Machine**: Total money in minus money out for each machine
- **Play Count**: Number of games played on each machine
- **Average Wager**: Total money in divided by play count
- **Hold Percentage**: (Money in - Money out) / Money in × 100

**Machine Evaluation:**

- **Performance Rating**: Based on revenue, uptime, and play activity
- **Efficiency Score**: Revenue generated per hour of operation
- **Maintenance Indicators**: Machines showing declining performance

**Offline Machine Analysis:**

- **Downtime Duration**: How long machines have been offline
- **Revenue Impact**: Lost revenue due to machine downtime
- **Maintenance Priority**: Ranking based on revenue loss and downtime

### 5.4. Meters Tab Calculations

**Meter Reading Analysis:**

- **Money In/Out Totals**: Sum of all meter readings for selected period
- **Net Revenue**: Money in minus money out for each machine
- **Meter Variance**: Difference between expected and actual meter readings
- **Collection Accuracy**: Percentage of accurate meter readings

**Financial Reconciliation:**

- **Expected vs Actual**: Comparison of predicted revenue vs actual meter data
- **Variance Reporting**: Identification of significant discrepancies
- **Audit Trail**: Complete record of all meter readings and changes

#### 5.4.1. Meters Tab Structure

The Meters Tab (`/reports?section=meters`) provides comprehensive meter reading analysis with the following components:

**Location Selection & Controls Card:**

- **Left Column**: Location multi-select dropdown with "Clear Selection" and "Select All" buttons
- **Right Column**: Top Performing Machines pie chart showing top 10 machines by drop (billIn) value
  - Interactive pie chart with hover states
  - Legend showing machine names with game information (if available)
  - Navigation icons to view location details
  - Chart displays machines currently shown in the table (synchronized with search/filter)

**Meters Export Report Card:**

- **Header**: Title, badge showing record count, and description
- **Hourly Charts** (when locations selected): Three charts showing hourly trends:
  - Games Played Per Hour (full width)
  - Coin In Per Hour (left column)
  - Coin Out Per Hour (right column)
  - Charts automatically filter based on table search results
- **Search Bar**: Located above the table, always visible
  - Searches by machine serial number, custom name, or location name
  - Debounced search (500ms delay) for performance
  - Shows "Showing X of Y records" with filter status
- **Data Table**: Desktop and mobile views
  - **Desktop**: 10-column table with all meter fields
  - **Mobile**: Card-based layout with grouped metrics
  - Columns: Machine ID, Location, Meters In, Money Won, Jackpot, Bill In, Voucher Out, Hand Paid Cancelled Credits, Games Played, Date
  - All cells center-aligned to match headers
  - Color-coded financial values (green for positive, red for negative)
- **Pagination**: Server-side pagination with page navigation controls

**Loading States & Skeleton Loaders:**

- **Initial Load**: Full page skeleton when locations are loading
- **Data Fetching**: Inline skeleton loaders for each section:
  - Top Performing Machines chart skeleton (legend + pie chart structure)
  - Hourly charts skeleton (matches MetersHourlyCharts loading state)
  - Meters Export Report card skeleton (header, search bar, table structure)
  - All skeleton loaders match the exact layout of actual content
- **Top Performing Machines**: Shows skeleton in the chart container while `topMachinesLoading` is true
- **Meters Table**: Shows skeleton table structure while `loading` is true

**Top Performing Machines Chart:**

- Calculated from the same data source as the table (`allMetersData`)
- Uses `billIn` (drop) as the performance metric
- Displays top 10 machines by total drop value
- Machine names formatted as: "CustomName (SerialNumber, Game)" or "SerialNumber (Game)"
- Includes navigation icons to view location details
- Chart updates automatically when table data changes (search/filter)

## 6. Data Flow and Processing

### 6.1. Data Sources

- **Machine Data**: Real-time data from gaming machines via SAS system
- **Meter Readings**: Physical meter data collected during maintenance
- **Collection Data**: Financial data from collection reports
- **Location Data**: Gaming location information and configuration

### 6.2. Data Processing Pipeline

1. **Data Collection**: Gather data from multiple sources (SAS, meters, collections)
2. **Data Validation**: Verify data integrity and flag discrepancies
3. **Data Aggregation**: Combine and summarize data by location, machine, and time period
4. **Calculation Engine**: Apply business logic to generate metrics and KPIs
5. **Data Presentation**: Format data for display in reports and dashboards

### 6.3. Real-time Updates

- **Live Data Sync**: Continuous synchronization with SAS system
- **Automatic Refresh**: Periodic updates of report data
- **Manual Refresh**: User-initiated data updates
- **Change Notifications**: Alerts for significant data changes

## 7. Delivery Considerations

• Prioritize foundational reports (counts, machines, location stats) in first implementation wave
• Additional integrations (e.g., bar POS) may follow if data sources become available
• Export and printing must be consistent across all reports
• All reports must respect user permissions and role-based access
• Export functionality should include progress indicators for large datasets
• Data export should maintain referential integrity with live dashboard data
