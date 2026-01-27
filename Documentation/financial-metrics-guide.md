# Financial Metrics Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Status:** Updated to reflect current implementation

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

**Last Updated:** January 2026  
**Version:** 2.1.0

## Table of Contents

1. [Overview](#overview)
2. [Core Financial Metrics](#core-financial-metrics)
3. [Financial Calculations](#financial-calculations)
4. [Collection System Metrics](#collection-system-metrics)
5. [Performance Metrics](#performance-metrics)
6. [Data Sources and Implementation](#data-sources-and-implementation)
7. [Calculation Examples](#calculation-examples)
8. [Business Context](#business-context)

## Overview

This document provides a comprehensive guide to the financial metrics used in the Evolution One Casino Management System. These metrics drive all financial calculations, reporting, and business intelligence features throughout the system.

### Key Principles

- **Accuracy**: All calculations follow standard casino industry practices
- **Transparency**: Clear formulas and data sources for all metrics
- **Compliance**: Metrics support regulatory reporting requirements
- **Real-time**: Live calculations for operational decision making

### System Integration

- **Dashboard Analytics**: Real-time financial performance monitoring
- **Collection System**: Automated collection and reporting calculations
- **Location Management**: Location-specific financial tracking
- **Machine Performance**: Individual machine financial analysis

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

### Average Wager Per Game

- **Definition**: Average bet amount per game played
- **Calculation**: `handle / gamesPlayed`
- **UI Usage**: Machine performance metrics and evaluation
- **Purpose**: Shows player betting patterns

## Financial Calculations

### Primary Gross Revenue Calculation

The core financial calculation used throughout the UI:

```
Gross = Money In - Money Out
```

Where:

- **Money In** = `movement.drop` (total money physically inserted)
- **Money Out** = `movement.totalCancelledCredits` (manual payouts)

### SAS GROSS Calculation (Updated October 9, 2025)

**Current Implementation:** Movement Delta Method
**Formula:**

```
SAS GROSS = Sum(movement.drop) - Sum(movement.totalCancelledCredits)
```

**Data Source:** `meters` collection
**Time Period:** Uses SAS time periods from collections
**Accuracy:** High - accounts for all meter readings in period

**Implementation Across Pages:**

- ✅ **Collection Report Details**: Queries meters for SAS time period
- ✅ **Cabinets Page**: Uses MongoDB aggregation pipeline
- ✅ **Location Details**: Uses MongoDB aggregation pipeline
- ✅ **Dashboard**: Aggregates across all locations
- ✅ **Collection Reports**: Recalculates SAS GROSS on-the-fly

**Deprecated Method:** First/Last Cumulative Method (no longer used)

- Only used 2 data points (first and last meter readings)
- Missed intermediate changes and corrections
- Only worked with cumulative data (coinIn/coinOut fields)

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

Location Total Gross = Σ(Machine Gross) for all machines at location
Location Total Drop = Σ(Machine Money In) for all machines at location
Location Total Money Out = Σ(Machine Money Out) for all machines at location

## UI Implementation

### Financial Metrics Cards

The main dashboard displays three core metrics:

- **Money In**: Total cash inserted into machines
- **Money Out**: Total manual payouts from machines
- **Gross**: Net revenue (Money In - Money Out)

### Location Tables

Location performance shows:

- **Money In**: Aggregated drop from all machines at location
- **Money Out**: Aggregated cancelled credits from all machines
- **Jackpot**: Total jackpot payouts at location
- **Gross**: Net revenue for the location

### Machine Evaluation

Machine performance metrics include:

- **Handle**: Total betting activity (coinIn)
- **Average Wager Per Game**: Handle divided by games played
- **Money In/Out**: Individual machine financial performance
- **Gross**: Machine-specific net revenue

## Data Sources

### Primary Data Fields Used in UI

The UI primarily uses these fields from the `Meters` collection:

```typescript
// Core financial fields used in UI
type UIFinancialFields = {
  // Movement data (primary source)
  movement: {
    drop: number; // Money In - physical cash inserted
    totalCancelledCredits: number; // Money Out - manual payouts
    coinIn: number; // Handle - total bets placed
    jackpot: number; // Jackpot payouts
    gamesPlayed: number; // Total games played
  };

  // Machine embedded data (fallback)
  sasMeters: {
    drop: number; // Money In fallback
    totalCancelledCredits: number; // Money Out fallback
    coinIn: number; // Handle fallback
    jackpot: number; // Jackpot fallback
    gamesPlayed: number; // Games played fallback
  };
};
```

### Collection Meters (for Collection Reports)

```typescript
// Collection-specific fields
type CollectionFields = {
  collectionMeters: {
    metersIn: number; // Money in machine at collection start
    metersOut: number; // Money in machine at collection end
  };
};
```

## API Implementation Standards

### Correct Field Mapping for UI

When implementing financial metrics in API endpoints:

```typescript
// ✅ CORRECT - Primary fields used in UI
const moneyIn = meterData.movement.drop;
const moneyOut = meterData.movement.totalCancelledCredits;
const gross = moneyIn - moneyOut;
const handle = meterData.movement.coinIn;
const jackpot = meterData.movement.jackpot;
const gamesPlayed = meterData.movement.gamesPlayed;

// ✅ FALLBACK - Use sasMeters when movement data unavailable
const moneyInFallback = machineData.sasMeters.drop;
const moneyOutFallback = machineData.sasMeters.totalCancelledCredits;
const grossFallback = moneyInFallback - moneyOutFallback;
```

### Date Filtering

⚠️ **Important**: Always use `readAt` field for date filtering on meter data:

```javascript
// ✅ CORRECT - Use readAt for meter date queries
const metersQuery = {
  machine: machineId,
  readAt: { $gte: startDate, $lte: endDate },
};
```

## Calculation Examples

### Example 1: Daily Location Performance

**Scenario**: Main Casino location for one day

**Input Data**:

- Money In (Drop): $15,000
- Money Out (Cancelled Credits): $500
- Handle (Coin In): $50,000
- Games Played: 2,500
- Jackpot: $1,000

**Calculations**:

```
Gross Revenue = Money In - Money Out
Gross Revenue = $15,000 - $500 = $14,500

Hold Percentage = (Gross Revenue / Handle) × 100
Hold Percentage = ($14,500 / $50,000) × 100 = 29%

Average Wager = Handle / Games Played
Average Wager = $50,000 / 2,500 = $20.00 per game
```

**Results**:

- **Gross Revenue**: $14,500
- **Hold Percentage**: 29%
- **Average Wager**: $20.00

### Example 2: Collection Period Calculation

**Scenario**: Collecting from Machine A over 7 days

**Meter Readings**:

- Previous metersIn: 1,000
- Current metersIn: 1,500
- Previous metersOut: 200
- Current metersOut: 300

**Calculations**:

```
Collection Drop = Current metersIn - Previous metersIn
Collection Drop = 1,500 - 1,000 = 500

Collection Cancelled = Current metersOut - Previous metersOut
Collection Cancelled = 300 - 200 = 100

Collection Gross = Collection Drop - Collection Cancelled
Collection Gross = 500 - 100 = 400

Amount to Collect = Collection Drop / 2 (50/50 profit sharing)
Amount to Collect = 500 / 2 = 250
```

**Results**:

- **Collection Drop**: $500
- **Collection Cancelled**: $100
- **Collection Gross**: $400
- **Amount to Collect**: $250

### Example 3: Multi-Location Aggregation

**Scenario**: Three locations for monthly reporting

**Location A**:

- Money In: $45,000
- Money Out: $1,500
- Handle: $150,000

**Location B**:

- Money In: $32,000
- Money Out: $800
- Handle: $120,000

**Location C**:

- Money In: $28,000
- Money Out: $1,200
- Handle: $100,000

**Aggregated Calculations**:

```
Total Money In = 45,000 + 32,000 + 28,000 = $105,000
Total Money Out = 1,500 + 800 + 1,200 = $3,500
Total Handle = 150,000 + 120,000 + 100,000 = $370,000

Total Gross Revenue = Total Money In - Total Money Out
Total Gross Revenue = 105,000 - 3,500 = $101,500

Overall Hold Percentage = (Total Gross Revenue / Total Handle) × 100
Overall Hold Percentage = (101,500 / 370,000) × 100 = 27.43%
```

**Results**:

- **Total Money In**: $105,000
- **Total Money Out**: $3,500
- **Total Gross Revenue**: $101,500
- **Overall Hold Percentage**: 27.43%

## Business Context

### Financial Reporting

These metrics support comprehensive financial reporting including:

- **Daily Operations**: Real-time performance monitoring
- **Monthly Reports**: Comprehensive financial analysis
- **Regulatory Compliance**: Automated compliance reporting
- **Business Intelligence**: Data-driven decision making

### Operational Benefits

- **Performance Tracking**: Monitor machine and location performance
- **Revenue Optimization**: Identify high-performing machines and locations
- **Cost Management**: Track operational costs and efficiency
- **Compliance**: Meet regulatory reporting requirements

### System Integration

- **Dashboard Analytics**: Real-time financial performance display
- **Collection Management**: Automated collection calculations
- **Location Management**: Location-specific financial tracking
- **Machine Monitoring**: Individual machine performance analysis

---

**Last Updated:** January 2026
