# Collection History Race Condition Fix

**Author:** Aaron Hazzard - Senior Software Engineer  
**Date:** November 4th, 2025  
**Version:** 1.0.0

## Overview

Fixed a critical race condition where collection history entries were not being created when adding new machines in the edit modal, causing "history inconsistency" warnings immediately after adding machines.

---

## The Problem

### User Report

> "I just opened the edit modal and added a machine to the list and checked the report and the history was still in the process of being made so when I went into the report I saw the history inconsistency message and when I came back it was gone."

### Root Cause Analysis

When adding a NEW machine in `EditCollectionModal` or `MobileEditCollectionModal`:

1. ✅ Collection is created with `locationReportId` set (via `POST /api/collections`)
2. ❌ **Collection history entry is NOT created**
3. User clicks "Update Report"
4. ❌ **Batch update endpoint is NOT called for new machines** (only for edited machines)
5. Modal closes immediately
6. User navigates to report details
7. ⚠️ **Sees "history inconsistency" warning because history entry doesn't exist yet**

### Why This Happened

#### Issue #1: Batch Update Only Processed EDITED Machines

**EditCollectionModal.tsx** (lines 1342-1371 OLD):
```typescript
for (const current of collectedMachineEntries) {
  const original = originalCollections.find(o => o._id === current._id);
  if (original) {  // ← Only processes machines that existed before
    const metersInChanged = current.metersIn !== original.metersIn;
    const metersOutChanged = current.metersOut !== original.metersOut;
    
    if (metersInChanged || metersOutChanged) {
      changes.push({ ... });  // Add to batch update
    }
  }
  // ❌ PROBLEM: Newly added machines have no 'original', so they're skipped!
}
```

**Result:** NEW machines were never included in the batch update, so their history was never created.

#### Issue #2: Update-History Endpoint Only UPDATED, Never CREATED

**update-history/route.ts** (lines 100-131 OLD):
```typescript
// Update the machine's collectionMetersHistory
const historyUpdateResult = await Machine.findByIdAndUpdate(
  machineId,
  {
    $set: {
      "collectionMetersHistory.$[elem].metersIn": metersIn,
      // ... other fields
    },
  },
  {
    arrayFilters: [{ "elem.locationReportId": locationReportId }],
  }
);
// ❌ PROBLEM: If history entry doesn't exist, arrayFilters silently does nothing!
```

**Result:** Even if new machines were included in the batch, their history wouldn't be created because `arrayFilters` only works on EXISTING array elements.

---

## The Fix

### Part 1: Include NEW Machines in Batch Update

Modified both `EditCollectionModal.tsx` and `MobileEditCollectionModal.tsx` to include newly added machines:

```typescript
for (const current of collectedMachineEntries) {
  const original = originalCollections.find(o => o._id === current._id);
  if (original) {
    // Check if meters changed (existing machine)
    const metersInChanged = current.metersIn !== original.metersIn;
    const metersOutChanged = current.metersOut !== original.metersOut;
    
    if (metersInChanged || metersOutChanged) {
      console.warn(`🔍 Detected changes for machine ${current.machineId}`);
      changes.push({
        machineId: current.machineId,
        locationReportId: current.locationReportId || reportId,
        metersIn: current.metersIn || 0,
        metersOut: current.metersOut || 0,
        prevMetersIn: current.prevIn || 0,
        prevMetersOut: current.prevOut || 0,
        collectionId: current._id,
      });
    }
  } else {
    // ✅ NEW: This is a NEW machine added in this editing session
    console.warn(`✨ Detected NEW machine added: ${current.machineId}`);
    changes.push({
      machineId: current.machineId,
      locationReportId: current.locationReportId || reportId,
      metersIn: current.metersIn || 0,
      metersOut: current.metersOut || 0,
      prevMetersIn: current.prevIn || 0,
      prevMetersOut: current.prevOut || 0,
      collectionId: current._id,
    });
  }
}
```

**Changes:**
- **EditCollectionModal.tsx** (lines 1370-1393)
- **MobileEditCollectionModal.tsx** (lines 959-982)

### Part 2: Update-History Endpoint Creates OR Updates

Modified `app/api/collection-reports/[reportId]/update-history/route.ts` to check if history exists and create if needed:

```typescript
// CRITICAL: Check if history entry exists first
const machine = await Machine.findById(machineId);
if (!machine) {
  // ... error handling
  continue;
}

const historyEntryExists = machine.collectionMetersHistory?.some(
  (h: { locationReportId: string }) => h.locationReportId === locationReportId
);

if (historyEntryExists) {
  // ✅ UPDATE existing history entry using $set with arrayFilters
  console.warn(`🔄 Updating existing history entry for machine ${machineId}`);
  await Machine.findByIdAndUpdate(
    machineId,
    {
      $set: {
        "collectionMetersHistory.$[elem].metersIn": metersIn,
        "collectionMetersHistory.$[elem].metersOut": metersOut,
        "collectionMetersHistory.$[elem].prevMetersIn": prevMetersIn,
        "collectionMetersHistory.$[elem].prevMetersOut": prevMetersOut,
        "collectionMetersHistory.$[elem].timestamp": new Date(),
        updatedAt: new Date(),
      },
    },
    {
      arrayFilters: [{ "elem.locationReportId": locationReportId }],
      new: true,
    }
  );
} else {
  // ✅ CREATE new history entry using $push
  console.warn(`✨ Creating NEW history entry for machine ${machineId}`);
  const mongoose = await import('mongoose');
  const historyEntry = {
    _id: new mongoose.Types.ObjectId(),
    metersIn: Number(metersIn) || 0,
    metersOut: Number(metersOut) || 0,
    prevMetersIn: Number(prevMetersIn) || 0,
    prevMetersOut: Number(prevMetersOut) || 0,
    timestamp: new Date(),
    locationReportId: locationReportId,
  };

  await Machine.findByIdAndUpdate(
    machineId,
    {
      $push: {
        collectionMetersHistory: historyEntry,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
}

// Update machine's current collectionMeters (same for both cases)
await Machine.findByIdAndUpdate(machineId, {
  $set: {
    "collectionMeters.metersIn": metersIn,
    "collectionMeters.metersOut": metersOut,
    collectionTime: new Date(),
    updatedAt: new Date(),
  },
});
```

