# Collection Report System - Frontend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 20th, 2025

## Overview

The Collection Report System manages casino slot machine money collection operations. It serves as the financial control center for tracking money flow from gaming machines to bank accounts.

### Key Features

- Multi-tab interface (Collection, Monthly, Manager, Collector)
- Real-time SAS metrics and movement calculations
- Role-based access control
- Automated issue detection and fixing
- Responsive design for desktop and mobile

### Main Components

- **Main Page**: `app/collection-report/page.tsx`
- **New Collection Modal**: `components/collectionReport/NewCollectionModal.tsx`
- **Edit Collection Modal**: `components/collectionReport/EditCollectionModal.tsx`
- **Mobile Modals**: Mobile-optimized creation and editing interfaces

## User Roles & Permissions

### Admin & Evolution Admin

- ✅ Full access to all features
- ✅ Create, edit, delete collection reports
- ✅ View and use issue detection and fix tools
- ✅ Access all validation and repair tools

### Manager

- ✅ Create, edit, delete collection reports
- ✅ View issue indicators and warnings
- ❌ Limited access to advanced fix tools

### Collector & Other Roles

- ✅ Create collection reports
- ❌ Cannot edit or delete reports
- ❌ No access to issue indicators or fix tools

## Collection Report Creation

### Process Flow

**1. Location Selection**

- User selects gaming location from dropdown
- System auto-initializes collection time based on location's `gameDayOffset`
- Default collection time: 8:00 AM (adjusts based on gaming day offset)

**2. Machine Selection & Data Entry**

- User selects machines from location's machine list
- System fetches previous meter values from `machine.collectionMeters`
- User enters current meter readings (`metersIn`, `metersOut`)
- System automatically calculates movement values

**3. Add Machine to List**

- Creates collection via `/api/collections POST`
- Backend calculates SAS metrics from `sashourly` collection
- Collection stored with empty `locationReportId`
- Machine added to collected machines list
- **Note**: `collectionMetersHistory` is NOT created yet

**4. Report Finalization (Create Report)**

- Updates all collections with `locationReportId`
- Creates collection report via `/api/collectionReport POST`
- Creates `collectionMetersHistory` entries for all machines
- Updates machine `collectionMeters` to current values
- Updates machine collection times

### Movement Calculation

**Standard Collections:**

```
movementIn = currentMetersIn - prevIn
movementOut = currentMetersOut - prevOut
gross = movementIn - movementOut
```

**RAM Clear Collections (with ramClearMeters):**

```
movementIn = (ramClearMetersIn - prevIn) + (currentMetersIn - 0)
movementOut = (ramClearMetersOut - prevOut) + (currentMetersOut - 0)
gross = movementIn - movementOut
```

**RAM Clear Collections (without ramClearMeters):**

```
movementIn = currentMetersIn  // meters reset to 0
movementOut = currentMetersOut  // meters reset to 0
gross = movementIn - movementOut
```

### SAS Metrics Calculation

- **SAS Drop**: Total money collected by SAS-enabled machines
- **SAS Cancelled Credits**: Credits paid out to players
- **SAS Gross**: Net revenue from SAS machines
- **Time Window**: From `sasStartTime` (previous collection) to `sasEndTime` (current collection)
- **Data Source**: Queries `sashourly` collection for machine's time period

## Collection Report Editing

### Process Flow

**1. Load Existing Report**

- Fetches report data via `/api/collection-report/[reportId]`
- Loads all collections for the report
- Populates financial fields with current values

**2. Modify Data**

- Add new machines to existing report
- Edit existing collection meter readings
- Delete collections from report
- Modify financial fields (taxes, advance, variance, etc.)

**3. Save Changes**

- Updates collection report via `/api/collection-report/[reportId] PUT`
- Updates individual collections as needed
- Maintains data consistency across all related records

### Editable Fields

- **Machine Data**: Meter readings, notes, RAM clear information
- **Financial Data**: Taxes, advance payments, variance adjustments
- **Balance Information**: Previous balance, balance corrections
- **Collection Details**: Collection time, collector information

## Financial Calculations

### Auto-calculated Fields

**Amount to Collect:**

```
amountToCollect = gross - variance - advance - partnerProfit
```

- Read-only field
- Never changes when user enters collected amount
- Does NOT include previousBalance (prevents circular dependency)

**Partner Profit:**

```
partnerProfit = Math.floor((gross - variance - advance) * profitShare / 100) - taxes
```

- Based on location's profit share percentage
- Taxes deducted after profit calculation

**Previous Balance:**

```
previousBalance = collectedAmount - amountToCollect
```

- Auto-calculated when user enters collected amount
- User can manually override if needed
- Field is editable

### User Input Fields

- **Taxes**: Government taxes and regulatory fees
- **Advance**: Money paid to location when in negative balance
- **Variance**: Manual adjustments for discrepancies
- **Collected Amount**: Actual cash collected by collector
- **Balance Correction**: Manual balance adjustments

### Balance Correction Logic

```
balanceCorrection = baseBalanceCorrection + collectedAmount
```

