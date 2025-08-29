# Casino Management System: Financial Metrics Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Date:** August 29, 2025

## Introduction

This document provides a comprehensive overview of key financial metrics used in the Evolution One Casino Management System (CMS) to track and manage slot machine performance. These metrics help casino operators analyze revenue, monitor machine activity, and ensure compliance with financial regulations.

## Key Financial Metrics

### Drop (Money In)
- **Definition**: The total amount of money physically inserted into a slot machine by players
- **Data Source**: `movement.drop` field in meter readings
- **Purpose**: Tracks the actual cash flow into machines

### Total Cancelled Credits (Money Out)
- **Definition**: The amount of money removed from the machine through handpay/ticket out
- **Alternative Names**: "Money Out" or "Cancelled Credits"
- **Data Source**: `movement.totalCancelledCredits` field in meter readings
- **Purpose**: Tracks manual payouts processed by casino staff
- **Note**: This occurs when payouts are manually processed rather than automatically dispensed

### Coin In
- **Definition**: The total value of bets placed in the machine
- **Alternative Names**: "Handle" and "Wager"
- **Data Source**: `movement.coinIn` field in meter readings
- **Purpose**: Represents the total amount players have wagered
- **Distinction**: Different from Drop as it tracks betting activity rather than physical money insertion

### Coin Out
- **Definition**: The total amount won by players from the machine
- **Alternative Names**: 'Money Won'
- **Data Source**: `movement.coinOut` field in meter readings
- **Purpose**: Tracks all winnings paid out automatically by the machine
- **Distinction**: Automatic payouts vs. manual cancelled credits

### Games Played
- **Definition**: The total number of games played on the machine
- **Data Source**: `movement.gamesPlayed` field in meter readings
- **Purpose**: Tracks player activity and usage patterns
- **Usage**: Used for calculating average wager per game and hold percentages

### Games Won
- **Definition**: The total number of games won by players
- **Data Source**: `movement.gamesWon` field in meter readings
- **Purpose**: Tracks winning game frequency
- **Usage**: Used for calculating win rate and game performance metrics

### Total Won Credits
- **Definition**: The total amount of money won by players
- **Data Source**: `movement.totalWonCredits` field in meter readings and is calculated from coinOut + jackpot
- **Purpose**: Shows the cumulative payout the machine has awarded to players
- **Usage**: Used in financial calculations such as voucher out on meters export report

### Theoretical Hold
- **Definition**: The total amount of money a machine holds over its lifetime
- **Calculated in Machines Collection**: 1 - `gameConfig.theoreticalRtp`
- **Usage**: Used in Machines Evaluation

### Theoretical Hold %
- **Definition**: The percentage of the theoreticalHold
- **Calculated in Machines Collection**: 1 - `gameConfig.theoreticalRtp`
- **Usage**: Used in Machines Evaluation



## Financial Calculations

### Primary Gross Revenue Calculation

Gross revenue represents the machine's net earnings after payouts and is calculated as:

```
Gross = Drop - Total Cancelled Credits
```

Where:
- **Drop** = Total money physically inserted into the machine (`movement.drop`)
- **Total Cancelled Credits** = Money removed from the machine via manual payouts (`movement.totalCancelledCredits`)

### Alternative Calculation Methods

#### Handle and Win Analysis (Alternative Method)

Based on betting activity analysis:

```typescript
// Handle = Total bets placed (equivalent to Coin In)
const handle = sumOf(movement.coinIn);

// Win (used for hold calculation which = win/handle * 100) = Theoretical winnings (coinIn - coinOut)
const win = sumOf(movement.coinOut)
const total win = sumOf(movement.coinOut) + sumOf(movement.jackpot)
const win/lose = sumOf(movement.coinOut) - sumOf(movement.coinIn) ;

// Actual Hold Percentage = (win / handle) * 100
const actualRtp = win / handle;
const actualRtp% = actualRtp * 100%;

const actualHold = 1 - actualRtp
const actualHold% = actualHold * 100%;

const theoreticalHold = 1 - `gameConfig.theoreticalRtp`
const theoreticalHoldPercent = (1 - `gameConfig.theoreticalRtp`) * 100

// Average Wager Per Game = handle / gamesPlayed
const avgWagerPerGame = handle / sumOf(movement.gamesPlayed);
```

#### Key Performance Metrics

```typescript
// Games-based metrics
const totalGamesPlayed = sumOf(movement.gamesPlayed);
const totalGamesWon = sumOf(movement.gamesWon);
const winRate = (totalGamesWon / totalGamesPlayed) * 100;

// Financial performance
const jackpotPayouts = sumOf(movement.jackpot);
const currentCredits = sumOf(movement.currentCredits);
```

