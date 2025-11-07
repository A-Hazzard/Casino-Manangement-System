# Database Maintenance & Test Scripts

This directory contains maintenance, cleanup, and testing scripts for the Evolution One Casino Management System database.

## Available Scripts

### Diagnostic & Fix Scripts

#### detect-and-fix-sas-times.js

**Purpose:** Detects and fixes SAS time issues in collection reports caused by bulk timestamp updates or incorrect SAS time calculations.

**Problem Solved:** When using the "Update All Dates" feature in collection modals, SAS times (sasStartTime/sasEndTime) were not being recalculated, leading to:
- Incorrect SAS windows (e.g., Oct 30th → Nov 3rd instead of Oct 30th → Oct 31st)
- Wrong SAS metrics (drop, cancelled credits, gross)
- Cascading errors in subsequent collections

**What it does:**

1. **Backup Mode:** Exports all collections and reports to timestamped JSON backup files
2. **Detect Mode:** Scans all reports chronologically and identifies SAS time issues:
   - Wrong sasStartTime (doesn't match previous collection's timestamp)
   - Wrong sasEndTime (doesn't match current collection's timestamp)  
   - Inverted times (start >= end)
   - Extremely long spans (> 30 days with time mismatches)
3. **Test Mode:** Simulates fixes without writing to database, verifies 0 issues after fix
4. **Fix Mode:** Applies fixes to database chronologically from oldest to newest
5. **Restore Mode:** Restores data from backup if needed

**Safety Features:**

- Multiple modes for safe testing before applying fixes
- Chronological processing (oldest first) to maintain data integrity
- Backup and restore capabilities
- Detailed reporting of all changes
- Confirmation prompts before destructive operations

**Usage:**

```bash
# Step 1: Create backup (ALWAYS do this first)
node scripts/detect-and-fix-sas-times.js --mode=backup

# Step 2: Detect issues
node scripts/detect-and-fix-sas-times.js --mode=detect

# Step 3: Test fixes (dry-run, no database writes)
node scripts/detect-and-fix-sas-times.js --mode=test

# Step 4: Apply fixes (requires confirmation)
node scripts/detect-and-fix-sas-times.js --mode=fix

# Step 5: Verify (should show 0 issues)
node scripts/detect-and-fix-sas-times.js --mode=detect

# If needed: Restore from backup
node scripts/detect-and-fix-sas-times.js --mode=restore --backup-dir=./backups/sas-times-backup-2025-11-07T...
```

**Prerequisites:**

- `MONGO_URI` must be set in `.env` file
- Node.js and required dependencies installed
- **CRITICAL:** Always backup before running `--mode=fix`

**Output Examples:**

**Detect Mode:**
```
═══════════════════════════════════════════════════════════
                    DETECTION SUMMARY                      
═══════════════════════════════════════════════════════════

❌ Found issues in 4 reports

📊 Report: Dueces - 2025-10-31 12:00:35
   Machines with issues: 17
   Total issues: 17

   🔧 Machine: GMID1
      Current SAS: 2025-10-30 12:00:29 → 2025-11-03 12:00:35
      Expected SAS: 2025-10-30 12:00:29 → 2025-10-31 12:00:35
      ❌ wrong_end_time: SAS end time doesn't match collection timestamp
```

**Test Mode:**
```
Issues before fix: 103
Issues after fix:  0
Issues resolved:   103

✅ All issues would be resolved by applying fixes!
```

**Related Fix:** The `PATCH /api/collections` endpoint has been updated to automatically recalculate SAS times when timestamps are changed, preventing this issue in future bulk updates.

---

### Cleanup Scripts

#### cleanup-old-collections.js

**Purpose:** Deletes all collections, collection reports, and collection history from machines that are older than January 1, 2025.

**What it does:**

1. Deletes all `collections` documents with `timestamp < 2025-01-01`
2. Deletes all `collectionReport` documents with `timestamp < 2025-01-01`
3. Removes all `collectionMetersHistory` entries from machines with `timestamp < 2025-01-01`

**Safety Features:**

