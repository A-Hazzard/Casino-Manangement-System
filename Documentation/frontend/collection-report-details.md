# Collection Report Details Page - Frontend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 20th, 2025

## Overview

The Collection Report Details page provides comprehensive analysis of individual collection reports, including machine-level metrics, location-level summaries, SAS data comparisons, and issue detection with automated fixing capabilities.

### File Information

- **File**: `app/collection-report/report/[reportId]/page.tsx`
- **URL Pattern**: `/collection-report/report/[reportId]`
- **Component**: `CollectionReportPageContent`

## Page Structure

### Main Components

1. **Header Section** - Report information, navigation, and action buttons
2. **Report Header** - Location name, report ID, and financial summary
3. **Tab Navigation** - Three main tabs for different views
4. **Content Area** - Dynamic content based on active tab
5. **Pagination** - For large datasets in Machine Metrics tab

### Tab Structure

```typescript
type ActiveTab = 'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare';
```

## Machine Metrics Tab

### Purpose

Displays individual machine performance data with detailed financial metrics.

### Data Displayed

- **Machine Identifier**: Serial number, machine name, or custom name
- **Drop/Cancelled**: Physical meter readings (formatted as "drop / cancelled")
- **Meters Gross**: Calculated from meter data (`movement.gross`)
- **SAS Gross**: SAS system data (`sasMeters.gross`)
- **Variation**: Difference between meter and SAS gross
- **SAS Times**: Time window for SAS calculations

### Key Metrics (Database Fields)

- `collections.metersIn`, `collections.metersOut` - Current meter values
- `collections.prevIn`, `collections.prevOut` - Previous meter baselines
- `collections.movement.metersIn`, `collections.movement.metersOut`, `collections.movement.gross`
- `collections.sasMeters.drop`, `collections.sasMeters.totalCancelledCredits`, `collections.sasMeters.gross`
- `collections.sasMeters.sasStartTime`, `collections.sasMeters.sasEndTime`
- `collections.ramClear`, `collections.ramClearMetersIn`, `collections.ramClearMetersOut`

### Features

- **Search**: Find specific machines by ID or name
- **Sorting**: Sort by any metric column
- **Pagination**: Handles large machine collections
- **RAM Clear Indicators**: Visual indicators for ram-cleared machines
- **Clickable Machine Names**: Navigate to machine details page

### Display Format

- **Desktop**: Table with all columns visible
- **Mobile**: Card layout with key metrics

## Location Metrics Tab

### Purpose

Provides location-level summary data and financial overview.

### Data Displayed

**Location Total:**

- Total Drop / Total Cancelled (formatted as "drop / cancelled")
- Total Meters Gross (sum of all `movement.gross`)
- Total SAS Gross (sum of all `sasMeters.gross`)
- Total Variation (sum of all machine variations)

**Financial Details:**

- Variance and variance reason
- Amount to Collect vs Collected Amount
- Location Revenue (partner profit)
- Amount Uncollected
- Machines Number (collected/total format)

**Balance Information:**

- Taxes
- Advance
- Previous Balance Owed
- Current Balance Owed
- Balance Correction and Correction Reason
- Reason for Shortage Payment

### Location Aggregations

- Sum of `movement.gross` → `totalGross`
- Sum of `sasMeters.gross` → `totalSasGross`
- Sum of (movement.gross - sasMeters.gross) → total variation

### Display Format

- **Desktop**: Grid layout with summary and detailed tables
- **Mobile**: Stacked cards with clear sections

## SAS Metrics Compare Tab

### Purpose

Compares SAS data across all machines in the collection report.

### Data Displayed

- **SAS Drop Total**: Sum of all `sasMeters.drop` values
- **SAS Cancelled Total**: Sum of all `sasMeters.totalCancelledCredits` values
- **SAS Gross Total**: Sum of all `sasMeters.gross` values

### SAS Gross Calculation Method

- **Current Method**: Movement Delta Method
- **Formula**: `Sum(movement.drop) - Sum(movement.totalCancelledCredits)`
- **Data Source**: Queries `meters` collection for each machine's SAS time period
- **Accuracy**: High - accounts for all meter readings in SAS time period

### Display Format

