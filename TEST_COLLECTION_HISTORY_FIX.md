# Testing Collection History Fix - Step-by-Step Guide

**Date:** November 6th, 2025  
**Author:** Aaron Hazzard - Senior Software Engineer

## Purpose

Test scripts to verify that the enhanced `fix-report` API properly syncs `collectionMetersHistory` entries with collection documents.

---

## Quick Start

### Option 1: Using pnpm (Recommended)

```bash
# Step 1: Run the test
pnpm test:history-fix

# Step 2: Verify via API
pnpm test:verify-fix

# Step 3: Revert if needed
pnpm test:history-fix:revert
```

### Option 2: Using Node directly

```bash
# Step 1: Run the test
node scripts/test-collection-history-fix.js

# Step 2: Verify via API
node scripts/verify-fix-via-api.js

# Step 3: Revert if needed
node scripts/test-collection-history-fix.js --revert
```

---

## What These Scripts Do

### test-collection-history-fix.js

**Purpose:** Creates a controlled test scenario to verify the fix works

**Process:**
1. ✅ Finds collections for AARON BOARD machine (ID: 68f90c0c98e7920bc598e945)
2. ✅ Backs up current state to `backup-aaron-test.json`
3. ✅ Intentionally creates WRONG prevMetersIn/prevMetersOut in history (e.g., 347900 instead of 0)
4. ✅ Calls POST `/api/collection-reports/fix-report` with machineId
5. ✅ Verifies history was corrected to match collection document
6. ✅ Reports SUCCESS or FAILURE with detailed comparison
7. ✅ Provides revert option to restore original state

