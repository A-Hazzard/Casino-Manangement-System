# Collection Reports System - Critical Guidelines for Cursor AI

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 4th, 2025  
**Version:** 2.0.0

---

## Purpose

This document provides critical guidelines for understanding, debugging, and modifying the Collection Reports system. Follow these guidelines strictly to maintain data integrity and avoid introducing bugs.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Critical Data Flow Rules](#critical-data-flow-rules)
3. [Common Bugs to Avoid](#common-bugs-to-avoid)
4. [Debugging Checklist](#debugging-checklist)
5. [Key Files and Their Roles](#key-files-and-their-roles)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [State Management](#state-management)
8. [Testing Guidelines](#testing-guidelines)

---

## Core Concepts

### Collection vs Collection Report

**Collection (Individual Machine Entry):**

- Document in `collections` MongoDB collection
- Represents ONE machine's meters at ONE point in time
- Has `machineId`, `metersIn`, `metersOut`, `prevIn`, `prevOut`, `movement`, `sasMeters`
- Has `locationReportId` (empty until report is finalized)
- Has `isCompleted` flag (false until report is finalized)

**Collection Report (Location-Level Report):**

- Document in `collectionreports` MongoDB collection
- Represents ALL machines collected at ONE location on ONE gaming day
- Has `locationReportId` (unique identifier for the report)
- Aggregates multiple collections
- Has financial summary (taxes, advance, variance, totals)

### Critical Relationship:

```
CollectionReport (1)
    ↓
locationReportId: "abc-123"
    ↓
Collections (many)
    ↓
Each has: locationReportId: "abc-123", isCompleted: true
    ↓
Machine.collectionMetersHistory
    ↓
Each entry has: locationReportId: "abc-123"
```

---

## Critical Data Flow Rules

### Rule 1: Collection Lifecycle States

**State 1: Draft (Not Yet Finalized)**

```typescript
{
  _id: "col-123",
  machineId: "machine-456",
  metersIn: 1000,
  metersOut: 800,
  prevIn: 500,
  prevOut: 400,
  locationReportId: "",  // ← EMPTY
  isCompleted: false,    // ← FALSE
}
```

**State 2: Finalized (Part of Report)**

```typescript
{
  _id: "col-123",
  machineId: "machine-456",
  metersIn: 1000,
  metersOut: 800,
  prevIn: 500,
  prevOut: 400,
  locationReportId: "report-789",  // ← SET
  isCompleted: true,               // ← TRUE
}
```

**⚠️ CRITICAL:** `locationReportId` and `isCompleted` MUST be synchronized!

- If `locationReportId` is set → `isCompleted` MUST be `true`
- If `locationReportId` is empty → `isCompleted` MUST be `false`

### Rule 2: prevIn/prevOut Calculation Sources

**Source 1: Actual Previous Collection (Preferred)**

```typescript
const previousCollection = await Collections.findOne({
  machineId: machineId,
  timestamp: { $lt: currentTimestamp },
  isCompleted: true, // ← MUST check this!
  locationReportId: { $exists: true, $ne: '' },
}).sort({ timestamp: -1 });

if (previousCollection) {
  prevIn = previousCollection.metersIn; // ← Use this
  prevOut = previousCollection.metersOut;
}
```

**Source 2: machine.collectionMeters (Fallback)**

```typescript
else {
  // ✅ VALID FALLBACK: Use machine's current meters
  prevIn = machine.collectionMeters.metersIn || 0;
  prevOut = machine.collectionMeters.metersOut || 0;
}
```

**⚠️ CRITICAL:** Both sources are VALID! Don't flag `machine.collectionMeters` fallback as an error!

### Rule 3: Collection History Timing

**❌ WRONG: Create history when collection is created**

```typescript
// POST /api/collections
await Collections.create({ ... });
await Machine.findByIdAndUpdate(machineId, {
  $push: { collectionMetersHistory: { ... } }  // ❌ TOO EARLY!
});
```

**✅ CORRECT: Create history when report is finalized**

```typescript
// POST /api/collectionReport
await Collections.findByIdAndUpdate(collectionId, {
  $set: { locationReportId: reportId, isCompleted: true }
});
await Machine.findByIdAndUpdate(machineId, {
  $push: { collectionMetersHistory: { ... } }  // ✅ CORRECT TIMING!
});
```

**OR when editing existing report:**

```typescript
// PATCH /api/collection-reports/[reportId]/update-history
// For NEW machines added in edit modal
await Machine.findByIdAndUpdate(machineId, {
  $push: { collectionMetersHistory: { ... } }  // ✅ CORRECT!
});
```

### Rule 4: isCompleted Must Be Set in Edit Modal

**When user adds/edits machine in edit modal and clicks "Update Report":**

```typescript
// ✅ MUST DO ALL OF THESE:
1. Update/create collection history ($push or $set with arrayFilters)
2. Update machine.collectionMeters
3. Set collection.isCompleted = true  // ← CRITICAL!
4. Only THEN close the modal
```

**⚠️ NEVER close modal before all async operations complete!**

### Rule 5: Delete Must Fully Revert State

**When deleting a collection:**

```typescript
// ✅ MUST DO ALL OF THESE:
1. Delete collection document
2. Revert machine.collectionMeters to prevIn/prevOut
3. Remove collectionMetersHistory entry (if locationReportId exists)
4. Log activity
```

**Dynamic operation building:**

```typescript
const updateOperation = {
  $set: {
    'collectionMeters.metersIn': collection.prevIn || 0,
    'collectionMeters.metersOut': collection.prevOut || 0,
  },
};

if (collection.locationReportId) {
  updateOperation.$pull = {
    collectionMetersHistory: {
      locationReportId: collection.locationReportId,
    },
  };
}

await Machine.findByIdAndUpdate(machineId, updateOperation);
```

---

## Common Bugs to Avoid

### Bug 1: Frontend Sending Calculated Values to API ❌

**WRONG:**

```typescript
await axios.post('/api/collections', {
  metersIn: 100,
  metersOut: 80,
  prevIn: 50,        // ❌ Don't send this!
  prevOut: 40,       // ❌ Don't send this!
  movement: { ... }, // ❌ Don't send this!
  sasMeters: { ... },// ❌ Don't send this!
});
```

**CORRECT:**

```typescript
await axios.post('/api/collections', {
  metersIn: 100,
  metersOut: 80,
  // Let API calculate prevIn/prevOut, movement, and sasMeters
  ramClear: false,
  notes: '...',
  // Only send sasStartTime if custom
  ...(customSasStartTime && {
    sasMeters: { sasStartTime: customSasStartTime },
  }),
});
```

**Rule:** Frontend only sends RAW DATA (meters, notes, timestamps). Backend calculates DERIVED DATA (prevIn/prevOut, movement, SAS metrics).

### Bug 2: Not Including NEW Machines in Batch Update ❌

**WRONG:**

```typescript
for (const current of collectedMachineEntries) {
  const original = originalCollections.find(o => o._id === current._id);
  if (original) {  // ❌ Only processes EDITED machines
    if (metersChanged) {
      changes.push({ ... });
    }
  }
  // ❌ NEW machines are skipped!
}
```

**CORRECT:**

```typescript
for (const current of collectedMachineEntries) {
  const original = originalCollections.find(o => o._id === current._id);
  if (original) {
    // Process EDITED machines
    if (metersChanged) {
      changes.push({ ... });
    }
  } else {
    // ✅ Process NEW machines
    changes.push({ ... });
  }
}
```

### Bug 3: Not Updating originalCollections When Deleting ❌

**WRONG:**

```typescript
setCollectedMachineEntries(prev =>
  prev.filter(entry => entry._id !== deletedId)
);
// ❌ originalCollections still has the deleted machine!
```

**CORRECT:**

```typescript
setCollectedMachineEntries(prev =>
  prev.filter(entry => entry._id !== deletedId)
);
setOriginalCollections(prev => prev.filter(entry => entry._id !== deletedId));
// ✅ Both updated!
```

### Bug 4: Only Updating History, Not Creating ❌

**WRONG:**

```typescript
// Only use $set with arrayFilters
await Machine.findByIdAndUpdate(
  machineId,
  {
    $set: {
      'collectionMetersHistory.$[elem].metersIn': metersIn,
    },
  },
  {
    arrayFilters: [{ 'elem.locationReportId': reportId }],
  }
);
// ❌ If history doesn't exist, this does nothing!
```

**CORRECT:**

```typescript
const historyExists = machine.collectionMetersHistory?.some(
  h => h.locationReportId === reportId
);

if (historyExists) {
  // UPDATE using $set with arrayFilters
  await Machine.findByIdAndUpdate(...);
} else {
  // CREATE using $push
  await Machine.findByIdAndUpdate(machineId, {
    $push: { collectionMetersHistory: newEntry }
  });
}
```

### Bug 5: Not Setting isCompleted: true ❌

**WRONG:**

```typescript
// When editing report
await Machine.findByIdAndUpdate(machineId, {
  $set: { 'collectionMeters.metersIn': metersIn },
});
// ❌ Forgot to update collection.isCompleted!
```

**CORRECT:**

```typescript
// Update machine meters
await Machine.findByIdAndUpdate(machineId, {
  $set: { 'collectionMeters.metersIn': metersIn },
});

// ✅ ALSO update collection.isCompleted
await Collections.findByIdAndUpdate(collectionId, {
  $set: { isCompleted: true },
});
```

### Bug 6: Wrong API Response Path ❌

**WRONG:**

```typescript
const response = await axios.post('/api/collections', { ... });
const savedEntry = { ...newEntry, _id: response.data._id };
// ❌ response.data._id is undefined!
```

**CORRECT:**

```typescript
const response = await axios.post('/api/collections', { ... });
// API returns: { success: true, data: { _id: "...", ... } }
const savedEntry = { ...newEntry, _id: response.data.data._id };
// ✅ Correct nested path
```

### Bug 7: Detection Logic False Positives ❌

**WRONG:**

```typescript
const previousCollection = await Collections.findOne({ ... });

if (!previousCollection) {
  // ❌ WRONG: Assumes prevIn/prevOut should be 0
  if (collection.prevIn !== 0 || collection.prevOut !== 0) {
    flagAsIssue();  // ❌ FALSE POSITIVE!
  }
}
```

**CORRECT:**

```typescript
const previousCollection = await Collections.findOne({ ... });

if (!previousCollection) {
  // ✅ CORRECT: Recognize machine.collectionMeters fallback is valid
  console.warn('No previous collection, prevIn/prevOut likely from machine.collectionMeters (expected)');
  // Don't flag as issue
}
```

---

## Debugging Checklist

### When Investigating Collection Issues:

1. **Check isCompleted Status:**

   ```javascript
   db.collections.find({
     locationReportId: { $exists: true, $ne: '' },
     isCompleted: false, // ← Should be 0 results!
   });
   ```

2. **Check Collection History Consistency:**

   ```javascript
   // Each machine should have exactly 1 history entry per report
   db.machines.aggregate([
     { $unwind: '$collectionMetersHistory' },
     {
       $group: {
         _id: {
           machineId: '$_id',
           reportId: '$collectionMetersHistory.locationReportId',
         },
         count: { $sum: 1 },
       },
     },
     { $match: { count: { $gt: 1 } } }, // ← Should be 0 results!
   ]);
   ```

3. **Check for Orphaned History:**

   ```javascript
   // Find history entries without matching collection
   const historyReportIds = db.machines.distinct(
     'collectionMetersHistory.locationReportId'
   );
   for (const reportId of historyReportIds) {
     const report = db.collectionreports.findOne({
       locationReportId: reportId,
     });
     if (!report) {
       console.warn('Orphaned history:', reportId);
     }
   }
   ```

4. **Verify prevIn/prevOut Calculation:**

   ```javascript
   const collection = db.collections.findOne({ _id: '...' });
   const previousCollection = db.collections
     .findOne({
       machineId: collection.machineId,
       timestamp: { $lt: collection.timestamp },
       isCompleted: true,
       locationReportId: { $exists: true, $ne: '' },
     })
     .sort({ timestamp: -1 })
     .limit(1);

   if (previousCollection) {
     // prevIn/prevOut should match previousCollection.metersIn/Out
   } else {
     // prevIn/prevOut should match machine.collectionMeters (fallback)
   }
   ```

5. **Check Movement Calculation:**

   ```javascript
   // Standard movement
   const expectedIn = collection.metersIn - collection.prevIn;
   const expectedOut = collection.metersOut - collection.prevOut;
   const expectedGross = expectedIn - expectedOut;

   // Should match collection.movement (within 0.1 tolerance)
   Math.abs(collection.movement.metersIn - expectedIn) < 0.1; // Should be true
   ```

---

## Key Files and Their Roles

### Frontend Files:

**Component Hierarchy:**

```
NewCollectionModal.tsx (Create)
├── Uses: addMachineCollection() helper
├── Creates: Collections with locationReportId: ""
└── Finalizes: POST /api/collectionReport

EditCollectionModal.tsx (Edit - Desktop)
├── Uses: confirmAddOrUpdateEntry() for adding/editing
├── Creates: Collections with locationReportId: reportId
├── Updates: PATCH /api/collection-reports/[reportId]/update-history
└── Tracks: originalCollections for change detection

MobileCollectionModal.tsx (Create - Mobile)
├── Uses: MobileFormPanel, MobileCollectedListPanel
├── Two-step: PATCH collections → POST collectionReport
└── Same result as desktop

MobileEditCollectionModal.tsx (Edit - Mobile)
├── Uses: Slide-up panels for navigation
├── Uses: modalState.originalCollections for change detection
└── Same logic as desktop
```

**Critical State Tracking:**

- `collectedMachineEntries` (Desktop) / `modalState.collectedMachines` (Mobile): Current state
- `originalCollections` (Desktop) / `modalState.originalCollections` (Mobile): Baseline for change detection
- **MUST** keep both synchronized, especially when deleting!

### Backend Files:

**API Routes:**

```
POST /api/collections
├── Calls: createCollectionWithCalculations()
├── Calls: getPreviousCollectionMeters()
├── Returns: { success: true, data: createdCollection }
└── Sets: isCompleted: false, locationReportId: "" or reportId

PATCH /api/collections
├── Recalculates: prevIn/prevOut if meters changed
├── Finds: Actual previous collection from DB
└── Recalculates: movement based on new prevIn/prevOut

DELETE /api/collections
├── Reverts: machine.collectionMeters to prevIn/prevOut
├── Removes: collectionMetersHistory entry (if locationReportId exists)
└── Deletes: collection document

POST /api/collectionReport
├── Updates: All collections with locationReportId and isCompleted: true
├── Creates: collectionMetersHistory entries
├── Updates: machine.collectionMeters
└── Creates: CollectionReport document

PATCH /api/collection-reports/[reportId]/update-history
├── Detects: If history entry exists
├── Creates OR Updates: collectionMetersHistory
├── Updates: machine.collectionMeters
└── Sets: collection.isCompleted = true  ← CRITICAL!
```

**Helper Functions:**

```
createCollectionWithCalculations()
└── Orchestrates collection creation with all calculations

getPreviousCollectionMeters()
├── Tries: Find actual previous collection from DB
└── Fallback: Use machine.collectionMeters

calculateMovement()
├── Standard: metersIn - prevIn, metersOut - prevOut
├── RAM Clear (with meters): (ramClearMeters - prev) + (current - 0)
└── RAM Clear (without meters): current meters only

calculateCollectionReportTotals()
└── Aggregates: All collections in a report to location-level totals
```

---

## API Endpoints Reference

### Collection Endpoints

#### POST /api/collections

**Purpose:** Create new collection with calculated metrics

**Request Body:**

```typescript
{
  machineId: string;
  metersIn: number;
  metersOut: number;
  // Don't send prevIn/prevOut - API calculates
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  notes?: string;
  timestamp: string;
  location: string;
  collector: string;
  locationReportId?: string;  // Empty for new reports, set for edit modal
  // Only send sasStartTime if custom
  sasMeters?: { sasStartTime?: string };
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    _id: string,  // ← Extract this as response.data.data._id
    machineId: string,
    metersIn: number,
    metersOut: number,
    prevIn: number,    // ← Calculated by API
    prevOut: number,   // ← Calculated by API
    movement: { ... }, // ← Calculated by API
    sasMeters: { ... },// ← Calculated by API
    isCompleted: false,
    locationReportId: string,
    // ...
  }
}
```

#### PATCH /api/collections?id=[collectionId]

**Purpose:** Update existing collection and recalculate if meters changed

**Key Behavior:**

- If meters changed → Finds actual previous collection → Recalculates prevIn/prevOut and movement
- Does NOT use machine.collectionMeters for recalculation!

#### DELETE /api/collections?id=[collectionId]

**Purpose:** Delete collection and fully revert machine state

**Key Behavior:**

- Always reverts `machine.collectionMeters`
- Conditionally removes `collectionMetersHistory` (if `locationReportId` exists)

### Collection Report Endpoints

#### POST /api/collectionReport

**Purpose:** Finalize collections into a report

**Key Behavior:**

1. Updates all collections: `locationReportId`, `isCompleted: true`
2. Creates `collectionMetersHistory` entries (ONE per machine)
3. Updates `machine.collectionMeters` to current values
4. Creates `CollectionReport` document

**⚠️ CRITICAL:** This is when history is created, not before!

#### PATCH /api/collection-reports/[reportId]/update-history

**Purpose:** Update/create collection history when editing report

**Request Body:**

```typescript
{
  changes: Array<{
    machineId: string;
    locationReportId: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    collectionId: string;
  }>;
}
```

**Key Behavior:**

1. Validates collection exists
2. Checks if history entry exists
3. **If exists:** Updates using `$set` with `arrayFilters`
4. **If NOT exists:** Creates using `$push`
5. Updates `machine.collectionMeters`
6. **Sets `collection.isCompleted = true`** ← Critical!

---

## State Management

### Desktop Edit Modal State:

```typescript
// Tracks current state
const [collectedMachineEntries, setCollectedMachineEntries] = useState<
  CollectionDocument[]
>([]);

// Tracks original state for change detection
const [originalCollections, setOriginalCollections] = useState<
  CollectionDocument[]
>([]);

// CRITICAL: Keep synchronized!
// When deleting:
setCollectedMachineEntries(prev => prev.filter(e => e._id !== deletedId));
setOriginalCollections(prev => prev.filter(e => e._id !== deletedId)); // ← MUST DO THIS!
```

### Mobile Edit Modal State:

```typescript
// All state in modalState
const [modalState, setModalState] = useState({
  collectedMachines: [],
  originalCollections: [], // For change detection
  // ...
});

// When deleting:
setModalState(prev => ({
  ...prev,
  collectedMachines: prev.collectedMachines.filter(m => m._id !== deletedId),
  originalCollections: prev.originalCollections.filter(
    m => m._id !== deletedId
  ), // ← MUST DO THIS!
}));
```

### Change Detection Logic:

```typescript
// Detect EDITED machines
for (const current of collectedMachineEntries) {
  const original = originalCollections.find(o => o._id === current._id);

  if (original) {
    // Machine existed before
    if (current.metersIn !== original.metersIn || current.metersOut !== original.metersOut) {
      // Meters changed → Include in batch update
      changes.push({ ... });
    }
  } else {
    // Machine is NEW → Always include in batch update
    changes.push({ ... });
  }
}
```

---

## Testing Guidelines

### Manual Testing Flow:

#### Test 1: Create New Collection Report

1. Open `NewCollectionModal`
2. Select location
3. Add 3+ machines
4. Enter meters for each
5. Fill financial fields
6. Click "Create Report"
7. **Verify:**
   - ✅ All collections have `isCompleted: true`
   - ✅ All collections have same `locationReportId`
   - ✅ All machines have `collectionMetersHistory` entry
   - ✅ All `machine.collectionMeters` updated

#### Test 2: Edit Existing Report - Add Machine

1. Open `EditCollectionModal`
2. Add new machine
3. Click "Update Report"
4. Navigate to report details
5. **Verify:**
   - ✅ New collection has `isCompleted: true`
   - ✅ New collection has correct `locationReportId`
   - ✅ Machine has `collectionMetersHistory` entry
   - ✅ `machine.collectionMeters` updated
   - ✅ No "history inconsistency" warning

#### Test 3: Edit Existing Report - Edit Machine

1. Open `EditCollectionModal`
2. Edit existing machine's meters
3. Click "Update Report"
4. **Verify:**
   - ✅ Collection still has `isCompleted: true`
   - ✅ `collectionMetersHistory` entry updated (not duplicated)
   - ✅ `machine.collectionMeters` updated
   - ✅ `prevIn/prevOut` recalculated correctly

#### Test 4: Edit Existing Report - Delete Machine

1. Open `EditCollectionModal`
2. Delete a machine from list
3. Click "Update Report"
4. **Verify:**
   - ✅ Collection deleted
   - ✅ `machine.collectionMeters` reverted to `prevIn/prevOut`
   - ✅ `collectionMetersHistory` entry removed
   - ✅ No "Collection not found" error when updating

### Automated Validation Scripts:

**Check isCompleted Status:**

```bash
node scripts/investigate-iscompleted-false.js
# Should show: Total collections with isCompleted: false: 0
# (or only draft collections without locationReportId)
```

**Check Collection History:**

```bash
node scripts/investigate-collection-reports.js --reportId=[reportId]
# Validates:
# - prevIn/prevOut match previous collection
# - movement calculations correct
# - collection history exists
# - SAS times valid
```

---

## Critical Warnings

### ⚠️ NEVER Do These:

1. **NEVER send `prevIn`/`prevOut` from frontend to `POST /api/collections`**
   - API calculates these from previous collection or `machine.collectionMeters`

2. **NEVER create collection history when creating collection**
   - History is only created when report is finalized or edited

3. **NEVER assume "no previous collection" means `prevIn/prevOut` should be 0**
   - `machine.collectionMeters` fallback is valid!

4. **NEVER skip updating `originalCollections` when deleting**
   - Causes "Collection not found" errors in batch update

5. **NEVER forget to set `isCompleted: true` when editing reports**
   - Breaks queries that rely on this flag

6. **NEVER close modal before awaiting all async operations**
   - Use `await` for batch update API call
   - Modal closes only after success

7. **NEVER use `response.data._id` - always use `response.data.data._id`**
   - API nests the created document in `data.data`

### ✅ ALWAYS Do These:

1. **ALWAYS let backend calculate `prevIn`, `prevOut`, `movement`, and `sasMeters`**
   - Frontend only sends raw meter readings

2. **ALWAYS include NEW machines in batch update** (edit modal)
   - Check `if (!original)` to detect new machines

3. **ALWAYS update both `collectedMachineEntries` AND `originalCollections`**
   - Especially when deleting or refetching

4. **ALWAYS set `isCompleted: true` when processing collections in edit modal**
   - `update-history` endpoint must do this

5. **ALWAYS check if history exists before updating**
   - Use `$push` if doesn't exist, `$set` with `arrayFilters` if exists

6. **ALWAYS remove collection history when deleting collection**
   - Use `$pull` with `locationReportId` matcher

7. **ALWAYS validate collection exists before processing in batch update**
   - Add detailed logging to debug validation failures

---

## Quick Reference

### Desktop vs Mobile Differences:

| Aspect              | Desktop                   | Mobile                                |
| ------------------- | ------------------------- | ------------------------------------- |
| **Layout**          | Three-column side-by-side | Slide-up panels                       |
| **Width**           | 20% \| 60% \| 20%         | Full-width panels                     |
| **Components**      | Monolithic modals         | Componentized (MobileFormPanel, etc.) |
| **State**           | Local useState            | modalState + Zustand                  |
| **Report Creation** | Single POST               | PATCH collections first, then POST    |
| **Final Result**    | Identical database state  | Identical database state              |

### Collection Flags:

| Flag               | When True                | When False                |
| ------------------ | ------------------------ | ------------------------- |
| `isCompleted`      | Part of finalized report | Draft (not yet finalized) |
| `locationReportId` | Set to report ID         | Empty string              |
| `ramClear`         | RAM Clear occurred       | Standard collection       |

### Movement Calculation Types:

| Type                           | Formula                                              |
| ------------------------------ | ---------------------------------------------------- |
| **Standard**                   | `movement = current - prev`                          |
| **RAM Clear (with meters)**    | `movement = (ramClearMeters - prev) + (current - 0)` |
| **RAM Clear (without meters)** | `movement = current`                                 |

---

## Recent Critical Fixes (November 4th, 2025)

### Fix #1: Previous Meters Recalculation in PATCH Endpoint

- **File:** `app/api/collections/route.ts`
- **Issue:** PATCH endpoint wasn't recalculating `prevIn/prevOut` when meters changed
- **Fix:** Now looks up actual previous collection and recalculates movement
- **Impact:** Prevents revenue calculation errors up to 99.7%

### Fix #2: DELETE Endpoint Not Removing History

- **File:** `app/api/collections/route.ts`
- **Issue:** DELETE only reverted meters, didn't remove history
- **Fix:** Now uses `$pull` to remove `collectionMetersHistory` entry
- **Impact:** Prevents orphaned history entries

### Fix #3: Edit Modal Not Matching Create Modal Logic

- **File:** `components/collectionReport/EditCollectionModal.tsx`
- **Issue:** Edit modal sent pre-calculated values to API
- **Fix:** Now sends only raw data, lets API calculate everything
- **Impact:** Consistency between create and edit flows

### Fix #4: Collection History Race Condition

- **Files:** Edit modals + `update-history/route.ts`
- **Issue:** NEW machines not included in batch update, history never created
- **Fix:** Include NEW machines, backend creates history if doesn't exist
- **Impact:** No more "history inconsistency" warnings

### Fix #5: isCompleted Status Not Updated in Edit Modal

- **File:** `app/api/collection-reports/[reportId]/update-history/route.ts`
- **Issue:** Collections left with `isCompleted: false` after editing
- **Fix:** Now sets `isCompleted: true` when processing batch update
- **Impact:** Query accuracy, data integrity

### Fix #6: Detection Logic False Positives

- **Files:** `check-all-issues/route.ts`, `check-sas-times/route.ts`, `fix-report/route.ts`
- **Issue:** Flagged valid collections using `machine.collectionMeters` fallback as errors
- **Fix:** Recognize fallback as valid, don't flag as issue
- **Impact:** No false positive warnings

### Fix #7: Wrong API Response Path

- **File:** `components/collectionReport/EditCollectionModal.tsx`
- **Issue:** Used `response.data._id` instead of `response.data.data._id`
- **Fix:** Corrected to nested path
- **Impact:** Collections properly saved with correct IDs

### Fix #8: originalCollections Not Updated When Deleting

- **Files:** Both edit modals
- **Issue:** Deleting machine left it in `originalCollections`, causing batch update errors
- **Fix:** Update both `collectedMachineEntries` AND `originalCollections`
- **Impact:** No "Collection not found" errors

---

## Data Integrity Rules

### Golden Rules:

1. **Single Source of Truth:**
   - Backend calculates ALL derived values
   - Frontend only sends raw data

2. **Atomic Updates:**
   - Collection + History + Machine meters updated together
   - No partial updates

3. **Consistent Flags:**
   - `locationReportId` set ↔ `isCompleted: true`
   - Always synchronized

4. **History Lifecycle:**
   - Created: When report finalized OR when machine added in edit modal
   - Updated: When machine edited in edit modal
   - Deleted: When collection deleted

5. **Fallback is Valid:**
   - `machine.collectionMeters` is a valid source for `prevIn/prevOut`
   - Detection logic must recognize this

---

## Summary

This document captures all critical knowledge about the Collection Reports system gained from extensive debugging and fixes on November 4th, 2025. Follow these guidelines strictly to maintain system integrity.

**Key Takeaway:** The Collection Reports system has complex data dependencies. Always consider the COMPLETE lifecycle: Collection → Report → History → Machine Meters. Breaking any link in this chain causes data integrity issues.

**When in doubt:**

1. Check the debugging checklist
2. Run investigation scripts
3. Review the "Common Bugs to Avoid" section
4. Consult the API endpoints reference
5. Read the complete documentation in `Documentation/backend/collection-report.md` and `Documentation/frontend/collection-report.md`

All guidelines verified through production debugging on November 4th, 2025. ✅