**Changes:**
- **update-history/route.ts** (lines 100-195)

---

## How It Works Now

### When Adding a Machine in Edit Modal:

1. User clicks "Add Machine"
2. Frontend creates collection via `POST /api/collections` with `locationReportId` set ✅
3. Collection is saved to DB ✅
4. Machine is added to local state ✅
5. User continues editing or clicks "Update Report"
6. **When "Update Report" is clicked:**
   - Frontend detects the NEW machine (no matching `original`)
   - Includes it in the `changes` array
   - Calls `PATCH /api/collection-reports/[reportId]/update-history` with ALL changes
   - Backend checks if history entry exists:
     - **If NO:** Creates new history entry using `$push` ✅
     - **If YES:** Updates existing history entry using `$set` with `arrayFilters` ✅
   - Backend updates `machine.collectionMeters` ✅
   - Frontend awaits the response before proceeding ✅
   - Only after ALL async operations complete, modal closes ✅

### Result:

✅ **All operations complete before modal closes:**
1. Collection created
2. `locationReportId` set on collection
3. Collection report updated
4. `collectionMeters` updated
5. **Collection history entry created**

✅ **No more race condition** - User navigates to report details and sees no warnings

---

## Testing Verification

### Test Case 1: Add New Machine in Edit Modal

**Steps:**
1. Open existing collection report
2. Click "Edit Report"
3. Add a new machine to the list
4. Click "Update Report"
5. Wait for success message
6. Navigate to report details page

**Expected Result:**
- ✅ No "history inconsistency" warning
- ✅ Machine appears with correct meters
- ✅ Collection history exists for the machine

### Test Case 2: Edit Existing Machine in Edit Modal

**Steps:**
1. Open existing collection report
2. Click "Edit Report"
3. Edit meters for an existing machine
4. Click "Update Report"
5. Wait for success message
6. Navigate to report details page

**Expected Result:**
- ✅ No "history inconsistency" warning
- ✅ Machine meters updated correctly
- ✅ Collection history updated (not duplicated)

### Test Case 3: Add Multiple New Machines

**Steps:**
1. Open existing collection report
2. Click "Edit Report"
3. Add 3 new machines to the list
4. Click "Update Report"
5. Wait for success message
6. Navigate to report details page

**Expected Result:**
- ✅ No "history inconsistency" warnings for any machine
- ✅ All 3 machines have collection history entries
- ✅ All `collectionMeters` updated correctly

---

## Files Modified

### Backend:

1. **`app/api/collection-reports/[reportId]/update-history/route.ts`** (lines 100-195)
   - Added check for history entry existence
   - Implements CREATE (using `$push`) or UPDATE (using `$set` with `arrayFilters`) logic
   - Ensures history is created for new machines

### Frontend:

2. **`components/collectionReport/EditCollectionModal.tsx`** (lines 1370-1393)
   - Added `else` block to include NEW machines in batch update
   - Logs newly added machines for debugging

3. **`components/collectionReport/mobile/MobileEditCollectionModal.tsx`** (lines 959-982)
   - Added `else` block to include NEW machines in batch update
   - Matches desktop behavior

---

## Key Principles

### 1. **Always Include ALL Machines in Batch Update**
- Don't just check for changes to EXISTING machines
- NEW machines need history entries created too

### 2. **Backend Must Handle Both Create and Update**
- Can't assume history entries always exist
- Check first, then create or update accordingly

### 3. **Wait for Async Operations Before Closing Modal**
- Already implemented: `await axios.patch(...)` ensures batch completes
- Now batch includes NEW machines, so history is guaranteed to be created

### 4. **Single Source of Truth**
- Collection history is created/updated through batch API
- Consistent behavior for both new and edited machines

---

## Impact

### Before Fix:
- ❌ Adding machines in edit modal caused immediate "history inconsistency" warnings
- ❌ Users had to close and reopen report to see warnings disappear
- ❌ Confusing UX - appeared as if something was broken
- ❌ Potential data integrity issues

### After Fix:
- ✅ No more race conditions
- ✅ History created immediately for new machines
- ✅ Consistent behavior for all machines (new and edited)
- ✅ Modal waits for all operations to complete
- ✅ Clean UX - no spurious warnings

---

## Summary

**Root Cause:** Race condition where collection history entries were not created for newly added machines in edit modal

**Solution:** 
1. Include NEW machines in batch update (not just edited ones)
2. Update-history endpoint creates history if it doesn't exist (not just updates)
3. Modal already waits for batch to complete before closing

**Result:** Complete elimination of race condition, consistent data integrity, clean user experience

All type-checks and lints pass! ✅

