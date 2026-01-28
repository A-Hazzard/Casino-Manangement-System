# Vault & Cashier Management - Phase 2 Plan

This document outlines features and improvements deferred to Phase 2, following the completion of the core Vault and Cashier implementation in Phase 1.

## 1. Mid-Shift Float Requests
**Current Status:**  
Cashiers can only request floats during shift opening. Mid-shift requests (e.g., topping up small denominations) are currently handled via toast placeholders.

**Phase 2 Implementation:**
- **UI:** Add "Request Float" button in Cashier Dashboard active view.
- **Modal:** Create `FloatRequestModal` allowing amount and denomination specification.
- **API:** Reuse `POST /api/vault/float-request` (Type: 'increase').
- **Vault Approval:** Already supported in `VaultFloatRequestsPageContent`.

## 2. Vault Manual Float Operations
**Current Status:**  
"Issue Float" (Push) and "Receive Float" (Pull) buttons on `VaultFloatTransactionsPage` are placeholders.

**Phase 2 Implementation:**
- **Issue Float:** Allow Vault Manager to manually issue cash to a desk/cashier without a request (e.g., correcting an error or initializing a drawer).
- **Receive Float:** Allow Vault Manager to sweep cash from a desk manually (Mid-shift skim).
- **Integration:** These actions create `FloatTransaction` records and update `CashierShift` balances real-time.

## 3. advanced Reporting & Exports
**Current Status:**  
Export buttons (PDF, CSV) on reports pages (`VaultEndOfDayReportsPage`, `VaultCashOnPremisesPage`) are placeholders.

**Phase 2 Implementation:**
- **PDF Generation:** Implement server-side or client-side PDF generation (e.g., using `react-pdf` or `jspdf`) for official closing reports.
- **CSV Export:** Implement JSON-to-CSV conversion for raw data export.

## 4. Enhanced Security & Audit
**Current Status:**  
Basic role checks and logging.

**Phase 2 Implementation:**
- **Supervisor Overrides:** Require Supervisor PIN for high-value payouts or voiding transactions.
- **Multi-Location Transfers:** Robust approval workflow for `InterLocationTransfer` (currently implemented but could use enhanced notification/email alerts).

## 5. Machine Integration
**Current Status:**  
Machine Balance uses `metrics.totalMachineBalance`.

**Phase 2 Implementation:**
- **Live Meter Sync:** Ensure machine balances update in near real-time from SAS meters.
- **Drop/Fill Wizard:** Guided workflow for physical drops and fills linked to Vault counts.

## 6. UI Refinements
- **Animations:** Add `framer-motion` for smoother transitions.
- **Mobile UX:** Further optimize complex tables for mobile (currently using card views).

## Summary
Phase 1 has delivered a fully functional core system enabling Shift Management, Payouts, Vault Balancing, and Transaction History. Phase 2 will focus on operational flexibility (mid-shift actions) and reporting depth.
