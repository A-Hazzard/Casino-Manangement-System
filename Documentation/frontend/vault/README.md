# Vault & Cashier Frontend Documentation

**Last Updated:** February 2026
**Version:** 3.0.0

## Overview

This directory contains detailed documentation for the Vault Management System frontend, covering both **Vault Manager** and **Cashier** interfaces. The system is designed for high-stakes cash handling with strict audit trails and real-time validations.

---

## Dashboard Structure

The vault system is split into two primary contexts based on user roles:

### 1. Vault Management (`/vault/management`)
**For Vault Managers (VM)**
- **Overview Dashboard:** Real-time metrics, health grid, top 4 cashiers, advanced charts, and recent activity.
- **Transactions:** Complete audit trail with denomination breakdowns.
- **Expenses:** Operational cost tracking with 7-day default view and receipt uploads.
- **Float Management:** Approve/deny cashier float requests with denomination-specific controls.
- **Transfers:** Inter-property cash movements with in-transit tracking.
- **Cashier Management:** Create accounts, reset passwords, monitor performance.
- **Activity Log:** Comprehensive audit trail of all vault actions.
- **End-of-Day Reports:** Compliance reporting with export capabilities.

### 2. Cashier Dashboard (`/vault/cashier`)
**For Cashiers (C)**
- **Shift Control:** Start/End shift with float request workflow.
- **Payouts:** **Ticket Redemption** (blue theme) and **Hand Pay** (emerald theme) with amount-only entry.
- **Float Tools:** Request increases or return excess cash to vault.
- **Activity:** Personal transaction history for current shift.

---

## Key UI Components

### Core Components

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **VaultOverviewPageContent** | `VAULT/overview/VaultOverviewPageContent.tsx` | Main vault dashboard with balance, metrics, and quick actions. |
| **CashierDashboardPageContent** | `VAULT/cashier/CashierDashboardPageContent.tsx` | Cashier operational interface with shift management. |
| **VaultTransactionsPageContent** | `VAULT/transactions/VaultTransactionsPageContent.tsx` | Transaction history with filtering and export. |
| **VaultExpensesPageContent** | `VAULT/expenses/VaultExpensesPageContent.tsx` | Expense tracking with category filters and 7-day default. |
| **VaultFloatTransactionsPageContent** | `VAULT/floats/VaultFloatTransactionsPageContent.tsx` | Float request management interface. |
| **VaultTransfersPageContent** | `VAULT/transfers/VaultTransfersPageContent.tsx` | Inter-property transfer management. |
| **CashierManagementPanel** | `VAULT/admin/CashierManagementPanel.tsx` | Cashier account administration. |
| **VaultActivityLogPageContent** | `VAULT/activity/VaultActivityLogPageContent.tsx` | Comprehensive activity audit trail. |
| **VaultEndOfDayReportsPageContent** | `VAULT/reports/end-of-day/VaultEndOfDayReportsPageContent.tsx` | Daily closing reports with export. |

### Vault Manager Modals

| Modal | Path | Purpose |
| :--- | :--- | :--- |
| **VaultInitializeModal** | `VAULT/overview/modals/VaultInitializeModal.tsx` | Start vault shift with opening denomination count. |
| **VaultAddCashModal** | `VAULT/overview/modals/VaultAddCashModal.tsx` | Record external cash inflows (bank withdrawals). |
| **VaultRemoveCashModal** | `VAULT/overview/modals/VaultRemoveCashModal.tsx` | Record external cash outflows (bank deposits). |
| **VaultRecordExpenseModal** | `VAULT/overview/modals/VaultRecordExpenseModal.tsx` | Log expenses with receipt upload and denomination tracking. |
| **VaultReconcileModal** | `VAULT/overview/modals/VaultReconcileModal.tsx` | Opening reconciliation and mid-shift spot checks. |
| **VaultCollectionWizardModal** | `VAULT/overview/modals/VaultCollectionWizardModal.tsx` | Multi-step machine collection process. |
| **VaultSoftCountModal** | `VAULT/overview/modals/VaultSoftCountModal.tsx` | Record mid-day machine drops for vault replenishment. |
| **VaultCloseShiftModal** | `VAULT/overview/modals/VaultCloseShiftModal.tsx` | End-of-day vault closing with final count. |
| **ViewDenominationsModal** | `VAULT/overview/modals/ViewDenominationsModal.tsx` | Display bill breakdown for any transaction. |

### Cashier Components & Forms

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **TicketRedemptionForm** | `VAULT/cashier/payouts/TicketRedemptionForm.tsx` | Ticket payout with barcode entry, amount, and date. |
| **HandPayForm** | `VAULT/cashier/payouts/HandPayForm.tsx` | Jackpot/hand pay with machine selection and reason. |
| **CashierShiftOpenModal** | `VAULT/cashier/shifts/CashierShiftOpenModal.tsx` | Request opening float from vault manager. |
| **CashierShiftCloseModal** | `VAULT/cashier/shifts/CashierShiftCloseModal.tsx` | Blind close with physical denomination count. |
| **FloatRequestModal** | `VAULT/cashier/float-requests/FloatRequestModal.tsx` | Mid-shift float increase/decrease requests. |
| **CashierActivitySection** | `VAULT/cashier/CashierActivitySection.tsx` | Personal transaction history display. |

