# Machines Evaluation Tab - Testing Guide

## Overview

This guide provides step-by-step instructions for testing the Machines Evaluation Tab functionality after implementing the FRD requirements.

## Prerequisites

1. **Test Data Setup**: Run the test data script to populate machines with simple test data:
   ```bash
   node scripts/update-test-machines-data.js
   ```

2. **Access**: Ensure you have access to the Cabana licensee or can view machines in Cabana locations.

3. **Browser**: Use a modern browser (Chrome, Firefox, Edge) with developer tools enabled.

## Test Data Overview

The script creates test data for up to 8 machines with the following characteristics:

- **Machine 1**: High performer (Handle: $10,000, Win: $500, Games: 1,000)
- **Machine 2**: Average performer (Handle: $5,000, Win: $250, Games: 500)
- **Machine 3**: Low performer (Handle: $3,000, Win: $90, Games: 300)
- **Machine 4**: High games, low hold (Handle: $8,000, Win: $160, Games: 2,000)
- **Machine 5**: With jackpot (Handle: $15,000, Win: $1,000, Games: 1,500, Jackpot: $500)
- **Machine 6**: Very high performer (Handle: $20,000, Win: $1,200, Games: 2,000)
- **Machine 7**: Low games, high hold (Handle: $4,000, Win: $200, Games: 200)
- **Machine 8**: Average with jackpot (Handle: $12,000, Win: $800, Games: 1,200, Jackpot: $200)

All machines have:
- Theoretical Hold: 5% (theoreticalRtp: 0.95)
- Actual Hold: Varies based on coinIn/coinOut ratio
- Data for "Today" time period

## Manual Testing Steps

### 1. Navigate to Evaluation Tab

1. Open the application in your browser
2. Navigate to: `http://localhost:3000/reports?section=machines&mtab=evaluation`
3. Verify the Evaluation tab is displayed

**Expected Result**: The Evaluation tab loads with all sections visible.

---

### 2. Test Summary Section (ME1-3.0 to ME1-3.3)

**Location**: Top of the Evaluation tab

**Test Steps**:
1. Select "Today" time period
2. Verify the Summary section displays three contribution percentages:
   - Handle Contribution
   - Win Contribution
   - Games Played Contribution

