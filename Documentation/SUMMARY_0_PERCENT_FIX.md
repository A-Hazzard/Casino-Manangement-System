# Summary "0%" Issue - Investigation and Fix

## Problem

The Summary section was showing:
- "0% of the machines contribute to 83% of the Total Win"
- "0% of the machines contribute to 77% of the Total Games Played"

This was incorrect because:
1. Data exists for 8 machines (confirmed by investigation script)
2. Charts show correct data
3. The calculation was including machines with zero metrics in the denominator

## Root Cause

The Pareto calculation was using `filteredEvaluationData` which includes ALL machines (even those with zero metrics for the selected time period). When calculating "X% of machines", it was dividing by the total number of machines (including those with zero data), not just machines with actual data.

### Example Scenario:
- 20 machines total in `filteredEvaluationData`
- Only 8 machines have data for "today"
- To reach 75% of total win, we need 4 machines
- Calculation: `4 / 20 * 100 = 20%` ❌ (Wrong - includes machines without data)
- Should be: `4 / 8 * 100 = 50%` ✅ (Correct - only counts machines with data)

## Solution

### 1. Fixed Pareto Calculation Logic

**File**: `components/reports/tabs/MachinesTab.tsx`

**Changes**:
1. **Filter machines with data first**: Only consider machines where `metricGetter(m) > 0`
2. **Use correct denominator**: Divide by `machinesWithData.length` instead of `machines.length`
3. **Better validation**: Check for NaN, Infinity, and zero values
4. **Prevent 0% display**: Use `Math.max(1, Math.round())` to ensure we never show 0% when data exists

**Key Code**:
```typescript
// Filter out machines with zero metrics - only count machines that actually have data
const machinesWithData = machines.filter(m => {
  const value = metricGetter(m);
  return value > 0 && !isNaN(value) && isFinite(value);
});

// Calculate percentage based on machines WITH DATA, not all machines
const machinePercentage =
  machinesWithData.length > 0
    ? (machineCount / machinesWithData.length) * 100
    : 0;
```

### 2. Fixed Test Data Script Date Handling

**File**: `scripts/update-test-machines-data.js`

**Changes**:
1. **Use UTC dates**: Changed from local time to UTC to match API filtering
2. **Proper date range**: Use `setUTCHours()` instead of `setHours()`

**Key Code**:
```javascript
// Create or update meter document for today (use UTC to match API filtering)
const meterDate = new Date();
meterDate.setUTCHours(12, 0, 0, 0); // Set to noon UTC for consistency

// Calculate today's date range in UTC for matching
const todayStartUTC = new Date();
todayStartUTC.setUTCHours(0, 0, 0, 0);
const todayEndUTC = new Date();
todayEndUTC.setUTCHours(23, 59, 59, 999);
```

## Investigation Script

Created `scripts/investigate-summary-issue.js` to:
1. Check what machines are returned by the API
2. Verify meter data exists for "today"
3. Calculate totals and identify machines with/without data
4. Check for date mismatches
5. Provide recommendations

**Usage**:
```bash
node scripts/investigate-summary-issue.js
```

## Expected Results After Fix

Based on the test data (8 machines with data):

### Handle (sorted by coinIn descending):
- Top 4 machines (50%): 57,000 / 77,000 = **74%** → "50% of the machines contribute to 74% of the Total Handle"
- Top 4 machines reach 74%, so we'd show: "50% of the machines contribute to 74% of the Total Handle"

### Win (sorted by netWin descending):
- Top 2 machines (25%): 2,200 / 4,200 = **52.4%**
- Top 3 machines (37.5%): 3,000 / 4,200 = **71.4%**
- Top 4 machines (50%): 3,500 / 4,200 = **83.3%** → "50% of the machines contribute to 83% of the Total Win"

### Games Played (sorted by gamesPlayed descending):
- Top 2 machines (25%): 4,000 / 8,700 = **46.0%**
- Top 3 machines (37.5%): 5,500 / 8,700 = **63.2%**
- Top 4 machines (50%): 6,700 / 8,700 = **77.0%** → "50% of the machines contribute to 77% of the Total Games Played"

## Testing

1. **Run investigation script** to verify data exists:
   ```bash
   node scripts/investigate-summary-issue.js
   ```

2. **Check the Summary section** in the UI:
   - Should show percentages > 0% when data exists
   - Should only count machines with actual data
   - Should match expected values above

3. **If data doesn't exist for today**, run the test data script:
   ```bash
   node scripts/update-test-machines-data.js
   ```

## Notes

- The Summary now correctly filters out machines with zero metrics
- Only machines with actual data are counted in the percentage calculation
- The calculation uses the target of 75% to find the Pareto point
- If 75% is never reached, it shows the actual percentage achieved
- The fix ensures we never show "0%" when data exists

