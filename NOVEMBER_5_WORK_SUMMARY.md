# November 5, 2025 - Work Summary

## 1. Collection Report Variation Investigation

### Issue Discovered
- User reported **-104,535 variation** on collection report page
- Negative variation indicates SAS Gross is higher than Movement Gross

### Documentation Created
Created comprehensive troubleshooting guide: `Documentation/variation-troubleshooting.md`

**Key Concepts:**
- **Variation Formula:** `Variation = Movement Gross - SAS Gross`
- **Movement Gross:** Calculated from physical meter readings (`metersIn - prevIn` minus `metersOut - prevOut`)
- **SAS Gross:** Calculated from SAS system data (`drop - totalCancelledCredits`) over SAS time window

**Common Causes of Negative Variation:**
1. SAS time window too wide (includes data from before previous collection)
2. Incorrect `prevIn`/`prevOut` values
3. RAM clear not properly handled

**How to Fix:**
1. Use "Sync Meters" feature (recalculates SAS time windows)
2. Use "Fix Report" feature (comprehensive fix for all issues)
3. Manual investigation if automated fixes don't work

**How Variation Becomes Zero:**
- Correct SAS time windows for each collection
- Accurate meter readings at collection time
- Proper RAM clear handling
- Maintained collection history chain

---

## 2. Database Cleanup - Accidental Migration Fix

### Problem
- User accidentally ran migration script on local Dueces server
- Non-Dueces data from production was imported into local Dueces database
- Need to remove all non-Dueces data while preserving Dueces data

### Dueces Location ID
```
_id: "b393ebf50933d1688c3fe2a7"
name: "Dueces"
```

### Solution Approach

**Phase 1: Backup (Already Completed)**
- Script: `scripts/backup-dueces-data.js`
- Backed up all Dueces-related data to `backup/dueces-backup-[timestamp]/`

**Phase 2: Cleanup - Memory Optimization Issue**

**First Attempt:**
- Script: `scripts/comprehensive-non-dueces-cleanup.js`
- **Failed:** JavaScript heap out of memory error
- **Cause:** Tried to load 704,392 meter records into memory at once
- **Error Log:**
  ```
  FATAL ERROR: Ineffective mark-compacts near heap limit 
  Allocation failed - JavaScript heap out of memory
  ```

**Optimized Solution:**
- Script: `scripts/comprehensive-non-dueces-cleanup-optimized.js`
- **Success:** Uses database query counts instead of loading all data
- **Method:** Query-based filtering with `$nin` (not in) operators

### Collections to Clean

| Collection | Total | Keep (Dueces) | Delete | Notes |
|-----------|-------|---------------|--------|-------|
| collections | 25,259 | 329 | 24,930 | All orphaned (machines deleted) |
| meters | 704,392 | 41,708 | 662,684 | Based on location/machine |
| members | 169 | 0 | 169 | Based on gamingLocation |
| machinesessions | 660 | 0 | 660 | Based on machineId |
| machineevents | 7,283,249 | 0 | 7,283,249 | Based on machineId |
| acceptedbills | 382,383 | 0 | 382,383 | Based on machineId |
| movementrequests | 12 | 0 | 12 | Based on machineId |
| **TOTAL** | **8,454,124** | **42,037** | **8,412,087** | 99.5% cleanup |

### Relationship-Based Deletion Logic

**Direct Location Field:**
```javascript
// Members have gamingLocation field directly
members.gamingLocation === DUECES_LOCATION_ID
```

**Machine → Location Relationship:**
```javascript
// Collections, meters, events, etc. check through machine
1. Find machine by machineId
2. Check machine.gamingLocation === DUECES_LOCATION_ID
3. If machine doesn't exist → orphaned → delete
4. If machine exists but wrong location → delete
```

**Dual-Field Check (Meters):**
```javascript
// Meters have both machine and location fields
meters.location === DUECES_LOCATION_ID OR
meters.machine IN (duecesMachineIds)
```

### Execution Status
✅ **Dry-run completed successfully**
⏳ **Awaiting user confirmation to execute with `--execute` flag**

### Commands

**Dry Run (already executed):**
```bash
node scripts/comprehensive-non-dueces-cleanup-optimized.js
```

**Execute Cleanup (not yet run):**
```bash
node scripts/comprehensive-non-dueces-cleanup-optimized.js --execute
```

---

## 3. Technical Notes

### Memory Optimization Lesson
- **Don't load large datasets into memory**
- **Use database aggregation queries**
- **Use `countDocuments()` instead of `find().toArray()`**
- **Use `$in` / `$nin` operators for bulk operations**
- **Process in batches if needed**