#### Meters Report Specific Mappings:

The meters report uses **different data sources** based on date range:

**For Recent Data (Today/Yesterday):**
- **Meters In** = `machine.sasMeters.coinIn` (total bets placed)
- **Money Won** = `machine.sasMeters.totalWonCredits` (total winnings paid to players)
- **Bill In** = `machine.sasMeters.drop` (physical cash inserted)
- **Voucher Out** = `machine.sasMeters.totalCancelledCredits - machine.sasMeters.totalHandPaidCancelledCredits`
- **Hand Paid Cancelled Credits** = `machine.sasMeters.totalHandPaidCancelledCredits`
- **Jackpot** = `machine.sasMeters.jackpot` (jackpot payouts)
- **Games Played** = `machine.sasMeters.gamesPlayed` (total games played)

**For Historical Data (7 days, 30 days, custom ranges):**
- **Movement Calculation**: Uses first and last meter readings within time period to calculate movement
- **Movement Logic**: `lastMeter.field - firstMeter.field` (if multiple readings), or `lastMeter.field` (if single reading)
- **Fallback Logic**: If movement is 0 or unavailable, falls back to `machine.sasMeters` values
- **Field Mappings** (after movement calculation or fallback):
  - **Meters In** = movement in `coinIn` OR fallback to `machine.sasMeters.coinIn`
  - **Money Won** = movement in `totalWonCredits` OR fallback to `machine.sasMeters.totalWonCredits`
  - **Bill In** = movement in `drop` OR fallback to `machine.sasMeters.drop`
  - **Voucher Out** = movement calculation: `totalCancelledCredits - totalHandPaidCancelledCredits`
  - **Hand Paid Cancelled Credits** = movement in `totalHandPaidCancelledCredits` OR fallback to `machine.sasMeters.totalHandPaidCancelledCredits`
  - **Jackpot** = movement in `jackpot` OR fallback to `machine.sasMeters.jackpot`
  - **Games Played** = movement in `gamesPlayed` OR fallback to `machine.sasMeters.gamesPlayed`

**Important**: Historical data calculates movement from meters collection, with fallback to `machine.sasMeters` when movement is zero

#### Casino Machine Context:
4. **Hand Paid Cancelled Credits**: Manual payouts by casino attendants for large wins or malfunctions
5. **Voucher Out**: Automatic ticket/voucher dispensing (excludes manual payouts)

This distinction is critical because the Meters Report shows **raw meter data** while other reports show **financial movement calculations**.

## Data Sources and Structure

### Meters Collection
The primary data source for financial metrics is the `Meters` collection with the following structure:

```typescript
type MeterData = {
  machine: string;
  location: string;
  // Top-level fields (used in Meters Report)
  coinIn: number;                    // Total bets placed
  coinOut: number;                   // Automatic winnings paid
  totalCancelledCredits: number;     // All cancelled credits (vouchers + hand-paid)
  totalHandPaidCancelledCredits: number; // Manual attendant payouts
  drop: number;                      // Physical money inserted (Bill In)
  jackpot: number;                   // Jackpot payouts
  currentCredits: number;            // Current machine credits
  gamesPlayed: number;               // Total games played
  gamesWon: number;                  // Total games won
  // Movement fields (used in other financial calculations)
  movement: {
    coinIn: number;                  // Total bets placed
    coinOut: number;                 // Automatic winnings paid
    totalCancelledCredits: number;   // Manual payouts (Money Out)
    drop: number;                    // Physical money inserted (Money In)
    jackpot: number;                 // Jackpot payouts
    currentCredits: number;          // Current machine credits
    gamesPlayed: number;             // Total games played
    gamesWon: number;                // Total games won
    billIn: number;                  // Bill acceptor input
    voucherOut: number;              // Voucher dispenser output
    attPaidCredits: number;          // Attendant paid credits
  };
  createdAt: Date;
  readAt: Date;
  machineId: string;
}
```

## Tracking Machine Performance

### Calculating Machine Inflow Over Time

To determine how much money was inserted into a machine over a given period:

1. **Filter by date range** using `readAt` field (NOT `createdAt`)
2. Sum all recorded `movement.drop` values from the machine's meter readings
3. Aggregate across multiple machines for location totals

#### Critical Date Field Usage

⚠️ **Important**: Always use `readAt` field for date filtering on meter data:

