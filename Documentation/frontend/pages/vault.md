# Vault Management Frontend Documentation

**Author:** Antigravity (Google DeepMind)
**Last Updated:** January 2026
**Version:** 2.0.0

## Overview

The Vault Management frontend is a dual-interface system designed for high-stakes cash handling. It provides distinct workflows for **Vault Managers** (Admins) and **Cashiers** (Operators), with localized state management and real-time validations.

## Application Architecture

The module is found within `app/vault/` and uses components from `components/VAULT/`.

### Core Technologies
- **UI Framework**: Tailwind CSS with Shadcn UI components.
- **State Management**: Zustand for user context, local state for complex forms.
- **Data Hooking**: `useCashierShift` and `useVaultOverview` (via helpers) for real-time status.

## Major Pages

### 1. Vault Manager Dashboard
- **Path**: `/vault/management` (or primary `/vault`)
- **Main Component**: `VaultOverviewPageContent`
- **Purpose**: High-level overview of Site Source of Truth. Shows vault balance, metrics (In/Out/Net), and cash desk statuses.
- **Quick Actions**:
    - **Add Cash**: `VaultAddCashModal`. Requires denomination breakdown.
    - **Remove Cash**: `VaultRemoveCashModal`. Tracks bank deposits/ATM fills.
    - **Soft Count / Collection**: Redirects to specialized processing pages.

### 2. Cashier Dashboard
- **Path**: `/vault/cashier/dashboard` (Renamed from Shifts for clarity)
- **Main Component**: `CashierDashboardPageContent`
- **Purpose**: Operational interface for daily transactions.
- **Workflows**:
    - **Shift Initiation**: `CashierShiftOpenModal`. Requests float from VM. Enforces **BR-06** (Manager must be on shift).
    - **Payouts**: `ProcessPayoutModal`. Handles Hand Pays and Ticket Redemptions.
    - **End of Shift**: `CashierShiftCloseModal`. Performs "Blind Close" (C-4).

### 3. Transaction History & Audit
- **Path**: `/vault/management/transactions`
- **Main Component**: `VaultTransactionsPageContent`
- **Table**: `VaultTransactionsTable`
- **Feature**: Displays a complete ledger of all movements, including a detailed **Denominations** column showing exact bill counts.

## Key UI Components & Modals

### Denomination Breakdown Input
Used in `VaultAddCashModal`, `VaultRemoveCashModal`, and `VaultInitializeModal`.
- **Logic**: Users enter counts for $100, $50, $20, $10, $5, and $1.
- **Auto-Calculation**: Total amount is computed in real-time as a read-only field.

### Vault Float Requests Panel
- **File**: `VaultFloatRequestsPanel.tsx`
- **Status**: Visual indicator for pending requests. Pulse animations for urgent approvals.

---

## Model Integration (Frontend View)

The frontend maps API responses to these shared types (`shared/types/vault.ts`):

| Model | Frontend Usage | Key Component |
|-------|----------------|---------------|
| `VaultShift` | Determines dashboard activation | `VaultBalanceCard` |
| `CashierShift` | Manages operational state | `CashierDashboardPageContent` |
| `VaultTransaction` | Populates the audit tables | `VaultTransactionsTable` |
| `FloatRequest` | Displays pending approvals | `VaultFloatRequestsPanel` |
| `Payout` | Shows transaction history | `VaultPayoutsPageContent` |

## Business Rule Enforcement (Frontend)

- **BR-06**: The "Request Float" button is disabled in the `CashierShiftOpenModal` if `hasActiveVaultShift` is false.
- **BR-03**: All monetary actions require an audit note before submission.
- **C-4**: Closing a shift requires entering a physical count without seeing the expected system balance (Blind Close).