- **Desktop**: Simple table showing SAS totals
- **Mobile**: Card view with key SAS metrics

## Financial Calculations

### Variation Definition

```
Variation = Meter Gross - SAS Gross
```

- Both values already rounded to 2 decimals
- Can be positive (meters > SAS) or negative (SAS > meters)

### Example

```
Meter Gross: 208.00
SAS Gross: -127.00
Variation: 208.00 - (-127.00) = 335.00 ✅
```

## Issue Detection & Fix System

### Issue Types Detected

**1. Movement Calculation Mismatches**

- Compares stored movement values with calculated values
- Handles standard and RAM Clear scenarios
- Uses precision tolerance (0.1) for comparisons

**2. Inverted SAS Times**

- Detects when `sasStartTime >= sasEndTime`
- Prevents invalid time ranges

**3. Previous Meter Mismatches**

- Detects when `prevIn`/`prevOut` don't match actual previous collection
- Ensures proper meter reading chain

**4. Collection History Issues**

- Orphaned entries (references non-existent reports)
- Duplicate entries for same date
- Missing collections or reports

### Issue Display

**Warning Banner:**

- Appears at top of page when issues detected
- Lists affected machines with issue counts
- Different titles for different issue types:
  - "SAS Time Issues Detected"
  - "Collection History Issues Detected"
  - "Multiple Issues Detected"
- Clickable machine names open detailed issue modals

**Issue Modal:**

- Shows detailed breakdown of specific issues
- Displays current values, expected values, and explanations
- Provides context for understanding problems

### Fix System

**"Fix Report" Button:**

- Appears in header when issues detected
- Fixes all detected issues in current report
- Comprehensive repair operations:
  - Movement recalculation
  - SAS time correction
  - Previous meter updates
  - Machine history updates
  - Chain validation

**Fix Operations:**

1. Recalculates movement values using proper formulas
2. Fixes inverted or invalid SAS time ranges
3. Corrects `prevIn`/`prevOut` references
4. Updates `collectionMetersHistory` entries
5. Removes orphaned history entries
6. Fixes duplicate history entries
7. Ensures data consistency across collection timeline

### Smart Issue Detection

- Issues detected automatically on page load
- Real-time validation ensures accuracy
- No manual intervention required for detection
- Clear communication of issues and fixes

## API Integration

### Data Fetching

**Report Data:**

- **GET** `/api/collection-report/[reportId]` - Fetch report details
- **GET** `/api/collections?locationReportId=[reportId]` - Fetch collections
- **POST** `/api/sync-meters` - Sync meter data
- **GET** `/api/meters/[machineId]` - Get machine meter data

**Issue Detection:**

- **GET** `/api/collection-report/[reportId]/check-sas-times` - Check for issues
- **GET** `/api/collection-reports/check-all-issues?reportId=[reportId]` - Check machine history issues
- **POST** `/api/collection-reports/fix-report` - Fix detected issues

### Data Validation

```typescript
const isValid = validateCollectionReportData(reportData);

if (!reportData || !collections || collections.length === 0) {
  setError('No data found for this report');
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

- Automatic retry for failed API calls
- Clear error messages for users
- Fallback to default values when data missing

## Performance Optimizations

### Data Loading

- Lazy loading for large datasets
- Pagination for machine metrics
- Memoization for expensive calculations
- Efficient filtering and sorting

### UI Optimizations

- Skeleton loaders during data fetching
- Smooth animations for tab transitions
- Responsive design for mobile/desktop
- Efficient re-rendering strategies

## Accessibility

### ARIA Attributes

- Tab navigation with proper ARIA roles
- Table headers with scope attributes
- Button states with aria-pressed
- Loading states with aria-live regions

### Keyboard Navigation

- Logical tab order
- Arrow keys for table navigation
- Enter/Space for button activation
- Escape for modal dismissal

### Semantic HTML

- Proper heading structure
- Form semantics
- Table semantics
- Button and link semantics

## Mobile Optimization

### Responsive Behavior

- Tab navigation switches to dropdown on mobile
- Tables convert to card layout
- Touch-friendly interface elements
- Simplified navigation

### Performance

- Optimized for slower connections
- Reduced data transfer
- Efficient rendering
- Progressive loading
