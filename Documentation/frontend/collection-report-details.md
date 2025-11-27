# Collection Report Details Page - Frontend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 27, 2025  
**Version:** 2.5.0

## Recent Updates (November 11th, 2025)

### Performance Optimization: 5-10x Faster! 🚀

**Backend N+1 Problem Solved:**

- Before: API queried meters individually for each machine (N+1 queries)
- After: ONE batch aggregation for all machines
- Result: ~1-3s for all report sizes (was ~5-15s)

**UI Improvements:**

- ✅ Fix Report button now **developer-only** (both desktop & mobile)
- ✅ Warning banner already was developer-only (correct)
- ✅ Table cells now **left-aligned** to match headers

### Key Changes:

1. **Performance:** Report details load 5-10x faster
2. **Security:** Fix button only visible to developers
3. **UX:** Table alignment consistent with headers

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

### Action Buttons (Updated November 11th, 2025)

**Available Buttons:**

- ✅ **Fix Report** - Appears when issues are detected, fixes all issues in the report
- ✅ **Back to Collection Reports** - Navigation button
- ❌ **Sync Meters** - REMOVED (commented out in code)
- ❌ **Floating Refresh Button** - REMOVED (commented out in code)

**Note:** Sync Meters functionality has been disabled. The "Sync Meters" button no longer appears on desktop or mobile views, and the floating refresh button has been hidden.

### Automatic Resume Redirect (November 15th, 2025)

If the report being viewed still has `isEditing: true`, the details page now:

1. Shows a toast informing the user that an unfinished edit is being resumed.
2. Redirects to `/collection-report?resume=<reportId>` so the main collection page can reopen the edit modal automatically.
3. Prevents the user from reviewing stale data until the incomplete edit is finalized.

This guarantees that opening a report on another device or refreshing the details page always routes the user back into the edit workflow instead of leaving the report stuck in an unfinished state.

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

### Overview

The Collection Report Details page includes a comprehensive issue detection and automated fixing system that validates data integrity for all collections in a report. This system works alongside the Cabinet Details Collection History issue detection but serves a different purpose focused on report-level financial accuracy.

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

**Updated:** November 6th, 2025 - Enhanced history sync logic

**"Fix Report" Button:**

- Appears in header when issues detected
- Fixes all detected issues in current report
- Comprehensive repair operations:
  - Movement recalculation
  - SAS time correction
  - Previous meter updates
  - **Machine history synchronization** (ENHANCED)
  - Chain validation

**Fix Operations:**

1. Recalculates movement values using proper formulas
2. Fixes inverted or invalid SAS time ranges
3. Corrects `prevIn`/`prevOut` references in collections
4. **Syncs `collectionMetersHistory` with collection documents** (ENHANCED)
   - Uses `locationReportId` as unique identifier
   - Updates: `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`, `timestamp`
   - Fixes discrepancies where history shows incorrect values
5. Removes orphaned history entries
6. Fixes duplicate history entries
7. Ensures data consistency across collection timeline

**Cabinet Details "Fix History" Button:**

- Renamed from "Check & Fix History" (November 6th, 2025)
- Appears when collection history issues detected
- **Auto-fix triggers automatically when issues detected** (zero-click)
- **Auto-requeries data after fix** to verify all issues resolved
- Performs same comprehensive fix operations as "Fix Report"
- Warning buttons and badges disappear automatically after fix
- Refreshes automatically after fix completes
- Hides button after successful fix

**CRITICAL PRINCIPLE - Collections Are Always the Source of Truth:**

- ✅ Collection documents are ALWAYS correct (validated, finalized, audit-ready)
- ✅ `collectionMetersHistory` is a denormalized copy (can get out of sync)
- ✅ Fix ALWAYS updates history to match collection (NEVER the reverse)
- ✅ ALL fields synced: `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`, `timestamp`
- ✅ Example: If history shows "Prev In: 347.9K" but collection has `prevIn: 0`, history gets updated to 0

### Smart Issue Detection & Auto-Fix

**Updated:** November 6th, 2025 - Auto-fix with auto-requery functionality added

**Issue Detection:**

- Issues detected automatically on page load
- Real-time validation ensures accuracy
- No manual intervention required for detection
- Uses enhanced `check-all-issues` API that checks machine history for reports

**Auto-Fix (NEW):**

- **Automatically fixes issues when detected** - No user action required
- Runs silently in the background after issue detection
- **Auto-requeries data after fix** to verify all issues are resolved
- Shows success toast: "Collection history automatically synchronized"
- Manual "Fix Report" / "Fix History" buttons remain available as backup
- PRINCIPLE: Collections are always right, auto-fix syncs history to match

**Auto-Requery After Fix (NEW):**

- After auto-fix completes, the page automatically requeries:
  - Collection report data
  - SAS time issues
  - Collection history issues
  - Machine metrics
