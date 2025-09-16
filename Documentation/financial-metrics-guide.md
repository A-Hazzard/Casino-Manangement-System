# Financial Metrics Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025

## Quick Search Guide (Ctrl+F)

- **money in** - Drop calculations and usage
- **money out** - Cancelled credits calculations
- **gross revenue** - Net earnings calculations
- **collection calculations** - Collection system formulas
- **dashboard metrics** - Dashboard display calculations
- **location aggregation** - Location-level calculations
- **machine performance** - Individual machine metrics
- **profit sharing** - Location profit calculations
- **amount to collect** - Collection amount formulas
- **balance management** - Balance calculations

## Overview

This guide covers all financial metrics used in the Evolution One Casino Management System. All calculations follow standard casino industry practices and support regulatory reporting requirements.

## Core Financial Metrics

### Money In (Drop)
- **Definition**: Total money physically inserted into slot machines by players
- **Data Source**: `movement.drop` field in meter readings
- **UI Usage**: Primary metric in Financial Metrics Cards and Dashboard
- **Purpose**: Tracks actual cash flow into machines

### Money Out (Total Cancelled Credits)
- **Definition**: Amount of money removed from machines through manual payouts
- **Data Source**: `movement.totalCancelledCredits` field in meter readings
- **UI Usage**: Displayed in Financial Metrics Cards and Location Tables
- **Purpose**: Tracks manual payouts processed by casino staff

### Gross Revenue
- **Definition**: Net earnings after payouts (Money In - Money Out)
- **Calculation**: `gross = moneyIn - moneyOut`
- **UI Usage**: Primary financial metric in all reports and dashboards
- **Purpose**: Shows actual profit from machine operations

### Jackpot
- **Definition**: Total jackpot amounts paid out by machines
- **Data Source**: `movement.jackpot` field in meter readings
- **UI Usage**: Displayed in Location Tables and Machine Performance
- **Purpose**: Tracks large payouts and jackpot activity

### Handle (Coin In)
- **Definition**: Total value of bets placed in machines
- **Data Source**: `movement.coinIn` field in meter readings
- **UI Usage**: Used in Machine Evaluation and Performance Analysis
- **Purpose**: Represents total wagering activity

## Financial Calculations

### Primary Gross Revenue Calculation

```
Gross = Money In - Money Out
```

Where:
- **Money In** = `movement.drop` (total money physically inserted)
- **Money Out** = `movement.totalCancelledCredits` (manual payouts)

### Machine Performance Calculations

#### Average Wager Per Game
```
Average Wager = Handle / Games Played
```

Where:
- **Handle** = `movement.coinIn` (total bets placed)
- **Games Played** = `movement.gamesPlayed` (total games)

#### Location Aggregation
```
Location Money In = Sum of all machine drops at location
Location Money Out = Sum of all machine cancelled credits at location
Location Gross = Location Money In - Location Money Out
```

### Collection System Calculations

#### Meter Movement Calculations
```
Collection Drop = Current Meters In - Previous Meters In
Collection Cancelled = Current Meters Out - Previous Meters Out
Collection Gross = Collection Drop - Collection Cancelled
```

#### RAM Clear Meter Calculations
When machine memory resets (rollover/reset):
```
Collection Drop = (RAM Clear metersIn - Previous metersIn) + Current metersIn
Collection Cancelled = (RAM Clear metersOut - Previous metersOut) + Current metersOut
```

#### Amount to Collect Calculation
```
Amount to Collect = Total Gross - Variance - Advance - Partner Profit + Previous Balance
```

#### Partner Profit Calculation
```
Partner Profit = Floor((Total Gross - Variance - Advance) × Profit Share % ÷ 100) - Taxes
```

#### Balance Management
```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
Balance Correction = Amount Collected (default, but editable)
```

### Dashboard Calculations

#### Financial Metrics Cards
```
Total Money In = Sum of movement.drop across all locations
Total Money Out = Sum of movement.totalCancelledCredits across all locations
Total Gross = Total Money In - Total Money Out
```

