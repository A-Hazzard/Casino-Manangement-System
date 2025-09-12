# Financial Metrics Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025  
**Version:** 2.0.0

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
- **Definition**: The total amount of money physically inserted into slot machines by players
- **Data Source**: `movement.drop` field in meter readings
- **UI Usage**: Primary metric displayed in Financial Metrics Cards and Dashboard
- **Purpose**: Tracks actual cash flow into machines

### Money Out (Total Cancelled Credits)
- **Definition**: The amount of money removed from machines through manual payouts
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
Location Total Gross = Σ(Machine Gross) for all machines at location
Location Total Drop = Σ(Machine Money In) for all machines at location
Location Total Money Out = Σ(Machine Money Out) for all machines at location
```

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
    drop: number;                    // Money In - physical cash inserted
    totalCancelledCredits: number;   // Money Out - manual payouts
    coinIn: number;                  // Handle - total bets placed
    jackpot: number;                 // Jackpot payouts
    gamesPlayed: number;             // Total games played
  };
  
  // Machine embedded data (fallback)
  sasMeters: {
    drop: number;                    // Money In fallback
    totalCancelledCredits: number;   // Money Out fallback
    coinIn: number;                  // Handle fallback
    jackpot: number;                 // Jackpot fallback
    gamesPlayed: number;             // Games played fallback
  };
}
```

### Collection Meters (for Collection Reports)
```typescript
// Collection-specific fields
type CollectionFields = {
  collectionMeters: {
    metersIn: number;                // Money in machine at collection start
    metersOut: number;               // Money in machine at collection end
  };
}
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
  readAt: { $gte: startDate, $lte: endDate }
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

**Last Updated:** August 29th, 2025
