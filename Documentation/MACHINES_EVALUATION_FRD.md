# Machines Evaluation Tab - Functional Requirements Document (FRD)

## Overview

This document outlines the functional requirements for the Machines Evaluation Tab in the Reports section. The evaluation tab provides comprehensive performance analysis of gaming machines, including contribution percentages, manufacturer and game performance comparisons, and top machines analysis.

## Requirements by Section

### ME1: Summary Section - Machine Contribution Percentages

#### ME1-3.0: Summary Section Overview

**Requirement**: The Summary section should provide machine contribution percentages to the key metrics within the time range.

**Description**: The summary section displays aggregate statistics showing how machines contribute to overall performance metrics. This provides a high-level view of machine performance distribution.

#### ME1-3.1: Handle Contribution Percentage

**Requirement**: The Summary section should state the machine contribution percentage towards handle within the time range (Calc. 3).

**Formula (Calc. 3)**: `(machineHandle / totalHandle) * 100`

**Display**: Show percentage contribution of machines to total handle (coin-in).

#### ME1-3.2: Win Contribution Percentage

**Requirement**: The Summary section should state the machine contribution percentage towards win within the time range (Calc. 3).

**Formula (Calc. 3)**: `(machineWin / totalWin) * 100`

**Display**: Show percentage contribution of machines to total win (net win).

#### ME1-3.3: Games Played Contribution Percentage

**Requirement**: The Summary section should state the machine contribution percentage towards games played within the time range (Calc. 3).

**Formula (Calc. 3)**: `(machineGamesPlayed / totalGamesPlayed) * 100`

**Display**: Show percentage contribution of machines to total games played.

---

### ME2: Manufacturer Performance Comparison

#### ME2-1.0: Manufacturer Performance Overview

**Requirement**: The system should compare manufacturer performance for key metrics as a percentage within the time range.

**Description**: Display manufacturer performance using percentage-based comparisons across multiple metrics.

#### ME2-1.1: Multiple Bars per Manufacturer

**Requirement**: The system should use multiple bars to represent each manufacturer for each of the key metrics within the time range.

**Display**: Each manufacturer should have multiple bars in the chart, one for each metric (Floor Positions, Handle, Win, Drop, Cancelled Credits, Gross).

#### ME2-1.2: Floor Positions Contribution

**Requirement**: The system should evaluate each manufacturer contribution to the floor position within the time range.

**Formula (Calc. 3)**: `(manufacturerMachinesCount / totalMachinesCount) * 100`

**Display**: Percentage of floor positions occupied by each manufacturer.

#### ME2-1.3: Handle Contribution

**Requirement**: The system should evaluate each manufacturer contribution to the handle within the time range.

**Formula (Calc. 3)**: `(manufacturerTotalHandle / totalHandle) * 100`

**Display**: Percentage contribution of each manufacturer to total handle.

#### ME2-1.4: Win Contribution

**Requirement**: The system should evaluate each manufacturer contribution to the win within the time range.

**Formula (Calc. 3)**: `(manufacturerTotalWin / totalWin) * 100`

**Display**: Percentage contribution of each manufacturer to total win.

#### ME2-1.5: Games Played Contribution

**Requirement**: The system should evaluate each manufacturer contribution to the games played within the time range.

**Formula (Calc. 3)**: `(manufacturerTotalGamesPlayed / totalGamesPlayed) * 100`

**Display**: Percentage contribution of each manufacturer to total games played.

#### ME2-1.6: Manufacturer Legend

**Requirement**: The system should show a legend where each manufacturer name is associated with its own color.

**Display**: Visual legend showing manufacturer names with corresponding colors used in the chart.

---

### ME2: Game Performance Comparison

#### ME2-2.0: Game Performance Overview

**Requirement**: The system should compare game performance for key metrics as a percentage within the time range.

**Description**: Display game performance using percentage-based comparisons across multiple metrics.

#### ME2-2.1: Multiple Bars per Game

**Requirement**: The system should use multiple bars to represent each game for each of the key metrics within the time range.

**Display**: Each game should have multiple bars in the chart, one for each metric (Floor Positions, Handle, Win, Drop, Cancelled Credits, Gross).

#### ME2-2.2: Floor Positions Contribution

**Requirement**: The system should evaluate each game contribution to the floor position within the time range.

**Formula (Calc. 3)**: `(gameMachinesCount / totalMachinesCount) * 100`

**Display**: Percentage of floor positions occupied by each game.

#### ME2-2.3: Handle Contribution

**Requirement**: The system should evaluate each game contribution to the handle within the time range.

**Formula (Calc. 3)**: `(gameTotalHandle / totalHandle) * 100`

**Display**: Percentage contribution of each game to total handle.

#### ME2-2.4: Win Contribution

**Requirement**: The system should evaluate each game contribution to the win within the time range.

**Formula (Calc. 3)**: `(gameTotalWin / totalWin) * 100`

**Display**: Percentage contribution of each game to total win.

#### ME2-2.5: Games Played Contribution

**Requirement**: The system should evaluate each game contribution to the games played within the time range.

**Formula (Calc. 3)**: `(gameTotalGamesPlayed / totalGamesPlayed) * 100`

**Display**: Percentage contribution of each game to total games played.

#### ME2-2.6: Game Legend

**Requirement**: The system should show a legend where each game name is associated with its own color.

**Display**: Visual legend showing game names with corresponding colors used in the chart.

---

### ME3: Top Machines Analysis

#### ME3-1.0: Top Machines Criteria Selection

**Requirement**: The user should be able to select the criteria for the Top Machines within the time range.

