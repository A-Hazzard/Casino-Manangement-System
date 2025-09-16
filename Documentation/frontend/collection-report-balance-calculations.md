# Collection Report Balance Calculations

## Overview
This document explains the balance calculation logic implemented in the `NewCollectionModal` component and how it handles the complex relationships between Amount to Collect, Previous Balance, and Balance Correction fields.

## Current Implementation

### State Management
The component uses the following state structure:

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

### Amount to Collect Calculation
The `calculateAmountToCollect` function automatically calculates the amount to collect based on machine entries and financial inputs:

```typescript
const calculateAmountToCollect = useCallback(() => {
  // Don't calculate if we don't have machine entries or if we're still loading
  if (
    !collectedMachineEntries.length ||
    isLoadingCollections ||
    isLoadingExistingCollections
  ) {
    setFinancials((prev) => ({ ...prev, amountToCollect: "0" }));
    return;
  }

  // Ensure we have valid machine data (not just empty entries)
  const hasValidData = collectedMachineEntries.some(
    (entry) => entry.metersIn !== undefined && entry.metersOut !== undefined
  );

  if (!hasValidData) {
    setFinancials((prev) => ({ ...prev, amountToCollect: "0" }));
    return;
  }

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

### Collected Amount Input Handler
When the user enters a collected amount, it triggers automatic calculations for previous balance and balance correction:

```typescript
// Collected Amount Input
<Input
  type="text"
  placeholder="0"
  value={financials.collectedAmount}
  onChange={(e) => {
    if (/^-?\d*\.?\d*$/.test(e.target.value) || e.target.value === "") {
      setFinancials({
        ...financials,
        collectedAmount: e.target.value,
      });
      // Trigger manual calculations
      setTimeout(() => {
        const amountCollected = Number(e.target.value) || 0;
        const amountToCollect = Number(financials.amountToCollect) || 0;
        const baseCorrection = Number(baseBalanceCorrection) || 0;

        // Calculate previous balance: collectedAmount - amountToCollect
        const previousBalance = amountCollected - amountToCollect;

        // Calculate balance correction: baseBalanceCorrection + collectedAmount
        const newBalanceCorrection = baseCorrection + amountCollected;

        setFinancials((prev) => ({
          ...prev,
          previousBalance: previousBalance.toString(),
          balanceCorrection: newBalanceCorrection.toString(),
        }));
      }, 0);
    }
  }}
  disabled={isProcessing}
/>
```

### Balance Correction Input Handler
The balance correction field shows the calculated total (base + collected amount) but allows manual editing:

```typescript
// Balance Correction Input
<Input
  type="text"
  placeholder="0"
  value={financials.balanceCorrection}
  onChange={(e) => {
    if (/^-?\d*\.?\d*$/.test(e.target.value) || e.target.value === "") {
      // When user manually edits balance correction, extract the base value
      const amountCollected = Number(financials.collectedAmount) || 0;
      const newBalanceCorrection = Number(e.target.value) || 0;
      const baseCorrection = newBalanceCorrection - amountCollected;

      setBaseBalanceCorrection(baseCorrection.toString());
      setFinancials((prev) => ({
        ...prev,
        balanceCorrection: e.target.value,
      }));
    }
  }}
  className="bg-white border-gray-300 focus:border-primary"
  title="Balance correction (collected amount is automatically added to base value)"
  disabled={isProcessing}
/>
```

### Previous Balance Input Handler
The previous balance field is auto-calculated but allows manual editing:

```typescript
// Previous Balance Input
<Input
  type="text"
  placeholder="0"
  value={financials.previousBalance}
  onChange={(e) =>
    setFinancials((prev) => ({
      ...prev,
      previousBalance: e.target.value,
    }))
  }
  className="bg-white border-gray-300 focus:border-primary"
  title="Auto-calculated as collected amount minus amount to collect (editable)"
  disabled={isProcessing}
