# Vault Management Frontend Documentation

**Author:** Antigravity (Google DeepMind)
**Last Updated:** February 2026
**Version:** 3.0.0

## Overview

The Vault Management frontend is a dual-interface system designed for high-stakes cash handling. It provides distinct workflows for **Vault Managers** (Admins) and **Cashiers** (Operators), with localized state management and real-time validations.

## Application Architecture

The module is found within `app/vault/` and uses components from `components/VAULT/`.

### Core Technologies
- **UI Framework**: Tailwind CSS with Shadcn UI components.
- **State Management**: Zustand for user context, local state for complex forms.
- **Data Fetching**: Helper functions in `lib/helpers/vaultHelpers.ts` for API integration.

---

## Vault Manager Pages

### 1. Vault Dashboard (Overview)
- **Path**: `/vault/management`
- **Component**: `VaultOverviewPageContent`
- **Purpose**: Central command center for vault operations. Displays vault balance, health metrics, active cashiers, and recent activity.
- **Key Features**:
    - **Vault Balance Card**: Shows current balance, last audit timestamp, manager on duty, and "Cash on Premises" calculation.
    - **Health Grid**: Real-time metrics for Cash In, Cash Out, Net Flow, and Payouts.
    - **Advanced Dashboard**: Interactive charts (Balance Trend, Transaction Volume, Cash Flow breakdown).
    - **Cash Desks Section**: Top 4 cashiers by balance in a responsive grid.
    - **Recent Activity**: Last 5 vault transactions with type badges.
    - **Quick Actions**: Add Cash, Remove Cash, Record Expense, Machine Collection, Soft Count, Manage Cashiers, View Activity Log, Close Day.
    - **Shift Review Panel**: Appears when cashiers have pending discrepancies requiring manager resolution.

### 2. Transactions History
- **Path**: `/vault/management/transactions`
- **Component**: `VaultTransactionsPageContent`
- **Purpose**: Complete audit trail of all vault movements.
- **Features**:
    - Filterable table with transaction type, timestamp, from/to, amount, and denominations.
    - Export and print capabilities.
    - Detailed view showing exact bill breakdown for each transaction.

### 3. Expenses Management
- **Path**: `/vault/management/expenses`
- **Component**: `VaultExpensesPageContent`
- **Purpose**: Track operational cash expenditures.
- **Features**:
    - **Default View**: Last 7 days of expense history.
    - **Summary Cards**: Total expenses, category breakdown, average expense.
    - **Filters**: Date range, category (Supplies, Repairs, Bills, Licenses, Other).
    - **Record Expense**: Modal-based entry with mandatory denomination breakdown and optional receipt upload.

### 4. Float Transactions
- **Path**: `/vault/management/floats`
- **Component**: `VaultFloatTransactionsPageContent`
- **Purpose**: Manage cashier float requests (increases/decreases).
- **Features**:
    - Pending requests with Approve/Deny/Edit actions.
    - Historical float transaction log.
    - Denomination-specific approval interface.

### 5. Transfers (Inter-Property)
- **Path**: `/vault/management/transfers`
- **Component**: `VaultTransfersPageContent`
- **Purpose**: Move cash between different gaming locations.
- **Features**:
    - Initiate outgoing transfers with denomination breakdown.
    - Approve/Reject incoming transfers.
    - "In-Transit" status tracking.

### 6. Cashier Management
- **Path**: `/vault/management/cashiers`
- **Component**: `CashierManagementPanel`
- **Purpose**: Administer cashier accounts.
- **Features**:
    - Create new cashier accounts.
    - Reset cashier passwords.
    - View cashier performance metrics.
    - Manage cashier desk assignments.

### 7. Activity Log
- **Path**: `/vault/management/activity-log`
- **Component**: `VaultActivityLogPageContent`
- **Purpose**: Comprehensive audit trail of all vault-related actions.
- **Features**:
    - Filterable by action type, user, date range.
    - Detailed metadata for each activity.
    - Export capabilities for compliance reporting.

### 8. End-of-Day Reports
- **Path**: `/vault/management/reports/end-of-day`
- **Component**: `VaultEndOfDayReportsPageContent`
- **Purpose**: Generate daily closing reports for compliance and accounting.
- **Features**:
    - Date selector for historical reports.
    - Comprehensive summary: opening balance, total collections, expenses, payouts, closing balance.
    - Cashier shift summaries with discrepancy tracking.
    - Export to PDF/Excel.
    - Print-optimized layout.

---

## Cashier Pages

### 1. Cashier Dashboard (Shifts)
- **Path**: `/vault/cashier/shifts` (default redirect from `/vault/cashier`)
- **Component**: `CashierDashboardPageContent`
- **Purpose**: Operational interface for daily cashier transactions.
- **Key States**:
    - **Shift Inactive**: "Start Shift" button to request opening float.
    - **Waiting for Approval**: Polling status while vault manager processes float request.
    - **Shift Active**: Full operational mode with payout and float adjustment capabilities.
    - **Pending Review**: Awaiting manager review after blind close with discrepancy.
    - **Shift Closed**: Summary view of completed shift.