**Description**: Users can choose which metric to use for ranking and displaying top machines.

#### ME3-1.1: Clickable Metric Selection

**Requirement**: The user should be able to click on a key metric to select it as the criteria for the Top Machines table.

**Available Metrics**:

- Handle (coin-in)
- Net Win
- Gross
- Games Played
- Actual Hold
- Theoretical Hold
- Average Wager
- Jackpot

**Interaction**: Clicking a metric selects it as the sorting criteria.

#### ME3-1.2: Toggle Sort Direction

**Requirement**: The user should be able to click on the same key metric to switch between ascending / descending sort.

**Behavior**:

- First click: Sort ascending
- Second click (same metric): Sort descending
- Clicking different metric: Switch to that metric, default to ascending

#### ME3-1.3: Visual Indicator

**Requirement**: The system should use a highlighted arrow to display the currently selected search criteria.

**Display**: Visual arrow indicator showing which metric is currently selected for sorting.

#### ME3-1.4: Arrow Direction Indication

**Requirement**: The arrow should be either pointing up or down to indicate if the sort is ascending / descending.

**Display**:

- Arrow up (↑): Ascending sort
- Arrow down (↓): Descending sort

---

### ME3: Top Machines Table

#### ME3-2.0: Top Machines Table Display

**Requirement**: The system should display the key metrics of the Top Machines within the time range in a table format.

**Description**: Table showing top-performing machines based on selected criteria.

#### ME3-2.1: Machine ID Column

**Requirement**: The Top Machines table should state the machine id of each of the machines within the time range.

**Display**: Machine identifier (serial number, custom name, or machine ID).

#### ME3-2.2: Handle Column

**Requirement**: The Top Machines table should state the handle of each of the machines within the time range.

**Display**: Total coin-in (handle) for each machine.

#### ME3-2.3: Average Wager Column (Calc. 1)

**Requirement**: The Top Machines table should state the average wager of each of the machines within the time range (Calc. 1).

**Formula (Calc. 1)**: `handle / gamesPlayed`

**Display**: Average amount wagered per game.

#### ME3-2.4: Win Column

**Requirement**: The Top Machines table should state the win of each of the machines within the time range.

**Display**: Net win (coin-in - coin-out) for each machine.

#### ME3-2.5: Jackpot Column

**Requirement**: The Top Machines table should state the jackpot of each of the machines within the time range.

**Display**: Total jackpot amount for each machine.

#### ME3-2.6: Theoretical Hold Column

**Requirement**: The Top Machines table should state the theoretical hold of each of the machines within the time range.

**Formula**: `(1 - theoreticalRtp) * 100`

**Display**: Expected hold percentage based on game configuration.

#### ME3-2.7: Actual Hold Column (Calc. 2)

**Requirement**: The Top Machines table should state the actual hold of the machines within the time range (Calc. 2).

**Formula (Calc. 2)**: `((coinIn - coinOut) / coinIn) * 100`

**Display**: Actual hold percentage based on real gameplay data.

#### ME3-2.8: Games Played Column

**Requirement**: The Top Machines table should state the games played of each of the machines within the time range.

**Display**: Total number of games played for each machine.

---

## Calculation Formulas Summary

### Calc. 1: Average Wager

```
Average Wager = Handle / Games Played
```

### Calc. 2: Actual Hold

```
Actual Hold = ((Coin In - Coin Out) / Coin In) * 100
```

### Calc. 3: Contribution Percentage

```
Contribution % = (Item Metric / Total Metric) * 100
```

**Examples**:

- Machine Handle Contribution = (Machine Handle / Total Handle) \* 100
- Manufacturer Win Contribution = (Manufacturer Total Win / Total Win) \* 100
- Game Games Played Contribution = (Game Total Games Played / Total Games Played) \* 100

---

## UI/UX Requirements

### Summary Section

- Display all three contribution percentages (handle, win, games played)
- Clear, readable format
- Percentage values with appropriate decimal precision (typically 1-2 decimal places)

### Manufacturer Performance Chart

- Bar chart with multiple bars per manufacturer
- Each bar represents a different metric
- Color-coded legend
- Percentage values on Y-axis
- Manufacturer names on X-axis

### Game Performance Chart

- Bar chart with multiple bars per game
- Each bar represents a different metric
- Color-coded legend
- Percentage values on Y-axis
- Game names on X-axis (truncated if too long)

### Top Machines Criteria Selector

- Clickable metric buttons
- Visual arrow indicator for selected metric
- Arrow direction indicates sort order
- Clear visual feedback on interaction

### Top Machines Table

- All required columns displayed
- Sortable by selected criteria
- Clear column headers
- Responsive design for mobile/desktop

---

## Data Requirements

### Machine Data Fields Required

- Machine ID / Serial Number
- Location
- Manufacturer
- Game Title
- Coin In (Handle)
- Coin Out
- Net Win (Win)
- Drop
- Gross
- Cancelled Credits
- Games Played
- Jackpot
- Theoretical RTP
- Last Activity

### Aggregation Requirements

- Group machines by manufacturer
- Group machines by game
- Calculate totals across all machines
- Calculate percentages for each group
- Sort machines by selected criteria

---

## Time Range Considerations

All calculations and displays must respect the selected time range:

- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- Quarterly
- Custom (user-selected date range)
- All Time

---

## Related Documentation

- `Documentation/MACHINES_EVALUATION_TAB.md` - Current implementation documentation
- `Documentation/financial-metrics-guide.md` - Financial metrics formulas
- `Documentation/PROJECT_GUIDE.md` - Overall project structure