- User enters base value (e.g., 5)
- System adds collected amount (e.g., 6)
- Result: 5 + 6 = 11
- User can manually edit total value

### Circular Dependency Prevention

**WRONG:**

```
amountToCollect = gross - variance - advance - partnerProfit + previousBalance
previousBalance = collectedAmount - amountToCollect
// ❌ Circular dependency!
```

**CORRECT:**

```
amountToCollect = gross - variance - advance - partnerProfit
previousBalance = collectedAmount - amountToCollect
// ✅ No circular dependency
```

### Financial Flow Example

```
Gross Revenue: $1000
Variance: -$50
Advance: $0
Net Revenue: $1000 - $50 - $0 = $950
Profit Share: 50%

Partner Profit: Math.floor(($950 * 50) / 100) - $20 = $455
Amount to Collect: $950 - $455 = $495

Result:
- Location receives: $455 (partner profit)
- Casino collects: $495 (amount to collect)
- Previous balance calculated from collected amount
```

## Collection Report Viewing

### Main Page Features

**Filtering:**

- Date range (Today, Yesterday, Last 7 days, Last 30 days, Custom)
- Location filter
- Completion status (show uncollected only)
- SMIB location filters

**Search:**

- By location name
- By collector name
- By report ID

**Display:**

- Desktop: Table view with all columns
- Mobile: Card view with key information
- Pagination for large datasets
- Sorting by any column

## Issue Detection & Fix System

### Types of Issues Detected

**1. Movement Calculation Mismatches**

- Compares stored movement values with calculated values
- Handles standard and RAM Clear scenarios
- Uses precision tolerance (0.1) for comparisons

**2. Inverted SAS Times**

- Detects when `sasStartTime >= sasEndTime`
- Prevents invalid time ranges for calculations

**3. Previous Meter Mismatches**

- Detects when `prevIn`/`prevOut` don't match actual previous collection
- Ensures proper meter reading chain

**4. Collection History Issues**

- Detects orphaned history entries (references non-existent reports)
- Detects duplicate history entries for same date
- Ensures `collectionMetersHistory` consistency

### Fix Operations

**Report-Specific Fix:**

- "Fix Report" button on report details page
- Fixes all issues in specific report
- Updates machine history entries
- Maintains data consistency

**Machine-Specific Fix:**

- "Check & Fix History" button on machine details pages
- Fixes issues for specific machine only
- Removes orphaned and duplicate history entries
- Automatic fix when issues detected

### Issue Indicators

- **Warning Banners**: Display detailed issue information
- **Yellow Highlighting**: Problematic reports highlighted
- **Issue Count Badges**: Show number of issues found
- **Visibility**: Only shown to Admin, Evolution Admin, and Manager users

## Database Structure

### Collections Collection

```typescript
{
  _id: string;
  machineId: string;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  movement: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  sasMeters: {
    drop: number;
    totalCancelledCredits: number;
    gross: number;
    sasStartTime: Date;
    sasEndTime: Date;
  };
  locationReportId: string;
  timestamp: Date;
  isCompleted: boolean;
  ramClear: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
}
```

### Collection Report Collection

```typescript
{
  _id: string;
  locationReportId: string;
  locationName: string;
  collectorName: string;
  timestamp: Date;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  variance: number;
  currentBalance: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  balanceCorrection: number;
}
```

### Machine Collection Meters

```typescript
{
  collectionMeters: {
    metersIn: number;
    metersOut: number;
  };
  collectionMetersHistory: [{
    _id: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    timestamp: Date;
    locationReportId: string;
  }];
  collectionTime: Date;
  previousCollectionTime: Date;
}
```

## API Endpoints

### Collection Reports

- **GET** `/api/collectionReport` - Fetch all collection reports
- **POST** `/api/collectionReport` - Create new collection report
- **PUT** `/api/collectionReport/[reportId]` - Update collection report
- **DELETE** `/api/collection-report/[reportId]` - Delete collection report

### Collections

- **GET** `/api/collections` - Fetch collections by report ID
- **POST** `/api/collections` - Create new collection
- **PUT** `/api/collections/[id]` - Update collection
- **DELETE** `/api/collections/[id]` - Delete collection

### Issue Detection & Fix

- **GET** `/api/collection-reports/check-all-issues` - Check for data issues
- **POST** `/api/collection-reports/fix-report` - Fix issues in specific report/machine

### Data Synchronization

- **POST** `/api/sync-meters` - Sync meter data with SAS system
- **GET** `/api/meters/[machineId]` - Get meter data for machine

## Best Practices

### Data Integrity

- Validate meter readings before submission
- Ensure proper timing of collection operations
- Maintain audit trail for all changes
- Use atomic operations for critical updates

### Performance

- Implement proper pagination for large datasets
- Use efficient database queries
- Cache frequently accessed data
- Optimize mobile interface

### Security

- Implement role-based access control
- Validate all user inputs
- Log all sensitive operations
- Use secure authentication

### User Experience

- Provide clear error messages
- Implement loading states with skeleton loaders
- Use responsive design principles
- Ensure accessibility compliance