### MongoDB Query Patterns Used
```javascript
// Count-based analysis (efficient)
await collection.countDocuments({ field: value })

// Set-based deletion (efficient)
await collection.deleteMany({ 
  machineId: { $nin: duecesMachineIdsArray } 
})

// OR conditions for dual-field checks
await collection.deleteMany({
  $and: [
    { location: { $ne: DUECES_LOCATION_ID } },
    { machine: { $nin: duecesMachineIdsArray } }
  ]
})
```

---

## 4. Files Created/Modified

### New Files
- `Documentation/variation-troubleshooting.md` - Comprehensive variation troubleshooting guide
- `scripts/comprehensive-non-dueces-cleanup.js` - Initial cleanup script (memory issues)
- `scripts/comprehensive-non-dueces-cleanup-optimized.js` - Optimized cleanup script (working)
- `scripts/cleanup-orphaned-non-dueces-collections.js` - Collections-only cleanup
- `NOVEMBER_5_WORK_SUMMARY.md` - This file

### Modified Files
- `Documentation/frontend/machine-details.md` - Updated with collection history issue detection system
  - Added "Collection History Issue Detection" section
  - Updated version to 2.2.0
  - Added "issue detection" and "data integrity" to quick search guide
  - Documented issue types: History Mismatch, Orphaned History, Missing History
  - Explained detection process and visual presentation
  - Added comparison table with Collection Report Details
  
- `Documentation/frontend/collection-report-details.md` - Updated with comparison to Cabinet Details
  - Added version 2.1.0
  - Updated last modified date
  - Added overview to Issue Detection section
  - Added comprehensive comparison table between report-level and machine-level detection
  - Documented when to use each system

---

## 5. Next Steps

### For Variation Issue:
1. User should try "Sync Meters" on the affected collection report
2. If that doesn't fix it, try "Fix Report"
3. Check `Documentation/variation-troubleshooting.md` for detailed guidance
4. Monitor future collections to ensure variation stays near 0

### For Database Cleanup:
1. ✅ Backup completed (already done)
2. ✅ Dry-run analysis completed (already done)
3. ⏳ **User needs to confirm and run with `--execute` flag**
4. After execution, verify Dueces data is intact
5. Verify collection reports still work correctly

---

## 6. Key Learnings

1. **Variation is a critical metric** for data integrity in collection reports
2. **SAS time windows must be accurate** to avoid large variations
3. **Memory optimization is crucial** when dealing with millions of records
4. **Database relationships must be understood** before cleanup operations
5. **Always backup before destructive operations**
6. **Use query-based counts** instead of loading data into memory

---

## 7. User Questions Answered

**Q: "How is variation calculated?"**
A: `Variation = Movement Gross - SAS Gross`
- Movement Gross from physical meter readings
- SAS Gross from SAS system data over time window
- See `Documentation/variation-troubleshooting.md` for details

**Q: "How can variation become 0 over time?"**
A: By ensuring:
- Correct SAS time windows
- Accurate meter readings
- Proper RAM clear handling
- Maintained collection history

**Q: "What do these last few logs mean?" (heap out of memory)**
A: Node.js ran out of memory trying to load 704K records at once
- Fixed with optimized script using query counts
- Optimized version completed successfully

---

## 8. Database Schema References

### Collections Checked
- `collections` - Collection records (machineId → machine.gamingLocation)
- `meters` - Meter readings (machine + location fields)
- `sashourly` - SAS hourly data (machine field)
- `members` - Member/player data (gamingLocation field)
- `machinesessions` - Machine sessions (machineId → machine.gamingLocation)
- `machineevents` - Machine events (machineId → machine.gamingLocation)
- `acceptedbills` - Accepted bills (machineId → machine.gamingLocation)
- `movementrequests` - Movement requests (machineId → machine.gamingLocation)

### Key Fields
- `machines.gamingLocation` - Links machine to location
- `gaminglocations._id` - Location identifier (Dueces: "b393ebf50933d1688c3fe2a7")
- `collections.machineId` - Links collection to machine
- `members.gamingLocation` - Direct location link for members
- `meters.machine` and `meters.location` - Dual location tracking

---

## Summary

Today's work focused on three critical areas:

1. **Collection Report Variation** - Created comprehensive troubleshooting guide to help understand and fix variation discrepancies
2. **Database Cleanup** - Created optimized script to remove accidental migration data while preserving Dueces data
3. **Documentation Updates** - Updated frontend documentation to reflect Collection History Issue Detection improvements

All issues have been documented and tooled, with the cleanup ready for execution pending user confirmation. Documentation is now fully synchronized with the latest features.

