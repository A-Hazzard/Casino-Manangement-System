# Vault & Cashier Implementation Tracker

## 1. Syntax & Property Fixes

- [x] Fix broken JSX in `components/VAULT/transactions/cards/VaultTransactionsMobileCards.tsx` [COMPLETED]
- [x] Align `VaultTransactionsMobileCards.tsx` with `ExtendedVaultTransaction` fields (`_id`, `timestamp`, `performedByName`, `fromName`, `toName`) [COMPLETED]

## 2. Pagination Implementation

- [x] Implement server-side limit (max 100) and payload shape `{ total, items }` in `/api/vault/transactions` [COMPLETED]
- [x] Implement frontend pagination UI (20 per page, "Showing X of Y") in transaction views [COMPLETED]

## 3. Location Limits

- [x] Update `VaultCashOnPremisesPageContent.tsx` to pull limit from location membership settings [COMPLETED]
- [x] Implement fallback to 0 for missing numerical data [COMPLETED]

## 4. Type Cleanup

- [x] Resolve remaining type errors in `VaultTransactionsTable.tsx` [COMPLETED]
- [x] Resolve type errors in `components/VAULT/transfers/` directory [COMPLETED]
- [x] Align all imports with `shared/types/vault.ts` [COMPLETED]

## 5. Verification

- [x] Run `pnpm run type-check` [COMPLETED]
- [x] Run `pnpm run lint` [COMPLETED]
- [x] Verify pagination UI on mobile and desktop [COMPLETED]
