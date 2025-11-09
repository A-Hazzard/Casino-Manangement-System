# Known Issues and Solutions - Evolution One CMS

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 7th, 2025  
**Version:** 1.0.0

## Purpose

This document catalogs common issues, pitfalls, and their solutions encountered during development of the Evolution One Casino Management System. Use this as a reference to avoid repeating past mistakes and to understand critical system behaviors.

---

## Table of Contents

1. [Collection Report System Issues](#collection-report-system-issues)
2. [Database & Data Integrity Issues](#database--data-integrity-issues)
3. [UI/UX Issues](#uiux-issues)
4. [State Management Issues](#state-management-issues)
5. [API & Backend Issues](#api--backend-issues)
6. [TypeScript & Type System Issues](#typescript--type-system-issues)
7. [Mobile Responsiveness Issues](#mobile-responsiveness-issues)
8. [Build & Configuration Issues](#build--configuration-issues)

---

## Collection Report System Issues

### Issue #1: Orphaned Collections from Wrong Report Creation Order ⚠️ CRITICAL

**Problem:**
- Report creation failed, leaving 32 orphaned collections in database
- Collections had `locationReportId` but no parent `CollectionReport` document
- Collections couldn't be used in new reports (already had reportId)
- System in inconsistent state requiring manual database cleanup

**Symptoms:**
- User clicks "Create Report", gets error message
- Collections marked with `isCompleted: false` but have `locationReportId`
- Multiple attempts create more orphaned collections with different `locationReportId`s
- Collections don't appear in "Create New Report" modal (have reportId but not completed)

**Root Cause:**
Both desktop and mobile modals updated collections BEFORE creating the parent report:

```javascript
// BROKEN ORDER:
Step 1: Update collections with locationReportId + isCompleted: true ✅
Step 2: Create parent CollectionReport → ❌ FAILS
Result: Collections orphaned with reportId but no parent report!
```

**Why This Happens:**
1. User adds machines to collection list
2. Modal generates `locationReportId` (e.g., `ec5e93e2-b727-4a20-8142-b983abae282a`)
3. Modal updates each collection: `{ locationReportId: xxx, isCompleted: true }`
4. Modal attempts to create parent `CollectionReport` document
5. Parent report creation FAILS (validation error, network issue, duplicate report, etc.)
6. Collections are left with `locationReportId` pointing to non-existent report
7. Collections are stuck - can't be used in new reports or edited

**Solution:**
Reverse the order - create parent report FIRST, then update collections:

```typescript
// ✅ CORRECT ORDER:
// Step 1: Create parent report FIRST
await createCollectionReport(payload);

// Step 2: ONLY IF successful, update collections
await updateCollectionsWithReportId(collectedMachineEntries, reportId);
```

**Implementation:**

Desktop (`NewCollectionModal.tsx` lines 1868-1961):
```typescript
// Create the collection report FIRST
await createCollectionReport(payload);

// Step 2: ONLY AFTER report is successfully created, update collections
await updateCollectionsWithReportId(collectedMachineEntries, reportId);
```

Mobile (`MobileCollectionModal.tsx` lines 1050-1074):
```typescript
// Create the collection report FIRST
const result = await createReportAPI(payload);

// Step 2: ONLY AFTER report is successfully created, update collections
const updatePromises = machinesForReport.map(async collection => {
  await axios.patch(`/api/collections?id=${collection._id}`, {
    locationReportId: reportId,
    isCompleted: true,
  });
});
await Promise.all(updatePromises);
```

**Prevention:**
- ✅ Atomic operation: If report fails, no side effects on collections
- ✅ If report succeeds but collection update fails, report exists (fixable via `/update-history`)
- ✅ No more orphaned collections
- ✅ Enhanced error logging shows exact failure point

**Manual Cleanup for Existing Orphaned Collections:**

Option 1 - Reset locationReportId (Recommended):
```javascript
db.collections.updateMany(
  { isCompleted: false },
  { $set: { locationReportId: '' } }
)
```

Option 2 - Delete orphaned collections:
```javascript
db.collections.deleteMany({ 
  isCompleted: false,
  locationReportId: { $ne: '' }
})
```

**Detection Script:**
```bash
node scripts/detect-incomplete-collections.js
```

**Affected Components:**
- `components/collectionReport/NewCollectionModal.tsx`
- `components/collectionReport/mobile/MobileCollectionModal.tsx`
- `scripts/detect-incomplete-collections.js`

**Date Fixed:** November 7th, 2025

---

### Issue #2: Database Updates Not Working in Mobile Create Modal

**Problem:**
- Desktop collection modal successfully updates database when using "Update All Dates"
- Mobile modal fails to update database - only updates frontend state

**Root Cause:**
- Mobile modal using `collectedMachines` from Zustand store instead of `modalState.collectedMachines`
- State mismatch between Zustand store and component state

**Solution:**
```typescript
// ❌ WRONG - Uses stale Zustand state
collectedMachines.map(async entry => {
  await axios.patch(`/api/collections?id=${entry._id}`, {...});
});

// ✅ CORRECT - Uses current modalState
modalState.collectedMachines.map(async entry => {
  await axios.patch(`/api/collections?id=${entry._id}`, {...});
});

// Update BOTH modalState AND Zustand store
setModalState(prev => ({ ...prev, collectedMachines: updatedMachines }));
setStoreCollectedMachines(updatedMachines);
```

**Prevention:**
- Always use component state (`modalState`) for current data in modals
- Update both component state and store when synchronization is needed
- Use `Promise.allSettled` instead of `Promise.all` for partial failure handling
- Add detailed logging to track which machines have `_id` and which are being updated

**Files:**
- `components/collectionReport/mobile/MobileCollectionModal.tsx`
- `components/collectionReport/mobile/MobileEditCollectionModal.tsx`

---

### Issue #2: Collection History Not Syncing with Collection Documents

**Problem:**
- Cabinet details page shows wrong `prevIn`/`prevOut` values in Collection History tab
- "Fix History" button doesn't fix the issue
- History shows values like `347.9K / 262.5K` when collection document has `0 / 0`

**Root Cause:**
- Fix API used `metersIn`/`metersOut` to match history entries (unreliable)
- Multiple collections can have same meter values
- Fix didn't update ALL fields (only some)

**Solution:**
```typescript
// ❌ WRONG - Unreliable identifier
const historyEntry = machine.collectionMetersHistory.find(
  h => h.metersIn === collection.metersIn && h.metersOut === collection.metersOut
);

// ✅ CORRECT - Use unique locationReportId
const historyEntry = machine.collectionMetersHistory.find(
  h => h.locationReportId === collection.locationReportId
);

// ✅ CORRECT - Sync ALL fields from collection to history
historyEntry.metersIn = collection.metersIn;
historyEntry.metersOut = collection.metersOut;
historyEntry.prevMetersIn = collection.prevIn || 0;
historyEntry.prevMetersOut = collection.prevOut || 0;
historyEntry.timestamp = new Date(collection.timestamp);
```

**CRITICAL PRINCIPLE:**
- **Collections are ALWAYS the source of truth**
- History is a denormalized copy (can drift)
- Fix direction: ALWAYS `history ← collection` (NEVER `collection ← history`)
- ANY field in history can be wrong, sync ALL fields

**Prevention:**
- Always use `locationReportId` as unique identifier for history entries
- Never trust `metersIn`/`metersOut` for matching (not unique)
- Always sync ALL 5 fields: `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`, `timestamp`
- Document that collections are source of truth in code comments

**Files:**
- `app/api/collection-reports/fix-report/route.ts`
- `components/cabinetDetails/AccountingDetails.tsx`
- `Documentation/backend/collection-report.md`

---

### Issue #3: False "Collection History Issues" on Every Report

**Problem:**
- Every collection report shows "Collection History Issues Detected"
- Even valid first collections with `prevIn=0` flagged as wrong
- `check-sas-times` API returns warnings for all reports

**Root Cause:**
- API compared history entries to OTHER history entries instead of collection documents
- Logic: `history[i].prevMeters !== history[i-1].meters` (WRONG!)
- Should compare: `history[i].prevMeters !== collection.prevIn` (source of truth)

**Solution:**
```typescript
// ❌ WRONG - Compares to previous history entry
if (entry.prevMetersIn !== history[i-1].metersIn) {
  issues.push({ /* error */ });
}

// ✅ CORRECT - Find and compare to collection document
const matchingCollection = await Collections.findOne({
  locationReportId: entry.locationReportId,
  machineId: machine._id.toString(),
}).lean();

if (!matchingCollection) continue;

const collectionPrevIn = matchingCollection.prevIn || 0;
const historyPrevIn = entry.prevMetersIn || 0;

if (Math.abs(historyPrevIn - collectionPrevIn) > 0.1) {
  issues.push({ /* real error */ });
}
```

**Prevention:**
- Always compare history to its corresponding COLLECTION document
- Never compare history entries to each other
- Use `locationReportId` to find matching collection
- Only flag as issue if history differs from collection (source of truth)

**Files:**
- `app/api/collection-report/[reportId]/check-sas-times/route.ts`
- `app/collection-report/report/[reportId]/page.tsx`

---

### Issue #4: Detection API Not Finding Previous Collections Across Reports

**Problem:**
- SAS time detection showing "No previous collection found" for machines that DO have previous collections
- Modal displays incorrect expected SAS times
- Fix button doesn't work because detection can't find the issue correctly
- Example: "FIXED MACHINE" had previous collection in Oct 6th report, but Nov 5th report couldn't find it

**Symptoms:**
- Modal shows: "No previous collection found, using 24 hours before current"
- Expected SAS start time calculated incorrectly
- Large time difference (e.g., 40889 minutes off)
- Previous collection exists in database but detection doesn't see it

**Root Cause:**
Detection API only searched collections within the CURRENT report:

```javascript
// BROKEN - Only searches current report
const collections = await Collections.find({
  locationReportId: reportId,  // Only this specific report
});

const previousCollection = collections.filter(c => 
  c.machineId === machineId && c.timestamp < current
)[0];
// Can't find previous collection if it's in a different report!
```

**Why This Happens:**
1. Machine collected on Oct 6th in report `A`
2. Machine collected on Nov 5th in report `B`
3. User opens report `B` to check for issues
4. Detection API only looks at collections in report `B`
5. Previous collection is in report `A`, so detection can't find it
6. Detection incorrectly calculates expected SAS time as "24 hours ago"

**Solution:**
Fetch ALL completed collections across ALL reports (match fix-report API logic):

```typescript
// ✅ CORRECT - Searches all reports
const allCollections = await Collections.find({
  isCompleted: true,
  locationReportId: { $exists: true, $ne: '' },
}).sort({ timestamp: 1, collectionTime: 1 });

const previousCollection = allCollections.filter(c =>
  c.machineId === machineId && 
  new Date(c.timestamp || c.collectionTime) < currentTimestamp &&
  c.isCompleted === true
).sort((a, b) => bTime - aTime)[0];
// Now finds previous collection regardless of which report it's in!
```

**Implementation:**

`app/api/collection-report/[reportId]/check-sas-times/route.ts` (lines 58-102):
```typescript
// Fetch ALL completed collections across ALL reports
const allCollections = await Collections.find({
  isCompleted: true,
  locationReportId: { $exists: true, $ne: '' },
}).sort({ timestamp: 1, collectionTime: 1 });

// Use allCollections instead of sortedCollections
const previousCollection = allCollections.filter(/* ... */)
```

**Impact:**
- ✅ Detection now correctly finds previous collections across different reports
- ✅ Accurate expected SAS times based on actual previous collection
- ✅ "No previous collection found" only when truly no previous exists
- ✅ Matches fix-report API logic for consistency
- ✅ Fix button works correctly

**Comparison with Other APIs:**

| API Endpoint | Previous Collection Search Scope | Status |
|-------------|----------------------------------|--------|
| `/check-sas-times` | ❌ Was: Current report only | ✅ Fixed: All reports |
| `/fix-report` | ✅ Correct: All reports | ✅ Working |
| `/check-all-issues` | ✅ Correct: All reports | ✅ Working |

**Diagnostic Script:**
```bash
node scripts/diagnose-fixed-machine.js
```

**Affected Files:**
- `app/api/collection-report/[reportId]/check-sas-times/route.ts`
- `scripts/diagnose-fixed-machine.js`

**Date Fixed:** November 7th, 2025

---

### Issue #5: Fix API Not Fixing "Future Value" Corruption

**Problem:**
- Machine GM02407 had Oct 21 history entry with `prevMetersIn` from Oct 29 (future value)
- Fix API returned "0 issues resolved" despite visible corruption
- Phase 3 of fix only ran sync if duplicates were found

**Root Cause:**
- Phase 3 sync was INSIDE `if (hasChanges)` block
- Only ran if duplicates/orphans were detected
- Machines with wrong values but no duplicates never got fixed

**Solution:**
```typescript
// ❌ WRONG - Only syncs if duplicates found
if (hasChanges) {
  // Sync history with collections
  for (const entry of cleanedHistory) {
    // ... sync logic
  }
  await Machine.findByIdAndUpdate(...);
}

// ✅ CORRECT - Always sync history, track changes separately
let syncMadeChanges = false;
for (const entry of cleanedHistory) {
  const matchingCollection = collections.find(c => c.locationReportId === entry.locationReportId);
  if (matchingCollection) {
    const valuesDiffer = (
      entry.prevMetersIn !== (matchingCollection.prevIn || 0) ||
      entry.prevMetersOut !== (matchingCollection.prevOut || 0)
    );
    if (valuesDiffer) {
      syncMadeChanges = true;
      entry.prevMetersIn = matchingCollection.prevIn || 0;
      entry.prevMetersOut = matchingCollection.prevOut || 0;
      // ... sync other fields
    }
  }
}

if (hasChanges || syncMadeChanges) {
  await Machine.findByIdAndUpdate(...);
}
```

**Prevention:**
- Phase 3 must ALWAYS sync history with collections
- Track sync changes separately from cleanup changes
- Update database if EITHER cleanup OR sync made changes
- Test with "future value" corruption scenarios

**Files:**
- `app/api/collection-reports/fix-report/route.ts`
- `scripts/comprehensive-fix-test.js`

---

### Issue #5: Auto-Fix Infinite Loop

**Problem:**
- Collection report details page and cabinet details page infinitely call fix endpoint
- Page becomes unresponsive
- Network tab shows hundreds of fix-report requests

**Root Cause:**
- `useEffect` with `hasCollectionHistoryIssues` dependency
- Fix function updates issues state → triggers useEffect → calls fix again → loop
- Missing flag to track if auto-fix already attempted

**Solution:**
```typescript
// ❌ WRONG - No tracking, infinite loop
useEffect(() => {
  if (hasCollectionHistoryIssues && !isFixingCollectionHistory) {
    handleFixCollectionHistory();
  }
}, [hasCollectionHistoryIssues, isFixingCollectionHistory, handleFixCollectionHistory]);

// ✅ CORRECT - Use ref to track auto-fix attempt
const autoFixAttemptedRef = useRef(false);

useEffect(() => {
  if (
    hasCollectionHistoryIssues && 
    !isFixingCollectionHistory && 
    !isCheckingIssues && 
    !autoFixAttemptedRef.current // Only run once per page session
  ) {
    autoFixAttemptedRef.current = true; // Mark attempted immediately
    handleFixCollectionHistory(true); // true = automatic/silent fix
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [hasCollectionHistoryIssues, isFixingCollectionHistory, isCheckingIssues]);
// Intentionally omit handleFixCollectionHistory to prevent loop
```

**Prevention:**
- Use `useRef` to track if auto-fix has been attempted
- Set flag to `true` BEFORE calling fix function
- NEVER reset the flag during page session
- Omit fix function from useEffect dependencies (add eslint-disable comment)
- Use separate flags for loading states and auto-fix tracking

**Files:**
- `components/cabinetDetails/AccountingDetails.tsx`
- `app/collection-report/report/[reportId]/page.tsx`

---

### Issue #6: Unsaved Machine Data Not Preventing Report Creation

**Problem:**
- User selects machine, enters meters/notes
- Forgets to click "Add Machine to List"
- Clicks "Create Report" - report created without that machine
- Data loss and user confusion

**Root Cause:**
- No validation checking if form has unsaved data
- Report creation allowed when machine selected with data

**Solution:**
```typescript
// ✅ Add validation before report creation
const hasUnsavedData = 
  selectedMachineId &&
  (currentMetersIn.trim() !== '' ||
    currentMetersOut.trim() !== '' ||
    currentMachineNotes.trim() !== '');

if (hasUnsavedData) {
  toast.error(
    'You have unsaved machine data. Please click "Add Machine to List" or cancel the current machine entry before creating the report.',
    { duration: 6000 }
  );
  return;
}

// Proceed with report creation
setShowCreateConfirmation(true);
```

**Prevention:**
- Always validate for unsaved data before destructive actions
- Check if ANY field has value (meters OR notes)
- Show clear error message explaining what user must do
- Apply same validation to both desktop and mobile modals

**Files:**
- `components/collectionReport/NewCollectionModal.tsx`
- `components/collectionReport/mobile/MobileCollectionModal.tsx`

---

## Database & Data Integrity Issues

### Issue #7: `_id` Field Type Mismatch in Test Scripts

**Problem:**
- Test scripts generate `ObjectId` for collection `_id`
- Collections schema defines `_id: { type: String }`
- API fails with "No collections found for this machine"
- Fix-report returns errors

**Root Cause:**
- Schema expects String `_id`, scripts generate ObjectId
- MongoDB silently accepts both but queries fail
- Collections/Reports use UUID strings, not ObjectIds

**Solution:**
```typescript
// ❌ WRONG - Generates ObjectId
const collection = {
  _id: new ObjectId(), // ObjectId type
  machineId: machineId,
  // ...
};

// ✅ CORRECT - Generate String _id
const collection = {
  _id: new ObjectId().toString(), // String type
  machineId: machineId,
  // ...
};
```

**Prevention:**
- Always check schema before generating test data
- Collections and CollectionReports use String `_id` (UUIDs)
- Machines use ObjectId `_id`
- Use `.toString()` when schema expects String
- Verify with `typeof _id` in tests

**Files:**
- `scripts/comprehensive-fix-test.js`
- `scripts/test-collection-history-fix.js`
- `app/api/lib/models/collections.ts`

---

### Issue #8: Test Scripts Using Wrong Database

**Problem:**
- Test script hardcodes `DB_NAME = 'test'`
- MONGO_URI points to `/sas-dev`
- API connects to `/sas-dev`, script connects to `/test`
- API can't find test data, shows "0 issues"

**Root Cause:**
- Database name extracted from MONGO_URI for API
- Script hardcodes different database name
- Data written to wrong database

**Solution:**
```typescript
// ❌ WRONG - Hardcoded database name
const DB_NAME = 'test';

// ✅ CORRECT - Extract from MONGO_URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sas-dev';
const DB_NAME = MONGO_URI.split('/').pop()?.split('?')[0] || 'sas-dev';

console.log(`🔗 Connecting to database: ${DB_NAME}`);
```

**Prevention:**
- Never hardcode database names in scripts
- Always extract from `MONGO_URI` environment variable
- Log database name at script start
- Verify API and script use same database

**Files:**
- `scripts/comprehensive-fix-test.js`
- All test/migration scripts

---

### Issue #9: Check-All-Issues Incorrectly Flagging Old Collections

**Problem:**
- API flags old collections as having issues
- Compares ALL collections to current `machine.collectionMeters`
- Historical collections show false positives

**Root Cause:**
- Logic compares every collection's meters to `machine.collectionMeters`
- `machine.collectionMeters` only reflects MOST RECENT collection
- Old collections naturally differ from current state

**Solution:**
```typescript
// ❌ WRONG - Checks all collections against current state
for (const collection of collections) {
  if (
    machine.collectionMeters.metersIn !== collection.metersIn ||
    machine.collectionMeters.metersOut !== collection.metersOut
  ) {
    issues.push({ /* false positive */ });
  }
}

// ✅ CORRECT - Only check most recent collection
const mostRecentCollection = await Collections.findOne({
  machineId: machineId,
  $and: [
    { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
    { isCompleted: true },
  ],
})
  .sort({ collectionTime: -1, timestamp: -1 })
  .lean();

const isThisMostRecent = 
  mostRecentCollection &&
  mostRecentCollection._id === collection._id;

if (isThisMostRecent) {
  // Only validate most recent collection
  if (machine.collectionMeters.metersIn !== collection.metersIn) {
    issues.push({ /* real issue */ });
  }
}
```

**Prevention:**
- Only validate `machine.collectionMeters` against MOST RECENT collection
- Historical collections should not be compared to current state
- Sort by `collectionTime` DESC to find most recent
- Add comments explaining why only most recent is checked

**Files:**
- `app/api/collection-reports/check-all-issues/route.ts`

---

## UI/UX Issues

### Issue #9: Edit Icons Shown on All Reports Instead of Most Recent Only

**Problem:**
- Edit and delete icons appeared on ALL collection reports
- Users could edit historical reports, causing data integrity issues
- No restriction to most recent report per location

**Requirement:**
- Edit/delete buttons should ONLY appear on the **most recent** collection report for each location
- Example: 3 locations with 5 reports each = only **3 edit icons** total (1 per location)
- Only authorized users should see edit icons (collectors, location collectors, managers, admins, evo admins)

**Root Cause:**
- No logic to determine which reports are the most recent for each location
- Edit icons shown based solely on user permissions
- All reports for authorized users had edit/delete buttons

**Solution:**

**Step 1: Calculate Most Recent Reports (`app/collection-report/page.tsx` lines 665-693)**
```typescript
const editableReportIds = useMemo(() => {
  if (!canUserEdit) return new Set<string>();
  
  const reportsByLocation = new Map<string, CollectionReportRow>();
  
  // Find most recent report for each location
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

**Step 2: Conditional Rendering**

Table (`CollectionReportTable.tsx` line 257):
```typescript
// BEFORE: Showed for all reports
{canEditDelete && (
  <Button onClick={() => onEdit(row.locationReportId)}>
    <Edit3 />
  </Button>
)}

// AFTER: Only shows for most recent reports
{canEditDelete && editableReportIds?.has(row.locationReportId) && (
  <Button onClick={() => onEdit(row.locationReportId)}>
    <Edit3 />
  </Button>
)}
```

**Behavior:**

Before:
- Dueces (10 reports) → **10 edit icons** (all reports)
- DevLabTuna (5 reports) → **5 edit icons** (all reports)
- Total: **15 edit icons**

After:
- Dueces (10 reports) → **1 edit icon** (latest only)
- DevLabTuna (5 reports) → **1 edit icon** (latest only)
- Total: **2 edit icons**

**Authorized Roles:**
- ✅ Collector
- ✅ Location Collector
- ✅ Manager
- ✅ Admin
- ✅ Developer

**Why This Restriction:**
- Prevents accidental modification of historical reports
- Maintains data integrity and audit trail
- Users should only edit current/latest collection report
- Historical reports remain immutable for accounting purposes

**Type Updates:**
- `CollectionDesktopUIProps` - Added `editableReportIds?: Set<string>`
- `CollectionMobileUIProps` - Added `editableReportIds?: Set<string>`
- `ExtendedCollectionReportTableProps` - Added `editableReportIds?: Set<string>`
- `ExtendedCollectionReportCardsProps` - Added `editableReportIds?: Set<string>`

**Affected Files:**
- `app/collection-report/page.tsx`
- `lib/types/componentProps.ts`
- `components/collectionReport/CollectionDesktopUI.tsx`
- `components/collectionReport/CollectionMobileUI.tsx`
- `components/collectionReport/CollectionReportTable.tsx`
- `components/collectionReport/CollectionReportCards.tsx`

**Date Implemented:** November 7th, 2025

---

### Issue #10: Collection History Table Overflowing on Mobile/Tablet

**Problem:**
- Collection History table overflows container on `lg:` breakpoint
- Horizontal scrollbar appears
- Data doesn't align vertically with headers
- Time column too wide

**Root Cause:**
- No `table-fixed` layout, browser ignores width constraints
- Desktop table shown on tablets (should be cards)
- Excessive padding and no explicit column widths

**Solution:**
```typescript
// ✅ CORRECT Breakpoint strategy
<div className="hidden w-full overflow-x-auto xl:block"> {/* Table on xl+ only */}
  <Table className="w-full table-fixed"> {/* Fixed layout */}
    <colgroup>
      <col style={{ width: '160px' }} /> {/* Time */}
      <col style={{ width: '85px' }} />  {/* Prev In */}
      <col style={{ width: '85px' }} />  {/* Meters In */}
      <col style={{ width: '85px' }} />  {/* Prev Out */}
      <col style={{ width: '85px' }} />  {/* Meters Out */}
      <col style={{ width: '110px' }} /> {/* Report */}
    </colgroup>
    <TableHead className="text-left">...</TableHead> {/* Left align */}
  </Table>
</div>

<div className="space-y-4 xl:hidden"> {/* Cards on < xl */}
  {/* Card layout */}
</div>
```

**Prevention:**
- Use `xl:` breakpoint for tables, cards for everything smaller
- Always use `table-fixed` with explicit column widths via `<colgroup>`
- Left-align ALL table cells for vertical alignment
- Reduce padding (`px-2` instead of `p-4`)
- Test on mobile, tablet, and desktop sizes

**Files:**
- `components/cabinetDetails/CollectionHistoryTable.tsx`

---

### Issue #11: Date Picker Closing Instantly on Interaction

**Problem:**
- `PCDateTimePicker` closes immediately when user clicks calendar
- Can't select date/time - picker disappears
- Poor user experience

**Root Cause:**
- `closeOnSelect={true}` default behavior
- Click-outside handler triggering too aggressively
- Event listener attached immediately without delay

**Solution:**
```typescript
// ✅ CORRECT Configuration
<DateTimePicker
  closeOnSelect={false} // Don't close on selection
  slotProps={{
    actionBar: {
      actions: ['accept', 'cancel'], // Explicit accept/cancel buttons
    },
  }}
/>

// ✅ CORRECT Click-outside with delay
useEffect(() => {
  if (!isOpen) return;

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Check if click is inside any MUI component
    const isInsidePicker = 
      target.closest('.MuiPickersPopper-root') ||
      target.closest('.MuiDialog-root') ||
      target.closest('.MuiPaper-root');
    
    if (!isInsidePicker && !buttonRef.current?.contains(target)) {
      setIsOpen(false);
    }
  };

  // Add 100ms delay to prevent immediate closing
  const timeoutId = setTimeout(() => {
    document.addEventListener('mousedown', handleClickOutside);
  }, 100);

  return () => {
    clearTimeout(timeoutId);
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isOpen]);
```

**Prevention:**
- Always set `closeOnSelect={false}` for DateTimePickers
- Add explicit accept/cancel buttons via `actionBar`
- Use 100ms delay before attaching click-outside listener
- Check for ALL MUI component classes in click-outside logic
- Test picker on both desktop and mobile

**Files:**
- `components/ui/pc-date-time-picker.tsx`

---

### Issue #12: Mobile Date Picker Overflowing Horizontally

**Problem:**
- Calendar and time picker overflow screen width on mobile
- User has to scroll horizontally to see full picker
- Poor mobile UX

**Root Cause:**
- Default MUI DateTimePicker shows 2 months side-by-side
- No width constraints on popper
- Horizontal layout for time picker

**Solution:**
```typescript
// ✅ CORRECT Mobile configuration
<DateTimePicker
  views={['year', 'month', 'day', 'hours', 'minutes']}
  openTo="day"
  slotProps={{
    popper: {
      sx: {
        // Constrain width to viewport minus padding
        maxWidth: 'calc(100vw - 2rem)',
        // Force vertical stacking on mobile
        '& .MuiPickersLayout-root': {
          display: 'flex',
          flexDirection: 'column !important',
        },
        // 1 month only on mobile
        '& .MuiDateCalendar-root': {
          width: '100%',
          maxWidth: '320px',
        },
        // Vertical scrollable time columns
        '& .MuiMultiSectionDigitalClock-root': {
          flexDirection: 'row !important',
          gap: '0px',
        },
      },
    },
  }}
/>
```

**Prevention:**
- Always constrain picker width to `calc(100vw - 2rem)` on mobile
- Use 1 month calendar on mobile, 2 on desktop
- Force vertical layout for picker container
- Use digital time input (scrollable columns), not analog clock
- Test on actual mobile devices, not just browser DevTools

**Files:**
- `components/ui/pc-date-time-picker.tsx`
- `components/ui/ModernDateRangePicker.tsx`

---

### Issue #13: Tooltip Not Showing in Collection History Table

**Problem:**
- AlertCircle icon shows for issues in table view
- No tooltip on hover - user can't see issue details
- Inconsistent with card view (which shows messages)

**Root Cause:**
- Missing `TooltipProvider` wrapper
- `TooltipTrigger` not using `asChild` prop
- No delay or positioning configured

**Solution:**
```typescript
// ✅ CORRECT Tooltip implementation
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

<TooltipProvider>
  <Table>
    <TableBody>
      {data.map(row => {
        const hasIssue = issuesMap[row.locationReportId];
        return (
          <TableRow key={row._id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {hasIssue && (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild> {/* CRITICAL: asChild prop */}
                      <div className="flex cursor-help">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="max-w-xs z-50 bg-slate-900 text-white"
                    >
                      <p className="text-xs">{issuesMap[row.locationReportId]}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <span>{/* data */}</span>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
</TooltipProvider>
```

**Prevention:**
- Always wrap table in `TooltipProvider`
- Use `asChild` prop on `TooltipTrigger`
- Set `delayDuration={200}` for responsive feedback
- Position with `side="right"` to avoid text overlap
- High z-index (`z-50`) to appear above other elements
- Dark background for better visibility

**Files:**
- `components/cabinetDetails/CollectionHistoryTable.tsx`

---

## State Management Issues

### Issue #14: React Detecting Component as Different Type

**Problem:**
- `react-dom.development.js:86 Warning: <Context.Provider> is being used instead of <Context.Provider>`
- Function component name mismatch
- React re-mounts component instead of updating

**Root Cause:**
- Anonymous function component or missing `displayName`
- React can't identify component for reconciliation

**Solution:**
```typescript
// ❌ WRONG - Anonymous component
const TimePicker = React.memo(({ value, onChange }) => {
  return <div>...</div>;
});

// ✅ CORRECT - Named component with displayName
const TimePicker = React.memo<TimePickerProps>(({ value, onChange }) => {
  return <div>...</div>;
});
TimePicker.displayName = 'TimePicker';
```

**Prevention:**
- Always set `displayName` for memoized components
- Use named function expressions, not arrow functions
- Add displayName immediately after component definition
- Especially important for `React.memo`, `React.forwardRef`

**Files:**
- `components/ui/ModernDateRangePicker.tsx`
- All memoized components

---

## API & Backend Issues

### Issue #15: TypeScript Error "Property 'substring' does not exist on type '{}'"

**Problem:**
- `entry.locationReportId.substring()` throws type error
- `locationReportId` inferred as `{}` instead of string
- Build fails with type error

**Root Cause:**
- MongoDB lean() returns Record<string, unknown>
- TypeScript can't infer specific field types
- Need explicit type casting or string coercion

**Solution:**
```typescript
// ❌ WRONG - No type coercion
console.log(`Syncing ${entry.locationReportId.substring(0, 20)}...`);

// ✅ CORRECT - Coerce to string
console.log(`Syncing ${String(entry.locationReportId || '').substring(0, 20)}...`);
```

**Prevention:**
- Always coerce to string when using string methods on unknown types
- Use `String(value || '')` for safe string conversion
- Handle null/undefined with fallback (`|| ''`)
- Or cast: `(entry.locationReportId as string)`

**Files:**
- `app/api/collection-reports/fix-report/route.ts`

---

### Issue #16: Finding Report by UUID Instead of ObjectId

**Problem:**
- Frontend passes `reportId` as UUID (locationReportId)
- API tries `findById` which expects ObjectId
- Returns null - "No report found"

**Root Cause:**
- `CollectionReport` has two ID fields: `_id` (ObjectId) and `locationReportId` (UUID)
- Frontend uses `locationReportId` (UUID) for routing
- Backend tries to find by `_id` (ObjectId)

**Solution:**
```typescript
// ❌ WRONG - Assumes reportId is ObjectId
const report = await CollectionReport.findById(reportId);

// ✅ CORRECT - Try locationReportId first, fallback to _id
let report = await CollectionReport.findOne({ 
  locationReportId: reportId 
});

if (!report) {
  // Fallback to _id if locationReportId fails
  report = await CollectionReport.findById(reportId);
}

if (!report) {
  return NextResponse.json(
    { success: false, error: 'Report not found' },
    { status: 404 }
  );
}
```

**Prevention:**
- Always try `locationReportId` first for reports
- Fallback to `_id` for backwards compatibility
- Document which ID type each endpoint expects
- Use consistent ID type in frontend routing

**Files:**
- `app/api/collection-reports/fix-report/route.ts`
- All collection report API endpoints

---

## TypeScript & Type System Issues

### Issue #17: Type 'Date' Cannot Be Used as Index Type

**Problem:**
- `Conversion of type 'Date' to type 'string' may be a mistake`
- Trying to use Date in string context
- Build fails with type error

**Root Cause:**
- MongoDB returns Date objects or string dates
- TypeScript can't determine which at compile time
- Need explicit type checking

**Solution:**
```typescript
// ❌ WRONG - Assumes always Date
const time = new Date(matchingCollection.timestamp).getTime();

// ✅ CORRECT - Handle both string and Date
const collectionTime = new Date(
  typeof matchingCollection.timestamp === 'string'
    ? matchingCollection.timestamp
    : (matchingCollection.timestamp as Date).toISOString()
).getTime();
```

**Prevention:**
- Always check type before conversion
- Handle both string and Date cases
- Use type guards: `typeof x === 'string'`
- Cast when certain: `(x as Date)`

**Files:**
- `app/api/collection-reports/fix-report/route.ts`

---

### Issue #18: Property Does Not Exist on Type 'IntrinsicAttributes'

**Problem:**
- `Property 'onDataRefresh' does not exist on type 'IntrinsicAttributes & AccountingDetailsProps'`
- Prop defined in component but not in type
- Multiple type definition locations

**Root Cause:**
- Duplicate type definitions across files
- Some definitions updated, others not
- Type inconsistency across codebase

**Solution:**
```typescript
// ❌ WRONG - Multiple type definitions
// lib/types/cabinetDetails.ts
export type AccountingDetailsProps = {
  cabinet: Cabinet | null;
  loading: boolean;
};

// global.d.ts
type AccountingDetailsProps = {
  cabinet: Cabinet | null;
  loading: boolean;
  activeMetricsTabContent: string;
};

// ✅ CORRECT - Single source of truth, all props included
// lib/types/cabinetDetails.ts
export type AccountingDetailsProps = {
  cabinet: Cabinet | null;
  loading: boolean;
  activeMetricsTabContent: string;
  onDataRefresh?: () => void | Promise<void>; // All props included
};

// Update ALL duplicate definitions
```

**Prevention:**
- Single source of truth for types (use `shared/types/`)
- Search for duplicate type definitions: `grep -r "type AccountingDetailsProps"`
- Update ALL occurrences when adding props
- Import from shared types, don't redefine

**Files:**
- `lib/types/cabinetDetails.ts`
- `global.d.ts`
- `lib/types/declarations.d.ts`

---

## Mobile Responsiveness Issues

### Issue #19: Analog Clock Time Input on Mobile

**Problem:**
- Time picker shows analog clock on mobile
- Hard to tap small numbers on clock face
- Clock interface not mobile-friendly

**Root Cause:**
- MUI DateTimePicker defaults to analog clock
- No mobile-specific time input configuration
- Horizontal layout for time options

**Solution:**
```typescript
// ✅ CORRECT - Digital scrollable columns
<DateTimePicker
  views={['year', 'month', 'day', 'hours', 'minutes']}
  slotProps={{
    popper: {
      sx: {
        // Hide analog clock completely
        '& .MuiTimeClock-root': {
          display: 'none !important',
        },
        // Show digital time as three vertical scrollable columns
        '& .MuiMultiSectionDigitalClock-root': {
          display: 'flex !important',
          flexDirection: 'row !important',
          justifyContent: 'center',
          gap: '0px',
        },
        // Each column (Hour | Minute | AM/PM)
        '& .MuiMultiSectionDigitalClockSection-root': {
          flex: '1 1 0',
          maxWidth: '80px',
          display: 'flex',
          flexDirection: 'column',
        },
        // Scrollable list within each column
        '& .MuiMultiSectionDigitalClockSection-root .MuiList-root': {
          maxHeight: '180px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        },
        // Larger touch targets
        '& .MuiMenuItem-root': {
          minHeight: '44px',
          fontSize: '16px',
        },
      },
    },
  }}
/>
```

**Prevention:**
- Always hide analog clock on mobile: `display: 'none'`
- Use `MuiMultiSectionDigitalClock` for time input
- Three columns: Hour | Minute | AM/PM
- Vertical scrollable lists within each column
- Minimum 44px touch targets for accessibility
- Test on actual mobile devices

**Files:**
- `components/ui/pc-date-time-picker.tsx`

---

## Build & Configuration Issues

### Issue #20: Tailwind Class Not Existing (`border-border`)

**Problem:**
- Build fails with: `The border-border class does not exist`
- Class used in multiple components
- Tailwind not recognizing custom color

**Root Cause:**
- Missing `tailwind.config.ts` file
- Custom colors not defined
- Tailwind not scanning all files

**Solution:**
```typescript
// ✅ CORRECT tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))", // Define custom colors
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // ... other colors
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**Prevention:**
- Always have `tailwind.config.ts` in project root
- Define all custom colors in config
- Use CSS variables: `hsl(var(--color-name))`
- Include all content paths
- Run `pnpm build` to verify

**Files:**
- `tailwind.config.ts`
- `app/globals.css` (define CSS variables)

---

## Best Practices Summary

### Database Operations
1. **Always use `locationReportId` as unique identifier** for collections/history
2. **Collections are source of truth** - history is denormalized copy
3. **Extract database name from MONGO_URI** - never hardcode
4. **Match schema types** - check if `_id` is String or ObjectId
5. **Use String coercion** for unknown types before string methods

### State Management
1. **Use component state for current data** - not Zustand in modals
2. **Update both local and global state** when syncing required
3. **Use refs to prevent infinite loops** - never reset during session
4. **Set displayName for memoized components** - helps React reconciliation

### UI/UX
1. **Use xl: for tables, cards for smaller** - better mobile UX
2. **table-fixed with explicit widths** - prevents overflow
3. **closeOnSelect={false} for date pickers** - add accept/cancel buttons
4. **100ms delay for click-outside** - prevents instant closing
5. **Digital time input on mobile** - no analog clocks
6. **TooltipProvider + asChild** - for proper tooltip rendering

### API Design
1. **Try locationReportId first, fallback to _id** - for reports
2. **Promise.allSettled for batch operations** - handle partial failures
3. **Detailed logging for debugging** - track what's being processed
4. **Type guards before conversions** - `typeof x === 'string'`
5. **Compare history to collections** - not to other history entries

### Testing
1. **Use correct database** - extract from MONGO_URI
2. **Match schema types** - String vs ObjectId for _id
3. **Test all corruption types** - duplicates, wrong values, orphans, future values
4. **Triple-layer verification** - API, immediate, database checks
5. **Clean up test data** - don't leave orphaned test machines

---

## Critical Reminders

### When Working on Collection Reports:
- ✅ Collections are ALWAYS source of truth
- ✅ Use `locationReportId` for matching, not meters
- ✅ Sync ALL fields (5 total) from collection to history
- ✅ Check for unsaved data before destructive actions
- ✅ Use refs to prevent infinite auto-fix loops

### When Working on Mobile UI:
- ✅ Test on actual devices, not just DevTools
- ✅ Use xl: breakpoint for tables, cards for smaller
- ✅ Constrain width to `calc(100vw - 2rem)`
- ✅ Digital time input (scrollable), not analog clock
- ✅ Minimum 44px touch targets

### When Writing Tests:
- ✅ Extract database name from MONGO_URI
- ✅ Check schema for _id type (String vs ObjectId)
- ✅ Use `.toString()` for String _id fields
- ✅ Test with multiple corruption types
- ✅ Clean up test data after completion

---

**Last Updated:** November 7th, 2025  
**Maintained By:** Aaron Hazzard - Senior Software Engineer  
**Version:** 1.0.0