- **Dry-run mode by default** - Preview changes before executing
- Detailed sample output showing what will be deleted
- Must pass `--execute` flag to actually delete data

**Usage:**

```bash
# Dry run (preview only, no deletions)
pnpm cleanup:old-collections

# Or run directly with Node.js
node scripts/cleanup-old-collections.js

# Execute actual deletion
node scripts/cleanup-old-collections.js --execute
```

**Prerequisites:**

- Ensure `MONGO_URI` is set in your `.env` or `.env.local` file
- **CRITICAL:** Always backup your database before running this script with `--execute`
- Recommended: Always run in dry-run mode first to preview changes

**Output:**
The script provides detailed console output including:

- Number of collections deleted
- Number of collection reports deleted
- Number of machines updated
- Number of history entries removed
- Summary of any errors encountered

**Example Output (Dry Run):**

```
✅ Connected to MongoDB

================================================================================
🔍 DRY RUN MODE
================================================================================
📅 Cutoff date: 2025-01-01T00:00:00.000Z

⚠️  DRY RUN MODE: No data will be deleted
   Run with --execute flag to actually delete data
   WARNING: Always backup your database before running with --execute

🔍 Step 1: Finding collections older than 2025...
   Found 1523 collections to delete
   Sample collections:
      - GM12345 | 2024-12-15
      - GM12346 | 2024-11-20
      - GM12347 | 2024-10-05
      - GM12348 | 2024-09-12
      - GM12349 | 2024-08-28
      ... and 1518 more

   Would delete 1523 collections

🔍 Step 2: Finding collection reports older than 2025...
   Found 87 collection reports to delete
   Sample reports:
      - Main Casino | 2024-12-15 | Report ID: abc-123
      - Downtown Bar | 2024-11-20 | Report ID: def-456
      - Airport Lounge | 2024-10-05 | Report ID: ghi-789
      - Beach Club | 2024-09-12 | Report ID: jkl-012
      - City Center | 2024-08-28 | Report ID: mno-345
      ... and 82 more

   Would delete 87 collection reports

🔍 Step 3: Finding machines with old collection history...
   Found 245 machines with old history entries
   Found 1523 history entries to remove across 245 machines
   Sample machines:
      - GM12345 | 6 old entries (of 12 total)
      - GM12346 | 8 old entries (of 15 total)
      - GM12347 | 5 old entries (of 10 total)
      - GM12348 | 7 old entries (of 14 total)
      - GM12349 | 4 old entries (of 9 total)
      ... and 240 more machines

   Would remove 1523 history entries from 245 machines

================================================================================
📊 CLEANUP SUMMARY
================================================================================
Collections to delete:        1523
Collection reports to delete: 87
Machines to update:           245
History entries to remove:    1523
================================================================================

🎉 Would clean up 3133 total items

To actually delete this data, run:
   node scripts/cleanup-old-collections.js --execute

✅ MongoDB connection closed
```

**Example Output (Execute Mode):**

```
✅ Connected to MongoDB

================================================================================
⚠️  EXECUTE MODE
================================================================================
📅 Cutoff date: 2025-01-01T00:00:00.000Z

⚠️⚠️⚠️  EXECUTE MODE: Data WILL BE DELETED ⚠️⚠️⚠️
   This operation is irreversible!

🔍 Step 1: Finding collections older than 2025...
   Found 1523 collections to delete
   Sample collections:
      - GM12345 | 2024-12-15
      ... (sample list)

   ✅ Deleted 1523 collections

🔍 Step 2: Finding collection reports older than 2025...
   Found 87 collection reports to delete
   Sample reports:
      - Main Casino | 2024-12-15 | Report ID: abc-123
      ... (sample list)

   ✅ Deleted 87 collection reports

🔍 Step 3: Finding machines with old collection history...
   Found 245 machines with old history entries
   Found 1523 history entries to remove across 245 machines
   Sample machines:
      - GM12345 | 6 old entries (of 12 total)
      ... (sample list)

   ✅ Removed 1523 history entries from 245 machines

================================================================================
📊 CLEANUP SUMMARY
================================================================================
Collections deleted:        1523
Collection reports deleted: 87
Machines updated:           245
History entries removed:    1523
================================================================================

✅ Cleanup completed successfully!
🎉 Total items cleaned up: 3133

✅ MongoDB connection closed
```

