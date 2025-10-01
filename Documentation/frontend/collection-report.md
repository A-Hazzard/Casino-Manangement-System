# Collection Report System

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 25th, 2025

## Table of Contents
- [Overview](#overview)
- [SAS Data Calculations](#sas-data-calculations)
- [Financial Calculations](#financial-calculations)
- [Variance Analysis](#variance-analysis)
- [Database Structure](#database-structure)
- [API Endpoints](#api-endpoints)

## Overview

The Collection Report System manages casino slot machine money collection operations. It serves as the financial control center for tracking money flow from gaming machines to bank accounts.

### Key Financial Concepts

**SAS (Slot Accounting System) Data:**
- **SAS Drop**: Total money collected by SAS-enabled machines (stored in `collections.sasMeters.drop`)
- **SAS Cancelled Credits**: Credits paid out to players from SAS machines (stored in `collections.sasMeters.totalCancelledCredits`)
- **SAS Gross**: Net revenue from SAS machines (stored in `collections.sasMeters.gross`)

**Meter Data:**
- **Meter Drop**: Physical money collected from machine meters (calculated as `metersIn - prevIn`)
- **Meter Cancelled Credits**: Credits paid out from machine meters (calculated as `metersOut - prevOut`)
- **Meter Gross**: Net revenue from meters (stored in `collections.movement.gross`)

## SAS Data Calculations

### SAS Drop Storage and Calculation

**SAS Drop IS stored directly** in the collections:

```typescript
// SAS Drop is stored in:
collections.sasMeters.drop

// SAS Gross is calculated as:
SAS Gross = SAS Drop - SAS Cancelled Credits

// From the actual code in lib/helpers/collectionReportCalculations.ts:
const totalSasGross = sasDrop - sasCancelled;
```

### SAS Data Storage Locations

**Where SAS Data is Stored:**
- **SAS Drop**: `collections.sasMeters.drop`
- **SAS Cancelled**: `collections.sasMeters.totalCancelledCredits`
- **SAS Gross**: `collections.sasMeters.gross`

## Financial Calculations

### Core Financial Formulas

**Meter Gross Calculation:**
```typescript
// From lib/helpers/accountingDetails.ts:
const drop = (collection.metersIn || 0) - (collection.prevIn || 0);
const cancelled = (collection.metersOut || 0) - (collection.prevOut || 0);
const meterGross = collection.movement?.gross || 0;
```

**SAS Gross Calculation:**
```typescript
// From lib/helpers/accountingDetails.ts:
const sasGross = collection.sasMeters?.gross || 0;
```

**Variation Calculation:**
```typescript
// From lib/helpers/accountingDetails.ts:
const variation = meterGross - sasGross;
// Variation = Meter Gross - SAS Gross
```

### Your Example Validation

**From your image:**
- **Meter Gross**: 208
- **SAS Gross**: -127
- **Variation**: 208 - (-127) = 208 + 127 = 335 ✅

**This confirms the formula is correct:**
```typescript
Variation = Meter Gross - SAS Gross
335 = 208 - (-127)
335 = 208 + 127 = 335 ✅
```

## Variance Analysis

### What Causes SAS Data to Have Values

**SAS Data is populated when:**
1. **SAS-enabled machines** are connected to the SAS system
2. **Meter readings** are synchronized with SAS protocols
3. **Collection reports** are generated with SAS data integration
4. **SMIB data** is uploaded and processed

### Manual SAS Data Changes

**SAS values can be changed manually by:**
1. **Direct database updates** to `collections.sasMeters` fields
2. **SMIB data uploads** that override existing SAS values
3. **Collection report edits** that modify SAS meter readings
4. **Administrative corrections** through the collection system

## Database Structure

### Collections Collection
```typescript
{
  _id: ObjectId,
  machineId: string,
  metersIn: number,        // Current meter reading
  prevIn: number,          // Previous meter reading
  metersOut: number,       // Current cancelled credits
  prevOut: number,         // Previous cancelled credits
  movement: {
    gross: number          // Meter gross calculation
  },
  sasMeters: {
    drop: number,          // SAS drop amount
    totalCancelledCredits: number, // SAS cancelled credits
    gross: number          // SAS gross calculation
  }
}
```

### Collection Reports Collection
```typescript
{
  _id: ObjectId,
  locationReportId: string,
  locationName: string,
  timestamp: Date,
  location: ObjectId,
  // Financial fields
  amountCollected: number,
  amountUncollected: number,
  partnerProfit: number,
  taxes: number,
  advance: number,
  // Balance fields
  previousBalance: number,
  currentBalance: number,
  balanceCorrection: number
}
```

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

## Balance Calculations

### Collection Modal Implementation

Both the `NewCollectionModal` and `EditCollectionModal` components handle complex balance calculations with automatic computation and user input validation. The implementation is identical across both modals.

#### State Management

```typescript
// Main financial state
const [financials, setFinancials] = useState({
  amountToCollect: "", // Auto-calculated, read-only
  collectedAmount: "", // User input
  previousBalance: "0", // Auto-calculated, editable
  balanceCorrection: "0", // Calculated from base + collected
  balanceCorrectionReason: "", // User input
  reasonForShortagePayment: "", // User input
  taxes: "0", // User input
  variance: "0", // User input
  advance: "0", // User input
});

// Separate state to track base balance correction
const [baseBalanceCorrection, setBaseBalanceCorrection] = useState("0");
```

#### Amount to Collect Calculation

The `calculateAmountToCollect` function automatically calculates the amount to collect based on machine entries and financial inputs. This function is implemented identically in both `NewCollectionModal` and `EditCollectionModal`:

```typescript
const calculateAmountToCollect = useCallback(() => {
  // Calculate total movement data from all machine entries
  const totalMovementData = collectedMachineEntries.map((entry) => {
    const drop = (entry.metersIn || 0) - (entry.prevIn || 0);
    const cancelledCredits = (entry.metersOut || 0) - (entry.prevOut || 0);
    return {
      drop,
      cancelledCredits,
      gross: drop - cancelledCredits,
    };
  });

  // Sum up all movement data
  const reportTotalData = totalMovementData.reduce(
    (prev, current) => ({
      drop: prev.drop + current.drop,
      cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
      gross: prev.gross + current.gross,
    }),
    { drop: 0, cancelledCredits: 0, gross: 0 }
  );

  // Get financial values
  const taxes = Number(financials.taxes) || 0;
  const variance = Number(financials.variance) || 0;
  const advance = Number(financials.advance) || 0;

  // Get profit share from selected location
  const profitShare = selectedLocation?.profitShare || 0;

  // Calculate partner profit: Math.floor((gross - variance - advance) * profitShare / 100) - taxes
  const partnerProfit =
    Math.floor(
      ((reportTotalData.gross - variance - advance) * profitShare) / 100
    ) - taxes;

  // Calculate amount to collect: gross - variance - advance - partnerProfit
  // NOTE: Amount to collect should NOT include previousBalance to avoid circular dependency
  const amountToCollect =
    reportTotalData.gross - variance - advance - partnerProfit;

  setFinancials((prev) => ({
    ...prev,
    amountToCollect: amountToCollect.toString(),
  }));
}, [
  collectedMachineEntries,
  financials.taxes,
  financials.variance,
  financials.advance,
  selectedLocation?.profitShare,
  isLoadingCollections,
  isLoadingExistingCollections,
]);
```

#### Balance Calculation Logic

The balance calculation logic is implemented identically in both `NewCollectionModal` and `EditCollectionModal`:

**1. Amount to Collect (Auto-calculated, Read-only)**
- **Formula**: `gross - variance - advance - partnerProfit`
- **Behavior**: Automatically calculated based on machine entries and financial inputs
- **UI**: Read-only input field, cannot be edited by user
- **CRITICAL**: This value NEVER changes when user enters collected amount or balance correction
- **CRITICAL**: Amount to collect should NOT include previousBalance in its calculation to prevent circular dependency

**2. Previous Balance (Auto-calculated, Editable)**
- **Formula**: `collectedAmount - amountToCollect`
- **Behavior**: 
  - When user enters collected amount, automatically calculates: `collectedAmount - amountToCollect`
  - User can manually override the calculated value if needed
  - Field should be enabled (not disabled/read-only)

**3. Balance Correction (Additive, Editable)**
- **Formula**: `baseBalanceCorrection + collectedAmount`
- **Behavior**:
  - User enters a base value (e.g., 5)
  - When user enters collected amount (e.g., 6), it adds to the base: `5 + 6 = 11`
  - The collected amount is ADDED to existing balance correction, not overwritten
  - User can manually edit the total value, which extracts the base value

#### Circular Dependency Prevention

- **WRONG**: Amount to Collect = gross - variance - advance - partnerProfit + previousBalance
- **PROBLEM**: Previous Balance = collectedAmount - amountToCollect
- **RESULT**: Circular dependency where each calculation depends on the other
- **SOLUTION**: Amount to Collect = gross - variance - advance - partnerProfit (no previousBalance)

#### Implementation Strategies

Both `NewCollectionModal` and `EditCollectionModal` use the same strategies for avoiding infinite loops:

**Avoiding Infinite Loops:**
1. **No useEffect for Calculated Fields**: Don't use useEffect to automatically update fields that depend on user input
2. **Manual Triggers Only**: Use input onChange handlers to trigger calculations
3. **setTimeout for State Updates**: Use setTimeout(0) to defer state updates and prevent immediate re-triggering
4. **Single State Update**: Consolidate multiple calculations into one setFinancials call
5. **Separate Base Values**: Track base values (like baseBalanceCorrection) separately from calculated values

#### Example Scenarios

These scenarios apply to both `NewCollectionModal` and `EditCollectionModal`:

**Scenario 1:**
- Amount to Collect: 29164 (auto-calculated, STAYS UNCHANGED)
- User enters Collected Amount: 2000
- User enters Balance Correction Base: 200
- **Results:**
  - Amount to Collect: 29164 (unchanged)
  - Previous Balance: `2000 - 29164 = -27164` (auto-calculated)
  - Balance Correction: `200 + 2000 = 2200` (base + collected amount)

**Scenario 2:**
- Amount to Collect: 8 (auto-calculated, STAYS UNCHANGED)
- User enters Collected Amount: 10
- User enters Balance Correction Base: 5
- **Results:**
  - Amount to Collect: 8 (unchanged)
  - Previous Balance: `10 - 8 = 2` (auto-calculated)
  - Balance Correction: `5 + 10 = 15` (base + collected amount)

## API Endpoints

### Collection Reports
- **GET** `/api/collectionReport` - Fetch all collection reports
- **POST** `/api/collectionReport` - Create new collection report
- **PUT** `/api/collectionReport` - Update collection report
- **DELETE** `/api/collectionReport/[reportId]` - Delete collection report

### Collections
- **GET** `/api/collections` - Fetch collections by report ID
- **POST** `/api/collections` - Create new collection
- **PUT** `/api/collections` - Update collection
- **DELETE** `/api/collections/[collectionId]` - Delete collection

### SAS Data Sync
- **POST** `/api/sync-meters` - Sync meter data with SAS system
- **GET** `/api/meters/[machineId]` - Get meter data for machine