# Reports Module Functional Requirements

## Table of Contents

- [Overview](#overview)
- [Functional Requirements](#functional-requirements)
- [Report Types](#report-types)
- [Current Implementation](#current-implementation)
- [Business Logic and Calculations](#business-logic-and-calculations)
- [Data Flow and Processing](#data-flow-and-processing)
- [Technical Architecture](#technical-architecture)
- [Export Functionality](#export-functionality)
- [Performance Considerations](#performance-considerations)
- [Future Enhancements](#future-enhancements)

## Overview

This document outlines the core functional requirements for the Reports Module within the Evolution One Casino Management System. The module provides comprehensive reporting capabilities for financial monitoring, machine performance analysis, customer data insights, and operational oversight across all casino locations.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 6th, 2025  
**Version:** 2.0.0

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

• **Data Source**: Direct API calls to `/api/analytics/reports` endpoint
• **Export Formats**: CSV and Excel (XLSX) with proper file naming
• **Data Scope**: Exports all data matching current filters (date range, licensee, report type)
• **File Naming**: Automatic naming with report type and date (e.g., `locations-report-2025-01-20.csv`)
• **Error Handling**: Comprehensive error handling with user feedback via toast notifications
• **Performance**: Optimized for large datasets with progress indicators

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