**Safety Features:**

- Warning message before execution
- Detailed logging of all operations
- Error handling and reporting
- Summary report with counts
- Non-zero exit code on errors

**When to Run:**

- Database optimization and cleanup
- Archiving old data
- Performance improvements
- Storage management

**Documentation References:**

- [Backend Collection Report Guide](../Documentation/backend/collection-report.md)
- [Database Models](../Documentation/database-models.md)
- [Engineering Guidelines](../Documentation/ENGINEERING_GUIDELINES.md)

---

### Test Scripts

#### comprehensive-fix-test.js ⭐ **COMPREHENSIVE END-TO-END TEST** ✅ **ALL TESTS PASSING**

**Purpose:** Comprehensive end-to-end test of the fix-report API with multiple types of data corruptions. **This test confirms all 7 corruption types are successfully fixed by the fix-report API!**

**What it does:**

1. Creates a fake test machine with intentionally corrupted collections and history
2. Tests the fix-report API via HTTP call
3. Checks issues before fix (should detect 6 issues)
4. Runs fix-report API
5. Checks issues after fix (should detect 0 issues ✅)
6. Performs immediate post-fix machine history verification
7. Performs final database-level verification
8. Automatic cleanup of test data

**Corruptions tested (ALL RESOLVED ✅):**

- ✅ Duplicate `locationReportId` in history (same ID, different timestamps) - **FIXED!**
- ✅ Duplicate dates in history (same date, different IDs) - **FIXED!**
- ✅ Wrong `prevIn`/`prevOut` in collection documents - **FIXED!**
- ✅ Wrong `prevMetersIn`/`prevMetersOut` in history entries - **FIXED!**
- ✅ Orphaned history entries (no collection exists) - **FIXED!**
- ✅ History entries with no collection report - **FIXED!**
- ✅ Mismatched meters between collection and history - **FIXED!**
- ✅ **Future value corruption** (Oct 21 has prevMeters from Oct 29) - **FIXED!** ← TTRHP022 scenario

**Test Results:**

- Before fix: **6 total issues detected** (including future value corruption)
- After fix: **0 total issues** ✅
- History entries: **7 → 4** (duplicates/orphaned removed)
- Machine issues: **4 → 0** (all resolved, including future value)
- machineHistoryFixed: **3** (duplicates + orphaned + future value sync)
- Success rate: **100%** 🎉

**Usage:**

```bash
# Preview what will be created (dry-run mode)
pnpm test:comprehensive

# Actually create test data and run tests (RECOMMENDED)
pnpm test:comprehensive:execute

# Or with manual cleanup control
node scripts/comprehensive-fix-test.js --execute --no-cleanup

# Revert/cleanup test data
pnpm test:comprehensive:revert
```

**Prerequisites:**

- Ensure `MONGO_URI` is set in your `.env` or `.env.local` file
- API server must be running on http://localhost:3000
- Requires `axios` package (already in dependencies)

**Test Flow:**

1. **Generate Test Data**: Creates machine, collections, collection reports, and corrupted history
2. **Insert Data**: Adds test data to database and creates backup
3. **Check Issues (Before)**: Calls `check-all-issues` API to see detected issues
4. **Run Fix**: Calls `fix-report` API with machine ID
5. **Check Issues (After)**: Calls `check-all-issues` API to verify resolution
6. **Verify Database**: Manually checks database for remaining issues
7. **Cleanup**: Removes all test data (unless `--no-cleanup` is specified)

**Test Machine:**

- Serial Number: `TEST-MACHINE-001`
- Custom Name: `Test Machine 001`
- Machine ID: Generated ObjectId
- 4 collections (Oct 21, 28, 29, 30)
- 7 history entries (including corrupted ones)

**What to Look For:**

