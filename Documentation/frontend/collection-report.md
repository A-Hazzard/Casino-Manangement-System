# Collection Report System - Frontend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 10, 2025  
**Version:** 2.4.0

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
- **New Collection Modal (Desktop)**: `components/collectionReport/NewCollectionModal.tsx`
- **Edit Collection Modal (Desktop)**: `components/collectionReport/EditCollectionModal.tsx`
- **Mobile Collection Modal**: `components/collectionReport/mobile/MobileCollectionModal.tsx`
- **Mobile Edit Collection Modal**: `components/collectionReport/mobile/MobileEditCollectionModal.tsx`
- **Form Components**: `components/collectionReport/forms/*` - Reusable form components

## User Roles & Permissions

### Admin & Developer

- ✅ Full access to all features across all licensees
- ✅ Create, edit, delete collection reports for any location
- ✅ View and use issue detection and fix tools
- ✅ Access all validation and repair tools
- ✅ Licensee dropdown to filter reports by specific licensee
- ✅ Can view all licensees or filter by specific licensee

### Manager

- ✅ Create, edit, delete collection reports for assigned licensees
- ✅ View issue indicators and warnings
- ✅ Can view all locations for their assigned licensees
- ✅ Licensee dropdown shows ONLY assigned licensees (if 2+)
- ❌ Cannot access reports for licensees they're not assigned to
- ❌ Limited access to advanced fix tools

### Collector & Location Collector

- ✅ Create collection reports for assigned locations only
- ✅ Edit and delete reports (most recent per location only - see Edit Restrictions below)
- ✅ View issue indicators
- ✅ Can only see locations they have permission to access
- ✅ Licensee dropdown shown if they have locations in multiple licensees
- ❌ No access to advanced fix tools
- ❌ Cannot see reports for other collectors' locations

### Location Admin

- ✅ Can view collection reports for assigned locations
- ✅ Location-specific access only
- ❌ No licensee dropdown (implicitly filtered)
- ❌ Cannot access dashboard

### Technician

- ❌ No access to collection reports (redirected to Cabinets)

## Collection Report Creation

### Process Flow (Both Desktop & Mobile)

**1. Location Selection**

- User selects gaming location from `LocationSingleSelect` dropdown
- System loads machines for the selected location
- System initializes collection time based on location's `gameDayOffset`
- Default collection time: 8:00 AM (adjusts based on gaming day offset from `calculateDefaultCollectionTime`)
- Location gets locked after first machine is added (prevents mixing locations)

**2. Machine Selection & Data Entry**

- User selects a machine from the location's machine list
- System fetches previous meter values from `machine.collectionMeters`
- User enters:
  - Current meter readings (`metersIn`, `metersOut`)
  - Collection time (can be customized per machine)
  - Optional notes
  - RAM clear status (if applicable, with RAM clear meters)
- System automatically calculates movement values using `calculateMachineMovement`

**3. Add Machine to List**

- Creates collection via `/api/collections POST` (calls `addMachineCollection`)
- Backend calculates SAS metrics from `sashourly` collection
- Collection stored with empty `locationReportId` and `isCompleted: false`
- Machine added to `collectedMachines` list in local state and Zustand store
- **Note**: `collectionMetersHistory` is NOT created yet
- Machine can be edited or deleted from list before report finalization

**Security Note (November 10, 2025):**

- Incomplete collections are filtered by user's assigned locations
- When modal reopens, only collections for accessible locations are loaded
- Collections are location-scoped, not user-scoped (enables team collaboration)
- See "Incomplete Collections Security Model" below for details

**4. Financial Data Entry (First Machine Only)**

- User enters shared financial data:
  - Taxes
  - Advance
  - Variance (with optional reason)
  - Balance correction (with optional reason)
  - Collected amount
  - Previous balance
  - Reason for shortage payment
- **Desktop**: Shows in right-side form panel
- **Mobile**: Shows in form panel after machine data entry

**5. Report Finalization (Create Report)**

