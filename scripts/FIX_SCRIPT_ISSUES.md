# 🐛 Fix Script Issues - Analysis and Solution

## Problem Identified

The `/api/collection-reports/fix-report` endpoint is failing with:
```
❌ Error: Machine not found: undefined
Machine ID: undefined (type: undefined)
```

---

## Root Cause

### Issue 1: Missing `machineId` Field

Many collections have `machineId: undefined` but the actual machine ID is stored in `sasMeters.machine`:

```javascript
// Collection with undefined machineId:
{
  "_id": "4f334a55ef097a68b3590270",
  "machineId": undefined,  // ❌ This is undefined!
  "sasMeters": {
    "machine": "997473d0ef4ea799e840cd8e",  // ✅ Actual machine ID is here!
    ...
  },
  ...
}
```

### Issue 2: Missing SAS Times

Many collections are missing `sasStartTime` and `sasEndTime`:

```javascript
{
  "sasMeters": {
    "machine": "997473d0ef4ea799e840cd8e",
    "drop": 437600,
    "totalCancelledCredits": 373416,
    // ❌ No sasStartTime!
    // ❌ No sasEndTime!
  }
}
```

---

## Required Fixes

### 1. Get Machine ID with Fallback

**Current Code (BROKEN):**
```typescript
const machine = await Machine.findById(collection.machineId);
// Fails when machineId is undefined!
```

**Fixed Code:**
```typescript
// Try multiple sources for machine ID
const machineId = collection.machineId || 
                  collection.sasMeters?.machine || 
                  undefined;

if (!machineId) {
  console.warn(`   ⚠️ Collection ${collection._id} has no machineId - skipping`);
  return;
}

const machine = await Machine.findOne({ _id: machineId });
```

### 2. Calculate SAS Times from Previous Collection

**Logic (as user described):**
1. Find previous collection for same machine (by machineId or machineCustomName)
2. Use previous collection's timestamp as `sasStartTime`
3. Use current collection's timestamp as `sasEndTime`
4. If no previous collection exists, use (current timestamp - 24 hours)

**Current Code:**
```typescript
const previousCollection = allCollections.filter(
  c => c.machineId === collection.machineId &&  // ❌ Fails if machineId undefined!
       ...
)[0];

const expectedSasStartTime = previousCollection
  ? new Date(previousCollection.timestamp)
  : new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000);
```

**Fixed Code:**
```typescript
// Get actual machine ID (with fallback)
const actualMachineId = collection.machineId || 
                        collection.sasMeters?.machine;
const actualMachineCustomName = collection.machineCustomName;

// Find previous collection by machineId OR machineCustomName
const previousCollection = allCollections.filter(c => {
  const cMachineId = c.machineId || c.sasMeters?.machine;
  const cCustomName = c.machineCustomName;
  
  // Match by ID or custom name
  const matchesMachine = (actualMachineId && cMachineId === actualMachineId) ||
                         (actualMachineCustomName && cCustomName === actualMachineCustomName);
  
  // Must be before current collection
  const timestamp = new Date((c.timestamp || c.collectionTime) as string | Date);
  const isBefore = timestamp < currentTimestamp;
  
  // Must be completed
  const isValid = c.isCompleted === true && 
                  c.locationReportId && 
                  c.locationReportId.trim() !== '' &&
                  c._id.toString() !== collection._id.toString();
  
  return matchesMachine && isBefore && isValid;
})
.sort((a, b) => {
  const aTime = new Date((a.timestamp || a.collectionTime) as string | Date).getTime();
  const bTime = new Date((b.timestamp || b.collectionTime) as string | Date).getTime();
  return bTime - aTime; // Most recent first
})[0];

const expectedSasStartTime = previousCollection
  ? new Date((previousCollection.timestamp || previousCollection.collectionTime) as string | Date)
  : new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000);

const expectedSasEndTime = currentTimestamp;
```

### 3. Better Error Messages

**Current Code:**
```typescript
if (!machine) {
  throw new Error(`Machine not found: ${collection.machineId}`);
}
```

