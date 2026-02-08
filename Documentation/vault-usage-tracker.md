# Vault Usage Tracker

This file tracks the relationship between Frontend Pages, API Endpoints, and Database Models to identify unused code and ensure documentation accuracy.

## Frontend Pages (Vault)

### Vault Manager (VM)
- [x] Management Overview (`app/vault/management/page.tsx`) -> `VaultOverviewPageContent.tsx`
- [x] Transaction History (`app/vault/management/transactions/page.tsx`) -> `VaultTransactionsPageContent.tsx`
- [x] Player Payouts (`app/vault/management/payouts/page.tsx`) -> `VaultPayoutsPageContent.tsx`
- [x] Float Management (`app/vault/management/floats/page.tsx`) -> `VaultFloatTransactionsPageContent.tsx`
- [x] End-of-Day Report (`app/vault/management/reports/end-of-day/page.tsx`) -> `VaultEndOfDayReportsPageContent.tsx`
- [x] Cashier Management (`app/vault/management/cashiers/page.tsx`) -> `CashierManagementPanel.tsx`

### Cashier (C)
- [x] Cashier Shift Management (`app/vault/cashier/shifts/page.tsx`) -> `CashierDashboardPageContent.tsx`
- [x] Cashier Dashboard (`app/vault/cashier/dashboard/page.tsx`) -> `CashierDashboardPageContent.tsx`

## API Endpoints & Model Mapping

| Endpoint | Method | Models Used | Used by UI? | Status |
|----------|---------|-------------|-------------|--------|
| `/api/vault/initialize` | POST | VaultShift | Yes | Active |
| `/api/vault/shift/close` | POST | VaultShift | Yes | Active |
| `/api/vault/balance` | GET | VaultShift, VaultTransaction | Yes | Active |
| `/api/cashier/shift/open` | POST | CashierShift | Yes | Active |
| `/api/cashier/shift/current`| GET | CashierShift | Yes | Active |
| `/api/vault/float-request`| GET/POST| FloatRequest, VaultNotification | Yes | Active |
| `/api/vault/float-request/approve`| POST | FloatRequest | Yes | Active |
| `/api/vault/payout` | POST | Payout, VaultTransaction | Yes | Active |
| `/api/vault/payouts` | GET | Payout | Yes | Active (List) |
| `/api/vault/payouts/[id]` | GET/PUT | CashDeskPayout | No | **LEGACY / BUG** (Mismatched model) |
| `/api/vault/transactions` | GET | VaultTransaction | Yes | Active |
| `/api/vault/shifts/[id]` | GET | Shifts (old) | No | **LEGACY** |
| `/api/vault/float-requests/[id]` | GET/PUT | FloatRequests (old) | No | **LEGACY** |
| `/api/vault/float-requests/[id]/approve` | POST | N/A | No | **BROKEN** (Empty directory) |

## Candidate for Deletion (Potential Legacy)

| Model / API | Reason | Status |
|-------------|--------|--------|
| `models/shifts.ts` | Replaced by `vaultShift.ts` and `cashierShift.ts`. | Candidate for Deletion |
| `models/floatRequests.ts` | Replaced by `floatRequest.ts`. | Candidate for Deletion |
| `models/cashDeskPayouts.ts` | Replaced by `payout.ts`. | Candidate for Deletion |
| `/api/vault/shifts/...` (plural) | Uses legacy `Shifts` model. Not found in main UI sidebar or dashboards. | Candidate for Deletion |
| `/api/vault/float-requests/...` (plural) | Uses legacy `FloatRequests` model. Hit by potentially legacy standalone pages. | Candidate for Deletion |
| `/api/vault/payouts/[id]` | Mismatched model `CashDeskPayout` leads to data inconsistency with the `Payout` ledger. | Candidate for Deletion |
