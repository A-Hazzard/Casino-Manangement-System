# Project: Cashdesk and Vault - Complete Functional Requirements

## #Details
This document outlines **every functional requirement** observed across the Vault and Cashier application, including all buttons, interactive elements, data views, and background logic. This is designed to be the exhaustive "Source of Truth" for ClickUp task creation.

### Operational Objectives
- **Security**: Mandatory opening reconciliations and secondary manager reviews for discrepancies.
- **Speed**: Cashier payouts streamlined for high-volume environments (Amount-only).
- **Auditability**: Permanent denomination-level logs for every Safe/Vault movement.

---

## #Subtasks

### 1. Vault Management & Safe Operations
- **Shift Initialization**: Process for creating the first shift of a gaming day.
- **Inflow/Outflow Management**: Recording cash from external sources (Banks/Drops) or to external targets (Deposits).
- **Safe Reconciliation**: Mandatory daily audits and mid-shift balance verifications.
- **Inventory Visualization**: Real-time tracking of 6-denomination bill stock ($100 to $1).
- **Closing Compliance**: End-of-day logic that blocks closure if cashier desks are inconsistent.

### 2. Cashier Lifecycle & Control
- **Shift Orchestration**: Opening/Closing requests with manager approval flow.
- **Blind Close Flow**: System-vs-Physical comparison without data exposure to the user.
- **Discrepancy Hub**: Manager interface for resolving "Unbalanced Shifts" (Accept Variance vs. Force Close).
- **Float Management**: Real-time handling of increase/decrease requests.

### 3. Gaming Floor Transactions
- **Ticket Redemption**: Barcode validation and rapid cash payout.
- **Hand Pay (Jackpot)**: Machine-linked payouts with audit reasons.
- **Activity Monitoring**: Shift-level transaction streams for both Cashiers and Managers.

### 4. Revenue Collection & Soft Counts
- **Machine Collection Wizard**: Step-by-step guided floor drop process.
- **Coverage Tally**: Visual verification that all assigned machines have been emptied.
- **Machine History**: Historical data drill-down for specific machine collection trends.

### 5. Administrative & Account Control
- **Cashier Administration**: Creation, disabling, and deletion of operator accounts.
- **Security Control**: Password reset workflows and temporary password management.
- **Inter-Location Transfers**: Managing cash movement between physical properties (Phase 4).

### 6. Comprehensive Reporting & Audits
- **End-of-Day (EOD) Summary**: Legal/Compliance documentation generation with selective historical dates.
- **Audit Trail Viewer**: Filterable history of "Who did What and When."
- **Export System**: Generation of CSV, PDF, and Excel (XLSX) files for accounting.
- **Metric Drill-downs**: Ability to view transaction lists contributing to specific health metrics (Cash In/Out).

---

## #Action Items

### Vault Manager Overview (Command Center)
- [ ] **Buttons: Quick Actions**:
    - [ ] Action: `Add Cash` (External inflow with denominations).
    - [ ] Action: `Remove Cash` (External outflow with denominations).
    - [ ] Action: `Record Expense` (Category selection + Receipt upload + Denoms).
    - [ ] Action: `Reconcile` (Audit comment mandatory + Denoms).
    - [ ] Action: `View Activity Log` (Quick jump to audit trail).
    - [ ] Action: `Close Vault Shift` (Validation logic for BR-01).
    - [ ] Action: `Soft Count` (Record mid-shift machine drops).
- [ ] **Data Views: Metrics**:
    - [ ] View: `Vault Balance Card` (Current Balance, Last Audit, Manager Name).
    - [ ] View: `Cash on Premises` (Vault + Machines + Cashier Stashes).
    - [ ] View: `Health Grid` (Cash In, Cash Out, Net, Total Payouts).
    - [ ] View: `Top 4 Cashiers` (Sorted by current stash balance).
    - [ ] View: `Stale Shift Banner` (Warning for shifts older than 24h).
    - [ ] **Interactive Drill-down**: Click metrics to see contributing transactions (Modal).
- [ ] **Interactive**:
    - [ ] `Advanced Charts` (Balance Trend, Volume, Distribution toggles).
    - [ ] `Shift Review Hub**: Resolve pending discrepancies (Accept Variance / Force Close).

### Cashier Management Panel (Admin)
- [ ] **Buttons: User Controls**:
    - [ ] `Create Cashier` (Inherit permissions/location logic).
    - [ ] `Reset Password` (Generate temporary password).
    - [ ] `Disable/Enable User` (Toggle operational status).
    - [ ] `Delete Cashier` (Permanent account removal).
    - [ ] `View Activity` (Modal showing individual cashier trail).
    - [ ] `End Shift Override` (Manager-forced closure of operator shift).
- [ ] **Data Views: Table**:
    - [ ] Columns: `Username`, `Status`, `Balance`, `Discrepancy`.
    - [ ] `Discrepancy Badge` (Red/Green indicators for review items).
    - [ ] **View Temporary Password**: For new users or resets (Copy-to-Clipboard logic).

### Cashier Dashboard (Operator Interface)
- [ ] **Buttons: Shift Control**:
    - [ ] `Start Shift` (Denom count request entry).
    - [ ] `End Shift` (Physical count trigger - Blind Close).
    - [ ] `Request Float Change` (Increase/Decrease modal).
- [ ] **Buttons: Payouts**:
    - [ ] `Ticket Redemption` (Blue theme, Barcode/Amount field + Printed Date tracking).
    - [ ] `Hand Pay` (Emerald theme, Machine select + Amount).
    - [ ] **Machine Meter Verification**: Display "Money In" meter for selected machine.
    - [ ] **Balance Safeguard**: Prevent payout if greater than cashier shift stash.
- [ ] **Data Views**:
    - [ ] `Current Stash Balance` (Real-time update).
    - [ ] `Personal Activity List` (Current shift transactions).

### Transactions & Audit Trail
- [ ] **Data Views & Filtering**:
    - [ ] Filter: `Transaction Type`, `User`, `Date Range`, `Quick Search`.
    - [ ] Detail: `Denomination breakdown drill-down` (Click row to see bills).
    - [ ] Status: `Voided` vs `Completed` badges.
- [ ] **Actions**:
    - [ ] `Void Transaction` (Manager only + Audit reason mandatory).

### Reporting & Exports
- [ ] **Actions: Reports Dashboard**:
    - [ ] `Generate EOD Report` (Date selective via historical calendar).
    - [ ] `Export PDF` (Print-optimized closing report).
    - [ ] `Export CSV` (Data-rich summary).
    - [ ] `Export Excel` (XLSX formatted reports).
    - [ ] `Refresh Data` (Real-time re-sync).
- [ ] **Data Views: EOD**:
    - [ ] `Variance Alert` (Warning if system != physical).
    - [ ] `Location Breakdown` (Vault vs Machines vs Floor).

### UI/UX Consistency (Cross-System)
- [ ] **Loading**: Replace spinners with `Skeletons` in Tables, Metrics, and Cards.
- [ ] **Interaction**: `DenominationInputGrid` (Standard 6-denom rows across all modals).
- [ ] **Security**: `Read-Only Mode` (Disable Reconcile/Pay/Record Expense buttons during stale shifts).
- [ ] **Feedback**: `Toast notifications` for successes and validation errors.
