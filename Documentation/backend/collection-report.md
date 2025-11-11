# Collection Report System - Backend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 11th, 2025  
**Version:** 2.5.0

## Recent Performance Optimizations (November 11th, 2025) 🚀

### Collection Report List API - Pagination Added

**API:** `GET /api/collectionReport`

**Problem:**

- Fetched ALL 40K+ reports at once, then filtered in memory
- Result: >5s for Today, >30s for All Time

**Solution:**

- Server-side pagination (default 50 reports per page, max 100)
- Query params: `page` (default 1), `limit` (default 50)
- Returns paginated slice of filtered results

**Performance:**

- Before: >5s for Today, >30s for All Time
- After: ~2-3s for all periods (2-10x faster!)

**Implementation:** `app/api/collectionReport/route.ts`

### Collection Report Details API - N+1 Problem SOLVED

**API:** `GET /api/collection-report/[reportId]`

**Problem:**

- Queried meters INDIVIDUALLY for each machine in report (N+1 problem!)
- Report with 16 machines = 16 separate database queries
- Result: ~5-15s for typical reports, >30s for large reports

**Solution:**

- ONE batch aggregation for ALL machines in report
- Collect all machine IDs and SAS time ranges upfront
- Single `Meters.aggregate()` with `$or` filter for all machines
- Create lookup map for O(1) access to meter data

**Performance:**

- Before: ~8-12s for 16 machines, >30s for 100+ machines
- After: ~1-3s for all report sizes (5-10x faster!)

**Implementation:** `app/api/lib/helpers/accountingDetails.ts` - `getCollectionReportById()`

```typescript
// Batch fetch ALL meter data in ONE query
const meterQueries = collections
  .filter(c => c.sasMeters?.sasStartTime && c.sasMeters?.sasEndTime)
  .map(c => ({
    machineId: c.machineId,
    startTime: new Date(c.sasMeters.sasStartTime),
    endTime: new Date(c.sasMeters.sasEndTime),
  }));

const allMeterData = await Meters.aggregate([
  {
    $match: {
      $or: meterQueries.map(q => ({
        machine: q.machineId,
        readAt: { $gte: q.startTime, $lte: q.endTime },
      })),
    },
  },
  {
    $group: {
      _id: '$machine',
      totalDrop: { $sum: '$movement.drop' },
      totalCancelled: { $sum: '$movement.totalCancelledCredits' },
    },
  },
]);

const meterDataMap = new Map(allMeterData.map(m => [m._id, m]));
```

### Locations with Machines API - Projection Optimized

**API:** `GET /api/collectionReport?locationsWithMachines=1`

**Problem:**

- Fetched ALL fields for locations and machines
- Slow $lookup without optimization

**Solution:**

- Project only essential fields BEFORE $lookup
- Optimized pipeline in $lookup for machines
- Reduced data transfer and memory usage

**Performance:**

- Before: ~2-5s
- After: <1s (3x faster!)

**Implementation:** `app/api/collectionReport/route.ts`

---

## Recent Critical Fixes

### November 7th, 2025 - Report Creation Order & Detection API Scope ✅

**Issue 1: Orphaned Collections from Wrong Operation Order**

32 incomplete collections were found with `locationReportId` but no parent `CollectionReport` document. This happened because both desktop and mobile modals updated collections BEFORE creating the parent report.

**Root Cause:**

```javascript
// BEFORE (BROKEN):
Step 1: Update collections with locationReportId + isCompleted: true ✅
Step 2: Create parent CollectionReport → ❌ FAILS
Result: Collections orphaned with reportId pointing to non-existent report
```

**The Fix:**
Reversed the order of operations in both modals to create an atomic transaction:

Desktop (`NewCollectionModal.tsx` lines 1868-1961):

```javascript
// Step 1: Create parent report FIRST
await createCollectionReport(payload);

// Step 2: ONLY IF successful, update collections
await updateCollectionsWithReportId(collectedMachineEntries, reportId);
```

Mobile (`MobileCollectionModal.tsx` lines 1050-1074):

```javascript
// Step 1: Create parent report FIRST
const result = await createReportAPI(payload);

// Step 2: ONLY IF successful, update collections
const updatePromises = machinesForReport.map(async collection => {
  await axios.patch(`/api/collections?id=${collection._id}`, {
    locationReportId: reportId,
    isCompleted: true,
  });
});
await Promise.all(updatePromises);
```

**Impact:**

- ✅ If report creation fails, collections remain untouched (no orphaned collections)
- ✅ If report succeeds but collection updates fail, report exists (fixable via `/update-history`)
- ✅ Atomic operation prevents data inconsistencies
- ✅ Better error messages with full API response details

**Issue 2: Detection API Not Finding Previous Collections Across Reports**

The SAS time detection API (`/api/collection-report/[reportId]/check-sas-times`) was only searching collections within the current report, causing "No previous collection found" errors when a machine's previous collection was in a different report.

**Root Cause:**

```javascript
// BEFORE (BROKEN):
const collections = await Collections.find({
  locationReportId: reportId, // Only current report
});
// Couldn't find previous collection in different report
```

**The Fix:**

```javascript
// AFTER (FIXED):
const allCollections = await Collections.find({
  isCompleted: true,
  locationReportId: { $exists: true, $ne: '' },
}).sort({ timestamp: 1, collectionTime: 1 });
// Searches ALL collections across ALL reports
```

**Impact:**

- ✅ Detection API now finds previous collections regardless of which report they're in
- ✅ Correct expected SAS times calculated from actual previous collection
- ✅ "No previous collection found" only shown when truly no previous exists
- ✅ Matches fix-report API logic for consistency

**Related Files:**

- `components/collectionReport/NewCollectionModal.tsx`
- `components/collectionReport/mobile/MobileCollectionModal.tsx`
- `app/api/collection-report/[reportId]/check-sas-times/route.ts`
- `scripts/detect-incomplete-collections.js`
- `scripts/diagnose-fixed-machine.js`

### November 6th, 2025 - Collection History Sync Enhancement ✅

**Fixed:** POST `/api/collection-reports/fix-report` endpoint now properly syncs `collectionMetersHistory` entries with actual collection documents using `locationReportId` as the unique identifier. Previously, the fix would fail when multiple collections had the same metersIn/metersOut values or would not update all fields correctly. The enhanced logic now:

- Uses `locationReportId` instead of metersIn/metersOut to uniquely identify history entries
- Syncs ALL fields: `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`, `timestamp`
- Fixes discrepancies where history shows incorrect values (prevIn/prevOut OR metersIn/metersOut)
- Works reliably even when multiple collections have similar meter readings

**CRITICAL PRINCIPLE - Single Source of Truth:**

- ✅ **Collection documents are ALWAYS correct** (validated through proper workflow)
- ✅ **History might be wrong** (denormalized copy, can get out of sync)
- ✅ **Fix always updates history to match collection** (NEVER the reverse)
- ✅ **All mismatches are resolved by syncing history from collection**

**UI Changes:**

- Cabinet Details: Renamed "Check & Fix History" button to "Fix History"
- Refresh logic now rechecks issues after fix to hide button when resolved

### November 6th, 2025 - `isEditing` Flag & History Mismatch Bug ✅

**Fixed:** Two critical issues resolved:

1. **History Mismatch:** `update-history` endpoint was using stale frontend `prevIn`/`prevOut` values instead of fetching from collection documents. Now always fetches actual collection data as single source of truth.
2. **Unsaved Data Protection:** Enhanced validation in Edit Collection Modal (desktop & mobile) to prevent users from updating/closing modal with unsaved machine data. Modal now properly detects `isEditing` flag and enforces completion.