**Expected Results**:
- All three percentages should display (typically 100% since we're looking at all machines in the filtered set)
- Percentages should be formatted with 1 decimal place (e.g., "100.0%")
- Values should be displayed in colored cards (blue, green, purple)

**Verification**:
- Handle Contribution = 100% (all machines contribute 100% to total handle)
- Win Contribution = 100% (all machines contribute 100% to total win)
- Games Played Contribution = 100% (all machines contribute 100% to total games played)

---

### 3. Test Manufacturer Performance Chart (ME2-1.0 to ME2-1.6)

**Location**: Below Summary section

**Test Steps**:
1. Verify the chart displays multiple bars per manufacturer
2. Check that each manufacturer has bars for:
   - Floor Positions %
   - Total Handle %
   - Total Win %
   - Total Drop %
   - Total Canc. Cr. %
   - Total Gross %
   - Total Games Played %
3. Verify the legend shows manufacturer names with colors
4. Hover over bars to see tooltip with percentage values

**Expected Results**:
- Chart displays all manufacturers from test machines
- Each manufacturer has 7 bars (one for each metric)
- Percentages are calculated correctly (Calc. 3 formula)
- Legend is visible and color-coded
- Tooltips show accurate percentage values

**Verification**:
- Floor Positions % = (manufacturer machines count / total machines count) * 100
- Total Handle % = (manufacturer total handle / total handle) * 100
- Total Win % = (manufacturer total win / total win) * 100
- Total Games Played % = (manufacturer total games / total games) * 100

---

### 4. Test Game Performance Chart (ME2-2.0 to ME2-2.6)

**Location**: Below Manufacturer Performance Chart

**Test Steps**:
1. Verify the chart displays multiple bars per game
2. Check that each game has bars for:
   - Floor Positions %
   - Total Handle %
   - Total Win %
   - Total Drop %
   - Total Canc. Cr. %
   - Total Gross %
   - Total Games Played %
3. Verify the legend shows game names with colors
4. Hover over bars to see tooltip with percentage values

**Expected Results**:
- Chart displays all games from test machines
- Each game has 7 bars (one for each metric)
- Percentages are calculated correctly (Calc. 3 formula)
- Legend is visible and color-coded
- Tooltips show accurate percentage values
- Long game names are truncated with "..." in chart labels

**Verification**:
- Floor Positions % = (game machines count / total machines count) * 100
- Total Handle % = (game total handle / total handle) * 100
- Total Win % = (game total win / total win) * 100
- Total Games Played % = (game total games / total games) * 100

---

### 5. Test Top Machines Criteria Selection (ME3-1.0 to ME3-1.4)

**Location**: Above Top Machines table

**Test Steps**:
1. Verify the criteria selector displays all 8 metrics:
   - Handle
   - Net Win
   - Gross
   - Games Played
   - Actual Hold
   - Theoretical Hold
   - Average Wager
   - Jackpot
2. Click on "Handle" - verify table sorts by handle (descending by default)
3. Click "Handle" again - verify sort direction toggles to ascending (arrow changes)
4. Click "Net Win" - verify table switches to sort by net win (descending)
5. Click "Net Win" again - verify sort direction toggles to ascending
6. Test all other metrics similarly

**Expected Results**:
- All 8 metric buttons are visible and clickable
- Selected metric is highlighted
- Arrow indicator shows current sort direction:
  - ↑ (up arrow) = Ascending
  - ↓ (down arrow) = Descending
- Clicking same metric toggles sort direction
- Clicking different metric switches to that metric (defaults to descending)
- Table updates immediately when criteria changes

---

### 6. Test Top Machines Table (ME3-2.0 to ME3-2.8)

**Location**: Below Criteria Selector

**Test Steps**:
1. Verify all required columns are displayed:
   - Machine ID
   - Handle
   - Average Wager (Calc. 1)
   - Win
   - Jackpot
   - Theoretical Hold
   - Actual Hold (Calc. 2)
   - Games Played
2. Verify table shows top 5 machines (or fewer if less than 5 machines)
3. Test sorting by different criteria (see step 5)
4. Verify calculations are correct:
   - Average Wager = Handle / Games Played
   - Actual Hold = ((Coin In - Coin Out) / Coin In) * 100
   - Theoretical Hold = (1 - theoreticalRtp) * 100

**Expected Results**:
- All 8 required columns are present
- Table displays machines sorted by selected criteria
- Calculations are accurate:
  - Average Wager matches: Handle ÷ Games Played
  - Actual Hold matches: ((Coin In - Coin Out) / Coin In) × 100
  - Theoretical Hold matches: (1 - theoreticalRtp) × 100 = 5%
- Values are formatted correctly (currency, percentages, numbers)
- Machine IDs are clickable (link to cabinet details)

**Verification Examples** (using test data):
- Machine 1: Handle = $10,000, Games = 1,000 → Avg Wager = $10.00
- Machine 1: Coin In = $10,000, Coin Out = $9,500 → Actual Hold = 5.00%
- Machine 1: Theoretical RTP = 0.95 → Theoretical Hold = 5.00%

---

### 7. Test Time Period Filtering

**Test Steps**:
1. Select "Today" - verify data matches test data
2. Select "Yesterday" - verify no data or different data
3. Select "Last 7 Days" - verify aggregated data
4. Select "Custom" - select today's date range, verify data appears

**Expected Results**:
- "Today" shows test data we just created
- Other time periods show appropriate data (or empty if no data)
- All calculations respect the selected time range

---

### 8. Test Location Filtering

**Test Steps**:
1. If location dropdown is available, select different locations
2. Verify data updates based on selected location
3. Verify all sections (Summary, Charts, Table) update correctly

**Expected Results**:
- Location filter affects all sections
- Data is filtered correctly by location
- Calculations remain accurate for filtered data

---

## Browser Testing (Automated)

If MCP browser extension is available, automated testing can be performed:

1. Navigate to the evaluation tab
2. Take screenshots of each section
3. Verify UI elements are displayed correctly
4. Test interactive elements (criteria selection, sorting)

---

## Common Issues and Troubleshooting

### Issue: Summary shows 0% for all metrics
**Cause**: No machines found or no data in time range
**Solution**: Verify test data script ran successfully and "Today" is selected

### Issue: Charts show "No data available"
**Cause**: No machines match the filters or no data in time range
**Solution**: Check location filter and time period selection

### Issue: Top Machines table is empty
**Cause**: No machines found or criteria filter too restrictive
**Solution**: Verify machines exist and try different criteria

### Issue: Calculations seem incorrect
**Cause**: Data may not be aggregated correctly
**Solution**: Verify test data values and check browser console for errors

### Issue: Criteria selector not working
**Cause**: JavaScript error or state management issue
**Solution**: Check browser console for errors, verify component is mounted

---

## Expected Test Results Summary

After running all tests, you should verify:

✅ **Summary Section**: Shows 100% for all three contribution percentages  
✅ **Manufacturer Chart**: Displays all manufacturers with 7 bars each  
✅ **Game Chart**: Displays all games with 7 bars each  
✅ **Criteria Selector**: All 8 metrics are clickable and toggle sort direction  
✅ **Top Machines Table**: Shows top 5 machines with all 8 required columns  
✅ **Calculations**: Average Wager, Actual Hold, Theoretical Hold are correct  
✅ **Sorting**: Table sorts correctly by selected criteria  
✅ **Time Filtering**: Data updates based on selected time period  
✅ **Location Filtering**: Data updates based on selected location  

---

## Next Steps

After successful testing:

1. Document any issues found
2. Verify calculations match expected formulas
3. Test with different time periods and locations
4. Test edge cases (no data, single machine, etc.)
5. Verify responsive design on mobile devices

---

## Related Documentation

- `Documentation/MACHINES_EVALUATION_FRD.md` - Functional requirements
- `Documentation/MACHINES_EVALUATION_TAB.md` - Implementation details
- `scripts/update-test-machines-data.js` - Test data script

