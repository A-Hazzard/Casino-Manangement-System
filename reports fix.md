# Fix Reports Page Issues - Top 5 Machines, Summary Cards, and Tab Navigation

## Issues to Address:

### 1. Top 5 Machines Not Working Correctly in LocationsTab
**Problem**: In `/reports?section=locations&tab=location-evaluation`, when selecting "Bet Cabana" or multiple locations, the top 5 machines table only shows 1 machine instead of the actual top 5 machines for the selected location(s).

**Root Cause**: The current implementation in `components/reports/tabs/LocationsTab.tsx` is incorrectly using location data instead of actual machine data for the top 5 machines table. It's showing location-level data (like `location.moneyIn`, `location.gross`) instead of individual machine data.

**Fix Required**:
- In the SAS Evaluation tab, the top 5 machines section should fetch actual machine data from the `/api/reports/machines` endpoint (similar to how MachinesTab does it)
- The table should display individual machine records, not location summaries
- When multiple locations are selected, it should show the top 5 machines across ALL selected locations combined
- The table should show proper machine data: Machine ID, Game, Manufacturer, Handle, Win/Loss, Jackpot, Avg. Wag. per Game, Actual Hold, Theoretical Hold, Games Played

### 2. Missing Summary Cards in SAS Evaluation Tab
**Problem**: The SAS Evaluation tab doesn't have the summary cards that show "Total Net Win (Gross)", "Total Drop", "Total Cancelled Credits", and "Online Machines" like the Revenue Analysis tab has.

**Fix Required**:
- Add a summary section with 4 metric cards above the charts in the SAS Evaluation tab
- Cards should show:
  - Total Net Win (Gross) - Green color
  - Total Drop - Orange color  
  - Total Cancelled Credits - Black color
  - Online Machines - Blue color with progress bar
- Calculate these metrics from the selected locations' data
- Use the same styling and layout as the Revenue Analysis tab

### 3. Same Issue in Revenue Analysis Tab
**Problem**: The Revenue Analysis tab has the same top 5 machines issue - it's showing location data instead of actual machine data.

**Fix Required**:
- Apply the same fix as SAS Evaluation tab
- Replace the current "Top 5 Machines (Overall)" section with proper machine data table
- Remove the comparison functionality that's not working properly

### 4. Tab Navigation Design Issue
**Problem**: The machines overview tab navigation design doesn't look good - the tabs appear cramped and the design is inconsistent.

**Fix Required**:
- In `components/reports/tabs/MachinesTab.tsx`, improve the tab navigation styling
- Make the tabs more spacious and visually appealing
- Ensure consistent styling with the rest of the application
- Consider using the same tab design pattern as LocationsTab

## Implementation Steps:

### Step 1: Fix Top 5 Machines Data Fetching
1. In `LocationsTab.tsx`, add a new state for machine data: `const [topMachinesData, setTopMachinesData] = useState<MachineApiData[]>([])`
2. Create a function `fetchTopMachines` that calls `/api/reports/machines` with the selected location IDs
3. Update the top 5 machines table to use actual machine data instead of location data
4. Apply this fix to both SAS Evaluation and Revenue Analysis tabs

### Step 2: Add Summary Cards to SAS Evaluation
1. Add the summary cards section above the charts in the SAS Evaluation tab
2. Calculate totals from the selected locations' data
3. Use the same card design and colors as Revenue Analysis tab

### Step 3: Improve Tab Navigation Design
1. Update the tab navigation styling in `MachinesTab.tsx`
2. Make tabs more spacious and visually consistent
3. Ensure proper spacing and hover effects

### Step 4: Clean Up Comparison Functionality
1. Remove the broken comparison functionality from the top 5 machines sections
2. Simplify the UI by removing comparison buttons and selection states

## Files to Modify:
- `components/reports/tabs/LocationsTab.tsx` - Fix top 5 machines data fetching and add summary cards
- `components/reports/tabs/MachinesTab.tsx` - Improve tab navigation design

## Expected Outcome:
- Top 5 machines table shows actual machine data for selected locations
- SAS Evaluation tab has summary cards matching Revenue Analysis tab
- Tab navigation looks clean and professional
- Consistent user experience across all tabs