# TODO: Improve Responsive Design for Large Monetary Numbers

The goal is to ensure all financial cards handle multi-million dollar amounts (e.g., $100,000,000.00) without breaking the layout or overflowing. This is achieved through dynamic font sizing based on string length and proper CSS truncation/wrapping.

## Priority 1: Overview Dashboard Cards
- [x] `components/VAULT/overview/cards/VaultBalanceCard.tsx`
    - [x] Dynamic font size for Main Balance (`text-2xl` to `text-4xl`)
    - [x] Dynamic font size for Cash on Premises
    - [x] Handle sub-metrics (M/F totals) overflow
- [x] `components/VAULT/overview/cards/VaultMetricCard.tsx`
    - [x] Dynamic font size for value (`text-lg` to `text-xl`)
    - [x] Ensure title and value don't overlap with icon area
- [x] `components/VAULT/overview/cards/VaultInventoryCard.tsx`
    - [x] Audit for large total values
- [x] `components/VAULT/overview/cards/VaultCashDeskCard.tsx`
    - [x] Audit for float totals

## Priority 2: Collection & Machine Forms
- [x] `components/VAULT/machine/SoftCountForm.tsx` (RECOMPLETED)
- [x] `components/VAULT/machine/MachineCollectionForm.tsx`
    - [x] Variance card dynamic sizing
    - [x] Physical total card dynamic sizing

## Priority 3: Cashier & Lists
- [x] `components/VAULT/cashier/sections/ActiveShiftDashboard.tsx`
    - [x] Main shift balance cards
- [x] `components/VAULT/floats/cards/VaultCashierFloatsMobileCards.tsx`
- [x] `components/VAULT/transactions/cards/VaultTransactionsMobileCards.tsx`
- [x] `components/VAULT/transfers/cards/VaultTransfersMobileCards.tsx`

## Implementation Strategy:
Create a reusable utility hook `useDynamicFontSize` or identical logic pattern:
```tsx
const getDynamicFontSize = (amount: string, sizes: { small: string, medium: string, large: string }) => {
  if (amount.length > 15) return sizes.small;
  if (amount.length > 12) return sizes.medium;
  return sizes.large;
};
```
