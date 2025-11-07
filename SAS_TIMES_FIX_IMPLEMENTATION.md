# SAS Times Detection and Fix Implementation

**Date:** November 7th, 2025  
**Author:** Aaron Hazzard - Senior Software Engineer

## Problem Statement

When using the "Update All Dates" button in collection modals, the system was updating `timestamp` and `collectionTime` fields but **NOT recalculating SAS times** (`sasStartTime`/`sasEndTime`). This caused:

1. **Incorrect SAS windows**: Collections showing wrong time periods
   - Example: Oct 31st report showing `Oct 30th → Nov 3rd` instead of `Oct 30th → Oct 31st`
   - Example: Nov 3rd report showing `Oct 31st → Nov 1st` instead of `Oct 31st → Nov 2nd`

2. **Cascading errors**: Each subsequent collection using wrong previous timestamp for its SAS start time

3. **Invalid SAS metrics**: Drop/cancelled credits/gross calculated from wrong time periods

## Root Cause Analysis

### Frontend Issue

**Files Affected:**
- `components/collectionReport/NewCollectionModal.tsx` (line ~3019)
- `components/collectionReport/EditCollectionModal.tsx` (line ~1716)
- `components/collectionReport/mobile/MobileCollectionModal.tsx` (line ~867)
- `components/collectionReport/mobile/MobileEditCollectionModal.tsx` (line ~3405)

**Problem Code:**
```typescript
// "Update All Dates" button implementation
const results = await Promise.allSettled(
  collectedMachineEntries.map(async entry => {
    return await axios.patch(`/api/collections?id=${entry._id}`, {
      timestamp: updateAllDate.toISOString(),
      collectionTime: updateAllDate.toISOString(),
      // ❌ Only sends timestamp, doesn't trigger SAS recalculation
    });
  })
);
```

### Backend Issue

**File:** `app/api/collections/route.ts` (PATCH endpoint)

**Problem:**
```typescript
// Only recalculates SAS when meters change
const metersChanged = (
  updateData.metersIn !== undefined ||
  updateData.metersOut !== undefined ||
  // ...
);

if (metersChanged) {
  // ✅ Recalculates SAS here
}
// ❌ BUT: When only timestamp changes, SAS NOT recalculated
```

## Solution Implemented

### 1. Backend Fix - PATCH /api/collections Endpoint

**File:** `app/api/collections/route.ts` (lines 335-486)

**Added timestamp change detection:**
```typescript
const timestampChanged =
  updateData.timestamp !== undefined &&
  new Date(updateData.timestamp).getTime() !==
    new Date(originalCollection.timestamp).getTime();

if (metersChanged || timestampChanged) {
  // Recalculate SAS times and metrics
  const collectionTimestamp = updateData.timestamp
    ? new Date(updateData.timestamp)
    : originalCollection.timestamp;

  const { sasStartTime, sasEndTime } = await getSasTimePeriod(
    originalCollection.machineId,
    undefined,
    collectionTimestamp
  );

  const sasMetrics = await calculateSasMetrics(
    originalCollection.machineId,
    sasStartTime,
    sasEndTime
  );

  updateData.sasMeters = {
    ...originalCollection.sasMeters,
    ...sasMetrics,
    sasStartTime: sasMetrics.sasStartTime,
    sasEndTime: sasMetrics.sasEndTime,
  };
}
```

**Impact:** Future "Update All Dates" operations will automatically recalculate SAS times

### 2. Detection and Fix Script

**File:** `scripts/detect-and-fix-sas-times.js`

**Features:**

#### Mode 1: Backup
- Exports all collections and reports to timestamped JSON files
- Creates `backups/sas-times-backup-[timestamp]/` directory
- Preserves data for safe rollback

#### Mode 2: Detect
- Scans all collection reports chronologically (oldest to newest)
- For each collection:
  - Validates `sasStartTime` matches previous collection's timestamp
  - Validates `sasEndTime` matches current collection's timestamp
  - Checks for inversions (start >= end)
  - Checks for extremely long spans (> 30 days with mismatches)
- Outputs detailed issue report with current vs. expected values

#### Mode 3: Test (Dry-Run)
- Simulates all fixes WITHOUT writing to database
- Shows what would change
- Re-runs detection on simulated data
- Confirms 0 issues would remain after fix

