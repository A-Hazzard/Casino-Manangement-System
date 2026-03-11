# Collection History Fix System

## Overview

The Collection History Fix system is a maintenance tool that automatically detects and corrects inconsistencies in machine collection history records within collection reports. It ensures that `prevIn` (previous meters in) and `prevOut` (previous meters out) values are correctly linked to their actual previous collection events.

## Problem Being Solved

### Issue: Broken Collection History Chain

When collection records are created or modified, each collection needs to reference the **previous** collection's meter values as `prevIn` and `prevOut`. These values are used to:
- Calculate the gross meters (movement) for a collection: `metersIn - prevIn`
- Maintain financial accuracy and audit trails
- Detect anomalies and validate data integrity

**The Problem**: Due to edits, deletions, or system errors, these historical links can become broken:
- `prevIn` and `prevOut` might be `0`, `null`, or `undefined` when they should reference actual previous values
- The chain of collections becomes disconnected, making it impossible to calculate correct financial movements

## How the Fix Works

### Step-by-Step Logic

#### 1. **Detection Phase**
The system checks each machine's `collectionMetersHistory` array:
- For **each collection entry** (except the first one):
  - Check if `prevIn` is `0`, `null`, or `undefined` **AND**
  - Check if `prevOut` is `0`, `null`, or `undefined`
- If both conditions are true, the entry is flagged as having an issue

```typescript
// Pseudocode: Issue Detection
for (entry in machine.collectionMetersHistory) {
  if (index > 0) {  // Skip first entry (has no previous)
    if ((entry.prevIn === 0 || null) AND (entry.prevOut === 0 || null)) {
      flagAsIssue()
    }
  }
}
```

#### 2. **Fixing Phase**
For each machine with detected issues:
- **Rebuild the entire collection history** from scratch
- Iterate chronologically through all collections for that machine:
  - Find the **immediately preceding collection** in timestamp order
  - Extract its `metersIn` and `metersOut` values
  - Update the **current** collection's `prevIn` and `prevOut` to those values
  - Recalculate the `movement` (gross meters) based on the corrected values

```typescript
// Pseudocode: History Rebuild
for (each collection in chronological order) {
  if (this is the first collection) {
    prevIn = 0
    prevOut = 0
  } else {
    previousCollection = findPreviousCollection(timestamp)
    prevIn = previousCollection.metersIn
    prevOut = previousCollection.metersOut
  }

  update collection with corrected prevIn, prevOut
  recalculate movement
  save to database
}
```

### API Endpoint

**Route**: `POST /api/collection-report/[reportId]/fix-collection-history`

**Authorization**: Requires `admin` or `developer` role (checked via JWT authentication)

**Request**:
```json
{
  "reportId": "report-id-123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Collection history fix completed successfully",
  "summary": {
    "totalMachinesInReport": 5,
    "machinesWithIssues": 2,
    "machinesFixed": 2,
    "totalHistoryRebuilt": 8
  }
}
```

### Response Fields Explained

| Field | Meaning |
|-------|---------|
| `totalMachinesInReport` | Total unique machines in all collections for this report |
| `machinesWithIssues` | Number of machines that had `prevIn`/`prevOut` issues detected |
| `machinesFixed` | Number of machines successfully rebuilt (attempted = fixed if no errors) |
| `totalHistoryRebuilt` | Total number of history entries that were corrected across all machines |

### Example Scenario

**Before Fix**:
```
Machine ABC-001
├─ Collection 1: metersIn=100, metersOut=50, prevIn=0, prevOut=0 ✓ (correct, first)
├─ Collection 2: metersIn=150, metersOut=80, prevIn=0, prevOut=0 ✗ (BROKEN - should be 100, 50)
├─ Collection 3: metersIn=200, metersOut=110, prevIn=0, prevOut=0 ✗ (BROKEN - should be 150, 80)
```

**After Fix**:
```
Machine ABC-001
├─ Collection 1: metersIn=100, metersOut=50, prevIn=0, prevOut=0 ✓
├─ Collection 2: metersIn=150, metersOut=80, prevIn=100, prevOut=50 ✓
├─ Collection 3: metersIn=200, metersOut=110, prevIn=150, prevOut=80 ✓
```

**Result**: `machinesFixed: 1`, `totalHistoryRebuilt: 2` (collections 2 and 3 were fixed)

## Implementation Details

### Key Functions

**`fixCollectionHistoryForReport(reportId)`**
- Main entry point for fixing a specific report
- Returns: `{ success, totalHistoryRebuilt, machinesFixedCount, machinesWithIssues, totalMachinesInReport, error? }`

**`hasCollectionHistoryIssues(machine)`**
- Detects if a machine has broken history links
- Returns: `boolean` (true if any non-first entry has both prevIn and prevOut as 0/null/undefined)

**`rebuildMachineHistory(machineId)`**
- Iterates through all collections for a machine in chronological order
- Corrects all `prevIn`/`prevOut` values
- Recalculates movement values
- Returns: Number of history entries updated

### Database Modifications

The fix operation modifies the **Machine** model's `collectionMetersHistory` array:
- **Updated fields**: `prevIn`, `prevOut`, `movement` (if needed)
- **Preserved fields**: All other fields remain unchanged
- **No deletions**: Only corrections, never removes entries

### Error Handling

- If report not found: Returns error `'Report not found'` with status 404
- If no collections for report: Returns error `'No collections found for this report'`
- If individual machine processing fails: Logged but continues with next machine (partial success)
- All errors are logged with machine ID for debugging

## When This Tool Activates

The collection history fix can be triggered:
1. **Automatically**: During report update validation (if issues detected)
2. **Manually**: Via admin/developer request through the API or UI

## Security

- **Access Control**: Only `admin` and `developer` roles can execute
- **Audit Logging**: All fixes are logged with timestamp, user ID, and summary
- **Data Integrity**: Operation is append-only at history level; previous values preserved through versioning

## Performance

- **Complexity**: O(n) where n = total collections for all machines in report
- **Typical Execution**: < 100ms for reports with < 100 machines
- **Concurrency**: Safe for concurrent requests (MongoDB handles document-level locking)

## Related Systems

- **Movement Calculation**: Uses corrected `prevIn`/`prevOut` to calculate gross movement
- **Financial Reporting**: Depends on accurate history for revenue calculations
- **SAS Times Fix**: Separate system that fixes SAS meter inconsistencies
- **Meter Sync**: Initial population of meter history during collection creation