#### Location Performance
```
Location Revenue = Location Gross × (100 - Profit Share %) ÷ 100
Partner Revenue = Location Gross × Profit Share % ÷ 100
```

## Data Sources and Implementation

### Meter Readings (movement field)
- **Source**: `meters` collection
- **Fields**: `movement.drop`, `movement.totalCancelledCredits`, `movement.jackpot`, `movement.coinIn`, `movement.gamesPlayed`
- **Purpose**: Raw meter data from slot machines

### Collection Data
- **Source**: `collections` and `collectionReports` collections
- **Fields**: `totalDrop`, `totalCancelled`, `totalGross`, `amountToCollect`, `partnerProfit`
- **Purpose**: Processed collection calculations

### Location Data
- **Source**: `gaminglocations` collection
- **Fields**: `profitShare`, `collectionBalance`, `previousCollectionTime`
- **Purpose**: Location-specific configuration and balances

### Machine Data
- **Source**: `machines` collection
- **Fields**: `collectionMeters.metersIn`, `collectionMeters.metersOut`, `collectionMetersHistory`
- **Purpose**: Machine-specific collection history

## Calculation Examples

### Example 1: Basic Machine Collection
```
Machine Previous Meters In: 1,000
Machine Current Meters In: 1,500
Machine Previous Meters Out: 200
Machine Current Meters Out: 250

Collection Drop = 1,500 - 1,000 = 500
Collection Cancelled = 250 - 200 = 50
Machine Gross = 500 - 50 = 450
```

### Example 2: Location Profit Sharing
```
Location Total Gross: 10,000
Location Profit Share: 50%
Taxes: 200
Advance: 100
Variance: 0
Previous Balance: 500

Partner Profit = Floor((10,000 - 0 - 100) × 50 ÷ 100) - 200 = Floor(4,950) - 200 = 4,750
Amount to Collect = 10,000 - 0 - 100 - 4,750 + 500 = 5,650
```

### Example 3: RAM Clear Scenario
```
Machine Previous Meters In: 1,000
Machine RAM Clear Meters In: 1,200
Machine Current Meters In: 300

Collection Drop = (1,200 - 1,000) + 300 = 200 + 300 = 500
```

## Business Context

### Revenue Recognition
- **Money In**: Recognized when physically inserted into machines
- **Money Out**: Recognized when manually paid out to players
- **Gross Revenue**: Net revenue after all payouts
- **Partner Profit**: Location's share based on profit sharing agreement

### Collection Process
- **Meter Readings**: Physical meter readings from machines
- **Movement Calculation**: Difference between current and previous readings
- **Amount Calculation**: Based on profit sharing and balance management
- **Collection Entry**: Recording actual cash collected

### Balance Management
- **Previous Balance**: Outstanding amount from previous collections
- **Current Balance**: Updated balance after each collection
- **Balance Correction**: Manual adjustments for discrepancies
- **Location Balance**: Running balance for each location

## Performance Considerations

### Database Aggregation
- **Location Aggregation**: Efficient grouping by location
- **Time Period Filtering**: Optimized date range queries
- **Machine Filtering**: Efficient machine-specific queries
- **Indexing**: Proper indexes on frequently queried fields

### Real-time Calculations
- **Dashboard Updates**: Live calculation of totals
- **Collection Updates**: Real-time balance updates
- **Variance Detection**: Immediate variance calculations
- **Performance Monitoring**: Efficient metric calculations

## Compliance and Reporting

### Regulatory Requirements
- **Financial Accuracy**: Precise tracking of all money movements
- **Audit Trail**: Complete history of all financial transactions
- **Data Retention**: Proper archival of historical data
- **Reporting**: Automated generation of compliance reports

### Data Integrity
- **Validation Rules**: All financial inputs validated
- **Constraint Checks**: Database constraints prevent invalid data
- **Rollback Capability**: Ability to reverse changes if needed
- **Backup Procedures**: Regular data backup and recovery