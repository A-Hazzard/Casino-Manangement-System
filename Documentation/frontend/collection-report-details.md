# Collection Report Details Page

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 25th, 2025

## Table of Contents
- [Overview](#overview)
- [Page Structure](#page-structure)
- [Machine Metrics Tab](#machine-metrics-tab)
- [Location Metrics Tab](#location-metrics-tab)
- [SAS Metrics Compare Tab](#sas-metrics-compare-tab)
- [Financial Calculations](#financial-calculations)
- [Variance Analysis](#variance-analysis)
- [API Integration](#api-integration)

## Overview

The Collection Report Details page (`app/collection-report/report/[reportId]/page.tsx`) provides comprehensive analysis of individual collection reports, including machine-level metrics, location-level summaries, and SAS data comparisons.

### File Information
- **File:** `app/collection-report/report/[reportId]/page.tsx`
- **URL Pattern:** `/collection-report/report/[reportId]`
- **Component:** `CollectionReportPageContent`

## Page Structure

### Main Components
1. **Header Section** - Report information and navigation
2. **Tab Navigation** - Three main tabs for different views
3. **Content Area** - Dynamic content based on active tab
4. **Pagination** - For large datasets

### Tab Structure
```typescript
type ActiveTab = "Machine Metrics" | "Location Metrics" | "SAS Metrics Compare";
```

## Machine Metrics Tab

### Purpose
Displays individual machine performance data with detailed financial metrics.

### Key Metrics Displayed
- **Machine Identifier** - Serial number, machine name, or custom name
- **Drop/Cancelled** - Physical meter readings
- **Meters Gross** - Calculated from meter data
- **SAS Gross** - SAS system data
- **Variation** - Difference between meter and SAS data

### Data Source
```typescript
// From lib/helpers/accountingDetails.ts
const drop = (collection.metersIn || 0) - (collection.prevIn || 0);
const cancelled = (collection.metersOut || 0) - (collection.prevOut || 0);
const meterGross = collection.movement?.gross || 0;
const sasGross = collection.sasMeters?.gross || 0;
const variation = meterGross - sasGross;
```

### Variation Calculation
```typescript
// Variation = Meter Gross - SAS Gross
// If no SAS data exists, shows "No SAS Data"
const variation = !collection.sasMeters || 
  collection.sasMeters.gross === undefined ||
  collection.sasMeters.gross === null ||
  collection.sasMeters.gross === 0
    ? "No SAS Data"
    : meterGross - sasGross;
```

## Location Metrics Tab

### Purpose
Provides location-level summary data and financial overview.

### Key Metrics Displayed
- **Dropped/Cancelled** - Total location metrics
- **Meters Gross** - Sum of all machine meter gross values
- **Variation** - Sum of all machine variations
- **SAS Gross** - Sum of all machine SAS gross values
- **Location Revenue** - Partner profit calculations
- **Machine Count** - Collected vs total machines

### Calculation Logic
```typescript
// From lib/helpers/accountingDetails.ts
const totalMetersGross = collections.reduce(
  (sum, col) => sum + (col.movement?.gross || 0), 0
);
const totalVariation = collections.reduce(
  (sum, col) => sum + (col.movement?.gross || 0) - (col.sasMeters?.gross || 0), 0
);
const totalSasGross = collections.reduce(
  (sum, col) => sum + (col.sasMeters?.gross || 0), 0
);
```

## SAS Metrics Compare Tab

### Purpose
Compares SAS data across all machines in the collection report.

### Key Metrics Displayed
- **SAS Drop Total** - Sum of all SAS drop values
- **SAS Cancelled Total** - Sum of all SAS cancelled credits
- **SAS Gross Total** - Sum of all SAS gross values

### SAS Data Aggregation
```typescript
// From lib/helpers/accountingDetails.ts
const sasDropTotal = collections.reduce(
  (sum, col) => sum + (col.sasMeters?.drop || 0), 0
);
const sasCancelledTotal = collections.reduce(
  (sum, col) => sum + (col.sasMeters?.totalCancelledCredits || 0), 0
);
const sasGrossTotal = collections.reduce(
  (sum, col) => sum + (col.sasMeters?.gross || 0), 0
);
```

## Financial Calculations

### Core Formulas

**Meter Gross:**
```typescript
Meter Gross = (Current Meters In - Previous Meters In) - (Current Meters Out - Previous Meters Out)
```

**SAS Gross:**
```typescript
SAS Gross = SAS Drop - SAS Cancelled Credits
```

**Variation:**
```typescript
Variation = Meter Gross - SAS Gross
```

### Example Validation
From your provided data:
- **Meter Gross**: 208
- **SAS Gross**: -127
- **Variation**: 208 - (-127) = 335 ✅

## Variance Analysis

### What Causes "No SAS Data"
The system displays "No SAS Data" when:
1. `collection.sasMeters` is null/undefined
2. `collection.sasMeters.gross` is null/undefined
3. `collection.sasMeters.gross` equals 0

### SAS Data Population
SAS data is populated through:
1. **SMIB data uploads** - CSV files with SAS meter readings
2. **SAS system integration** - Direct connection to SAS protocols
3. **Manual data entry** - Administrative corrections
4. **Meter synchronization** - Automated sync processes

## API Integration

### Data Fetching
```typescript
// Primary data source
const reportData = await fetchCollectionReportById(reportId);

// Collections data
const collections = await fetchCollectionsByLocationReportId(reportId);

// Meter synchronization
await syncMetersForReport(reportId);
```

### Key API Endpoints
- **GET** `/api/collectionReport/[reportId]` - Fetch report details
- **GET** `/api/collections?locationReportId=[reportId]` - Fetch collections
- **POST** `/api/sync-meters` - Sync meter data
- **GET** `/api/meters/[machineId]` - Get machine meter data

### Data Validation
```typescript
// Validate collection report data
const isValid = validateCollectionReportData(reportData);

// Check for required fields
if (!reportData || !collections || collections.length === 0) {
  setError("No data found for this report");
  return;
}
```

## Error Handling

### Common Error States
1. **Loading State** - Skeleton loaders while fetching data
2. **No Data State** - Empty state when no collections found
3. **Error State** - Error message when API calls fail
4. **Not Found State** - 404 page for invalid report IDs

### Error Recovery
```typescript
// Retry mechanism for failed API calls
const retryFetch = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchCollectionReportById(reportId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Performance Optimizations

### Data Loading
- **Lazy loading** for large datasets
- **Pagination** for machine metrics
- **Memoization** for expensive calculations
- **Caching** for frequently accessed data

### UI Optimizations
- **Skeleton loaders** during data fetching
- **Smooth animations** for tab transitions
- **Responsive design** for mobile/desktop
- **Virtual scrolling** for large tables

## Accessibility

### ARIA Labels
- **Tab navigation** with proper ARIA roles
- **Table headers** with scope attributes
- **Button states** with aria-pressed
- **Loading states** with aria-live regions

### Keyboard Navigation
- **Tab order** for logical navigation
- **Arrow keys** for table navigation
- **Enter/Space** for button activation
- **Escape** for modal dismissal