See [`isEditing` Flag System](#isediting-flag-system---unsaved-changes-protection) for complete documentation.

### November 4th, 2025 - Previous Meters Recalculation Bug ✅

**Fixed:** PATCH `/api/collections` endpoint now correctly recalculates `prevIn`, `prevOut`, and `movement` values when editing collections. Previously, the endpoint was blindly updating values without looking up the actual previous collection, causing revenue calculation errors up to 99.7%. See [PATCH Implementation](#patch-apicollections-edit-collection-implementation) for details.

### November 4th, 2025 - DELETE Endpoint Not Removing Collection History ✅

**Fixed:** DELETE `/api/collections` endpoint now properly removes `collectionMetersHistory` entries when deleting collections. Previously, it only reverted `collectionMeters` but left orphaned history entries, causing data integrity issues and incorrect collection counts in the UI. See [DELETE Implementation](#delete-apicollections) for details.

## Overview

The backend handles collection report creation, SAS metrics calculation, machine time management, and report queries. This guide documents all backend logic for the collection report system.

**Important:** All date filtering respects each location's gaming day offset. See [Gaming Day Offset System](../../.cursor/gaming-day-offset-system.md) for details.

## Complete Flow Diagram

### Collection Report Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ACTIONS (Frontend)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. SELECT LOCATION                                              │
│    - User selects gaming location from LocationSingleSelect    │
│    - System initializes collection time (gameDayOffset)        │
│    - Location locks after first machine added                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. ADD MACHINE TO LIST (Repeat for each machine)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/collections                                 │
│   Payload: {                                                    │
│     machineId, location, collector,                            │
│     metersIn, metersOut, timestamp,                            │
│     ramClear, ramClearMetersIn, ramClearMetersOut, notes       │
│   }                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend: app/api/collections/route.ts                          │
│   ↓                                                             │
│   createCollectionWithCalculations()                           │
│   ↓                                                             │
│   1. Validate payload                                          │
│   2. Get machine document from database                        │
│   3. Get previous meters from machine.collectionMeters         │
│   4. getSasTimePeriod(machineId, collectionTime)              │
│      → sasStartTime = previous collection time                 │
│      → sasEndTime = current collection time                    │
│   5. calculateSasMetrics(machineId, sasStart, sasEnd)         │
│      → Query sashourly collection                             │
│      → Sum drop, cancelled credits, gross                     │
│   6. calculateMovement(current, prev, ramClear)               │
│      → movementIn = currentIn - prevIn                        │
│      → movementOut = currentOut - prevOut                     │
│      → gross = movementIn - movementOut                       │
│   7. Create Collection document:                               │
│      {                                                          │
│        locationReportId: "",  ← EMPTY                         │
│        isCompleted: false,    ← NOT COMPLETED                 │
│        metersIn, metersOut, prevIn, prevOut,                  │
│        movement: { metersIn, metersOut, gross },              │
│        sasMeters: { drop, cancelled, gross, times },          │
│        timestamp, machineId, location, collector, notes       │
│      }                                                          │
│   8. Return collection to frontend                            │
│                                                                 │
│   ⚠️  IMPORTANT: Does NOT update machine.collectionMeters      │
│   ⚠️  IMPORTANT: Does NOT create collectionMetersHistory       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: Add to collectedMachines list (local + Zustand)      │
│   - Machine added to UI list                                   │
│   - Can edit/delete before finalization                        │
│   - Repeat steps 2-3 for more machines                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ENTER FINANCIAL DATA (First machine only)                   │
│    - Taxes, Advance, Variance, Balance Correction              │
│    - Collected Amount, Previous Balance                        │
│    - Reasons for variance/shortage                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. CREATE REPORT (Finalize)                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
┌────────────────────────────┐  ┌────────────────────────────────┐
│ Desktop Flow               │  │ Mobile Flow                    │
│ (NewCollectionModal)       │  │ (MobileCollectionModal)        │
├────────────────────────────┤  ├────────────────────────────────┤
│ 1. Generate locationReportId│  │ 1. Generate locationReportId   │
│    (uuidv4)                │  │    (uuidv4)                    │
│ 2. Validate payload        │  │ 2. Update all collections:     │
│ 3. POST /api/collectionReport│  │    PATCH /api/collections    │
│    → Backend handles all   │  │    Set locationReportId        │
│       updates automatically│  │    Set isCompleted = true      │
│                            │  │ 3. POST /api/collectionReport  │
└────────────────────────────┘  └────────────────────────────────┘
                │                            │
                └─────────────┬──────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend: POST /api/collectionReport                             │
│   app/api/collectionReport/route.ts                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. CHECK FOR DUPLICATES                                         │
│    - Query CollectionReport for same location + gaming day     │
│    - Return 409 Conflict if exists                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. VALIDATE PAYLOAD                                             │
│    - Check all required fields                                 │
│    - Sanitize string inputs                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CALCULATE TOTALS                                             │
│    calculateCollectionReportTotals(locationReportId)           │
│    - Sum all movement data from collections                    │
│    - Sum all SAS data from collections                         │
│    - Calculate variance                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. CREATE COLLECTION REPORT DOCUMENT                            │
│    CollectionReport.create({                                   │
│      locationReportId, locationName, collectorName,            │
│      totalDrop, totalCancelled, totalGross, totalSasGross,     │
│      variance, taxes, advance, partnerProfit,                  │
│      amountToCollect, amountCollected, previousBalance,        │
│      timestamp, location                                       │
│    })                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. UPDATE ALL COLLECTIONS                                       │
│    For each machine in payload.machines:                       │
│    Collections.updateMany(                                     │
│      { machineId, metersIn, metersOut, locationReportId: "" }, │
│      {                                                          │
│        $set: {                                                  │
│          locationReportId: <generated-uuid>,                   │
│          isCompleted: true,                                    │
│          updatedAt: new Date()                                 │
│        }                                                        │
│      }                                                          │
│    )                                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. CREATE COLLECTION METERS HISTORY                             │
│    For each machine:                                           │
│    Machine.findByIdAndUpdate(machineId, {                      │
│      $push: {                                                   │
│        collectionMetersHistory: {                              │
│          _id: new ObjectId(),                                  │
│          metersIn: current metersIn,                           │
│          metersOut: current metersOut,                         │
│          prevMetersIn: previous metersIn,                      │
│          prevMetersOut: previous metersOut,                    │
│          timestamp: collection time,                           │
│          locationReportId: <generated-uuid>                    │
│        }                                                        │
│      }                                                          │
│    })                                                           │
│                                                                 │
│    ⚠️  CRITICAL: This is when history entries are created      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. UPDATE MACHINE COLLECTION METERS                             │
│    For each machine:                                           │
│    Machine.findByIdAndUpdate(machineId, {                      │
│      $set: {                                                    │
│        'collectionMeters.metersIn': current metersIn,          │
│        'collectionMeters.metersOut': current metersOut,        │
│        previousCollectionTime: old collectionTime,             │
│        collectionTime: new collection time                     │
│      }                                                          │
│    })                                                           │
│                                                                 │
│    ⚠️  CRITICAL: This is when machine meters are updated       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. UPDATE GAMING LOCATION                                       │
│    GamingLocations.findByIdAndUpdate(locationId, {            │
│      $set: {                                                    │
│        previousCollectionTime: new collection time            │
│      }                                                          │
│    })                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. LOG ACTIVITY                                                 │
│    logActivity({                                               │
│      action: 'CREATE',                                          │
│      details: 'Created collection report...',                  │
│      metadata: { resource, changes, user info }               │
│    })                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. RETURN SUCCESS                                              │
│     { success: true, data: createdReportId }                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: Success handling                                      │
│   - Show success toast                                         │
│   - Reset form state                                           │
│   - Clear Zustand store                                        │
│   - Refresh parent data                                        │
│   - Close modal                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Collection Report Editing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. OPEN EDIT MODAL                                              │
│    - User clicks "Edit" on collection report row              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LOAD REPORT DATA                                             │
│    GET /api/collection-report/[reportId]                       │
│    - Fetch report details                                      │
│    - Populate financial fields                                 │
│                                                                 │
│    GET /api/collections?locationReportId=[reportId]            │
│    - Fetch all collections for report                          │
│    - Display in collected machines list                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. MODIFY DATA (User actions)                                  │
│    Options:                                                    │
│    a) Edit existing machine collection                         │
│    b) Add new machine to report                                │
│    c) Delete machine from report                               │
│    d) Update financial data                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Edit Collection  │  │ Add Machine     │  │ Delete Machine  │
└──────────────────┘  └─────────────────┘  └─────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ PATCH            │  │ POST            │  │ DELETE          │
│ /api/collections │  │ /api/collections│  │ /api/collections│
│ ?id=[collId]     │  │                 │  │ ?id=[collId]    │
│                  │  │                 │  │                 │
│ CRITICAL:        │  │ - Same as       │  │ - Remove from   │
│ - Find ACTUAL    │  │   creation flow │  │   report        │
│   previous coll  │  │ - Add to report │  │ - Update history│
│   from DB        │  │   immediately   │  │ - Update machine│
│ - Recalc prevIn/ │  │                 │  │   meters        │
│   prevOut from   │  │                 │  │                 │
│   prev coll      │  │                 │  │                 │
│ - Recalc movement│  │                 │  │                 │
│   (current-prev) │  │                 │  │                 │
│ - NOT from       │  │                 │  │                 │
│   machine.coll   │  │                 │  │                 │
│   Meters!        │  │                 │  │                 │
└──────────────────┘  └─────────────────┘  └─────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SAVE REPORT CHANGES                                          │
│    PUT /api/collection-report/[reportId]                       │
│    - Update financial fields                                   │
│    - Recalculate totals                                        │
│    - Log activity                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. SUCCESS                                                      │
│    - Show success toast                                        │
│    - Refresh data                                              │
│    - Close modal                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Collection Report Deletion Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS DELETE                                           │
│    - Confirmation dialog shown                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. DELETE REQUEST                                               │
│    DELETE /api/collection-report/[reportId]                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. FIND ALL COLLECTIONS                                         │
│    Collections.find({ locationReportId })                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. REVERT MACHINE STATE (For each collection)                  │
│    a) Find previous collection for machine                     │
│    b) Revert machine.collectionMeters to previous values       │
│       OR set to 0 if this was first collection                 │
│    c) Remove entry from machine.collectionMetersHistory        │
│       Using $pull with locationReportId                        │
│    d) Update machine.collectionTime to previous time           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. DELETE ALL COLLECTIONS                                       │
│    Collections.deleteMany({ locationReportId })                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. DELETE COLLECTION REPORT                                     │
│    CollectionReport.findByIdAndDelete(reportId)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. LOG ACTIVITY                                                 │
│    logActivity({ action: 'DELETE', details, metadata })        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. SUCCESS                                                      │
│    - Show success toast                                        │
│    - Refresh data                                              │
│    - Machine state fully reverted                              │
└─────────────────────────────────────────────────────────────────┘
```

## Desktop vs Mobile Implementation Differences

### Collection Creation

**Desktop (NewCollectionModal.tsx)**:

1. User adds machines → Creates collections via `POST /api/collections`
2. Collections stored with `locationReportId: ""` and `isCompleted: false`
3. User clicks "Create Report" → Validates payload
4. **Single API call**: `POST /api/collectionReport` with full payload
5. Backend handles ALL updates:
   - Updates collections with `locationReportId`
   - Creates `collectionMetersHistory`
   - Updates machine meters
   - Updates location time

**Mobile (MobileCollectionModal.tsx)**:

1. User adds machines → Creates collections via `POST /api/collections`
2. Collections stored with `locationReportId: ""` and `isCompleted: false`
3. User clicks "Create Report" → Generates `locationReportId` (uuidv4)
4. **Two-step process**:
   - Step 1: `PATCH /api/collections` for EACH collection
     - Sets `locationReportId`
     - Sets `isCompleted: true`
   - Step 2: `POST /api/collectionReport` with full payload
5. Backend handles remaining updates:
   - Creates `collectionMetersHistory`
   - Updates machine meters
   - Updates location time

**Why the Difference?**

- Mobile implementation does extra PATCH step to mark collections as completed before report creation
- Desktop relies entirely on backend to update collections
- Both approaches result in the same final state
- Mobile approach provides more granular control over collection state

### Collection Editing

**Desktop (EditCollectionModal.tsx)**:

- Three-column layout for better visibility
- Instant visual feedback for all changes
- Can see all machines, form, and collected list simultaneously
- Uses standard form inputs and buttons

**Mobile (MobileEditCollectionModal.tsx)**:

- Slide-up panel architecture for limited screen space
- Navigation between: Location → Form → Collected List
- Uses `MobileFormPanel` and `MobileCollectedListPanel` components
- Touch-optimized UI with larger buttons and spacing

**Common Behavior**:

- Both use same API endpoints (`PATCH /api/collections`, `PATCH /api/collection-report/[reportId]`)
- Both recalculate SAS metrics and movement on edit
- Both update `collectionMetersHistory` using `arrayFilters`
- Both maintain state in Zustand store for persistence

## Database Schema

### Collections Collection (Machine-Level Entries)

```typescript
{
  _id: string;
  isCompleted: boolean;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  softMetersIn: number;
  softMetersOut: number;
  notes: string;
  timestamp: Date;
  collectionTime: Date;
  location: string;
  collector: string;
  locationReportId: string;
  sasMeters: {
    machine: string;
    drop: number;
    totalCancelledCredits: number;
    gross: number;
    gamesPlayed: number;
    jackpot: number;
    sasStartTime: string;
    sasEndTime: string;
  };
  movement: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  machineCustomName: string;
  machineId: string;
  machineName: string;
  ramClear: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  serialNumber: string;
}
```

### Collection Report Collection (Location-Level)

```typescript
{
  _id: string;
  variance: number;
  previousBalance: number;
  currentBalance: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  collectorName: string;
  locationName: string;
  locationReportId: string;
  location: string;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross: number;
  timestamp: Date;
  varianceReason?: string;
  previousCollectionTime?: Date;
  locationProfitPerc?: number;
  reasonShortagePayment?: string;
  balanceCorrection?: number;
  balanceCorrectionReas?: string;
  machinesCollected?: string;
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
    _id: ObjectId;
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

### POST /api/collections

**Purpose**: Create a new collection with calculated metrics

**Flow**:

1. Validate payload (machineId, location, collector, meters)
2. Get machine details
3. Get previous collection meters from `machine.collectionMeters`
4. Calculate SAS time window (`getSasTimePeriod`)
   - `sasStartTime` = `machine.previousCollectionTime` or default
   - `sasEndTime` = current `collectionTime`
5. Calculate SAS metrics from `sashourly` collection
   - Queries SAS data between sasStartTime and sasEndTime
   - Sums drop, cancelled credits, gross, games played, jackpot
6. Calculate movement values using `calculateMovement`
   - Standard: `currentMeters - prevMeters`
   - RAM Clear: `(ramClearMeters - prevMeters) + (currentMeters - 0)`
7. Save collection document:
   - `locationReportId: ""` ← EMPTY (not finalized yet)
   - `isCompleted: false` ← NOT COMPLETED
   - Includes all meter data, movement, SAS metrics
8. Return created collection to frontend

**File**: `app/api/collections/route.ts`

**Key Functions**:

- `createCollectionWithCalculations` (`app/api/lib/helpers/collectionCreation.ts`)
- `getSasTimePeriod` (determines SAS time window)
- `calculateSasMetrics` (aggregates SAS data from sashourly)
- `calculateMovement` (computes movement values)

**Important**: Does NOT update `machine.collectionMeters` or create `collectionMetersHistory` entries. These operations happen when report is finalized via `POST /api/collectionReport`.

### PATCH /api/collections

**Purpose**: Update existing collection (used in edit mode and mobile finalization)

**Flow**:

1. Validate collection exists
2. Recalculate SAS time window (if needed)
3. Recalculate SAS metrics from `sashourly`
4. Recalculate movement values
5. Update collection document
6. If collection has `locationReportId` (already finalized):
   - Update corresponding `collectionMetersHistory` entry using `$set` with `arrayFilters`
   - Does NOT create new history entry (prevents duplicates)
7. Update machine meters if needed
8. Return updated collection

**File**: `app/api/collections/route.ts`

**Query Parameters**: `id=[collectionId]`

**Important**: Uses `$set` with `arrayFilters` to update existing history entries, not `$push`. This prevents duplicate history entries when editing collections.

### DELETE /api/collections

**Purpose**: Delete a collection and fully revert machine state

**Fixed:** November 4th, 2025 - Now properly removes `collectionMetersHistory` entries

**Flow**:

1. Find collection by ID
2. Delete the collection document
3. **Revert machine state**:
   - If collection has `locationReportId` (finalized report):
     - Revert `machine.collectionMeters` to `prevIn`/`prevOut` values
     - **Remove `collectionMetersHistory` entry** using `$pull` with `locationReportId`
   - If collection has NO `locationReportId` (not yet finalized):
     - Revert `machine.collectionMeters` to `prevIn`/`prevOut` values only
     - No history entry to remove (history is only created when report is finalized)
4. Log activity
5. Return success

**Critical Fix Details:**

```typescript
// CRITICAL: ALWAYS revert meters AND remove any history entries
const updateOperation: {
  $set: Record<string, unknown>;
  $pull?: Record<string, unknown>;
} = {
  $set: {
    'collectionMeters.metersIn': collectionToDelete.prevIn || 0,
    'collectionMeters.metersOut': collectionToDelete.prevOut || 0,
    updatedAt: new Date(),
  },
};

// If collection has a locationReportId, remove its history entry
if (collectionToDelete.locationReportId) {
  updateOperation.$pull = {
    collectionMetersHistory: {
      locationReportId: collectionToDelete.locationReportId,
    },
  };
}

await Machine.findByIdAndUpdate(collectionToDelete.machineId, updateOperation);
```

**Key Logic:**

- Always reverts `collectionMeters` to `prevIn`/`prevOut` values
- If `locationReportId` exists, also removes the history entry using `$pull`
- Single database operation for efficiency
- Handles both finalized and unfinalized collections correctly

**Before Fix (Bug):**

- ❌ Only reverted `collectionMeters`
- ❌ Did NOT remove `collectionMetersHistory` entry
- ❌ Caused orphaned history entries to accumulate

**After Fix:**

- ✅ Reverts `collectionMeters` to previous values
- ✅ Removes `collectionMetersHistory` entry (if collection was finalized)
- ✅ Complete state reversion - machine returns to state before collection was added

**Use Case:** 2. If collection has `locationReportId`:

- Remove from `collectionMetersHistory` using `$pull`
- Recalculate machine meters from remaining history

3. Delete collection document
4. Return success

**File**: `app/api/collections/route.ts`

**Query Parameters**: `id=[collectionId]`

### POST /api/collectionReport

**Purpose**: Create a new collection report (finalize collections)

**Flow**:

1. **Check for duplicates**:
   - Query `CollectionReport` for same `locationName` and gaming day (date match)
   - Return `409 Conflict` if duplicate found
   - Prevents multiple reports for same location on same day

2. **Validate payload**:
   - Check all required fields (variance, balances, amounts, collector, location, etc.)
   - Sanitize string fields (trim whitespace)

3. **Calculate totals** using `calculateCollectionReportTotals`:
   - Query all collections for this `locationReportId`
   - Sum `movement.metersIn` → `totalDrop`
   - Sum `movement.metersOut` → `totalCancelled`
   - Sum `movement.gross` → `totalGross`
   - Sum `sasMeters.gross` → `totalSasGross`

4. **Create CollectionReport document**:

   ```typescript
   {
     locationReportId: payload.locationReportId,
     locationName, collectorName, timestamp,
     totalDrop, totalCancelled, totalGross, totalSasGross,
     variance, taxes, advance, partnerProfit,
     amountToCollect, amountCollected, amountUncollected,
     previousBalance, currentBalance,
     varianceReason, balanceCorrectionReas, reasonShortagePayment,
     location: locationObjectId
   }
   ```

5. **Update all collections with `locationReportId`**:
   - `Collections.updateMany` for each machine
   - Match by: `machineId`, `metersIn`, `metersOut`, `locationReportId: ""`
   - Set: `locationReportId`, `isCompleted: true`, `updatedAt`
   - **Mobile**: This may already be done by frontend via PATCH

6. **Create `collectionMetersHistory` entries**:
   - `$push` to `machine.collectionMetersHistory` array
   - One entry per machine per report
   - Includes: `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`, `timestamp`, `locationReportId`
   - ⚠️ **CRITICAL**: This is the ONLY place history entries are created

7. **Update `machine.collectionMeters`**:
   - Set `collectionMeters.metersIn` to current reading
   - Set `collectionMeters.metersOut` to current reading
   - Set `previousCollectionTime` to old `collectionTime`
   - Set `collectionTime` to new collection time
   - ⚠️ **CRITICAL**: This is when machine meters become "previous" for next collection

8. **Update `gamingLocation.previousCollectionTime`**:
   - Sets location's last collection time
   - Used for tracking location collection schedule

9. **Log activity**:
   - Action: `CREATE`
   - Details: Location name, collector, machine count, amount collected
   - Metadata: User info, resource, changes

10. **Return success**:
    - `{ success: true, data: createdReportId }`

**File**: `app/api/collectionReport/route.ts`

**Helper Functions**:

- `calculateCollectionReportTotals` (`app/api/lib/helpers/collectionReportCalculations.ts`)
- `logActivity` (`app/api/lib/helpers/activityLogger.ts`)

**Critical Timing**:

- `collectionMetersHistory` entries are created HERE, not during `POST /api/collections`
- `machine.collectionMeters` are updated HERE, not during `POST /api/collections`
- This ensures atomic updates and prevents premature meter changes

### GET /api/collectionReport

**Purpose**: Fetch collection reports with filtering

**Features**:

- Time period filtering (Today, Yesterday, 7d, 30d, All Time, Custom)
- **Gaming day offset support** - All time filters respect location's `gameDayOffset`
- Location and licensee filtering
- Monthly aggregation support
- Locations with machines query for modal dropdowns

**Query Parameters**:

- `timePeriod`: Predefined time period (Today, Yesterday, 7d, 30d, All Time, Custom)
- `startDate` & `endDate`: Custom date range (YYYY-MM-DD format)
- `locationName`: Filter by specific location
- `licencee`: Filter by licensee ObjectId
- `locationsWithMachines=1`: Return locations with their machine lists

**Special Query - Locations with Machines**:
When `locationsWithMachines=1` is set:

- Returns locations aggregated with their machines
- Used to populate location/machine dropdowns in modals
- Includes: `name`, `profitShare`, `machines[]` with meter data
- Filters by licensee if provided
- Used by both desktop and mobile creation modals

**Time Period Conversion** (Trinidad Time - UTC-4):

- All time periods converted to UTC for database queries
- `Today`: Start of today (Trinidad) to end of today (Trinidad)
- `Yesterday`: Start of yesterday to end of yesterday
- `7d`: Last 7 days
- `30d`: Last 30 days
- `Custom`: Uses provided startDate/endDate with gaming day offset

**File**: `app/api/collectionReport/route.ts`

**Helper Functions**:

- `getAllCollectionReportsWithMachineCounts` (`app/api/lib/helpers/collectionReportService.ts`)
- `getMonthlyCollectionReportSummary` (`lib/helpers/collectionReport.ts`)
- `getMonthlyCollectionReportByLocation` (`lib/helpers/collectionReport.ts`)

### GET /api/collection-report/[reportId]

**Purpose**: Fetch a specific collection report with all details

**Flow**:

1. Find report by ID
2. Populate location details
3. Calculate machine count from collections
4. Return complete report data

**File**: `app/api/collection-report/[reportId]/route.ts`

**Returns**:

```typescript
{
  (_id,
    locationReportId,
    locationName,
    collectorName,
    totalDrop,
    totalCancelled,
    totalGross,
    totalSasGross,
    variance,
    taxes,
    advance,
    partnerProfit,
    amountToCollect,
    amountCollected,
    amountUncollected,
    previousBalance,
    currentBalance,
    timestamp,
    location,
    machineCount);
}
```

### PATCH /api/collection-report/[reportId]

**Purpose**: Update existing collection report (financial data only)

**Flow**:

1. **Validate report exists**:
   - Find report by reportId
   - Return 404 if not found

2. **Update financial fields**:
   - Updates only the financial/metadata fields
   - Does NOT modify machine collections or meters
   - Fields: `variance`, `taxes`, `advance`, `amountCollected`, `previousBalance`, `currentBalance`, `amountToCollect`, `amountUncollected`, `partnerProfit`
   - Reasons: `varianceReason`, `balanceCorrectionReas`, `reasonShortagePayment`

3. **Recalculate totals if machines changed**:
   - If collections were added/edited/deleted separately
   - Uses `calculateCollectionReportTotals` to sum from collections
   - Updates `totalDrop`, `totalCancelled`, `totalGross`, `totalSasGross`

4. **Log activity**:
   - Action: `UPDATE`
   - Tracks all changed fields with old/new values
   - Includes user info and timestamp

**Editable Fields**:

- **Financial**: `taxes`, `advance`, `variance`, `amountCollected`, `previousBalance`, `currentBalance`, `amountToCollect`, `partnerProfit`
- **Reasons**: `varianceReason`, `balanceCorrectionReas`, `reasonShortagePayment`
- **Metadata**: `collectorName` (can be updated)

**Non-Editable**:

- Machine collections (use `/api/collections` endpoints)
- Location (locked to original location)
- Report ID (immutable)
- Timestamp (audit trail)

**File**: `app/api/collection-report/[reportId]/route.ts`

**Note**: For editing machine data within a report, use the `/api/collections` PATCH/DELETE endpoints, then optionally update the report totals via this endpoint.

### DELETE /api/collection-report/[reportId]

**Purpose**: Delete collection report and fully revert machine state

**Flow**:

1. **Authenticate user**:
   - Verify user is authenticated
   - Check permissions (admin/manager only)

2. **Find all collections**:
   - `Collections.find({ locationReportId })`
   - Get all machine collections for this report

3. **Revert machine state** (for each collection):
   - Find previous collection for the machine (before this report)
   - Revert `machine.collectionMeters`:
     - If previous collection exists: Set to previous `metersIn`/`metersOut`
     - If no previous (first collection): Set to `0`/`0`
   - Remove entry from `machine.collectionMetersHistory`:
     - `$pull` using `locationReportId` match
   - Update `machine.collectionTime` to previous collection time
   - Update `machine.previousCollectionTime`

4. **Delete all collections**:
   - `Collections.deleteMany({ locationReportId })`
   - Removes all machine-level collection documents

5. **Delete collection report**:
   - `CollectionReport.findByIdAndDelete(reportId)`
   - Removes location-level report document

6. **Log activity**:
   - Action: `DELETE`
   - Details: Location, collector, machine count
   - Metadata: User info, report data

7. **Return success**:
   - `{ success: true }`

**File**: `app/api/collection-report/[reportId]/route.ts`

**Critical**: Fully reverts machine state to before report was created. This includes:

- Machine meters restored to previous values
- Collection history cleaned
- Collection times reverted
- All related documents deleted

**Important**: This is a destructive operation that cannot be undone. Users must confirm before deletion.

### GET /api/collection-reports/check-all-issues

**Purpose**: Check for data inconsistencies in reports and machine history

**Updated:** November 6th, 2025 - Enhanced to check machine history for reports

**Parameters**:

- `reportId`: Check specific report and all machines in it
- `machineId`: Check specific machine across all reports

**Checks Performed**:

1. Movement calculation mismatches (precision tolerance 0.1)
2. Inverted SAS times
3. Previous meter mismatches
4. **Collection history mismatches** (NEW - all fields: metersIn, metersOut, prevIn, prevOut)
5. Collection history orphaned entries
6. Collection history duplicate dates

**Key Enhancement (November 6th, 2025):**
When `reportId` is provided, the API now:

- Fetches all collections in the report
- Gets unique machine IDs from those collections
- Checks `collectionMetersHistory` for each machine
- Compares history entries with actual collection documents
- Detects mismatches in ANY field (metersIn, metersOut, prevMetersIn, prevMetersOut)
- Returns detailed machine issues grouped by report

This enables the Collection Report Details page to automatically detect and fix history corruption.

**Returns**:

```typescript
{
  success: boolean;
  totalIssues: number;
  reportIssues: {
    [reportId]: {
      hasIssues: boolean;
      issueCount: number;
      machines: string[];
    };
  };
  machines: Array<{
    machineId: string;
    machineName: string;
    issues: Array<{
      type: 'history_mismatch' | 'orphaned_history' | 'duplicate_history';
      locationReportId: string;
      message: string;
      details?: object;
    }>;
  }>;
}
```

**File**: `app/api/collection-reports/check-all-issues/route.ts`

### POST /api/collection-reports/fix-report

**Purpose**: Fix detected issues in report or machine and sync collectionMetersHistory with collection documents

**Updated:** November 6th, 2025 - Enhanced history sync logic

**Parameters**:

- `reportId`: Fix specific report
- `machineId`: Fix specific machine

**Fix Operations**:

1. Movement recalculation
2. SAS time correction
3. Previous meter updates
4. **Sync collectionMetersHistory with collection documents** (ENHANCED)
5. Remove orphaned history entries
6. Fix duplicate history entries
7. Update machine collection meters

**Critical Enhancement - History Sync**:

The fix now properly syncs `collectionMetersHistory` entries with actual collection documents:

- **Identifier**: Uses `locationReportId` as unique identifier (more reliable than metersIn/metersOut)
- **Fields Synced**: ALL fields - `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`, `timestamp`
- **Logic**: Finds history entry by `locationReportId`, then updates ALL fields to match collection document
- **Result**: Fixes discrepancies where history shows incorrect values (ANY field can be wrong)

**CRITICAL PRINCIPLE - Collections Are Always Right:**

- Collection documents = Source of Truth (validated, finalized, audit-ready)
- History = Denormalized copy (performance optimization, can drift)
- Fix direction: ALWAYS history ← collection (NEVER collection ← history)
- All fields synced from collection to history, no exceptions

**Example**:

```typescript
// Collection document has:
{ prevIn: 0, prevOut: 0, metersIn: 347982, metersOut: 261523 }

// But collectionMetersHistory shows:
{ prevMetersIn: 347400, prevMetersOut: 261700, ... }

// Fix updates history to match collection:
{ prevMetersIn: 0, prevMetersOut: 0, metersIn: 347982, metersOut: 261523 }
```

**Returns**:

```typescript
{
  success: boolean;
  results: {
    collectionsProcessed: number;
    issuesFixed: {
      sasTimesFixed: number;
      movementCalculationsFixed: number;
      prevMetersFixed: number;
      historyEntriesFixed: number;
      machineHistoryFixed: number;
    }
    errors: [];
  }
}
```

**File**: `app/api/collection-reports/fix-report/route.ts`

## Core Helper Functions

### Collection Creation (`lib/helpers/collectionCreation.ts`)

#### `createCollectionWithCalculations`

Orchestrates complete collection creation:

- Validates payload
- Gets SAS time period
- Calculates SAS metrics
- Calculates movement values
- Returns all calculated data

**Does NOT**:

- Update machine.collectionMeters
- Create collectionMetersHistory entries
- These operations happen during report finalization

#### `calculateMovement`

Calculates movement values:

```typescript
// Standard
movementIn = currentMetersIn - prevIn;
movementOut = currentMetersOut - prevOut;
gross = movementIn - movementOut;

// RAM Clear (with ramClearMeters)
movementIn = ramClearMetersIn - prevIn + (currentMetersIn - 0);
movementOut = ramClearMetersOut - prevOut + (currentMetersOut - 0);
gross = movementIn - movementOut;

// RAM Clear (without ramClearMeters)
movementIn = currentMetersIn;
movementOut = currentMetersOut;
gross = movementIn - movementOut;
```

All values rounded to 2 decimal places.

#### `getSasTimePeriod`

Determines SAS time window:

- Queries for previous collection time
- Uses current collection time as end
- Handles custom SAS start times
- Validates time ranges (start must be before end)

#### `calculateSasMetrics`

Calculates SAS metrics from historical data:

- Queries `sashourly` collection for time period
- Aggregates drop, cancelled credits, gross
- Rounds all values to 2 decimal places
- Returns comprehensive SAS metrics object

### Collection Report Calculations (`app/api/lib/helpers/collectionReportCalculations.ts`)

#### `calculateCollectionReportTotals`

Calculates totals for collection reports:

**Purpose**: Aggregates all machine-level collections into location-level totals

**Flow**:

1. Query all collections with matching `locationReportId`
2. Sum movement data:
   - `totalDrop` = sum of `movement.metersIn`
   - `totalCancelled` = sum of `movement.metersOut`
   - `totalGross` = sum of `movement.gross`
3. Sum SAS data:
   - `totalSasGross` = sum of `sasMeters.gross`
   - `totalSasDrop` = sum of `sasMeters.drop`
   - `totalSasCancelled` = sum of `sasMeters.totalCancelledCredits`
4. Calculate variance (if SAS data exists)
5. Round all values to 2 decimal places
6. Return totals object

**Used by**:

- `POST /api/collectionReport` (during creation)
- `PATCH /api/collection-report/[reportId]` (when recalculating after edits)

## SAS Time Window

### Concept

The SAS time window defines the period for SAS metrics aggregation:

- **Start Time**: Previous collection time for the machine
- **End Time**: Current collection time
- **Purpose**: Ensures accurate comparison between meter and SAS data

### Implementation

- Stored in `collections.sasMeters.sasStartTime` and `sasMeters.sasEndTime`
- Used to query `sashourly` collection for metrics
- Validated to ensure start is before end

### Movement vs SAS

**Movement-Based Metrics:**

- Use meter deltas between two points
- Baseline: `prevIn`, `prevOut` (preserved from creation)
- Current: `metersIn`, `metersOut`
- Delta: `movement.metersIn`, `movement.metersOut`
- Gross: `movement.gross`

**SAS-Based Metrics:**

- Use SAS protocol data for time window
- Drop: `sasMeters.drop`
- Cancelled: `sasMeters.totalCancelledCredits`
- Gross: `sasMeters.gross`

**Why Both:**

- Provides data integrity validation
- Variance analysis for discrepancies
- Operational insights

## Collection Meters History

### Purpose

Tracks historical meter readings for each machine across all collections.

### When Created

- Created ONLY when collection report is finalized
- NOT created when machine is added to list
- One entry per machine per report

### Structure

```typescript
{
  _id: ObjectId;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  timestamp: Date;
  locationReportId: string;
}
```

### Maintenance

- Updated when collection is edited (using `$set` with `arrayFilters`)
- Removed when collection report is deleted
- Cleaned up when orphaned (no matching report/collection)
- Deduplicated when multiple entries for same date exist

## Issue Detection Logic

### Movement Validation

```typescript
const expectedMovementIn = currentMetersIn - prevIn;
const actualMovementIn = collection.movement.metersIn;
const diff = Math.abs(expectedMovementIn - actualMovementIn);

if (diff > 0.1) {
  // Issue detected
}
```

### SAS Time Validation

```typescript
const sasStart = new Date(collection.sasMeters.sasStartTime);
const sasEnd = new Date(collection.sasMeters.sasEndTime);

if (sasStart >= sasEnd) {
  // Invalid time range detected
}
```

### Previous Meter Validation

```typescript
const previousCollection = await findPreviousCollection(
  machineId,
  currentTimestamp
);
const expectedPrevIn = previousCollection?.metersIn || 0;

if (Math.abs(collection.prevIn - expectedPrevIn) > 0.1) {
  // Mismatch detected
}
```

### History Validation

```typescript
// Orphaned entry check
const collectionsExist = await Collections.findOne({ locationReportId });
const reportExists = await CollectionReport.findOne({ locationReportId });

if (!collectionsExist || !reportExists) {
  // Orphaned entry detected
}

// Duplicate date check
const dateGroups = groupByDate(collectionMetersHistory);
if (dateGroups.some(group => group.length > 1)) {
  // Duplicate detected
}
```

## Data Flow

### Collection Creation

```
Frontend: User enters meter data
    ↓
POST /api/collections
    ↓
createCollectionWithCalculations()
    ↓
- Get previous meters from machine.collectionMeters
- Calculate SAS time window
- Calculate SAS metrics from sashourly
- Calculate movement values
- Save collection (locationReportId = "")
    ↓
Return collection to frontend
```

### Report Finalization

```
Frontend: User clicks "Create Report"
    ↓
POST /api/collectionReport
    ↓
- Check for duplicate report on same gaming day
- Calculate totals from all collections
- Create CollectionReport document
- Update collections with locationReportId
- Create collectionMetersHistory entries
- Update machine.collectionMeters
- Update machine collection times
- Update location previousCollectionTime
    ↓
Return success to frontend
```

### Report Deletion

```
Frontend: User deletes report
    ↓
DELETE /api/collection-report/[reportId]
    ↓
- Find all collections for report
- For each collection:
  - Find previous collection
  - Revert machine.collectionMeters to previous values
  - Remove entry from collectionMetersHistory
- Delete all collections
- Delete collection report
    ↓
Return success to frontend
```

## Key Implementation Details

### Collection Meters Update Timing

**When machine is added to list**:

- Collection created with empty `locationReportId`
- Machine.collectionMeters NOT updated
- collectionMetersHistory NOT created

**When report is created**:

- All collections updated with `locationReportId`
- Machine.collectionMeters updated to current values
- collectionMetersHistory entries created
- Machine collection times updated

**Why**: Prevents premature updates and duplicate history entries.

### Edit Behavior

**When editing a collection**:

- Uses ORIGINAL `prevIn`/`prevOut` values (preserved from creation)
- Recalculates movement with these baseline values
- Updates existing `collectionMetersHistory` entry (not create new)
- Maintains data consistency

### RAM Clear Handling

**With ramClearMetersIn/Out**:

```
movement.metersIn = (ramClearMetersIn - prevIn) + (currentMetersIn - 0)
movement.metersOut = (ramClearMetersOut - prevOut) + (currentMetersOut - 0)
```

**Without ramClearMetersIn/Out**:

```
movement.metersIn = currentMetersIn
movement.metersOut = currentMetersOut
```

### SAS Time Window

**Calculation**:

- `sasStartTime`: Previous collection time for machine
- `sasEndTime`: Current collection time
- **Validation**: sasStartTime must be < sasEndTime

**Usage**:

- Queries `sashourly` collection for time period
- Aggregates SAS metrics (drop, cancelled, gross)
- All values rounded to 2 decimal places

### Location Aggregations

**From Collections to Collection Report**:

- `totalDrop` = sum of `movement.metersIn`
- `totalCancelled` = sum of `movement.metersOut`
- `totalGross` = sum of `movement.gross`
- `totalSasGross` = sum of `sasMeters.gross`
- `variance` = difference between movement and SAS totals

## Issue Detection System

### Movement Calculation Validation

**Check**: Stored movement values vs calculated values
**Precision**: Tolerance of 0.1 for floating-point comparisons
**Scenarios**: Standard and RAM Clear collections

### SAS Time Validation

**Check**: sasStartTime < sasEndTime
**Fix**: Corrects inverted time ranges using proper logic

### Previous Meter Validation

**Check**: prevIn/prevOut match actual previous collection
**Fix**: Updates to correct previous meter values

### Collection History Validation

**Orphaned Entries**:

- Checks if both Collections and CollectionReport exist for locationReportId
- Removes entries with no matching documents

**Duplicate Dates**:

- Groups history entries by date (without time)
- Identifies multiple entries for same date
- Keeps most accurate entry (matched with collection data)
- Removes duplicates

## Fix Operations

### Movement Fix

```typescript
// Recalculate movement
const expectedMovement = calculateMovement(
  metersIn,
  metersOut,
  prevIn,
  prevOut,
  ramClear,
  ramClearMetersIn,
  ramClearMetersOut
);

// Update collection
await Collections.findByIdAndUpdate(collectionId, {
  $set: {
    'movement.metersIn': expectedMovement.metersIn,
    'movement.metersOut': expectedMovement.metersOut,
    'movement.gross': expectedMovement.gross,
  },
});
```

### SAS Time Fix

```typescript
// Get correct SAS times
const { sasStartTime, sasEndTime } = await getSasTimePeriod(
  machineId,
  customSasStart,
  collectionTime
);

// Update collection
await Collections.findByIdAndUpdate(collectionId, {
  $set: {
    'sasMeters.sasStartTime': sasStartTime,
    'sasMeters.sasEndTime': sasEndTime,
  },
});
```

### History Cleanup

```typescript
// Remove orphaned entries
const validEntries = [];
for (const entry of collectionMetersHistory) {
  const hasCollections = await Collections.findOne({
    locationReportId: entry.locationReportId,
  });
  const hasReport = await CollectionReport.findOne({
    locationReportId: entry.locationReportId,
  });

  if (hasCollections && hasReport) {
    validEntries.push(entry);
  }
}

// Fix duplicate dates
const dateGroups = groupByDate(validEntries);
for (const [date, entries] of dateGroups) {
  if (entries.length > 1) {
    const bestEntry = selectBestEntry(entries);
    validEntries = validEntries.filter(
      e => getDate(e.timestamp) !== date || e === bestEntry
    );
  }
}

// Update machine
await Machine.findByIdAndUpdate(machineId, {
  $set: { collectionMetersHistory: validEntries },
});
```

## Data Consistency

### Atomic Operations

All critical operations use atomic updates:

- Collection creation
- Report finalization
- Meter updates
- History management

### Validation

Comprehensive validation at all levels:

- Input validation
- Business logic validation
- Data consistency validation
- Time range validation

### Error Handling

Proper error handling throughout:

- Clear error messages
- Rollback on failures
- Comprehensive logging
- User-friendly responses

## Performance Optimization

### Database Queries

- Proper indexing on frequently queried fields
- Aggregation pipelines for complex queries
- Efficient filtering at database level
- Minimize round trips to database

### Caching

- Strategic caching of frequently accessed data
- Cache invalidation on data changes
- Reduced database load

### Data Processing

- Process data in batches where appropriate
- Optimize aggregation queries
- Use efficient data structures

## Best Practices

### Code Organization

- Separate concerns into focused helper functions
- Use consistent naming conventions
- Implement proper error handling
- Maintain comprehensive logging

### Database Operations

- Use atomic operations for critical updates
- Implement proper indexing
- Validate data before operations
- Use aggregation pipelines for complex queries

### API Design

- Consistent response formats
- Proper HTTP status codes
- Clear error messages
- Comprehensive validation

### Security

- Input sanitization
- Authentication checks
- Authorization enforcement
- Activity logging

## Key Takeaways

### Critical Timing Rules

1. **Collection Creation** (`POST /api/collections`):
   - ✅ Creates collection document
   - ✅ Calculates SAS metrics and movement
   - ✅ Stores with `locationReportId: ""` and `isCompleted: false`
   - ❌ Does NOT update `machine.collectionMeters`
   - ❌ Does NOT create `collectionMetersHistory` entries

2. **Report Finalization** (`POST /api/collectionReport`):
   - ✅ Creates CollectionReport document
   - ✅ Updates collections with `locationReportId` and `isCompleted: true`
   - ✅ Creates `collectionMetersHistory` entries (ONE per machine)
   - ✅ Updates `machine.collectionMeters` to current values
   - ✅ Updates `machine.collectionTime` and `previousCollectionTime`
   - ✅ Updates `gamingLocation.previousCollectionTime`

3. **Collection Editing** (`PATCH /api/collections`):
   - ✅ Recalculates SAS metrics and movement
   - ✅ Updates collection document
   - ✅ Updates existing `collectionMetersHistory` entry (using `$set` with `arrayFilters`)
   - ❌ Does NOT create new history entry
   - ✅ Preserves original `prevIn`/`prevOut` baseline

4. **Report Deletion** (`DELETE /api/collection-report/[reportId]`):
   - ✅ Reverts `machine.collectionMeters` to previous values
   - ✅ Removes `collectionMetersHistory` entries (using `$pull`)
   - ✅ Deletes all collections for report
   - ✅ Deletes CollectionReport document
   - ✅ Fully reverts machine state

### Desktop vs Mobile Summary

| Aspect                 | Desktop                             | Mobile                                                        |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------- |
| **Layout**             | Three-column side-by-side           | Slide-up panels with navigation                               |
| **Width Distribution** | 20% \| 60% \| 20%                   | Full-width panels                                             |
| **Report Creation**    | Single `POST /api/collectionReport` | PATCH collections first, then POST report                     |
| **Components**         | Monolithic modals                   | Componentized (`MobileFormPanel`, `MobileCollectedListPanel`) |
| **State Management**   | Local state + Zustand               | Local state + Zustand                                         |
| **Final Result**       | Identical database state            | Identical database state                                      |

### Data Integrity Rules

1. **prevIn/prevOut are immutable**: Once a collection is created, these baseline values never change during edits
2. **One history entry per report**: Each `locationReportId` gets exactly ONE entry in `collectionMetersHistory`
3. **History updates use arrayFilters**: Edits use `$set` with `arrayFilters`, never `$push`
4. **Duplicate prevention**: Gaming day check prevents multiple reports for same location/day
5. **Atomic operations**: All critical updates use MongoDB atomic operations

### Common Pitfalls to Avoid

❌ **Don't** create `collectionMetersHistory` during `POST /api/collections`  
✅ **Do** create it during `POST /api/collectionReport`

❌ **Don't** use `$push` when updating existing history  
✅ **Do** use `$set` with `arrayFilters`

❌ **Don't** update `prevIn`/`prevOut` when editing  
✅ **Do** preserve original baseline values

❌ **Don't** update `machine.collectionMeters` before report finalization  
✅ **Do** wait for `POST /api/collectionReport`

❌ **Don't** allow multiple reports for same location on same gaming day  
✅ **Do** check for duplicates using date match

### Debugging Tips

**Check if meters updated prematurely**:

```javascript
// Machine meters should ONLY change after POST /api/collectionReport
// If they change after POST /api/collections, there's a bug
```

**Verify history entry count**:

```javascript
// Each report should have exactly 1 history entry per machine
machine.collectionMetersHistory.filter(h => h.locationReportId === reportId)
  .length === 1;
```

**Validate movement calculations**:

```javascript
// Stored movement should match calculated movement (tolerance: 0.1)
const calculated = currentMetersIn - prevIn;
const stored = collection.movement.metersIn;
Math.abs(calculated - stored) < 0.1; // Should be true
```

**Check SAS time window**:

```javascript
// SAS start must be before SAS end
new Date(sasMeters.sasStartTime) < new Date(sasMeters.sasEndTime); // Should be true
```

---

## PATCH /api/collections (Edit Collection) Implementation

**Fixed:** November 4th, 2025  
**Critical Bug:** Previous meters were not being recalculated when editing collections

### Previous Implementation (INCORRECT) ❌

```typescript
export async function PATCH(req: NextRequest) {
  const updateData = await req.json();

  // ❌ Blindly updates whatever frontend sends
  const updated = await Collections.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  );

  // ❌ NO recalculation of prevIn/prevOut
  // ❌ NO recalculation of movement
}
```

**Problem:** When editing a collection, the system did not verify or recalculate `prevIn`, `prevOut`, and `movement` values. This caused massive revenue calculation errors (up to 99.7% understatement).

### Current Implementation (CORRECT) ✅

```typescript
export async function PATCH(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const updateData = await req.json();

  const originalCollection = await Collections.findById(id);

  // Detect if meters changed
  const metersChanged =
    (updateData.metersIn !== undefined &&
      updateData.metersIn !== originalCollection.metersIn) ||
    (updateData.metersOut !== undefined &&
      updateData.metersOut !== originalCollection.metersOut) ||
    (updateData.ramClear !== undefined &&
      updateData.ramClear !== originalCollection.ramClear) ||
    updateData.ramClearMetersIn !== undefined ||
    updateData.ramClearMetersOut !== undefined;

  if (metersChanged) {
    // CRITICAL: Find ACTUAL previous collection from database
    // Do NOT use machine.collectionMeters (could be outdated)
    const previousCollection = await Collections.findOne({
      machineId: originalCollection.machineId,
      timestamp: {
        $lt: originalCollection.timestamp || originalCollection.collectionTime,
      },
      isCompleted: true,
      locationReportId: { $exists: true, $ne: '' },
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      _id: { $ne: id }, // Don't find this same collection
    })
      .sort({ timestamp: -1 })
      .lean();

    // Set prevIn/prevOut from actual previous collection
    if (previousCollection) {
      updateData.prevIn = previousCollection.metersIn || 0;
      updateData.prevOut = previousCollection.metersOut || 0;
    } else {
      // No previous collection, this is first collection
      updateData.prevIn = 0;
      updateData.prevOut = 0;
    }

    // Recalculate movement with correct prevIn/prevOut
    const currentMetersIn = updateData.metersIn ?? originalCollection.metersIn;
    const currentMetersOut =
      updateData.metersOut ?? originalCollection.metersOut;
    const ramClear = updateData.ramClear ?? originalCollection.ramClear;
    const ramClearMetersIn =
      updateData.ramClearMetersIn ?? originalCollection.ramClearMetersIn;
    const ramClearMetersOut =
      updateData.ramClearMetersOut ?? originalCollection.ramClearMetersOut;

    let movementIn: number;
    let movementOut: number;

    if (ramClear) {
      if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
        // RAM clear with ramClearMeters
        movementIn = ramClearMetersIn - updateData.prevIn + currentMetersIn;
        movementOut = ramClearMetersOut - updateData.prevOut + currentMetersOut;
      } else {
        // RAM clear without ramClearMeters
        movementIn = currentMetersIn;
        movementOut = currentMetersOut;
      }
    } else {
      // Standard: current - previous
      movementIn = currentMetersIn - updateData.prevIn;
      movementOut = currentMetersOut - updateData.prevOut;
    }

    updateData.movement = {
      metersIn: Number(movementIn.toFixed(2)),
      metersOut: Number(movementOut.toFixed(2)),
      gross: Number((movementIn - movementOut).toFixed(2)),
    };
  }

  // Update collection with recalculated values
  const updated = await Collections.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  );

  return NextResponse.json({ success: true, data: updated });
}
```

### Key Points

1. **Always look up actual previous collection from database**
   - Query `Collections` table for most recent completed collection
   - Filter by `machineId`, `timestamp < current`, `isCompleted: true`
   - Do NOT rely on `machine.collectionMeters` (could be stale)

2. **Recalculate prevIn/prevOut**
   - If previous collection exists: use its `metersIn`/`metersOut`
   - If no previous collection: use `0` (first collection)

3. **Recalculate movement**
   - Standard: `movement = current - previous`
   - RAM Clear with meters: `movement = (ramClearMeters - prev) + (current - 0)`
   - RAM Clear without meters: `movement = current`

4. **Maintain data integrity**
   - Movement values are always consistent with prevIn/prevOut
   - Financial calculations remain accurate
   - Revenue reporting is correct

### Why This Matters

**Example (GM02163):**

- Without fix: Movement = 2,286 (wrong!)
- With fix: Movement = 764,003 (correct!)
- Revenue difference: $92,787.58 (99.7% error)

This fix ensures that editing collection reports maintains the same data integrity as creating them.

---

## `isEditing` Flag System - Unsaved Changes Protection

### Overview

The `isEditing` flag is a **boolean field** on the `CollectionReport` model that tracks whether a report has **unsaved changes** requiring finalization. It's a critical safety mechanism that prevents data loss and ensures report integrity.

**Database Field:**

```typescript
{
  isEditing: { type: Boolean, default: false }
}
```

**Location:** `app/api/lib/models/collectionReport.ts` (line 32)

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ISEDITING FLAG LIFECYCLE                  │
└─────────────────────────────────────────────────────────────┘

1. REPORT CREATION
   CollectionReport.create({ isEditing: false, ... })
   ↓
   Report is complete and finalized

2. USER EDITS METERS (PATCH /api/collections/[id])
   ↓
   Collection document updated
   ↓
   CollectionReport.findOneAndUpdate(
     { locationReportId },
     { $set: { isEditing: true } }
   )
   ↓
   Report marked as "in-progress"

3. USER FINALIZES REPORT (PATCH /api/collection-report/[reportId])
   ↓
   Financial data updated
   ↓
   CollectionReport.findOneAndUpdate(
     { _id: reportId },
     { isEditing: false, ...reportData }
   )
   ↓
   /update-history called to sync machine histories
   ↓
   Report fully finalized
```

### Trigger Points

#### 1. Set to `true` - Editing Begins

**Endpoint:** `PATCH /api/collections/[id]`  
**File:** `app/api/collections/[id]/route.ts` (lines 244-267)

**Trigger Conditions:**

- User edits an existing collection via Edit Collection Modal
- `metersIn` OR `metersOut` is modified
- Collection has a `locationReportId` (part of a finalized report)

**Implementation:**

```typescript
// After updating collection document
if (
  finalUpdatedCollection &&
  (updateData.metersIn !== undefined || updateData.metersOut !== undefined)
) {
  const reportIdToUpdate = finalUpdatedCollection.locationReportId;

  if (reportIdToUpdate && reportIdToUpdate.trim() !== '') {
    const updateResult = await CollectionReport.findOneAndUpdate(
      { locationReportId: reportIdToUpdate },
      {
        $set: {
          isEditing: true,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (updateResult) {
      console.warn(`✅ Marked report ${reportIdToUpdate} as isEditing: true`);
    }
  }
}
```

**Result:**

- ✅ Report marked as having unsaved changes
- ✅ Frontend can detect incomplete edits on reload
- ✅ Data integrity preserved across sessions

#### 2. Set to `false` - Editing Completes

**Endpoint:** `PATCH /api/collection-report/[reportId]`  
**File:** `app/api/collection-report/[reportId]/route.ts` (line 97)

**Trigger Conditions:**

- User clicks "Update Report" in Edit Collection Modal
- All validations pass
- Financial data is complete

**Implementation:**

```typescript
const updatedReport = await CollectionReport.findOneAndUpdate(
  { _id: reportId },
  {
    ...body,
    isEditing: false, // Mark as NOT editing when report is finalized
    updatedAt: new Date(),
  },
  { new: true }
);
```

**Subsequent Actions:**

1. Frontend calls `/api/collection-reports/[reportId]/update-history`
2. Machine `collectionMetersHistory` entries are synchronized
3. Machine `collectionMeters` fields are updated
4. Report is fully finalized

**Result:**

- ✅ Report marked as complete
- ✅ All machine histories synchronized
- ✅ Safe for financial reporting

#### 3. NOT Modified - History Sync

**Endpoint:** `PATCH /api/collection-reports/[reportId]/update-history`  
**File:** `app/api/collection-reports/[reportId]/update-history/route.ts` (lines 265-266)

**Important Note:**

```typescript
// NOTE: We do NOT set isEditing: false here
// That is handled by the main collection-report PATCH endpoint
// This endpoint only updates machine histories
```

This endpoint is **intentionally designed** to NOT touch the `isEditing` flag. It only synchronizes machine history data after the main report update has already set `isEditing: false`.

### Frontend Integration

#### Detection on Modal Open

**Desktop:** `components/collectionReport/EditCollectionModal.tsx` (lines 514-518)
**Mobile:** `components/collectionReport/mobile/MobileEditCollectionModal.tsx` (line 1230)

```typescript
useEffect(() => {
  if (show && reportId) {
    fetchCollectionReportById(reportId).then(data => {
      setReportData(data);

      // CRITICAL: If report has isEditing: true, there are unsaved changes
      if (data.isEditing) {
        console.warn(
          '⚠️ Report has isEditing: true - marking as having unsaved edits'
        );
        setHasUnsavedEdits(true); // Prevents premature closing
      }

      // ... load financial data
    });
  }
}, [show, reportId]);
```

**Effect:**

- Modal detects incomplete edits
- Sets internal `hasUnsavedEdits` state
- Activates validation guards
- Prevents data loss

#### Validation Guards

**Before Closing Modal:**

```typescript
const handleClose = useCallback(() => {
  // Check for unsaved machine data in form
  if (
    selectedMachineId ||
    currentMetersIn ||
    currentMetersOut ||
    currentMachineNotes.trim()
  ) {
    if (!editingEntryId) {
      toast.error('You have unsaved machine data. Please add or cancel.');
      setShowUnsavedChangesWarning(true);
      return; // PREVENT CLOSING
    }
  }

  // Check for general unsaved edits (from isEditing flag)
  if (hasUnsavedEdits) {
    setShowUnsavedChangesWarning(true);
    return; // PREVENT CLOSING
  }

  onClose(); // Safe to close
}, [
  selectedMachineId,
  currentMetersIn,
  currentMetersOut,
  currentMachineNotes,
  hasUnsavedEdits,
]);
```

**Before Updating Report:**

```typescript
const handleUpdateReport = useCallback(async () => {
  // Enhanced validation (lines 1314-1339 in EditCollectionModal.tsx)
  if (
    selectedMachineId ||
    currentMetersIn ||
    currentMetersOut ||
    currentMachineNotes
  ) {
    if (!editingEntryId) {
      toast.error('You have unsaved machine data in the form.');
      return; // PREVENT UPDATE
    }
  }

  // Proceed with report update...
  await updateReport(); // Sets isEditing: false on backend
}, [selectedMachineId, currentMetersIn, currentMetersOut, editingEntryId]);
```

### Data Flow Example

**Scenario: User Edits Meters Mid-Session**

```
TIME: 10:00 AM
ACTION: User creates report "RPT-001"
STATE: { isEditing: false }

TIME: 10:05 AM
ACTION: User realizes GM00066 meters are wrong
ACTION: Opens Edit Collection Modal for "RPT-001"
STATE: { isEditing: false } ← Still false

TIME: 10:06 AM
ACTION: User changes GM00066 metersIn: 583676 → 585000
ACTION: Clicks "Update Entry in List"
BACKEND: PATCH /api/collections/[collectionId]
  ↓ Updates collection document
  ↓ Finds parent report by locationReportId
  ↓ Sets isEditing: true
STATE: { isEditing: true } ← NOW TRUE

TIME: 10:07 AM
ACTION: User's browser crashes
RESULT: Report remains { isEditing: true }
        Collections are updated
        Machine histories NOT yet synced

───────────────────────────────────────────

TIME: 2:00 PM (4 hours later)
ACTION: User returns, opens Edit Collection Modal again
FRONTEND: Fetches report data
  ↓ Detects isEditing: true
  ↓ Sets hasUnsavedEdits: true
  ↓ Loads existing collections in list
  ↓ Prevents premature modal closing
RESULT: User can review and finalize

TIME: 2:02 PM
ACTION: User reviews financials, clicks "Update Report"
BACKEND: PATCH /api/collection-report/[reportId]
  ↓ Updates report with financial data
  ↓ Sets isEditing: false
  ↓ Calls /update-history
  ↓ Synchronizes machine histories
STATE: { isEditing: false } ← COMPLETE

RESULT: ✅ Report fully finalized
        ✅ Machine histories synchronized
        ✅ Data integrity maintained
```

### Critical Rules for Developers

#### ✅ DO:

1. **Always check `isEditing` when debugging** collection issues
2. **Respect the flag's state** - don't bypass validation
3. **Use the flag** to determine if a report needs attention
4. **Test edge cases** like browser crashes mid-edit
5. **Verify machine history sync** after finalizing

#### ❌ DON'T:

1. **Never manually set `isEditing: false`** without syncing histories
2. **Never bypass validation** in modal close handlers
3. **Never delete collections** without checking `isEditing` state
4. **Never assume `isEditing: false`** means histories are synced
5. **Never use stale frontend data** for history updates

### Troubleshooting

#### Problem: Report Stuck with `isEditing: true`

**Symptoms:**

- Report shows as incomplete
- Modal auto-loads with existing collections
- Cannot create new collections for same location/time

**Diagnosis:**

```bash
# MongoDB query
db.collectionreports.findOne({ locationReportId: "RPT-001" })
# Check: isEditing: true?
```

**Solutions:**

**Option 1: Complete the Edit (Recommended)**

1. Open Edit Collection Modal
2. Review existing collections
3. Verify financial data
4. Click "Update Report"
5. Let system finalize automatically

**Option 2: Manual Reset (Use Sparingly)**

```javascript
// Only if collections are already correct
await CollectionReport.findOneAndUpdate(
  { locationReportId: "RPT-001" },
  { $set: { isEditing: false } }
);

// CRITICAL: Also sync machine histories
await fetch(`/api/collection-reports/RPT-001/update-history`, {
  method: 'PATCH',
  body: JSON.stringify({ changes: [...] })
});
```

**Option 3: Use Fix Report API**

```bash
POST /api/collection-reports/fix-report
Body: { reportId: "RPT-001" }
```

#### Problem: History Mismatch After Edit

**Symptoms:**

- `prevIn`/`prevOut` don't match between collection and history
- Movement calculations incorrect
- Variation discrepancies

**Root Cause:**

- Update-history endpoint received stale frontend data (FIXED Nov 6, 2025)

**Verification:**

```javascript
// Check collection document
const collection = await Collections.findById(collectionId);

// Check machine history
const machine = await Machine.findById(collection.machineId);
const historyEntry = machine.collectionMetersHistory.find(
  h => h.locationReportId === reportId
);

// Compare values
console.log('Collection prevIn:', collection.prevIn);
console.log('History prevIn:', historyEntry.prevMetersIn);
// Should match!
```

**Fix:**

- Update-history now fetches collection document directly
- Uses collection values as single source of truth
- No longer trusts frontend payload for prevIn/prevOut

### Best Practices

1. **Monitor `isEditing` in production:**

   ```javascript
   // Alert on reports stuck in editing state > 24 hours
   const stuckReports = await CollectionReport.find({
     isEditing: true,
     updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
   });
   ```

2. **Include `isEditing` in report queries:**

   ```javascript
   GET /api/collectionReport?isEditing=true
   // Returns only reports needing finalization
   ```

3. **Add visual indicators in UI:**

   ```tsx
   {
     report.isEditing && <Badge variant="warning">⚠️ Incomplete Edit</Badge>;
   }
   ```

4. **Log all flag transitions:**

   ```typescript
   console.warn(`🔄 Report ${reportId}: isEditing ${oldValue} → ${newValue}`);
   ```

5. **Test recovery scenarios:**
   - Browser crash during edit
   - Network failure during update
   - Multiple concurrent editors
   - Incomplete financial data entry

### Related Documentation

- **Frontend:** See [Documentation/frontend/collection-report.md](../frontend/collection-report.md)
- **High-Level Guide:** See [.cursor/isediting-system.md](../../.cursor/isediting-system.md)
- **Collection Guidelines:** See [.cursor/collection-reports-guidelines.md](../../.cursor/collection-reports-guidelines.md)