#### Mode 4: Fix
- Applies fixes to database chronologically
- Recalculates SAS times from previous collections
- Recalculates SAS metrics with correct time windows
- Updates collection documents
- Updates machine collectionMetersHistory
- Requires user confirmation before proceeding

#### Mode 5: Restore
- Restores collections and reports from backup JSON
- Validates backup integrity
- Requires confirmation before overwrite

## Testing Results

### Detection Results

**Before Fix:**
- **Total issues found:** 103 across 4 reports
- **Oct 21st report:** 38 machines with wrong start times
- **Oct 28th report:** 2 machines with extremely old start times (2024)
- **Oct 31st report:** 17 machines with wrong end times (showing Nov 3rd instead of Oct 31st) ✅
- **Nov 3rd report:** 40 machines with wrong end times (showing Nov 1st instead of Nov 2nd) ✅

### Test Mode Results

```
Issues before fix: 103
Issues after fix:  0
Issues resolved:   103

✅ All issues would be resolved by applying fixes!
```

**Verification:** Script successfully:
1. Detected all issues the user reported (Oct 31st and Nov 3rd)
2. Simulated fixes for all 103 issues
3. Confirmed 0 issues would remain after fix

## Usage Workflow

### Recommended Testing Workflow

```bash
# Step 1: Create backup
node scripts/detect-and-fix-sas-times.js --mode=backup

# Step 2: Detect current issues
node scripts/detect-and-fix-sas-times.js --mode=detect

# Step 3: Test fixes (no database writes)
node scripts/detect-and-fix-sas-times.js --mode=test

# Step 4: Apply fixes (requires confirmation)
node scripts/detect-and-fix-sas-times.js --mode=fix

# Step 5: Verify all issues resolved
node scripts/detect-and-fix-sas-times.js --mode=detect

# If needed: Restore from backup
node scripts/detect-and-fix-sas-times.js --mode=restore --backup-dir=./backups/sas-times-backup-2025-11-07T...
```

## Files Created/Modified

### Created
1. `scripts/detect-and-fix-sas-times.js` - Main detection and fix script (547 lines)
2. `SAS_TIMES_FIX_IMPLEMENTATION.md` - This documentation

### Modified
1. `app/api/collections/route.ts` - Added timestamp change detection and SAS recalculation
2. `scripts/README.md` - Added documentation for new script

## Validation

### Type Check
```
✅ tsc --noEmit - PASSED
```

### Lint
```
✅ ESLint - No warnings or errors
```

### Build
```
✅ next build - Compiled successfully
```

## Impact

### Immediate Impact
- Script ready to fix 103 existing SAS time issues
- Safe testing workflow with backup/restore
- No data loss risk

### Long-term Impact
- Backend now automatically recalculates SAS times when timestamps change
- Future "Update All Dates" operations will work correctly
- Prevents cascading SAS time errors

## Next Steps for User

1. **Backup first:** Run `node scripts/detect-and-fix-sas-times.js --mode=backup`
2. **Review issues:** Run `node scripts/detect-and-fix-sas-times.js --mode=detect`
3. **Test fix:** Run `node scripts/detect-and-fix-sas-times.js --mode=test`
4. **When ready to fix:** Run `node scripts/detect-and-fix-sas-times.js --mode=fix`
5. **Verify:** Run `node scripts/detect-and-fix-sas-times.js --mode=detect` (should show 0 issues)

## Technical Notes

### Detection Logic

The script validates that:
```javascript
sasStartTime === previousCollection.timestamp
sasEndTime === currentCollection.timestamp
sasStartTime < sasEndTime
```

### Fix Logic

For each issue:
```javascript
1. Find correct previous collection
2. Calculate: sasStartTime = previous.timestamp
3. Calculate: sasEndTime = current.timestamp
4. Recalculate SAS metrics from meters collection
5. Update collection.sasMeters
6. Update machine.collectionMetersHistory
```

### Why Chronological Processing

Processing from oldest to newest ensures:
- Each fix has correct context from previous collections
- No cascading errors introduced during fix process
- Data chain integrity maintained

## Success Criteria

✅ Script detects Oct 31st issues (17 machines)  
✅ Script detects Nov 3rd issues (40 machines)  
✅ Test mode shows 0 issues after fix  
✅ Backend prevents future issues  
✅ Type check passes  
✅ Lint passes  
✅ Build succeeds  

All criteria met! Ready for user testing.