**Fixed Code:**
```typescript
if (!machineId) {
  console.warn(
    `   ⚠️ Collection ${collection._id} missing machineId field.\n` +
    `      machineCustomName: ${collection.machineCustomName || 'N/A'}\n` +
    `      sasMeters.machine: ${collection.sasMeters?.machine || 'N/A'}\n` +
    `      Unable to process - skipping this collection.`
  );
  fixResults.errors.push({
    collectionId: collection._id,
    error: 'Missing machineId - cannot identify machine',
    details: {
      machineCustomName: collection.machineCustomName,
      sasMeters Machine: collection.sasMeters?.machine,
    },
  });
  return;
}

if (!machine) {
  console.warn(
    `   ⚠️ Machine ${machineId} not found in database.\n` +
    `      Collection: ${collection._id}\n` +
    `      machineCustomName: ${collection.machineCustomName || 'N/A'}\n` +
    `      This might be a deleted or migrated machine - skipping.`
  );
  fixResults.errors.push({
    collectionId: collection._id,
    error: 'Machine not found in database',
    machineId: machineId,
  });
  return;
}
```

---

## Complete Fix Implementation

### File: `app/api/collection-reports/fix-report/route.ts`

#### Change 1: Add helper function to get machine ID

```typescript
// Add this helper function at the top of the file (after imports)

/**
 * Safely get machine ID from collection, checking multiple sources
 */
function getMachineIdFromCollection(collection: CollectionData): string | undefined {
  // Try collection.machineId first
  if (collection.machineId) {
    return collection.machineId;
  }
  
  // Fall back to sasMeters.machine
  if (collection.sasMeters?.machine) {
    return collection.sasMeters.machine;
  }
  
  // No machine ID found
  return undefined;
}
```

#### Change 2: Update fixSasTimesIssues function (line ~311)