```javascript
// ✅ CORRECT - Use readAt for meter date queries
const metersQuery = {
  machine: machineId,
  readAt: { $gte: startDate, $lte: endDate }
};

// ❌ INCORRECT - Do not use createdAt for meter date filtering
const wrongQuery = {
  machine: machineId,
  createdAt: { $gte: startDate, $lte: endDate }  // Wrong field!
};
```

### Movement Log Analysis

The Movement section tracks changes in machine activity over time:

#### Example Movement Calculation:
```javascript
// If current reading shows drop = 250 and previous reading showed drop = 100
const movementDrop = currentReading.movement.drop - previousReading.movement.drop;
// Result: 150 (money inserted since last reading)
```

### Key Movement Metrics:

- **Drop Movement**: Tracks changes in money inserted over time
- **Total Cancelled Credits Movement**: Monitors manual payouts removed from the machine
- **Coin In Movement**: Reflects player betting trends
- **Coin Out Movement**: Tracks fluctuations in automatic winnings

## API Implementation Standards

### Correct Field Mapping

When implementing financial metrics in API endpoints:

```typescript
// ✅ CORRECT - Use these fields for MOST financial calculations
const moneyIn = meterData.movement.drop;
const moneyOut = meterData.movement.totalCancelledCredits;
const gross = moneyIn - moneyOut;

// ❌ INCORRECT - Do not use these for general financial metrics
const wrongMoneyIn = meterData.movement.coinIn;    // This is betting activity
const wrongMoneyOut = meterData.movement.coinOut;  // This is automatic payouts

// ⚠️ EXCEPTION - Meters Report uses different mappings based on date range:
// For /api/reports/meters endpoint ONLY:

// Recent data (Today/Yesterday) - use machine.sasMeters:
const metersIn = machineData.sasMeters.coinIn;                    // Total bets placed
const moneyWon = machineData.sasMeters.totalWonCredits;           // Total winnings paid
const billIn = machineData.sasMeters.drop;                       // Physical cash inserted
const voucherOut = machineData.sasMeters.totalCancelledCredits - // Net cancelled credits
                   machineData.sasMeters.totalHandPaidCancelledCredits;
const handPaidCredits = machineData.sasMeters.totalHandPaidCancelledCredits; // Manual payouts
const jackpot = machineData.sasMeters.jackpot;                   // Jackpot payouts
const gamesPlayed = machineData.sasMeters.gamesPlayed;           // Total games played

// Historical data (7 days, 30 days, custom) - use meters collection top-level fields:
const metersIn = latestMeterData.coinIn;                         // Total bets placed
const moneyWon = latestMeterData.totalWonCredits;                // Total winnings paid
const billIn = latestMeterData.drop;                             // Physical cash inserted
const voucherOut = latestMeterData.totalCancelledCredits -       // Net cancelled credits
                   latestMeterData.totalHandPaidCancelledCredits;
const handPaidCredits = latestMeterData.totalHandPaidCancelledCredits; // Manual payouts
const jackpot = latestMeterData.jackpot;                         // Jackpot payouts
const gamesPlayed = latestMeterData.gamesPlayed;                 // Total games played
```

### Formatting and Display

- Use consistent currency formatting across all components
- Display metrics with appropriate precision (typically 2 decimal places)
- Include proper labels and tooltips explaining metric meanings
- Ensure responsive design for mobile and desktop views

## Compliance and Auditing

### Regulatory Requirements

- All financial metrics must be traceable to source meter readings
- Movement calculations must be auditable with clear timestamps
- Gross revenue calculations must be consistent across all system components
- Data integrity checks should validate that Drop ≥ Total Cancelled Credits

### Audit Trail

The system maintains audit trails through:
- Timestamped meter readings in the `Meters` collection
- Movement calculations logged with source data references
- Financial report generation with calculation methodology documentation

## Common Pitfalls and Best Practices

- [Meters Report API](backend/meters-report-api.md) - Meters report endpoint documentation
- [API Overview](backend/api-overview.md) - Complete API documentation
- [Analytics API](backend/analytics-api.md) - Analytics and reporting endpoints
- [Collections API](backend/collections-api.md) - Collection and meter data management
- [Reports API](backend/reports-api.md) - Reports backend API documentation
- [Engineering Guidelines](ENGINEERING_GUIDELINES.md) - Development standards and practices

## Support and Maintenance

For questions about financial metrics implementation:
1. Review this guide for proper field mapping
2. Check API documentation for endpoint specifications
3. Validate calculations against meter data sources
4. Ensure compliance with casino regulatory requirements

---

**Last Updated**: August 28, 2025  
**Version**: 2.0  
**Maintained By**: Aaron Hazzard - Senior Software Engineer
