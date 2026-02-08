# Vault & Cashier System Enhancement TO-DO List

This list follows the issues identified in `VAULT_ISSUES_AUDIT.md`.

## Phase 1: Critical Logic & UX Fixes
- [x] **Fix `useCashierShift` Polling**: Enable polling in `idle` state so cashiers automatically see when the Vault Manager has reconciled the vault.
- [x] **Standardize Vault Overview Header**: Replace the local `VaultHeader` section with the unified `VaultManagerHeader` to ensure notification bell parity and cleaner code.
- [x] **Unified Cashier Header**: Create or adapt `VaultManagerHeader` for the Cashier interface to include the `NotificationBell`.
- [x] **Add Error Boundaries**: Ensure `PageErrorBoundary` is wrapping all top-level vault and cashier pages. (Verified existing coverage)

## Phase 2: Form & Validation Improvements
- [x] **Direct Shift Open Validation**: Add real-time stock checks to the "Direct Open Shift" modal in `CashierManagementPanel`.
- [x] **General Fund Movement Validation**: Ensure "Add Cash", "Remove Cash", and "Record Expense" modals provide immediate feedback if vault stock is insufficient.

## Phase 3: Performance & Security
- [x] **Polling Optimization**: Refactor `VaultOverviewPageContent` to rely on the `VaultManagerHeader` refresh logic instead of having its own redundant interval.
- [x] **Aggregation Audit**: Verify all `VaultTransaction` aggregations in `vaultHelpers.ts` explicitly match by `licensee`. (Checked and applied to transactions API)
- [x] **Pagination for Activity**: Implement pagination for the "Recent Activity" list on the dashboard.

## Phase 4: Polish & Placeholders
- [x] **Cash Desk Placeholders**: Add "Coming Soon" indicators to inactive cash desk features.
- [x] **Breadcrumb/Navigation Polish**: Ensure back buttons and titles are consistent across the entire nested vault structure.
