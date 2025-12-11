# Skeleton Loader Audit Tracker

**Last Updated:** December 10, 2025

This document tracks the systematic review and correction of skeleton loaders across the Reports page to ensure they exactly match the actual data structure and layout.

---

## Machines Tab

### Overview Tab

- [x] **Metric Cards (Above Tabs)**
  - Status: Fixed
  - Issue: Refresh button doesn't show skeleton loaders for metric cards
  - Location: Lines 1582-1650 in MachinesTab.tsx
  - Skeleton: Custom inline skeleton (lines 1585-1591)
  - Actual: 4 cards (Total Net Win, Total Drop, Total Cancelled Credits, Online Machines)
  - Action: ✅ Fixed refresh to show skeleton for metric cards

- [x] **MachinesOverviewSkeleton - Removed Cards/Filters**
  - Status: Fixed
  - Issue: Skeleton included cards and filters that are rendered separately
  - Location: ReportsSkeletons.tsx lines 400-492
  - Action: ✅ Removed cards and filters from skeleton, now only shows table structure

- [x] **Table Structure**
  - Status: Fixed
  - Location: Lines 1790-2025 in MachinesTab.tsx
  - Actual: 8 columns (Machine, Location, Type, Gross, Drop, Hold %, Games, Actions)
  - Action: ✅ Updated skeleton to match exact table structure with proper columns

- [x] **Mobile Card View**
  - Status: Fixed
  - Location: Lines 2027-2305 in MachinesTab.tsx
  - Actual: Two layouts - tiny screen (<425px) single column, small screen (425px+) two columns
  - Action: ✅ Updated skeleton to match both mobile layouts exactly

- [x] **Pagination**
  - Status: Fixed
  - Action: ✅ Verified skeleton matches pagination structure

### Evaluation Tab

- [x] **Overall Structure**
  - Status: Fixed
  - Actual Structure:
    - Filters (search, location) - rendered separately
    - Manufacturers Performance Chart
    - Summary Section (MachineEvaluationSummary)
    - Games Performance Chart
    - Games Performance Revenue Chart
    - Top 5 Machines Table (11 columns)
  - Action: ✅ Updated MachinesEvaluationSkeleton to match exact structure, removed location selector (rendered separately)

- [x] **Top 5 Machines Table**
  - Status: Fixed
  - Actual: 11 columns (Location, Machine ID, Game, Manufacturer, Money In, Net Win, Jackpot, Avg. Wag. per Game, Actual Hold, Theoretical Hold, Games Played)
  - Action: ✅ Updated skeleton to match 11-column structure

- [x] **Mobile Card View**
  - Status: Fixed
  - Action: ✅ Updated skeleton to match mobile card layouts

### Offline Machines Tab

- [x] **Overall Structure**
  - Status: Fixed
  - Actual Structure:
    - Filters (search, location) - rendered separately
    - Offline Badge
    - Table (5 columns: Machine, Location, Last Activity, Offline Duration, Actions)
  - Action: ✅ Updated MachinesOfflineSkeleton to match exact structure, removed filters (rendered separately)

- [x] **Table Structure**
  - Status: Fixed
  - Actual: 5 columns
  - Action: ✅ Updated skeleton to match 5-column structure

- [x] **Mobile Card View**
  - Status: Fixed
  - Action: ✅ Updated skeleton to match mobile card layouts

---

## Locations Tab

### Overview Tab

- [ ] **Overall Structure**
  - Status: Pending
  - Action: Review entire tab structure and skeleton

### SAS Evaluation Tab

- [ ] **Overall Structure**
  - Status: Pending
  - Action: Review entire tab structure and skeleton

### Revenue Analysis Tab

- [ ] **Overall Structure**
  - Status: Pending
  - Action: Review entire tab structure and skeleton

---

## Meters Tab

- [ ] **Overall Structure**
  - Status: Pending
  - Action: Review entire tab structure and skeleton

---

## Notes

- All skeleton loaders must exactly match the layout, structure, and visual hierarchy of the actual content
- Remove any skeleton loaders for components that don't exist
- Ensure refresh actions trigger appropriate skeleton loaders
- Verify responsive behavior (mobile vs desktop) for all skeletons
- Filters and search components are rendered separately and should NOT be in skeleton loaders

---

## Pagination Audit

### Pagination Standards (from Admin Page)

- **Items per page**: 10
- **Items per batch**: 50
- **Pages per batch**: 5 (50 / 10)
- **Total pages calculation**: Based on filtered data length (not all loaded data)
- **Pagination display**: Shows "Page X of Y" where Y is based on filtered data

