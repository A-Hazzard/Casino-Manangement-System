# Vault Documentation & Implementation Tracker

This document tracks the documentation status and implementation coverage for the Vault Management System (VMS) on both the frontend and backend.

## 📊 Documentation Coverage Index

| Module | Frontend Docs | Backend Docs | Status |
| :--- | :--- | :--- | :--- |
| **Overview / Dashboard** | [FE Dashboard](./frontend/vault/vault-manager/VaultDashboard.md) | [BE README](./backend/vault/README.md) | ✅ Complete |
| **Shift Management** | [FE Shift Review](./frontend/vault/vault-manager/ShiftReview.md) | [BE Shift Close](./backend/vault/vault-manager/shift-close.md) | ✅ Complete |
| **Cashier Operations** | [FE Cashier Dashboard](./frontend/vault/cashier/CashierDashboard.md) | [BE Shift Open](./backend/vault/cashier/shift-open.md) | ✅ Complete |
| **Payouts (Ticket/Handpay)**| [FE Payouts](./frontend/vault/cashier/Payouts.md) | [BE Payouts](./backend/vault/cashier/payouts.md) | ✅ Complete |
| **Float Management** | [FE Floats](./frontend/vault/vault-manager/FloatManagement.md) | [BE Floats](./backend/vault/cashier/float-requests.md) | ✅ Complete |
| **Machine Collections** | [FE Collections](./frontend/vault/vault-manager/CollectionsModal.md) | [BE Collections](./backend/vault/vault-manager/machine-collections.md) | ✅ Complete |
| **Soft Counts** | [FE Soft Count](./frontend/vault/vault-manager/SoftCountModal.md) | [BE Soft Count](./backend/vault/vault-manager/soft-counts.md) | ✅ Complete |
| **Expenses** | [FE Expenses](./frontend/vault/vault-manager/ExpensesModal.md) | [BE Expenses](./backend/vault/vault-manager/expenses.md) | ✅ Complete |
| **Inter-property Transfers**| [FE Transfers](./frontend/vault/vault-manager/Transfers.md) | [BE Transfers](./backend/vault/vault-manager/transfers.md) | ✅ Complete |
| **Transaction Audit** | [FE History](./frontend/vault/VM_and_Cashier/TransactionHistory.md) | [BE Transactions](./backend/vault/VM_and_Cashier/transactions.md) | ✅ Complete |

---

## 🗺️ Page Implementation Checklist (`app/vault`)

Tracking the high-level documentation and state of each route in the `/vault` directory.

### 🏧 Cashier Context (`/vault/cashier`)

- [x] **Dashboard (`/vault/cashier`)**
  - **Description**: Main operational hub for cashiers (Shift start/end, overview).
  - **Doc Reference**: [CashierDashboard.md](./frontend/vault/cashier/CashierDashboard.md)
- [x] **Activity (`/vault/cashier/activity`)**
  - **Description**: Personal audit trail of the cashier's current shift transactions.
  - **Doc Reference**: Included in [CashierDashboard.md](./frontend/vault/cashier/CashierDashboard.md)
- [x] **Float Requests (`/vault/cashier/float-requests`)**
  - **Description**: Interface for requesting liquidity increases or returning excess cash.
  - **Doc Reference**: [FloatRequests.md](./frontend/vault/cashier/FloatRequests.md)
- [x] **Payouts (`/vault/cashier/payouts`)**
  - **Description**: Rapid entry for Ticket Redemption and Hand Pay payouts.
  - **Doc Reference**: [Payouts.md](./frontend/vault/cashier/Payouts.md)
- [x] **Shifts (`/vault/cashier/shifts`)**
  - **Description**: Dedicated view for shift lifecycle (Open/Blind Close).
  - **Doc Reference**: [BlindClose.md](./frontend/vault/cashier/BlindClose.md)

### 🔐 management Context (`/vault/management`)

- [x] **Overview Dashboard (`/vault/management`)**
  - **Description**: Real-time vault health, balance tracking, and quick action modals.
  - **Doc Reference**: [VaultDashboard.md](./frontend/vault/vault-manager/VaultDashboard.md)
- [x] **Activity Log (`/vault/management/activity-log`)**
  - **Description**: System-wide audit trail of all vault-related configuration and management actions.
  - **Doc Reference**: [VaultDashboard.md](./frontend/vault/vault-manager/VaultDashboard.md) (Audit Section)
- [x] **Cashiers (`/vault/management/cashiers`)**
  - **Description**: Management of cashier accounts, status, and reset controls.
  - **Doc Reference**: [VAULT_USERFLOW.md](./frontend/vault/VAULT_USERFLOW.md)
- [x] **Expenses (`/vault/management/expenses`)**
  - **Description**: Log of operational expenses with receipt tracking.
  - **Doc Reference**: [ExpensesModal.md](./frontend/vault/vault-manager/ExpensesModal.md)
- [x] **Floats (`/vault/management/floats`)**
  - **Description**: Central hub for approving/denying/editing pending float requests.
  - **Doc Reference**: [FloatManagement.md](./frontend/vault/vault-manager/FloatManagement.md)
- [x] **Transfers (`/vault/management/transfers`)**
  - **Description**: Inter-location cash movement tracking.
  - **Doc Reference**: [Transfers.md](./frontend/vault/vault-manager/Transfers.md)
- [x] **Reports (`/vault/management/reports`)**
  - **Description**: Compliance and end-of-day financial reporting.
  - **Doc Reference**: [VaultReports.md](./frontend/vault/vault-manager/VaultReports.md)
- [x] **Soft Counts (`/vault/management/soft-counts`)**
  - **Description**: Historical log and entry points for machine soft counts.
  - **Doc Reference**: [SoftCountModal.md](./frontend/vault/vault-manager/SoftCountModal.md)
- [x] **Transactions (`/vault/management/transactions`)**
  - **Description**: Detailed ledger of every bill movement (Audit Trail).
  - **Doc Reference**: [TransactionHistory.md](./frontend/vault/VM_and_Cashier/TransactionHistory.md)

### 🔔 Shared Context

- [x] **Notifications (`/vault/notifications`)**
  - **Description**: Integrated notification detail center (also accessible via FAB).
  - **Doc Reference**: [README.md](./frontend/vault/README.md) (Notifications section)
- [x] **Role Selection (`/vault/role-selection`)**
  - **Description**: Entry point for selecting between Cashier or Vault Manager contexts.
  - **Doc Reference**: [README.md](./frontend/vault/README.md)

---

## 🛠️ Maintenance Notes
- [ ] Ensure all full-screen responsive modal architectural changes are reflected in individual modal docs.
- [ ] Link backend API response changes (v8.18+ cast through unknown) to BE schema docs.
- [ ] Verify Floating Bell behavior documentation in frontend guidelines.