After running the fix:

- ✅ No duplicate `locationReportId`s in history
- ✅ No duplicate dates in history
- ✅ Oct 30 collection has correct `prevIn`/`prevOut` (from Oct 29)
- ✅ All history entries match their collection documents
- ✅ No orphaned history entries
- ✅ `check-all-issues` API returns no issues

**Safety Features:**

- Dry-run mode by default (preview only)
- Creates backup file before inserting data
- Automatic cleanup after test completes
- Revert option to manually clean up
- Uses isolated test machine ID

**Example Output:**

```
🧪 ========================================
   COMPREHENSIVE FIX-REPORT API TEST
=========================================

📝 STEP 1: Generating test data...

Generated test data:
  - Machine ID: 67290abc123def456789
  - Collections: 4
  - History entries: 7
  - Collection reports: 4

Intentional corruptions:
  ✗ Duplicate locationReportId in history
  ✗ Duplicate date in history
  ✗ Wrong prevIn/prevOut in Oct 30 collection
  ✗ Wrong prevMetersIn/prevMetersOut in history
  ✗ Orphaned history entry
  ✗ No collection report for duplicate entry

💾 STEP 2: Inserting test data...
✅ Backup created: backup-comprehensive-test-1699123456789.json
✅ Machine inserted
✅ Collections inserted
✅ Collection reports inserted

🔍 STEP 3: Checking issues before fix...
✅ check-all-issues API Response:
{
  "hasMachineHistoryIssues": true,
  "reportIssues": {
    "report-oct30-123": {
      "hasPrevMetersIssues": true,
      "machines": ["Test Machine 001"]
    }
  }
}

🔧 STEP 4: Running fix-report API...
✅ fix-report API Response:
{
  "success": true,
  "results": {
    "collectionsProcessed": 4,
    "issuesFixed": {
      "prevMetersFixed": 1,
      "historyEntriesFixed": 3,
      "machineHistoryFixed": 1
    }
  }
}

🔍 STEP 5: Checking issues after fix...
✅ check-all-issues API Response:
{
  "hasMachineHistoryIssues": false,
  "reportIssues": {}
}

✅ ALL ISSUES RESOLVED! Fix API working correctly.

🔍 STEP 6: Verifying data in database...
Machine history entries: 5
Collections: 4
Unique locationReportIds: 5
Duplicate locationReportIds: NO ✅

Oct 30 Collection prevIn/prevOut:
  Current: prevIn=444014, prevOut=360151.65
  Expected: prevIn=444014, prevOut=360151.65
  Status: ✅ CORRECT

🧹 STEP 7: Cleaning up test data...
✅ Test data removed from database
✅ Backup file deleted

✅ TEST COMPLETE!
```

---

#### test-collection-history-fix.js

**Purpose:** Test if the fix-report API properly syncs `collectionMetersHistory` with collection documents.

**What it does:**

1. Finds collections for test machine (AARON BOARD)
2. Backs up current state to `backup-aaron-test.json`
3. Modifies `collectionMetersHistory` with WRONG prevMetersIn/prevMetersOut values
4. Calls the fix-report API
5. Verifies history was updated to match collection document
6. Provides option to revert changes

**Usage:**

```bash
# Run the test
node scripts/test-collection-history-fix.js

# Revert changes to original state
node scripts/test-collection-history-fix.js --revert
```

**Prerequisites:**

- Ensure `MONGO_URI` is set in your `.env` or `.env.local` file
- Machine must have at least one completed collection
- API server must be running on http://localhost:32081

**Test Flow:**

```
1. Fetch machine and collections
2. Backup current state
3. Set history prevMetersIn/prevMetersOut to WRONG values (e.g., 347900/262500)
4. Call POST /api/collection-reports/fix-report with machineId
5. Verify history was updated to match collection (e.g., 0/0)
6. Report SUCCESS or FAILURE
```

**Example Output:**