**Why This Tests the Fix:**
- Creates a known-bad state (history doesn't match collection)
- Runs the exact same fix that users would run via "Fix History" button
- Verifies the fix corrected the mismatch
- Proves the locationReportId-based matching works

### verify-fix-via-api.js

**Purpose:** Verifies the fix by querying the cabinet details API

**Process:**
1. ✅ Calls GET `/api/cabinets/[machineId]` (same endpoint UI uses)
2. ✅ Displays collection history from API response
3. ✅ Queries MongoDB to get actual collection documents
4. ✅ Compares history values with collection values
5. ✅ Reports any mismatches with details

**Why This Verifies the Fix:**
- Uses the actual API endpoint that the UI calls
- Shows exactly what users see in the UI
- Compares API response with database truth
- Validates end-to-end data flow

---

## Test Machine Details

**Machine ID:** `68f90c0c98e7920bc598e945`  
**Serial Number:** `AARON BOARD`  
**Custom Name:** `AARON`  
**Location:** Dueces

**Current State:**
- `collectionMetersHistory`: Empty array `[]`
- `collectionMeters`: `{ metersIn: 0, metersOut: 0 }`

**Why This Machine:**
- Clean slate for testing
- Named for easy identification
- Part of test/development data

---

## Expected Test Results

### Scenario: Collection with prevIn=0, prevOut=0

**Before Fix:**
```
Collection Document:
  prevIn: 0
  prevOut: 0
  metersIn: 347982
  metersOut: 261523.7

collectionMetersHistory:
  prevMetersIn: 347900  ❌ WRONG
  prevMetersOut: 262500  ❌ WRONG
  metersIn: 347982
  metersOut: 261523.7
```

**After Fix:**
```
Collection Document:
  prevIn: 0
  prevOut: 0
  metersIn: 347982
  metersOut: 261523.7

collectionMetersHistory:
  prevMetersIn: 0  ✅ CORRECT (synced from collection)
  prevMetersOut: 0  ✅ CORRECT (synced from collection)
  metersIn: 347982  ✅ CORRECT (synced from collection)
  metersOut: 261523.7  ✅ CORRECT (synced from collection)
```

---

## Running the Complete Test

### Step-by-Step Walkthrough

**1. Ensure Prerequisites**
```bash
# Check MongoDB connection
echo %MONGO_URI%

# Make sure API server is running
# Navigate to http://localhost:32081 in browser
```

**2. Run the Test Script**
```bash
pnpm test:history-fix
```

**What to Watch For:**
- ✅ "Found machine: AARON BOARD"
- ✅ "Found X collections"
- ✅ "Created WRONG history entry" or "Updated history with WRONG values"
- ✅ "Fix API completed successfully"
- ✅ "Match? ✅ YES - FIX WORKED!"
- ✅ "🎉 SUCCESS! The fix properly synced..."

**3. Verify via API**
```bash
pnpm test:verify-fix
```

**What to Watch For:**
- ✅ "Found cabinet: AARON BOARD"
- ✅ Collection history table displayed
- ✅ "✅ SUCCESS! All collection history entries match"

**4. Check in UI (Optional)**
- Navigate to: http://localhost:32081/machines/68f90c0c98e7920bc598e945
- Click "Collection History" tab
- Verify Prev In and Prev Out values match collection document
- Verify no red exclamation marks in Status column

**5. Revert (Optional)**
```bash
pnpm test:history-fix:revert
```

This restores the original state from backup.

---

## Troubleshooting

### "No collections found for this machine"

**Solution:** Create a collection report for AARON BOARD first:
1. Go to Collection Report page
2. Click "Create Collection Report"
3. Select "Dueces" location
4. Select "AARON BOARD" machine
5. Enter any meter values
6. Add to list and create report
7. Run test again

### "Fix API failed"

**Check:**
1. Is API server running? (http://localhost:32081)
2. Check console/terminal for API errors
3. Verify MONGO_URI is correct
4. Check if you have admin permissions

### "MISMATCH DETECTED after fix"

**This means the fix didn't work properly:**
1. Check API logs in terminal/console
2. Look for errors in fix-report execution
3. Verify the fixMachineHistoryIssues function was updated correctly
4. Check if arrayFilters are working properly

---

## Understanding the Test Output

### Test Summary Interpretation

**If You See:**
```
Status: ✅ Match - FIX WORKED!
```
✅ **GOOD:** The fix properly synced history with collection

**If You See:**
```
Status: ❌ Mismatch - FIX FAILED!
```
❌ **BAD:** The fix didn't work, needs debugging

### Detailed Comparison

The test shows:
- **Collection values** - The source of truth from collection document
- **History values** - What's stored in collectionMetersHistory
- **Before/After** - State change from fix operation
- **Match status** - Whether sync was successful

---

## Your Specific Issue (TTRHP020)

For the machine you showed in screenshots (TTRHP020):

**Problem:**
- Collection: `prevIn: 0, prevOut: 0`
- History showing: `Prev In: 347.9K, Prev Out: 262.5K`

**To Test with TTRHP020:**

1. Modify test script to use TTRHP020's machine ID
2. Run the test
3. Should see history sync from 347900/262500 to 0/0
4. Verify in UI that Prev In/Out now show 0

**Or just run the fix directly:**
```bash
# In browser, navigate to TTRHP020 cabinet details
# Click "Collection History" tab
# Click "Fix History" button
# Refresh page
# Verify Prev In/Out now show 0
```

---

## Backup Safety

### Automatic Backup

Both test and revert operations use a backup file:
- **Location:** `backup-aaron-test.json`
- **Contains:** Original machine state and collection values
- **Created:** Automatically before any modifications
- **Used by:** Revert command

### Manual Backup (Extra Safe)

Before running tests on production data:
```bash
mongodump --uri="your-mongodb-uri" --out=backup-test-$(date +%Y%m%d)
```

---

## When to Run These Tests

### Development Testing
- ✅ After modifying fix-report API
- ✅ After changing fixMachineHistoryIssues function
- ✅ Before deploying to production
- ✅ When debugging collection history issues

### Production Verification
- ✅ After deploying fix to production
- ✅ When users report "Fix History" button not working
- ✅ To verify specific machines are fixed correctly

---

## Next Steps After Testing

### If Test SUCCEEDS ✅
1. Test with other machines that have real issues
2. Run fix on production machines with confidence
3. Monitor for any edge cases
4. Document any special scenarios

### If Test FAILS ❌
1. Check the API logs for errors
2. Verify fixMachineHistoryIssues function code
3. Check if arrayFilters syntax is correct
4. Verify locationReportId matching logic
5. Debug step-by-step with console logs

---

## Related Files

**Test Scripts:**
- `scripts/test-collection-history-fix.js`
- `scripts/verify-fix-via-api.js`

**API Endpoint:**
- `app/api/collection-reports/fix-report/route.ts`

**Components:**
- `components/cabinetDetails/CollectionHistoryTable.tsx` (Fix History button)
- `app/collection-report/report/[reportId]/page.tsx` (Fix Report button)

**Documentation:**
- `Documentation/backend/collection-report.md` (Fix logic documented)
- `Documentation/backend/collection-report-details.md` (Fix operations)
- `COLLECTION_HISTORY_FIX_UPDATE_NOV6.md` (Implementation details)

---

**Created:** November 6th, 2025  
**Status:** ✅ Ready to Use  
**Safety:** ✅ Includes backup and revert functionality