- UI automatically updates to reflect fixed state
- Warning banners disappear automatically when issues are resolved
- No page reload required - seamless UX

**User Experience:**

1. Page loads → Detects issues
2. Auto-fix triggers automatically
3. Issues resolved in background
4. **Data automatically requeried to verify fix**
5. Success toast appears
6. Warning banners disappear automatically
7. Data displays correctly

**Benefits:**

- Zero-click resolution for users
- Immediate data consistency
- Better user experience
- Maintains data integrity automatically
- Clear communication of issues and fixes
- **Seamless UI updates without page reload**
- **Automatic verification that fixes worked**

### Comparison with Cabinet Details Issue Detection

Both the Collection Report Details page and the Cabinet Details Collection History tab include issue detection systems, but they serve different purposes:

| Feature          | Collection Report Details                                 | Cabinet Details Collection History                    |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| **Focus**        | Report-level financial accuracy                           | Machine-level data integrity                          |
| **Scope**        | All collections in ONE report                             | All collection history for ONE machine                |
| **Issue Types**  | SAS times, movement calculations, prev meters, RAM clears | History/Collection sync (mismatch, orphaned, missing) |
| **Auto-Fix**     | ✅ Yes - Automatic when issues detected                   | ✅ Yes - Automatic when issues detected               |
| **Auto-Requery** | ✅ Yes - After fix completes                              | ✅ Yes - After fix completes                          |
| **Visual Style** | Warning banner with issue counts, issue modals            | Red rows/cards with AlertCircle icons                 |
| **User Action**  | Zero-click (automatic)                                    | Zero-click (automatic)                                |
| **Purpose**      | Ensure accurate financial reporting                       | Validate collection history synchronization           |
| **When to Use**  | Before finalizing financial reports                       | When investigating machine-specific issues            |

**Use Collection Report Details Fix When:**

- Variation is too high and needs investigation
- SAS times are inverted or missing
- Movement calculations don't match meter readings
- Previous meters are incorrect
- You want to fix all issues in a report at once

**Use Cabinet Details Issue Detection When:**

- Investigating a specific machine's collection history
- Checking if machine history matches collection documents
- Identifying orphaned or missing history entries
- Understanding machine-specific data integrity problems
- No automated fix is needed, just visibility

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

## Collection History Table Component

**Updated:** November 6th, 2025 - Responsiveness and breakpoint improvements

### Component Details

**File**: `components/cabinetDetails/CollectionHistoryTable.tsx`

**Used In:**

- Cabinet Details page (Collection History tab)
- Shows machine's complete collection history from `collectionMetersHistory`

### Responsive Design Strategy

**Breakpoint Strategy:**

- **Mobile & Tablet (< 1280px)**: Card layout for better readability
- **Desktop XL (1280px+)**: Table layout with sortable columns

```tsx
// Desktop table - only on xl: breakpoint
<div className="hidden xl:block">
  <Table className="w-full table-fixed">
    // ... table content
  </Table>
</div>

// Card view - on mobile, tablet, and lg: screens
<div className="xl:hidden">
  // ... card content
</div>
```

### Table Design (XL+ Screens)

**Features:**

- Fixed table layout (`table-fixed`) to enforce column widths
- Sortable columns with visual indicators
- Compact padding (`px-2`) for efficient space usage
- Left-aligned text for better readability
- Perfect vertical alignment between headers and data

**Column Widths:**

- Time: `160px` - Displays full date/time without truncation
- Meters In/Out: `85px` - Compact for numeric values
- Prev. In/Out: `85px` - Compact for numeric values
- Collection Report: `110px` - Fits "VIEW REPORT" button

**Key Design Decisions:**

- Removed Status column (November 6th, 2025) - not needed
- Used `table-fixed` layout to enforce column widths
- Reduced padding from `p-4` (16px) to `px-2` (8px) for compact design
- All text left-aligned for consistent vertical alignment

### Card Design (Mobile/Tablet/LG Screens)

**Layout:**

- Card-based design for better mobile UX
- Vertical column layout for meter values
- Responsive header that stacks on mobile, inline on tablet
- Issue warnings with proper text wrapping (`break-words`)

**Features:**

- Clear visual separation of metrics
- Prominent "VIEW REPORT" button
- Issue alerts displayed inline with details
- Compact spacing for efficient use of screen space

### Filter Controls

**Responsive Behavior:**

- **Mobile**: Stacks vertically (`flex-col`)
- **Tablet+**: Horizontal layout (`sm:flex-row`)
- Time filter dropdown with pre-defined ranges
- Entry count display
- "Fix History" button (appears when issues detected)

### Issue Detection Integration

**Visual Indicators:**

- **Table**: Red background on rows with issues
- **Cards**: Red border and red background on cards with issues
- **Both**: AlertCircle icon for visual prominence

**Auto-Fix Behavior:**

- Issues detected automatically
- Fix triggers without user action
- Data requeries after fix
- Visual indicators disappear when resolved

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
