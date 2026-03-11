# Collection History Fix - Frontend Guide

## Overview

The Collection History Fix is a developer-only tool integrated into the collection report UI that allows inspection and automatic correction of broken collection history chains. It detects when machine collection records have incorrect or missing "previous meter" values and automatically rebuilds the history with correct values.

## User-Facing Messages

### Message Display Conditions

The collection history fix messages **only appear to users with the `developer` role**. This is intentional because:
- The fix is a maintenance/diagnostic operation
- Messages may contain technical details useful only to developers/admins
- Regular users don't need to see these system-level corrections

### Toast Messages

When the fix operation completes, users see:

**Success**:
```
✓ Collection history fixed
  Machines fixed: 2
  History entries rebuilt: 8
```

**Error**:
```
✗ Failed to fix collection history
  Report not found
```

## What the Frontend Does

### 1. Detection & Alerts

The frontend automatically checks each collection report for history issues:
- Queries the backend to identify which machines have broken `prevIn`/`prevOut` values
- Displays a **warning badge** on affected reports
- Shows issue count next to affected location

**Visual Indicator**:
```
⚠️ Issues Detected (2)
└─ Machine ABC-001: prevIn/prevOut broken
└─ Machine XYZ-789: prevIn/prevOut broken
```

### 2. Manual Fix Trigger

Developers can manually trigger the fix via:
- **Button Click**: "Fix Collection History" button in report tools
- **API Call**: `POST /api/collection-report/{reportId}/fix-collection-history`

```typescript
// Frontend code pattern
const handleFixHistory = async () => {
  try {
    const response = await axios.post(
      `/api/collection-report/${reportId}/fix-collection-history`
    );

    if (response.data.success) {
      toast.success(
        `Collection history fixed\nMachines fixed: ${response.data.summary.machinesFixed}\nHistory entries rebuilt: ${response.data.summary.totalHistoryRebuilt}`
      );
      // Refresh report data
      onRefresh();
    }
  } catch (error) {
    toast.error('Failed to fix collection history');
  }
};
```

### 3. Response Handling

After the fix operation completes, the frontend:
- **Displays Summary**: Shows how many machines were fixed and entries rebuilt
- **Refreshes Data**: Re-fetches the report to show updated values
- **Shows Details** (developers only): Technical breakdown of fixes applied

## Integration Points

### Where Fix Messages Appear

1. **Collection Report Details Page**
   - Admin/Developer tools section
   - "Fix Collection History" button with icon
   - Results displayed in toast notification

2. **Collection Report List**
   - Issue badge/indicator on reports with problems
   - Click to navigate to details for fixing

3. **Edit Modal (if applicable)**
   - May trigger automatic fix if issues detected
   - Shows message only if user is developer

## Implementation Pattern

### Role-Based Visibility

```typescript
// Only show messages to developers
if (user?.roles?.includes('developer')) {
  // Show detailed messages
  toast.success('Collection history fixed: 2 machines, 8 entries rebuilt');
} else if (autoFixApplied) {
  // Don't show message to regular users
  // Fix happens silently in background
}
```

### Error Scenarios

**Scenario 1: Report Not Found**
- Message: "Report not found"
- Status: 404
- User sees: Error toast

**Scenario 2: No Collections**
- Message: "No collections found for this report"
- Status: Error
- User sees: Error toast (developers only)

**Scenario 3: Partial Failure**
- Some machines fix successfully, others fail
- Message: Shows successful count, notes failures
- User sees: Partial success toast (developers only)

## Technical Details for Developers

### Request/Response

```typescript
// Request
POST /api/collection-report/{reportId}/fix-collection-history

// Response (Success)
{
  success: true,
  message: "Collection history fix completed successfully",
  summary: {
    totalMachinesInReport: 5,
    machinesWithIssues: 2,
    machinesFixed: 2,
    totalHistoryRebuilt: 8
  }
}

// Response (Error)
{
  success: false,
  error: "Report not found"
}
```

### Interpretation

| Summary Field | Meaning |
|---|---|
| `totalMachinesInReport` | All machines ever collected in this report |
| `machinesWithIssues` | Machines with broken `prevIn`/`prevOut` links |
| `machinesFixed` | Machines successfully rebuilt |
| `totalHistoryRebuilt` | Total entries that were corrected |

**Example Interpretation**:
```
totalMachinesInReport: 5
machinesWithIssues: 2      ← 2 had problems
machinesFixed: 2           ← Both were successfully fixed
totalHistoryRebuilt: 8     ← A total of 8 history entries were corrected
```

## User Experience

### For Regular Users
- No messages shown
- Fix happens automatically if needed
- Reports show corrected values transparently

### For Developers
- See detailed diagnostic messages
- Know exactly what was fixed and how many entries were affected
- Can investigate issues in detail if needed
- Can manually trigger fixes if suspicious

## Data After Fix

After a successful fix, the collection report will show:
- Correct `prevIn`/`prevOut` values for all collections
- Accurate movement calculations (metersIn - prevIn)
- Correct financial metrics based on real meter deltas
- Complete audit trail of corrections applied

## Related Features

- **SAS Times Fix**: Separate system for fixing SAS meter timing issues
- **Movement Validation**: Checks if movement calculations are correct
- **Issue Detection**: Identifies problems before they affect reporting
- **Audit Logging**: Records who triggered the fix and when

## Troubleshooting

**Q: Fix button is disabled**
A: Likely reason - no issues detected, or not authorized (requires developer role)

**Q: Messages not appearing**
A: Likely reason - not a developer user, or toast notifications disabled

**Q: Fix shows partial success**
A: Some machines may have additional issues beyond `prevIn`/`prevOut` (e.g., missing meter values)

**Q: Report still shows old data after fix**
A: Try manual refresh - data may not update immediately in UI

## Best Practices

1. **Check Before Fixing**: Review detected issues before triggering fix
2. **Monitor Results**: Watch the summary to understand scope of issues
3. **Refresh Data**: Always refresh report after fix to see updated values
4. **Check Audit Log**: Verify fix was recorded in activity logs
5. **Validate Results**: Spot-check a few machines to confirm fix correctness
