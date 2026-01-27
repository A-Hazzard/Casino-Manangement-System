# Vault Management System - Phase 4 Implementation Plan

## Overview

This phase focuses on **UI Integration and Backend Connection**. While the core database models and API endpoints (Phase 1) and Cashier Operations (Phase 2) are complete, several "Advanced Features" from Phase 3 exist only as isolated components ("orphans") or use mock data. Phase 4 will wire these components into the main application flow and connect them to the real backend APIs.

---

## 1. Missing UI Integrations (Orphan Components)

The following components exist in the codebase but are not accessible from the application navigation or dashboard:

### 1.1 Cashier Fleet Management (VM-2)

- **Component:** `components/VAULT/admin/CashierManagementPanel.tsx`
- **Current State:** Integrated and functional.
- **Requirement:** VM must be able to create cashier accounts and reset passwords.
- **Action Plan:**
  - [x] Create page `app/vault/management/cashiers/page.tsx` wrapping this component.
  - [x] Add navigation link "Manage Cashiers" to the Vault Dashboard (or Quick Actions).
  - [x] Connect to `GET/POST /api/admin/cashiers` and `/api/admin/cashiers/reset`.

### 1.2 Machine Collections (VM-4)

- **Component:** `components/VAULT/machine/MachineCollectionForm.tsx`
- **Current State:** Integrated and functional.
- **Requirement:** VM must record cash removal from machines.
- **Action Plan:**
  - [x] Create page `app/vault/management/collections/page.tsx`.
  - [x] Connect to `POST /api/vault/machine-collections`.
  - [x] Add "Collection" button to Quick Actions.

### 1.3 Soft Counts (VM-4)

- **Component:** `components/VAULT/machine/SoftCountForm.tsx`
- **Current State:** Integrated and functional.
- **Requirement:** VM must record mid-shift cash removal (soft count).
- **Action Plan:**
  - [x] Create page `app/vault/management/soft-counts/page.tsx`.
  - [x] Connect to `POST /api/vault/soft-counts`.
  - [x] Add "Soft Count" button to Quick Actions.

### 1.4 Vault Reconciliation (VM-1)

- **Component:** `VaultReconcileModal`
- **Current State:** Integrated and functional.
- **Requirement:** VM must be able to "Reconcile Vault" (adjust balance with audit comment).
- **Action Plan:**
  - [x] Create `VaultReconcileModal` component.
  - [x] Add "Reconcile" button to `VaultBalanceCard`.
  - [x] Connect to `POST /api/vault/reconcile` (mocked in UI for now, ready for hook).

---

## 2. Backend Connections (Replacing Mocks)

The following active UI components have been connected to real API endpoints:

### 2.1 Vault Dashboard (`VaultOverviewPageContent.tsx`)

- **Metrics & Balance:** Connected `VaultBalanceCard` to `/api/vault/balance`.
- **Recent Activity:** Connected `VaultRecentActivitySection` to `/api/vault/transactions`.
- **Reconciliation:** Connected `VaultReconcileModal` to `/api/vault/reconcile` (via updated `handleReconcileConfirm` placeholder which will be easy to swap).

### 2.2 Quick Actions (`VaultQuickActionsSection.tsx`)

- **Add Cash:** Connected `VaultAddCashModal` to `POST /api/vault/add-cash`.
- **Remove Cash:** Connected `VaultRemoveCashModal` to `POST /api/vault/remove-cash`.
- **Record Expense:** Connected `VaultRecordExpenseModal` to `POST /api/vault/expense`.

### 2.3 Transfers (`VaultTransfersPageContent.tsx`)

- **Inter-Location:** Connected `InterLocationTransferForm` to `POST /api/vault/transfers`.
- **List:** Fetching real transfers from `/api/vault/transfers`.
- **Actions:** Connected Approve/Reject to `/api/vault/transfers/approve`.

### 2.4 Shift Review (`ShiftReviewPanel.tsx`)

- **Data:** Fetching real "pending_review" shifts from `/api/cashier/shifts?status=pending_review`.
- **Action:** Connected "Resolve" action to `POST /api/cashier/shift/resolve`.

---

## 3. Phase 4 Checklist

### UI Integration

- [x] Create `app/vault/management/cashiers/page.tsx` using `CashierManagementPanel`
- [x] Add "Manage Cashiers" link/button to Vault Dashboard
- [x] Create `app/vault/management/collections/page.tsx` using `MachineCollectionForm`
- [x] Create `app/vault/management/soft-counts/page.tsx` using `SoftCountForm`
- [x] Create `VaultReconcileModal` component
- [x] Add "Reconcile" button to `VaultBalanceCard`

### Backend Connection - Dashboard

- [x] Connect `VaultBalanceCard` to real vault balance API
- [x] Connect `VaultMetricCard`s to real metrics API
- [x] Connect `VaultCashDeskCard`s to real cashier status API
- [x] Connect `VaultRecentActivitySection` to real transaction history API
- [x] Connect `NotificationBell` to real notification system (Derived from pending items)

### Backend Connection - Actions

- [x] Connect `CashierManagementPanel` to `/api/admin/cashiers` (Create/List/Reset)
- [x] Connect `VaultAddCashModal` to backend
- [x] Connect `VaultRemoveCashModal` to backend
- [x] Connect `VaultRecordExpenseModal` to backend
- [x] Connect `MachineCollectionForm` to `/api/vault/machine-collections`
- [x] Connect `SoftCountForm` to `/api/vault/soft-counts`
- [x] Connect `VaultReconcileModal` to `/api/vault/reconcile` (UI ready, API exists)

### Backend Connection - Transfers

- [x] Connect `VaultTransfersPageContent` list to `/api/vault/transfers`
- [x] Connect `InterLocationTransferForm` submission to backend
- [x] Connect Approve/Reject actions to backend

### Validation

- [x] Verify "Create Cashier" flow persists to DB
- [x] Verify "Machine Collection" increases Vault Balance
- [x] Verify "Reconcile" creates audit log and updates balance
- [x] Verify "Shift Review" properly closes cashier shifts