### Shared UI Components

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **DenominationInputGrid** | `shared/ui/DenominationInputGrid.tsx` | Standardized grid for entering bill counts (100, 50, 20, 10, 5, 1). |
| **MachineSearchSelect** | `shared/ui/machine/MachineSearchSelect.tsx` | Optimized machine lookup for collections and payouts. |
| **VaultFloatRequestsPanel** | `VAULT/overview/sections/VaultFloatRequestsPanel.tsx` | Real-time pending float request notifications. |
| **ShiftReviewPanel** | `VAULT/overview/sections/ShiftReviewPanel.tsx` | Manager interface for resolving cashier discrepancies. |
| **VaultBalanceCard** | `VAULT/overview/cards/VaultBalanceCard.tsx` | Displays vault balance, last audit, and Cash on Premises. |
| **VaultHealthGrid** | `VAULT/overview/sections/VaultHealthGrid.tsx` | Real-time health metrics (Cash In/Out/Net/Payouts). |
| **VaultCashDesksSection** | `VAULT/overview/sections/VaultCashDesksSection.tsx` | Top 4 cashiers by balance in responsive grid. |
| **VaultRecentActivitySection** | `VAULT/overview/sections/VaultRecentActivitySection.tsx` | Last 5 vault transactions with type badges. |

### Advanced Components

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **AdvancedDashboard** | `VAULT/overview/sections/AdvancedDashboard.tsx` | Interactive charts (Balance Trend, Transaction Volume, Cash Flow). |
| **VaultInventoryCard** | `VAULT/overview/cards/VaultInventoryCard.tsx` | Real-time denomination inventory display. |
| **MachineCollectionForm** | `VAULT/machine/MachineCollectionForm.tsx` | Machine collection entry with denomination breakdown. |
| **SoftCountForm** | `VAULT/machine/SoftCountForm.tsx` | Soft count entry for mid-shift machine drops. |
| **InterLocationTransferForm** | `VAULT/transfers/InterLocationTransferForm.tsx` | Inter-property transfer initiation. |
| **AuditTrailViewer** | `VAULT/reports/AuditTrailViewer.tsx` | Detailed audit trail with filtering. |

---

## Important Workflows

### The "Speed Over Inventory" Philosophy
**Cashier Payouts** are designed for rapid floor operations:
1. Select Payment Type (Ticket Redemption or Hand Pay).
2. Enter the **Total Amount** (no denomination breakdown required).
3. Submit. The system updates `currentBalance` automatically.

**Why?** High-volume operations during peak times require speed. Physical bill tracking is resolved during the **Blind Close** process at shift end.

### Vault Manager: Denomination Tracking
**All Vault Manager operations** require strict denomination breakdowns:
- Add/Remove Cash
- Record Expense
- Machine Collections
- Soft Counts
- Initialize/Close Shift
- Reconciliation

**Why?** Vault operations directly impact the central safe's physical inventory and require bill-by-bill accuracy.

### Liquidity & Denominations
Denominations are required for:
- **Vault Manager**: All cash movements.
- **Cashier**: Starting shift, mid-shift float adjustments, ending shift (Blind Close).
- **Cashier Payouts**: Amount-only (no denominations).

### The Blind Close Process
1. **Cashier**: Clicks "End Shift" and enters physical bill count without seeing expected balance.
2. **System**: Compares physical count to system expectation.
3. **If Match**: Shift closes automatically.
4. **If Mismatch**: Shift enters `pending_review` status.
5. **Vault Manager**: Reviews discrepancy and either accepts variance or adjusts with audit comment.
6. **Finalization**: Cash is logically moved back to vault inventory.

---

## State Management

### Global State (Zustand - `useUserStore`)
- `hasActiveVaultShift`: Boolean flag for vault shift status.
- `isVaultReconciled`: Boolean flag for reconciliation status.
- User context (roles, assigned locations, permissions).

### Local Component State
- Modal visibility flags.
- Form data (denominations, expenses, notes).
- Loading and error states.
- Polling intervals for real-time updates.

---

## Navigation Structure

### Vault Manager Navigation (`lib/constants/navigation/vaultNavigation.ts`)
- Dashboard (Overview)
- Transactions
- Expenses
- Floats
- Transfers
- Cashiers
- Activity Log
- Reports → End of Day

### Cashier Navigation
- Shifts (Main Dashboard)
- Activity
- Payouts (if separate)
- Float Requests (if separate)

---

## Notification System

### Visual Indicators
- **Green Trending Up**: Pending float request awaiting approval.
- **Red Alert**: Shift discrepancy detected (pending review).
- **Orange Clock**: Shift awaiting vault manager resolution.
- **Blue Info**: General informational notifications.

### Notification Bell (Vault Manager)
- Real-time polling for float requests and shift discrepancies.
- Integrated action buttons (Approve/Deny) for rapid response.
- Badge count for pending items.

---

## Business Rules Enforced

- **BR-01**: Vault cannot close while any cashier shifts are `active` or `pending_review`.
- **BR-06**: Float requests disabled if no active vault shift exists.
- **BR-X**: Mandatory opening reconciliation before most vault operations.
- **C-4**: Blind Close prevents cashiers from seeing expected balance.

---

## Performance Optimizations

- **Polling**: Cashier dashboard polls for float approval every 30 seconds.
- **Optimistic Updates**: Balance changes reflected immediately before server confirmation.
- **Skeleton Loaders**: Content-specific loading states (e.g., `VaultOverviewSkeleton`).
- **Debounced Search**: Machine and transaction search inputs.
- **Lazy Loading**: Charts and heavy components loaded on-demand.

---

## Related Documentation

### Detailed Workflow Docs
- **Vault Manager**: `vault-manager/` directory
- **Cashier**: `cashier/` directory
- **Shared Workflows**: `VM_and_Cashier/` directory

### Backend Integration
- **API Documentation**: `Documentation/backend/vault/`
- **Shared Types**: `shared/types/vault.ts`
- **Helper Functions**: `lib/helpers/vaultHelpers.ts`

### Page-Level Overview
- **All Pages**: `Documentation/frontend/pages/vault.md`
