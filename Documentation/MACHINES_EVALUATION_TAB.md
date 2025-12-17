# Machines Evaluation Tab - Documentation

## Overview

The **Machines Evaluation Tab** (`/reports?section=machines&mtab=evaluation`) is a performance analysis tool that compares actual machine performance against expected theoretical performance. This helps casino operators identify machines that are performing better or worse than expected, enabling data-driven decisions for floor optimization.

## Purpose

The evaluation tab serves several critical business functions:

1. **Performance Monitoring**: Track how machines are performing relative to their expected hold percentage
2. **Revenue Optimization**: Identify underperforming machines that may need attention or relocation
3. **Floor Management**: Make informed decisions about machine placement and game selection
4. **Variance Analysis**: Understand the difference between theoretical and actual hold percentages

## Key Metrics Explained

### Theoretical Hold Percentage

**Formula**: `theoreticalHold = (1 - theoreticalRtp) * 100`

- **Source**: Game configuration (`gameConfig.theoreticalRtp`)
- **Meaning**: The expected hold percentage based on the game's Return to Player (RTP) setting
- **Example**: If a game has 95% RTP, theoretical hold = (1 - 0.95) × 100 = 5%

### Actual Hold Percentage

**Formula**: `actualHold = ((coinIn - coinOut) / coinIn) * 100`

- **Source**: Real gameplay data from meters (`coinIn` and `coinOut`)
- **Meaning**: The actual percentage of money retained by the casino from player bets
- **Calculation**: 
  - `coinIn` = Total money wagered (handle)
  - `coinOut` = Total money won by players
  - `actualHold` = Net win as percentage of handle

### Hold Difference

**Formula**: `holdDifference = actualHold - theoreticalHold`

- **Positive Value**: Machine is performing better than expected (higher hold)
- **Negative Value**: Machine is performing worse than expected (lower hold)
- **Zero**: Machine is performing exactly as expected

### Performance Rating

Based on `holdDifference`, machines are categorized:

- **Excellent**: `holdDifference >= 1%` - Significantly outperforming expectations
- **Good**: `holdDifference >= 0%` - Meeting or slightly exceeding expectations
- **Average**: `holdDifference >= -1%` - Slightly underperforming but within acceptable range
- **Poor**: `holdDifference < -1%` - Significantly underperforming, may need attention

## Data Flow

### 1. Data Fetching

**API Endpoint**: `/api/reports/machines?type=all`

**Parameters**:
- `timePeriod`: Time range for analysis (Today, Yesterday, 7d, 30d, Custom, All Time)
- `licencee`: Optional licensee filter
- `locationId`: Optional location filter (for evaluation tab)
- `currency`: Display currency
- `startDate`, `endDate`: For Custom time period

**Response**: Array of `MachineData` objects with:
- Financial metrics (coinIn, coinOut, drop, gross, netWin)
- Game metrics (gamesPlayed, avgBet)
- Hold percentages (theoreticalHold, actualHold)
- Machine metadata (machineId, location, manufacturer, gameTitle)

### 2. Data Transformation

The raw machine data is transformed into `MachineEvaluationData`:

```typescript
const evaluationData = allMachines.map(machine => ({
  machineId: machine.machineId,
  theoreticalHold: machine.theoreticalHold || 0,
  actualHold: machine.actualHold || 0,
  holdDifference: actualHold - theoreticalHold,
  performanceRating: getPerformanceRating(holdDifference),
  // ... other metrics
}));
```

### 3. Filtering & Sorting

**Filters Available**:
- **Search**: Filter by machine ID, game title, location name, manufacturer
- **Location**: Filter by specific location (or "all")
- **Performance Level**: Filter by top/average/poor performers

**Sorting**: Sortable columns include:
- Actual Hold
- Theoretical Hold
- Hold Difference
- Net Win
- Gross
- Games Played
- Average Bet

## UI Components

### Evaluation Summary Cards

Displays aggregate statistics:
- **Total Machines**: Count of machines in evaluation
- **Top Performers**: Machines with `actualHold > 80%`
- **Average Performers**: Machines with `50% < actualHold <= 80%`
- **Poor Performers**: Machines with `actualHold <= 50%`
- **Total Revenue**: Sum of gross revenue
- **Total Handle**: Sum of coinIn