```
🧪 TESTING COLLECTION HISTORY FIX
📋 Machine ID: 68f90c0c98e7920bc598e945 (AARON BOARD)

🔍 Step 1: Fetching machine document...
   ✅ Found machine: AARON BOARD
   Current collectionMetersHistory entries: 1

🔍 Step 2: Finding collections for this machine...
   Found 1 collections

🔍 Step 5: Verifying WRONG state before fix...
   State BEFORE fix:
   Collection: prevIn=0, prevOut=0
   History: prevMetersIn=347900, prevMetersOut=262500
   Match? ❌ NO (this is intentional for testing)

🔧 Step 6: Calling fix-report API...
   ✅ Fix API completed successfully

🔍 Step 7: Verifying fix worked...
   State AFTER fix:
   Collection: prevIn=0, prevOut=0
   History: prevMetersIn=0, prevMetersOut=0
   Match? ✅ YES - FIX WORKED!

📊 TEST SUMMARY
Before Fix:
  Collection: prevIn=0, prevOut=0
  History:    prevMetersIn=347900, prevMetersOut=262500
  Status: ❌ Mismatch

After Fix:
  Collection: prevIn=0, prevOut=0
  History:    prevMetersIn=0, prevMetersOut=0
  Status: ✅ Match - FIX WORKED!

🎉 SUCCESS! The fix properly synced collectionMetersHistory with collection document
```

**Safety:**

- Always creates backup before modifications
- Changes can be reverted with `--revert` flag
- Only modifies test machine (AARON BOARD)

#### verify-fix-via-api.js

**Purpose:** Verify collection history is displayed correctly via the cabinet details API endpoint.

**What it does:**

1. Calls GET `/api/cabinets/[machineId]`
2. Displays collection history from API response
3. Compares history with actual collection documents in database
4. Reports any mismatches

**Usage:**

```bash
# Verify fix worked
node scripts/verify-fix-via-api.js
```

**Prerequisites:**

- API server must be running on http://localhost:32081
- Ensure `MONGO_URI` is set in your `.env` or `.env.local` file

**Example Output:**

```
🔍 VERIFYING FIX VIA CABINET DETAILS API

🔍 Step 1: Fetching cabinet details...
   ✅ Found cabinet: AARON BOARD

🔍 Step 2: Checking collection history...
   Total history entries: 1

   Collection History Entries:
   ----------------------------------------------------------------------------
   Date                 | Meters In  | Meters Out | Prev In    | Prev Out
   ----------------------------------------------------------------------------
   2025-10-21           | 347982     | 261523.7   | 0          | 0
   ----------------------------------------------------------------------------

🔍 Step 3: Comparing with actual collection documents...
   Found 1 collections in database

📊 VERIFICATION RESULTS
✅ SUCCESS! All collection history entries match collection documents

   The fix-report API is working correctly!
   - All metersIn/metersOut values match
   - All prevMetersIn/prevMetersOut values match
```

**Use Cases:**

- Verify fix worked after running test-collection-history-fix.js
- Check if displayed values match database
- Validate API response format

## Creating New Scripts

When creating new database maintenance scripts:

1. **Follow TypeScript Discipline:**
   - Use proper types from `shared/types/` or `app/api/lib/types/`
   - No `any` types allowed
   - Comprehensive error handling

2. **Database Operations:**
   - Always use atomic operations
   - Implement proper error handling
   - Log all operations clearly
   - Provide detailed summary reports

3. **Safety:**
   - Add confirmation/warning messages
   - Test on staging database first
   - Document backup requirements
   - Handle edge cases properly

4. **Documentation:**
   - Add script description to this README
   - Document all parameters and options
   - Provide usage examples
   - Reference related documentation

5. **Package.json:**
   - Add npm/pnpm script for easy execution
   - Use clear, descriptive script names
   - Document any required environment variables

## Best Practices

1. **Always backup database before running cleanup scripts**
2. **Test scripts on staging environment first**
3. **Run during low-traffic periods**
4. **Monitor script output for errors**
5. **Document any manual interventions required**
6. **Keep detailed logs of script executions**

---

**Last Updated:** November 6, 2025  
**Author:** Aaron Hazzard - Senior Software Engineer