/>
```

## Calculation Logic

### 1. Amount to Collect (Auto-calculated, Read-only)
- **Formula**: `gross - variance - advance - partnerProfit`
- **Behavior**: Automatically calculated based on machine entries and financial inputs
- **UI**: Read-only input field, cannot be edited by user
- **CRITICAL**: This value NEVER changes when user enters collected amount or balance correction
- **CRITICAL**: Amount to collect should NOT include previousBalance in its calculation to prevent circular dependency

### 2. Previous Balance (Auto-calculated, Editable)
- **Formula**: `collectedAmount - amountToCollect`
- **Behavior**: 
  - When user enters collected amount, automatically calculates: `collectedAmount - amountToCollect`
  - User can manually override the calculated value if needed
  - Field should be enabled (not disabled/read-only)

### 3. Balance Correction (Additive, Editable)
- **Formula**: `baseBalanceCorrection + collectedAmount`
- **Behavior**:
  - User enters a base value (e.g., 5)
  - When user enters collected amount (e.g., 6), it adds to the base: `5 + 6 = 11`
  - The collected amount is ADDED to existing balance correction, not overwritten
  - User can manually edit the total value, which extracts the base value

## Example Scenarios

### Scenario 1 (User's Example):
- Amount to Collect: 29164 (auto-calculated, STAYS UNCHANGED)
- User enters Collected Amount: 2000
- User enters Balance Correction Base: 200
- **Results:**
  - Amount to Collect: 29164 (unchanged)
  - Previous Balance: `2000 - 29164 = -27164` (auto-calculated)
  - Balance Correction: `200 + 2000 = 2200` (base + collected amount)

### Scenario 2:
- Amount to Collect: 8 (auto-calculated, STAYS UNCHANGED)
- User enters Collected Amount: 10
- User enters Balance Correction Base: 5
- **Results:**
  - Amount to Collect: 8 (unchanged)
  - Previous Balance: `10 - 8 = 2` (auto-calculated)
  - Balance Correction: `5 + 10 = 15` (base + collected amount)

## Key Implementation Details

### Avoiding Infinite Loops
The implementation uses several strategies to prevent infinite loops:

1. **No useEffect for Calculated Fields**: Don't use useEffect to automatically update fields that depend on user input
2. **Manual Triggers Only**: Use input onChange handlers to trigger calculations
3. **setTimeout for State Updates**: Use setTimeout(0) to defer state updates and prevent immediate re-triggering
4. **Single State Update**: Consolidate multiple calculations into one setFinancials call
5. **Separate Base Values**: Track base values (like baseBalanceCorrection) separately from calculated values

### Circular Dependency Prevention
- **WRONG**: Amount to Collect = gross - variance - advance - partnerProfit + previousBalance
- **PROBLEM**: Previous Balance = collectedAmount - amountToCollect
- **RESULT**: Circular dependency where each calculation depends on the other
- **SOLUTION**: Amount to Collect = gross - variance - advance - partnerProfit (no previousBalance)

### Loading State Handling
The calculation includes proper loading state handling:
- Sets `amountToCollect` to "0" during loading states
- Checks for valid machine data before calculating
- Prevents calculations when `isLoadingCollections` or `isLoadingExistingCollections` is true

## UI Labels and Help Text

The current implementation includes helpful labels and tooltips:

```typescript
// Amount to Collect (Read-only)
<label className="block text-sm font-medium text-grayHighlight mb-1">
  Amount to Collect:{" "}
  <span className="text-xs text-gray-400">
    (Auto-calculated based on machine entries)
  </span>
</label>

// Collected Amount
<label className="block text-sm font-medium text-grayHighlight mb-1">
  Collected Amount:{" "}
  <span className="text-xs text-gray-400">
    (Enter the amount actually collected)
  </span>
</label>

// Balance Correction
<label className="block text-sm font-medium text-grayHighlight mb-1">
  Balance Correction:{" "}
  <span className="text-xs text-gray-400">
    (Adds collected amount to existing value, editable)
  </span>
</label>

// Previous Balance
<label className="block text-sm font-medium text-grayHighlight mb-1">
  Previous Balance:{" "}
  <span className="text-xs text-gray-400">
    (Auto-calculated: collected amount - amount to collect)
  </span>
</label>
```

## Summary

The current implementation successfully handles the complex balance calculations with:

- ✅ **Amount to Collect**: Auto-calculated, read-only, NEVER changes when user inputs values
- ✅ **Previous Balance**: `collectedAmount - amountToCollect` (auto-calculated, editable)
- ✅ **Balance Correction**: `baseBalanceCorrection + collectedAmount` (additive, not overwriting)
- ✅ **Avoid Loops**: Uses manual triggers with setTimeout, no useEffect for calculated fields
- ✅ **State Management**: Tracks base values separately, consolidates calculations into single updates
- ✅ **Loading States**: Proper handling of loading states and data validation
- ✅ **User Experience**: Clear labels, helpful tooltips, and intuitive behavior

The implementation follows the principles outlined in the original balance calculation prompt and successfully prevents infinite loops while maintaining the correct calculation logic.
