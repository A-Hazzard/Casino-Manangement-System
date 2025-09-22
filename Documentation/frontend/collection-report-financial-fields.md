# Collection Report Financial Fields

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 20th, 2025

## Overview

This document explains the financial fields used in collection reports and their business context in casino operations.

## Financial Fields Explained

### 1. Taxes
- **Purpose**: Government taxes and regulatory fees deducted from partner profit
- **Calculation**: Applied as a deduction from the partner's share of revenue
- **Business Context**: Required tax payments that reduce the location's profit share
- **Example**: If partner profit is $100 and taxes are $10, the location receives $90

### 2. Advance
- **Purpose**: Money paid to the location when they are in a negative balance
- **Business Context**: 
  - **Half Advance**: Partial payment to help location recover from losses
  - **Full Advance**: Complete payment to cover all losses
  - **Ride Advance**: Allows the machine to continue operating to make back money
  - **Balance**: Final settlement of all outstanding amounts
- **When Used**: When location owes money to the casino (negative balance)
- **Example**: Location has -$500 balance, casino pays $500 advance to location

### 3. Variance
- **Purpose**: Difference between expected and actual collection amounts
- **Historical Context**: Originally used with software meters (now deprecated)
- **Current Status**: Optional field for manual variance adjustments
- **Business Context**: Used to account for discrepancies in collection data
- **Example**: Expected to collect $1000, actually collected $950, variance = -$50

### 4. Previous Balance
- **Purpose**: Outstanding balance from previous collections
- **Source**: Location's `collectionBalance` field in database
- **Calculation**: Carried forward from previous collection reports
- **Business Context**: Running balance of money owed between casino and location

### 5. Amount to Collect
- **Purpose**: Total amount that should be collected from the location
- **Formula**: `gross - variance - advance - partnerProfit + previousBalance`
- **Business Context**: The amount the location owes to the casino
- **Auto-calculated**: Based on machine entries and financial inputs

### 6. Collected Amount
- **Purpose**: Actual cash collected by the collector
- **User Input**: Entered by the collector after physical collection
- **Business Context**: Real money collected from the location
- **Validation**: Should match expected amount within acceptable variance

### 7. Balance Correction
- **Purpose**: Manual adjustment to the balance calculation
- **Business Context**: Used for special circumstances or corrections
- **Formula**: `baseBalanceCorrection + collectedAmount`
- **Example**: Collector found extra $50, adds $50 to balance correction

### 8. Partner Profit
- **Purpose**: Location's share of the gross revenue
- **Formula**: `Math.floor((gross - variance - advance) * profitShare / 100) - taxes`
- **Business Context**: The location's percentage of the total revenue
- **Example**: 50% profit share on $1000 gross = $500 partner profit

## Financial Flow Example

### Scenario: Location Collection
1. **Machine Revenue**: $1000 gross from machines
2. **Variance**: -$50 (discrepancy)
3. **Advance**: $0 (no advance needed)
4. **Taxes**: $20 (deducted from partner profit)
5. **Profit Share**: 50%
6. **Previous Balance**: $100 (location owes casino)

### Calculations:
```
Gross Revenue: $1000
Variance: -$50
Advance: $0
Net Revenue: $1000 - $50 - $0 = $950

Partner Profit: Math.floor(($950 * 50) / 100) - $20 = $455
Amount to Collect: $950 - $455 + $100 = $595
```

### Result:
- **Location receives**: $455 (partner profit)
- **Casino collects**: $595 (amount to collect)
- **Previous balance**: $100 (carried forward)

## Field Dependencies

### Auto-calculated Fields:
- **Amount to Collect**: Calculated from machine entries and financial inputs
- **Partner Profit**: Calculated from gross revenue and profit share
- **Previous Balance**: Calculated as `collectedAmount - amountToCollect`

### User Input Fields:
- **Taxes**: Manual entry of tax amounts
- **Advance**: Manual entry of advance payments
- **Variance**: Manual entry of variance adjustments (optional)
- **Collected Amount**: Manual entry of actual cash collected
- **Balance Correction**: Manual entry of balance adjustments

## Business Rules

### 1. Advance Payments
- Only used when location has negative balance
- Can be half, full, or ride advance
- Reduces the amount the location owes

### 2. Variance Handling
- Optional field (deprecated software meters)
- Used for manual adjustments
- Should be documented with reason

### 3. Balance Management
- Previous balance carries forward
- New balance = previous + amount to collect - collected + corrections
- Positive balance = location owes casino
- Negative balance = casino owes location

### 4. Profit Sharing
- Based on location's profit share percentage
- Calculated before taxes and deductions
- Location receives their percentage of net revenue

## Common Scenarios

### Scenario 1: Normal Collection
- Location has positive balance
- No advance needed
- Collect expected amount
- Update balance

### Scenario 2: Advance Payment
- Location has negative balance
- Casino pays advance to location
- Advance reduces amount to collect
- Location can continue operating

### Scenario 3: Variance Adjustment
- Collection amount differs from expected
- Enter variance amount and reason
- Adjusts final calculations
- Maintains audit trail

### Scenario 4: Balance Correction
- Special circumstances require adjustment
- Enter correction amount and reason
- Affects final balance calculation
- Requires approval and documentation

## Implementation Notes

### Data Validation
- All monetary fields must be numeric
- Negative values allowed for corrections
- Decimal precision to 2 places
- Required fields must be filled

### Audit Trail
- All changes logged with timestamp
- User who made changes recorded
- Reason codes for adjustments
- Complete history maintained

### Security
- Role-based access to financial fields
- Approval workflows for large adjustments
- Encryption of sensitive financial data
- Regular audit of financial transactions

## Summary

These financial fields work together to manage the complex relationship between casinos and gaming locations, ensuring accurate tracking of money flow, profit sharing, and balance management. Each field serves a specific business purpose in the casino collection process.