### Evaluation Table

Shows detailed machine-by-machine analysis with:
- Machine identification (ID, name, location)
- Hold percentages (actual vs theoretical)
- Financial metrics (net win, gross, drop, coin in)
- Game metrics (games played, average bet)
- Performance rating badge

### Performance Charts

- **Manufacturer Performance Chart**: Aggregated performance by manufacturer
- **Games Performance Chart**: Aggregated performance by game title
- **Performance Rating Distribution**: Visual breakdown of excellent/good/average/poor machines

## Use Cases

### 1. Identifying Underperformers

**Scenario**: A machine shows `actualHold = 2%` but `theoreticalHold = 5%`

**Analysis**: 
- Hold difference = -3% (poor rating)
- Machine is retaining 3% less than expected
- May indicate: player skill, game configuration issues, or location problems

**Action**: Investigate machine placement, game settings, or consider relocation

### 2. Finding Top Performers

**Scenario**: A machine shows `actualHold = 8%` but `theoreticalHold = 5%`

**Analysis**:
- Hold difference = +3% (excellent rating)
- Machine is performing significantly better than expected
- May indicate: favorable location, popular game, or player behavior

**Action**: Consider replicating successful factors (game type, location) to other machines

### 3. Floor Optimization

**Scenario**: Multiple machines in a location show poor performance

**Analysis**:
- Pattern suggests location-specific issues
- May indicate: poor foot traffic, wrong game mix, or environmental factors

**Action**: Review location strategy, consider game mix changes, or relocate machines

## Technical Implementation

### Component Structure

```
MachinesTab (Main Container)
├── MachinesEvaluationTab (Evaluation UI)
│   ├── MachineEvaluationSummary (Summary Cards)
│   ├── Evaluation Table (Sortable machine list)
│   ├── ManufacturerPerformanceChart
│   └── GamesPerformanceChart
└── Data Fetching Logic
    └── useAbortableRequest (API calls)
```

### Key Files

- **Component**: `components/reports/tabs/MachinesTab.tsx`
- **Evaluation UI**: `components/reports/tabs/MachinesEvaluationTab.tsx`
- **API Route**: `app/api/reports/machines/route.ts`
- **Types**: `lib/types/index.ts` (MachineEvaluationData)
- **Helpers**: `lib/helpers/reportsPage.ts` (sorting, export)

### Performance Considerations

- **Data Fetching**: Uses `type=all` to fetch all machines at once (not paginated)
- **Client-Side Filtering**: Filtering and sorting happen in-memory for responsiveness
- **Memoization**: Uses `useMemo` for expensive calculations (evaluation data, summaries)
- **Abortable Requests**: Uses `useAbortableRequest` to cancel in-flight requests when filters change

## Best Practices

1. **Time Period Selection**: 
   - Use "Today" or "Yesterday" for recent performance
   - Use "7d" or "30d" for trend analysis
   - Use "Custom" for specific date ranges

2. **Location Filtering**: 
   - Start with "all" to see overall performance
   - Filter by location to identify location-specific patterns

3. **Performance Rating Interpretation**:
   - Don't immediately flag "poor" performers - consider sample size (games played)
   - Look for patterns across multiple machines
   - Consider variance - some variance is normal in gaming

4. **Actionable Insights**:
   - Focus on machines with significant hold differences (>2%)
   - Consider games played - low play count may indicate location issues
   - Compare similar machines (same game, different locations)

## Related Documentation

- **Reports API**: `Documentation/backend/reports-api.md` (Section: Machines Report API)
- **Financial Metrics Guide**: See project financial documentation for detailed formulas
- **Machine Data Types**: `shared/types/machines.ts`

## Example Workflow

1. Navigate to `/reports?section=machines&mtab=evaluation`
2. Select time period (e.g., "Last 7 Days")
3. Review evaluation summary cards for overall performance
4. Filter by location to see location-specific performance
5. Sort by "Hold Difference" to identify top/bottom performers
6. Click on specific machines to view detailed metrics
7. Export data for further analysis if needed
8. Take action based on findings (relocate machines, adjust game mix, etc.)