**CRITICAL: Correct Order of Operations (November 7th, 2025 Fix)**

Both desktop and mobile modals now follow this atomic operation order to prevent orphaned collections:

**Step 1: Create Parent Report FIRST**

- Validates all data using `validateCollectionReportPayload`
- Generates `locationReportId` using `uuidv4()`
- Calls `/api/collectionReport POST` with complete payload
- **If this fails, collections remain untouched (no side effects)**

**Step 2: Update Collections ONLY IF Report Created Successfully**

- Updates all collections with `locationReportId` via `/api/collections PATCH`
- Marks collections as completed (`isCompleted: true`)
- **If this fails, report still exists and can be fixed via `/update-history`**

**Why This Order Matters:**

Before (BROKEN - caused 32 orphaned collections):

```
1. Update collections → locationReportId + isCompleted: true ✅
2. Create parent report → ❌ FAILS
Result: Collections orphaned with reportId but no parent report!
```

After (FIXED):

```
1. Create parent report → ✅ SUCCESS
2. Update collections → locationReportId + isCompleted: true ✅
Result: Atomic operation! If report fails, collections untouched.
```

Desktop (`NewCollectionModal.tsx` lines 1868-1961):

- Creates CollectionReport first
- Only on success, calls `updateCollectionsWithReportId()`

Mobile (`MobileCollectionModal.tsx` lines 1050-1074):

- Creates CollectionReport first
- Only on success, updates collections via PATCH
- Non-throwing on collection update failure (report already exists)

Backend (`/api/collectionReport POST`):

- Validates payload and checks for duplicate reports on same gaming day
- Creates CollectionReport document
- Updates all collections with `locationReportId` (if not already done by frontend)
- Creates `collectionMetersHistory` entries for all machines
- Updates `machine.collectionMeters` to current values
- Updates `machine.collectionTime` and `previousCollectionTime`
- Updates `gamingLocation.previousCollectionTime`
- Logs activity

**6. State Cleanup**

- Resets all form state
- Clears Zustand store
- Refreshes parent component data
- Shows success toast notification

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

### Process Flow (Both Desktop & Mobile)

**1. Load Existing Report**

- Opens edit modal via "Edit" button on collection report row
- Fetches report data via `/api/collection-report/[reportId] GET`
- Loads all collections for the report via `/api/collections GET`
- Populates financial fields with current report values
- Displays collected machines list with ability to edit/delete

**2. Modify Data**

Desktop (`EditCollectionModal.tsx`):

- Three-column layout: Machine list | Data entry form | Collected machines
- Can add new machines to existing report
- Can edit existing collection meter readings
- Can delete collections from report
- Financial data updates in real-time

Mobile (`MobileEditCollectionModal.tsx`):

- Slide-up panels for different sections
- Location panel → Form panel → Collected machines list
- Similar functionality to desktop but optimized for touch
- Uses `MobileFormPanel` and `MobileCollectedListPanel` components

**3. Add or Edit Machine Collection**

**Fixed:** November 4th, 2025 - EditCollectionModal now matches NewCollectionModal logic

- Click "Add Machine" or "Edit" on existing machine
- **Sends only essential data to API** (meters, RAM clear, notes, timestamp)
- **API calculates** `prevIn`, `prevOut`, `movement`, and SAS metrics (not frontend)
- Updates collection via `/api/collections POST` (for new) or `PATCH` (for edit)
- Updates machine in local state and Zustand store

**Critical Change:**
Previously, EditCollectionModal sent pre-calculated values (`prevIn`, `prevOut`, `movement`, `sasMeters` with hardcoded 0s) to the API. This caused inconsistencies with NewCollectionModal. Now both modals send identical payloads, letting the backend handle all calculations.

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

## Component Architecture (Mobile)

### Reusable Form Components

The mobile collection modals have been fully componentized for better maintainability:

**`components/collectionReport/forms/`**:

- **`MachineInfoDisplay.tsx`**: Displays machine name and SMIB ID with view button
- **`CollectionTimeInput.tsx`**: Date/time picker for collection time
- **`MachineMetersForm.tsx`**: Meters In/Out with RAM clear functionality
- **`MachineNotesInput.tsx`**: Notes textarea input
- **`SharedFinancialsForm.tsx`**: Taxes and Advance inputs (first machine only)
- **`MachineDataEntryForm.tsx`**: Master component combining all machine data inputs
- **`FinancialSummaryForm.tsx`**: Complete financial summary section
- **`MachineListPanel.tsx`**: Searchable machine selection list
- **`MobileFormPanel.tsx`**: Complete form panel with scrolling header/content/footer
- **`MobileCollectedListPanel.tsx`**: Complete collected machines list with financial summary

### Component Benefits

- **Code Reduction**: Reduced `MobileCollectionModal` from 2,707 lines to 1,855 lines (31.5% smaller)
- **Reusability**: All components can be reused in create and edit modals
- **Maintainability**: Each component has a single, focused responsibility
- **Consistency**: Ensures consistent UI/UX across create and edit flows
- **Testing**: Easier to test individual components in isolation

### Scroll Behavior

Both `MobileFormPanel` and `MobileCollectedListPanel` use proper scroll structure:

```tsx
<div className="fixed ...">
  {' '}
  {/* Outer container - no scroll */}
  <div className="flex flex-col overflow-hidden">
    <Header /> {/* Fixed at top */}
    <div className="flex-1 overflow-y-auto">
      <Content /> {/* Scrollable content */}
    </div>
    <Footer /> {/* Fixed at bottom */}
  </div>
</div>
```

This ensures:

- Header stays visible at all times
- Only content scrolls
- Footer remains accessible
- Better UX on mobile devices

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
- **Visibility**: Only shown to Admin, Developer, and Manager users

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

## Edit & Delete Restrictions

### Most Recent Report Per Location Rule (November 7th, 2025)

**Requirement:**

- Edit and delete buttons ONLY appear on the **most recent collection report** for each location
- Example: If there are 3 locations with 5 reports each, only **3 edit icons** appear total (1 per location)

**Implementation:**

**Frontend Logic (`app/collection-report/page.tsx` lines 655-693):**

```typescript
// Step 1: Check user permissions
const canUserEdit = useMemo(() => {
  if (!user || !user.roles) return false;
  return hasManagerAccess(user.roles); // collectors, locationCollector, manager, admin, evoAdmin
}, [user]);

// Step 2: Find most recent report per location
const editableReportIds = useMemo(() => {
  if (!canUserEdit) return new Set<string>();

  const reportsByLocation = new Map<string, CollectionReportRow>();

  filteredReports.forEach(report => {
    const existing = reportsByLocation.get(report.location);
    if (!existing || new Date(report.time) > new Date(existing.time)) {
      reportsByLocation.set(report.location, report);
    }
  });

  return new Set(
    Array.from(reportsByLocation.values()).map(r => r.locationReportId)
  );
}, [filteredReports, canUserEdit]);
```

**Conditional Rendering:**

Table (`CollectionReportTable.tsx` line 257):

```typescript
{canEditDelete && editableReportIds?.has(row.locationReportId) && (
  <div className="flex gap-1">
    <Button onClick={() => onEdit(row.locationReportId)}>
      <Edit3 />
    </Button>
    <Button onClick={() => onDelete(row.locationReportId)}>
      <Trash2 />
    </Button>
  </div>
)}
```

Cards (`CollectionReportCards.tsx` line 189):

```typescript
{canEditDelete && editableReportIds?.has(row.locationReportId) && (
  // Edit/Delete buttons
)}
```

**Authorized Roles:**

- ✅ Collector
- ✅ Location Collector
- ✅ Manager
- ✅ Admin
- ✅ Developer

**Behavior:**

- Unauthorized users: See **0 edit icons** (regardless of report count)
- Authorized users: See **1 edit icon per location** (only on most recent report)
- Older reports: **No edit/delete buttons** (prevents editing historical data)

