# Balance Calculation Logic for Collection Report Modal

## Overview
This prompt explains the correct balance calculation logic for the NewCollectionModal component and how to implement it without causing infinite loops.

**📚 For comprehensive documentation with current implementation details, see:**
**`Documentation/frontend/collection-report-balance-calculations.md`**

## Calculation Logic

### 1. Amount to Collect (Auto-calculated, Read-only)
- **Formula**: `gross - variance - advance - partnerProfit + locationPreviousBalance`
- **Behavior**: Automatically calculated based on machine entries and financial inputs
- **UI**: Read-only input field, cannot be edited by user
- **CRITICAL**: This value NEVER changes when user enters collected amount or balance correction
- **CRITICAL**: Uses location's previous balance from database, not calculated previous balance

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
  - User can manually edit the base value

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

### Scenario 3:
- Amount to Collect: 12 (auto-calculated, STAYS UNCHANGED)
- User enters Collected Amount: 6
- User enters Balance Correction Base: 2
- **Results:**
  - Amount to Collect: 12 (unchanged)
  - Previous Balance: `6 - 12 = -6` (auto-calculated)
  - Balance Correction: `2 + 6 = 8` (base + collected amount)

## Implementation Requirements

### State Management
```typescript
const [financials, setFinancials] = useState({
  amountToCollect: "", // Auto-calculated, read-only
  collectedAmount: "", // User input
  previousBalance: "0", // Auto-calculated, editable
  balanceCorrection: "0", // Calculated from base + collected
});

// Track base balance correction separately
const [baseBalanceCorrection, setBaseBalanceCorrection] = useState("0");
```

### Avoiding Infinite Loops

#### ❌ WRONG APPROACH (Causes Infinite Loops):
```typescript
// DON'T DO THIS - Causes infinite loops
useEffect(() => {
  setFinancials(prev => ({
    ...prev,
    balanceCorrection: (baseBalanceCorrection + collectedAmount).toString()
  }));
}, [baseBalanceCorrection, financials.collectedAmount]);
```

#### ✅ CORRECT APPROACH (Manual Triggers):
```typescript
// DO THIS - Manual calculation in input handlers
const handleCollectedAmountChange = (value: string) => {
  setFinancials(prev => ({ ...prev, collectedAmount: value }));
  
  // Manual calculation with setTimeout to prevent loops
  setTimeout(() => {
    const amountCollected = Number(value) || 0;
    const amountToCollect = Number(financials.amountToCollect) || 0;
    const baseCorrection = Number(baseBalanceCorrection) || 0;
    
    // Calculate previous balance
    const previousBalance = amountCollected - amountToCollect;
    
    // Calculate balance correction
    const balanceCorrection = baseCorrection + amountCollected;
    
    setFinancials(prev => ({
      ...prev,
      previousBalance: previousBalance.toString(),
      balanceCorrection: balanceCorrection.toString(),
    }));
  }, 0);
};

const handleBalanceCorrectionBaseChange = (value: string) => {
  setBaseBalanceCorrection(value);
  
  // Manual calculation with setTimeout
  setTimeout(() => {
    const amountCollected = Number(financials.collectedAmount) || 0;
    const amountToCollect = Number(financials.amountToCollect) || 0;
    const baseCorrection = Number(value) || 0;
    
    // Calculate previous balance
    const previousBalance = amountCollected - amountToCollect;
    
    // Calculate balance correction
    const balanceCorrection = baseCorrection + amountCollected;
    
    setFinancials(prev => ({
      ...prev,
      previousBalance: previousBalance.toString(),
      balanceCorrection: balanceCorrection.toString(),
    }));
  }, 0);
};
```

### Key Principles to Avoid Infinite Loops

1. **No useEffect for Calculated Fields**: Don't use useEffect to automatically update fields that depend on user input
2. **Manual Triggers Only**: Use input onChange handlers to trigger calculations
3. **setTimeout for State Updates**: Use setTimeout(0) to defer state updates and prevent immediate re-triggering
4. **Single State Update**: Consolidate multiple calculations into one setFinancials call
5. **Separate Base Values**: Track base values (like baseBalanceCorrection) separately from calculated values

### UI Implementation

```typescript
// Amount to Collect (Read-only)
<Input
  value={financials.amountToCollect}
  readOnly
  className="bg-gray-100 cursor-not-allowed"
  title="Auto-calculated based on machine entries"
/>

// Collected Amount (User input)
<Input
  value={financials.collectedAmount}
  onChange={(e) => handleCollectedAmountChange(e.target.value)}
  placeholder="0"
  title="Enter the amount actually collected"
/>

// Previous Balance (Auto-calculated, Editable)
<Input
  value={financials.previousBalance}
  onChange={(e) => setFinancials(prev => ({ ...prev, previousBalance: e.target.value }))}
  placeholder="0"
  title="Auto-calculated as collected amount minus amount to collect (editable)"
/>

// Balance Correction (Shows base + collected)
<Input
  value={baseBalanceCorrection}
  onChange={(e) => handleBalanceCorrectionBaseChange(e.target.value)}
  placeholder="0"
  title="Base value (collected amount will be added to this)"
/>
```

## Key Principles

### CRITICAL RULES:
1. **Amount to Collect NEVER changes** when user enters collected amount or balance correction
2. **Previous Balance = collectedAmount - amountToCollect** (amountToCollect stays the same)
3. **Balance Correction = baseBalanceCorrection + collectedAmount** (additive, not overwriting)
4. **No useEffect for calculated fields** - use manual triggers only
5. **setTimeout(0) for state updates** to prevent infinite loops
6. **NO CIRCULAR DEPENDENCY**: Amount to collect should NOT include previousBalance in its calculation

### CIRCULAR DEPENDENCY EXPLANATION:
- **WRONG**: Amount to Collect = gross - variance - advance - partnerProfit + previousBalance
- **PROBLEM**: Previous Balance = collectedAmount - amountToCollect
- **RESULT**: Circular dependency where each calculation depends on the other
- **SOLUTION**: Amount to Collect = gross - variance - advance - partnerProfit (no previousBalance)

### Example Flow:
1. Amount to Collect: 29164 (auto-calculated, stays 29164)
2. User enters Collected Amount: 2000
3. User enters Balance Correction Base: 200
4. **Results:**
   - Amount to Collect: 29164 (unchanged)
   - Previous Balance: 2000 - 29164 = -27164
   - Balance Correction: 200 + 2000 = 2200

## Summary

- **Amount to Collect**: Auto-calculated, read-only, NEVER changes when user inputs values
- **Previous Balance**: `collectedAmount - amountToCollect` (auto-calculated, editable)
- **Balance Correction**: `baseBalanceCorrection + collectedAmount` (additive, not overwriting)
- **Avoid Loops**: Use manual triggers with setTimeout, no useEffect for calculated fields
- **State Management**: Track base values separately, consolidate calculations into single updates