### Machines Tab

#### Overview Tab

- [x] **Pagination Constants**
  - Status: Correct
  - `overviewItemsPerPage = 10` ✓
  - `overviewItemsPerBatch = 50` ✓
  - `overviewPagesPerBatch = 5` ✓
  - **Note**: Uses `allOverviewMachines.length` for total pages (backend handles filtering, so this is correct)

#### Evaluation Tab

- [ ] **Pagination**
  - Status: Needs review
  - Action: Check if evaluation tab has pagination and if it follows the standard

#### Offline Machines Tab

- [x] **Pagination Constants**
  - Status: Correct
  - `offlineItemsPerPage = 10` ✓
  - `offlineItemsPerBatch = 50` ✓
  - `offlinePagesPerBatch = 5` ✓
- [x] **Total Pages Calculation**
  - Status: Fixed
  - Issue: Was using `allOfflineMachines.length` (unfiltered)
  - Fix: Now uses `filteredOfflineData.length` (filtered, like admin page)
  - Action: ✅ Updated to use filtered data for total pages

### Locations Tab

#### Overview Tab

- [x] **Pagination Constants**
  - Status: Correct
  - `itemsPerPage = 10` ✓
  - `itemsPerBatch = 50` ✓
  - `pagesPerBatch = 5` ✓
- [ ] **Total Pages Calculation**
  - Status: Needs review
  - Current: Uses `totalPages` state from API pagination metadata
  - Action: Verify this matches admin page pattern

#### SAS Evaluation Tab

- [ ] **Pagination**
  - Status: Needs review
  - Action: Check if this tab has pagination and if it follows the standard

#### Revenue Analysis Tab

- [ ] **Pagination**
  - Status: Needs review
  - Action: Check if this tab has pagination and if it follows the standard

### Meters Tab

- [x] **Pagination Constants**
  - Status: Correct
  - `itemsPerPage = 10` ✓
  - `itemsPerBatch = 50` ✓
  - `pagesPerBatch = 5` ✓
- [x] **Total Pages Calculation**
  - Status: Correct
  - Uses `filteredMetersData.length` for total pages ✓
- [x] **Pagination Display**
  - Status: Correct
  - Uses standard `PaginationControls` component ✓

---

## Pagination Issues Fixed

### Machines Tab - Offline Machines

- [x] **Total Pages Calculation**
  - Status: Fixed
  - Issue: Was using `allOfflineMachines.length` (unfiltered) for total pages
  - Fix: Now uses `filteredOfflineData.length` (filtered, like admin page)
  - Action: ✅ Updated to use filtered data for total pages

### Locations Tab

- [x] **Page Numbering**
  - Status: Fixed
  - Issue: Was using 1-based page numbers
  - Fix: Changed to 0-based page numbers (like admin page)
  - Action: ✅ Updated `currentPage` state to start at 0, updated all calculations

- [x] **Batch Calculation**
  - Status: Fixed
  - Issue: `calculateBatchNumber` was using `(page - 1)` calculation
  - Fix: Updated to use `Math.floor(page / pagesPerBatch) + 1` (0-based)
  - Action: ✅ Updated batch calculation to match admin page pattern

- [x] **Pagination Display**
  - Status: Fixed
  - Issue: EnhancedLocationTable and RevenueAnalysisTable had custom pagination
  - Fix: Updated to use standard `PaginationControls` component
  - Action: ✅ Replaced custom pagination with standard component

- [x] **Double Pagination**
  - Status: Fixed
  - Issue: EnhancedLocationTable and RevenueAnalysisTable were paginating already-paginated data
  - Fix: Removed internal pagination, now uses pre-paginated data from parent
  - Action: ✅ Removed internal pagination logic from both components

### Machines Tab - Overview

- [x] **Pagination Constants**
  - Status: Correct
  - `overviewItemsPerPage = 10` ✓
  - `overviewItemsPerBatch = 50` ✓
  - `overviewPagesPerBatch = 5` ✓
  - **Note**: Uses `allOverviewMachines.length` for total pages (backend handles filtering, so this is correct)

### Machines Tab - Evaluation

- [x] **Pagination**
  - Status: Correct (No pagination needed)
  - Top 5 Machines table shows only top 5 machines (`.slice(0, 5)`)
  - No pagination controls needed for this table
  - Action: ✅ Verified - no pagination needed for Top 5 table