**Why This Restriction:**

- Prevents accidental modification of historical reports
- Maintains data integrity and audit trail
- Users should only edit the current/latest collection report
- Historical reports should remain immutable for accounting purposes

## Best Practices

### Data Integrity

- Validate meter readings before submission
- Ensure proper timing of collection operations
- Maintain audit trail for all changes
- Use atomic operations for critical updates
- **Create parent report BEFORE updating collections** (prevents orphaned collections)

### Performance

- Implement proper pagination for large datasets
- Use efficient database queries
- Cache frequently accessed data
- Optimize mobile interface

### Security

- **Authentication**: JWT-based with `sessionVersion` validation
- **Role-Based Access Control**:
  - Developer/Admin: Full access to all reports across all licensees
  - Manager: Access to reports for assigned licensees only
  - Collector: Access to reports for assigned locations only
  - Location Admin: Access to reports for assigned locations only
  - Technician: No access (redirected)
- **Licensee-Based Filtering**: Users only see reports for their assigned licensees/locations
  - Developer/Admin: Can filter by any licensee or view all
  - Manager: Can filter by assigned licensees (dropdown shown if 2+)
  - Collector/Location Admin: See only assigned locations (no dropdown if single licensee)
- **Location Permission Validation**: Server validates access to each location before returning reports
- **Session Invalidation**: Auto-logout when permissions change
- **Input Validation**: Comprehensive validation for all form inputs

#### Incomplete Collections Security Model (November 10, 2025)

When a user opens the collection modal, incomplete collections (collections not yet submitted as a report) are loaded from the database. These collections are **location-scoped**, not user-scoped.

**Security Filter Logic:**

```typescript
// 1. Get user's accessible location IDs
const locationIds = user.resourcePermissions['gaming-locations'].resources;
// Example: ['691166b455fe4b9b7ae3e702']

// 2. Convert IDs to location names
const locations = await GamingLocations.find({ _id: { $in: locationIds } });
const locationNames = locations.map(l => l.name);
// Example: ['Test-Permission-Location']

// 3. Filter collections by location names
const collections = await Collections.find({
  isCompleted: false,
  locationReportId: '',
  location: { $in: locationNames }, // Collections.location stores NAME, not ID
});
```

**Why Location-Based (Not User-Based)?**

1. **Team Collaboration**: Multiple collectors may work on the same location
2. **Data Consistency**: `collector` field stores display names which are inconsistent
3. **Permission Model**: Access is granted by location, not by user identity
4. **Workflow**: One collector may start, another may finish the report

**Security Guarantees:**

- ✅ Users only see incomplete collections for locations they have access to
- ✅ Collectors assigned to Location A cannot see Location B's incomplete collections
- ✅ Admin/Developer see all incomplete collections (for troubleshooting)
- ✅ Manager see incomplete collections for all locations in their assigned licensees
- ✅ Location permissions from `resourcePermissions` are strictly enforced

**Example:**

```
User: testuser (Collector, TTG)
  resourcePermissions: ['691166b455fe4b9b7ae3e702']
  → Location: 'Test-Permission-Location'

Modal Query: GET /api/collections?incompleteOnly=true
  → Returns: Collections where location = 'Test-Permission-Location'
  → Does NOT return: Collections for any other location
```

**Store Validation:**
The modal also validates the Zustand store on open:

```typescript
// If locked location is not in user's accessible locations, clear the store
if (lockedLocationId && !locations.some(loc => loc._id === lockedLocationId)) {
  useCollectionModalStore.getState().resetState();
}
```

This prevents stale data from persisting when users switch accounts or permissions change.

- **Audit Trail**: All create/edit/delete operations logged
- **Secure Authentication**: JWT tokens with role and permission validation

### User Experience

- Provide clear error messages
- Implement loading states with skeleton loaders
- Use responsive design principles
- Ensure accessibility compliance