- **Features**:
    - **Stash Balance**: Real-time display of current cashier balance.
    - **Payout Modals**: Ticket Redemption (blue theme) and Hand Pay (emerald theme).
    - **Float Requests**: Mid-shift increase/decrease requests with denomination input.
    - **End Shift**: Blind Close process (cashier enters physical count without seeing expected balance).

### 2. Cashier Activity
- **Path**: `/vault/cashier/activity`
- **Component**: `CashierActivitySection`
- **Purpose**: Personal transaction history for the current shift.
- **Features**:
    - Filtered view showing only transactions related to the cashier's shift.
    - Real-time updates as payouts and float adjustments are processed.

### 3. Cashier Payouts
- **Path**: `/vault/cashier/payouts`
- **Component**: Payout-specific interface (if separate from main dashboard).
- **Purpose**: Dedicated payout processing interface.

### 4. Cashier Float Requests
- **Path**: `/vault/cashier/float-requests`
- **Purpose**: View status of pending and historical float requests.

---

## Key UI Components & Modals

### Vault Manager Modals
1. **VaultInitializeModal**: Start vault shift with opening denomination count.
2. **VaultAddCashModal**: Record external cash inflows (bank withdrawals).
3. **VaultRemoveCashModal**: Record external cash outflows (bank deposits).
4. **VaultRecordExpenseModal**: Log operational expenses with receipt upload.
5. **VaultReconcileModal**: Perform opening reconciliation or mid-shift spot checks.
6. **VaultCollectionWizardModal**: Multi-step machine collection process.
7. **VaultSoftCountModal**: Record mid-day machine drops for vault replenishment.
8. **VaultCloseShiftModal**: End-of-day vault closing with final denomination count.
9. **ViewDenominationsModal**: Display bill breakdown for any transaction or balance.

### Cashier Modals
1. **CashierShiftOpenModal**: Request opening float from vault manager.
2. **TicketRedemptionForm**: Process ticket payouts (amount-only, no denominations).
3. **HandPayForm**: Process jackpot/hand pay payouts with machine selection.
4. **CashierShiftCloseModal**: Blind close with physical denomination count.
5. **FloatRequestModal**: Request mid-shift float increase/decrease.

### Shared Components
- **DenominationInputGrid**: Standardized bill count input (100, 50, 20, 10, 5, 1).
- **VaultFloatRequestsPanel**: Real-time pending float request notifications.
- **ShiftReviewPanel**: Manager interface for resolving cashier discrepancies.
- **MachineSearchSelect**: Optimized machine lookup for collections and payouts.

---

## Model Integration (Frontend View)

The frontend maps API responses to these shared types (`shared/types/vault.ts`):

| Model | Frontend Usage | Key Component |
|-------|----------------|---------------|
| `VaultShift` | Determines dashboard activation and balance tracking | `VaultBalanceCard` |
| `CashierShift` | Manages operational state and stash balance | `CashierDashboardPageContent` |
| `VaultTransaction` | Populates audit tables and activity logs | `VaultTransactionsTable` |
| `FloatRequest` | Displays pending approvals with action buttons | `VaultFloatRequestsPanel` |
| `Payout` | Shows payout history and metrics | `CashierActivitySection` |
| `MachineCollection` | Tracks machine drop collections | `VaultCollectionWizardModal` |
| `SoftCount` | Records mid-shift machine soft counts | `VaultSoftCountModal` |

---

## Business Rule Enforcement (Frontend)

- **BR-01**: Vault cannot close while any cashier shifts are `active` or `pending_review`.
- **BR-06**: Float requests are disabled if no active vault shift exists.
- **BR-X**: Mandatory opening reconciliation before most vault operations are enabled.
- **C-4**: Blind Close prevents cashiers from seeing expected balance during shift close.
- **Speed Over Inventory**: Cashier payouts are amount-only (no denomination input) for rapid processing.

---

## Navigation Structure

### Vault Manager Navigation (`vaultNavigation.ts`)
- Dashboard (Overview)
- Transactions
- Expenses
- Floats
- Transfers
- Cashiers
- Activity Log
- Reports → End of Day

### Cashier Navigation
- Shifts (Dashboard)
- Activity
- Payouts (if separate)
- Float Requests (if separate)

---

## State Management

### Global State (Zustand)
- `hasActiveVaultShift`: Boolean flag for vault shift status.
- `isVaultReconciled`: Boolean flag for reconciliation status.
- User context (roles, assigned locations).

### Local State
- Modal visibility states.
- Form data for complex inputs (denominations, expenses).
- Loading and error states.
- Polling intervals for real-time updates.

---

## Performance Considerations

- **Polling**: Cashier dashboard polls for float approval status every 30 seconds.
- **Optimistic Updates**: Balance changes reflected immediately in UI before server confirmation.
- **Skeleton Loaders**: Content-specific loading states for all async data (e.g., `VaultOverviewSkeleton`).
- **Debounced Search**: Machine and transaction search inputs use debouncing.

---

## Related Documentation

- **Detailed Workflows**: `Documentation/frontend/vault/vault-manager/` and `Documentation/frontend/vault/cashier/`
- **Backend APIs**: `Documentation/backend/vault/`
- **Shared Types**: `shared/types/vault.ts`
- **Helper Functions**: `lib/helpers/vaultHelpers.ts`