```typescript
async function fixSasTimesIssues(
  collection: CollectionData,
  fixResults: FixResults,
  allCollections: CollectionData[]
) {
  try {
    // 🔧 FIX: Get machine ID with fallback
    const actualMachineId = getMachineIdFromCollection(collection);
    const actualMachineCustomName = collection.machineCustomName;
    
    if (!actualMachineId) {
      console.warn(
        `   ⚠️ Collection ${collection._id} has no machine ID (machineId or sasMeters.machine).\n` +
        `      machineCustomName: ${actualMachineCustomName || 'N/A'}\n` +
        `      Unable to calculate SAS times - skipping this collection.`
      );
      fixResults.errors.push({
        collectionId: collection._id,
        error: 'Missing machine identifier - cannot calculate SAS times',
        details: { machineCustomName: actualMachineCustomName },
      });
      return;
    }
    
    let needsUpdate = false;
    const updateData: Record<string, unknown> = {};

    // Get expected SAS times by finding the previous collection
    const currentTimestamp = new Date(
      (collection.timestamp || collection.collectionTime) as string | Date
    );

    // 🔧 FIX: Find previous collection by machineId OR machineCustomName
    const previousCollection = allCollections
      .filter(c => {
        const cMachineId = getMachineIdFromCollection(c);
        const cCustomName = c.machineCustomName;
        
        // Match by machine ID or custom name
        const matchesMachine = 
          (actualMachineId && cMachineId === actualMachineId) ||
          (actualMachineCustomName && cCustomName === actualMachineCustomName);
        
        // Must be before current collection
        const timestamp = new Date((c.timestamp || c.collectionTime) as string | Date);
        const isBefore = timestamp < currentTimestamp;
        
        // Must be valid collection
        const isValid = 
          c.isCompleted === true &&
          c.locationReportId &&
          c.locationReportId.trim() !== '' &&
          c._id.toString() !== collection._id.toString();
        
        return matchesMachine && isBefore && isValid;
      })
      .sort((a, b) => {
        const aTime = new Date((a.timestamp || a.collectionTime) as string | Date).getTime();
        const bTime = new Date((b.timestamp || b.collectionTime) as string | Date).getTime();
        return bTime - aTime; // descending (most recent first)
      })[0];

    // 🔧 FIX: Better SAS time calculation
    const expectedSasStartTime = previousCollection
      ? new Date((previousCollection.timestamp || previousCollection.collectionTime) as string | Date)
      : new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000);

    const expectedSasEndTime = currentTimestamp;
    
    // 🔧 FIX: Better logging for missing previous collection
    if (!previousCollection) {
      console.warn(
        `   ℹ️ No previous collection found for machine ${actualMachineId} (${actualMachineCustomName}).\n` +
        `      Using default SAS start time: 24 hours before collection time.`
      );
    }

    // Rest of the function continues as before...
    // Check if SAS times need updating, etc.
    
    // ... existing code ...
    
    if (needsUpdate) {
      // 🔧 FIX: Use actualMachineId instead of collection.machineId
      const sasMetrics = await calculateSasMetrics(
        actualMachineId,  // Changed from collection.machineId
        expectedSasStartTime,
        expectedSasEndTime
      );

      updateData.sasMeters = {
        ...collection.sasMeters,
        drop: sasMetrics.drop,
        totalCancelledCredits: sasMetrics.totalCancelledCredits,
        gross: sasMetrics.gross,
        gamesPlayed: sasMetrics.gamesPlayed,
        jackpot: sasMetrics.jackpot,
        sasStartTime: expectedSasStartTime.toISOString(),
        sasEndTime: expectedSasEndTime.toISOString(),
        machine: actualMachineId,  // Changed from collection.machineId
      };

      await Collections.findByIdAndUpdate(collection._id, { $set: updateData });
      console.warn(`   ✅ Fixed SAS times for collection ${collection._id}`);
      fixResults.issuesFixed.sasTimesFixed++;
    } else {
      console.warn(`   ℹ️ SAS times already correct for collection ${collection._id}`);
    }
  } catch (error) {
    console.error(
      `   ❌ Error fixing SAS times for collection ${collection._id}:`,
      error
    );
    fixResults.errors.push({
      collectionId: collection._id,
      phase: 'SAS Times',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

#### Change 3: Update all other functions that use machineId

Search for all instances of `collection.machineId` and replace with:
```typescript
const machineId = getMachineIdFromCollection(collection);
```

---

## Summary of Changes Needed

### Files to Modify:
- `app/api/collection-reports/fix-report/route.ts`

### Changes Required:
1. ✅ Add `getMachineIdFromCollection()` helper function
2. ✅ Update `fixSasTimesIssues()` to use helper and handle undefined machineId
3. ✅ Update `fixPrevMetersIssues()` to use helper
4. ✅ Update `fixMachineCollectionMeters()` to use helper  
5. ✅ Update `fixMachineHistoryIssues()` to use helper
6. ✅ Update `fixMachineHistoryEntryIssues()` to use helper
7. ✅ Better error messages (not "undefined", but explain what's missing)
8. ✅ Handle previous collection matching by both machineId AND machineCustomName

---

## Expected Behavior After Fix

**Before:**
```
❌ Error fixing SAS times for collection: Machine not found: undefined
Machine ID: undefined (type: undefined)
```

**After:**
```
ℹ️ Processing collection bc2f3914a5368f7db38b3628
   Machine ID: 997473d0ef4ea799e840cd8e (from sasMeters.machine)
   machineCustomName: GM03054
   ℹ️ No previous collection found - using 24h default window
   ✅ Fixed missing SAS times for collection bc2f3914a5368f7db38b3628
```

---

## Implementation Status

**Status:** Ready to implement  
**Complexity:** Medium (20-30 changes across one file)  
**Risk:** Low (backward compatible - handles both old and new data formats)  
**Testing:** Should test with collections that have:
- ✅ machineId defined
- ✅ machineId undefined, sasMeters.machine defined
- ✅ Both undefined (should skip gracefully)
- ✅ Previous collection exists
- ✅ No previous collection (first collection)

Would you like me to implement these fixes to the fix-report route?

