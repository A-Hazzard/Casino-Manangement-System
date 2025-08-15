# Casino Management System: Financial Metrics Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Date:** February 26, 2025

## Introduction

This document provides a comprehensive overview of key financial metrics used in the Evolution One Casino Management System (CMS) to track and manage slot machine performance. These metrics help casino operators analyze revenue, monitor machine activity, and ensure compliance with financial regulations.

## Key Financial Metrics

### Drop (Money In)
- **Definition**: The total amount of money physically inserted into a slot machine by players
- **Alternative Names**: "Money In", "Handle", or "Wager"
- **Data Source**: `movement.drop` field in meter readings
- **Purpose**: Tracks the actual cash flow into machines

### Total Cancelled Credits (Money Out)
- **Definition**: The amount of money removed from the machine through manual payouts
- **Alternative Names**: "Money Out" or "Cancelled Credits"
- **Data Source**: `movement.totalCancelledCredits` field in meter readings
- **Purpose**: Tracks manual payouts processed by casino staff
- **Note**: This occurs when payouts are manually processed rather than automatically dispensed

### Coin In
- **Definition**: The total value of bets placed in the machine
- **Data Source**: `movement.coinIn` field in meter readings
- **Purpose**: Represents the total amount players have wagered
- **Distinction**: Different from Drop as it tracks betting activity rather than physical money insertion

### Coin Out
- **Definition**: The total amount won by players from the machine
- **Data Source**: `movement.coinOut` field in meter readings
- **Purpose**: Tracks all winnings paid out automatically by the machine
- **Distinction**: Automatic payouts vs. manual cancelled credits

## Gross Revenue Calculation

Gross revenue represents the machine's net earnings after payouts and is calculated as:

```
Gross = Drop - Total Cancelled Credits
```

Where:
- **Drop** = Total money physically inserted into the machine (`movement.drop`)
- **Total Cancelled Credits** = Money removed from the machine via manual payouts (`movement.totalCancelledCredits`)

### Important Implementation Notes

⚠️ **Critical**: In our system, financial calculations should use:
- **Money In**: `movement.drop` (NOT `movement.coinIn`)
- **Money Out**: `movement.totalCancelledCredits` (NOT `movement.coinOut`)
- **Gross**: `movement.drop - movement.totalCancelledCredits`

## Data Sources and Structure

### Meters Collection
The primary data source for financial metrics is the `Meters` collection with the following structure:

```typescript
interface MeterData {
  machine: string;
  location: string;
  movement: {
    coinIn: number;           // Total bets placed
    coinOut: number;          // Automatic winnings paid
    totalCancelledCredits: number; // Manual payouts (Money Out)
    drop: number;             // Physical money inserted (Money In)
    jackpot: number;          // Jackpot payouts
    currentCredits: number;   // Current machine credits
    gamesPlayed: number;      // Total games played
    gamesWon: number;         // Total games won
    metersIn: number;         // Meter reading in
    metersOut: number;        // Meter reading out
    billIn: number;           // Bill acceptor input
    voucherOut: number;       // Voucher dispenser output
    attPaidCredits: number;   // Attendant paid credits
  };
  createdAt: Date;
  readAt: Date;
  machineId: string;
}
```

## Tracking Machine Performance

### Calculating Machine Inflow Over Time

To determine how much money was inserted into a machine over a given period:

1. Sum all recorded `movement.drop` values from the machine's meter readings
2. Filter by date range as needed
3. Aggregate across multiple machines for location totals

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
// ✅ CORRECT - Use these fields for financial calculations
const moneyIn = meterData.movement.drop;
const moneyOut = meterData.movement.totalCancelledCredits;
const gross = moneyIn - moneyOut;

// ❌ INCORRECT - Do not use these for financial metrics
const wrongMoneyIn = meterData.movement.coinIn;    // This is betting activity
const wrongMoneyOut = meterData.movement.coinOut;  // This is automatic payouts
```

### Database Queries

When aggregating financial data:

```javascript
// MongoDB aggregation example
const financialSummary = await Meters.aggregate([
  {
    $group: {
      _id: "$location",
      totalMoneyIn: { $sum: "$movement.drop" },
      totalMoneyOut: { $sum: "$movement.totalCancelledCredits" },
      totalGross: { 
        $sum: { 
          $subtract: ["$movement.drop", "$movement.totalCancelledCredits"] 
        }
      }
    }
  }
]);
```

## Frontend Display Standards

### Component Implementation

Financial metrics components should display:

```typescript
interface FinancialMetrics {
  moneyIn: number;    // From movement.drop
  moneyOut: number;   // From movement.totalCancelledCredits  
  gross: number;      // Calculated as moneyIn - moneyOut
}
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

### ❌ Common Mistakes

1. **Using Coin In/Out for financial metrics**: These track betting activity, not cash flow
2. **Inconsistent gross calculations**: Always use Drop - Total Cancelled Credits
3. **Missing fallback values**: Always provide default values for missing data
4. **Incorrect aggregations**: Ensure proper field mapping in database queries

### ✅ Best Practices

1. **Use movement.drop for Money In**: This represents actual cash inserted
2. **Use movement.totalCancelledCredits for Money Out**: This represents manual payouts
3. **Implement proper type safety**: Use TypeScript interfaces for meter data
4. **Validate data integrity**: Check that financial calculations are logical
5. **Provide clear documentation**: Label metrics clearly in UI components

## Related Documentation

- [API Overview](backend/api-overview.md) - Complete API documentation
- [Analytics API](backend/analytics-api.md) - Analytics and reporting endpoints
- [Collections API](backend/collections-api.md) - Collection and meter data management
- [Engineering Guidelines](ENGINEERING_GUIDELINES.md) - Development standards and practices

## Support and Maintenance

For questions about financial metrics implementation:
1. Review this guide for proper field mapping
2. Check API documentation for endpoint specifications
3. Validate calculations against meter data sources
4. Ensure compliance with casino regulatory requirements

---

**Last Updated**: February 26, 2025  
**Version**: 1.0  
**Maintained By**: Evolution One CMS Development Team
