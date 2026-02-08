# Vault Management System: Potential Issues & Improvement Areas

This document outlines potential technical issues, UI/UX inconsistencies, and architectural gaps identified within the current Vault Management (VM) and Cashier implementations.

## 1. UI/UX & Consistency Issues

### 1.1 Header Inconsistency
*   **Issue**: There are multiple header implementations across vault pages.
    *   **Dashboard**: Uses a local `VaultHeader` component.
    *   **Sub-pages**: Use the unified `VaultManagerHeader` component.
    *   **Cashier Pages**: Mostly manual flexbox headers without unified logic.
*   **Impact**: Inconsistent look and feel; maintenance overhead when updating global features (like the notification bell).
*   **Recommendation**: Standardize all pages to use a single `VaultHeader` or `VaultManagerHeader` component with slots for page-specific actions.

### 1.2 Missing Unified Notification for Cashiers
*   **Issue**: Cashiers do not have a `NotificationBell` in their headers.
*   **Impact**: Cashiers must manually refresh or rely on the dashboard banner to know if a float request was approved or denied. They lack high-visibility alerts for urgent system messages.
*   **Recommendation**: Integrate the `NotificationBell` and `useNotifications` hook into the Cashier interface headers.

### 1.3 Floating Action Buttons (FAB) on Mobile
*   **Issue**: On some mobile views, critical actions (like "Reconcile" or "Record Expense") are buried in the "Quick Actions" card at the bottom of the overview.
*   **Impact**: Slower operational loop for managers on the move.
*   **Recommendation**: Implement a consistent FAB or top-level action menu for mobile users.

---

## 2. Technical & Logic Issues

### 2.1 useCashierShift Polling Bug
*   **Code Location**: `lib/hooks/useCashierShift.ts`
*   **Issue**: Polling is disabled when shift status is `idle`.
    ```typescript
    if (!user || status === 'idle' || status === 'loading') {
      return;
    }
    ```
*   **Impact**: If a cashier is on the dashboard and the status is `idle` (waiting for vault reconciliation), the "Start Shift" button will **never** enable automatically when the VM reconciles the vault. The cashier must manually refresh the page.
*   **Recommendation**: Allow polling in `idle` state if `isVaultReconciled` is false.

### 2.2 Redundant Polling & State Sync
*   **Issue**: Both the `VaultManagerHeader` and individual page contents (like `VaultOverviewPageContent`) implement their own `setInterval` polling.
*   **Impact**: Multiple redundant API requests to `/api/vault/notifications`, `/api/vault/balance`, etc., every 30 seconds. This can lead to race conditions or unnecessary server load.
*   **Recommendation**: Centralize polling logic into a context provider or ensure sub-components rely on the parent's refresh triggers.

### 2.3 Heavy Dashboard Data Load
*   **Issue**: `fetchVaultOverviewData` fetches balance, metrics, transactions, pending shifts, float requests, and cash desks in a single large call or multiple simultaneous calls.
*   **Impact**: Performance degradation as the transaction history grows or the number of cashiers increases.
*   **Recommendation**: Implement pagination for "Recent Activity" on the dashboard and optimize the aggregation queries.

---

## 3. Security & Validation

### 3.1 Client-Side Stock Validation
*   **Issue**: While the `NotificationBell` handles shortage alerts for float requests, some direct actions (like `Direct Shift Open` or `Remove Cash`) may not strictly validate individual denomination counts on the client side before submission.
*   **Impact**: Users might fill out a large form only to be rejected by the backend with a generic "Insufficient Stock" error.
*   **Recommendation**: Add real-time stock-checking logic to all cash-movement forms.

### 3.2 Error Boundary Coverage
*   **Issue**: `PageErrorBoundary` is applied to some pages but missing from the main Vault Overview and several Cashier sub-pages.
*   **Impact**: A single sub-component failure (e.g., in `AdvancedDashboard` charts) could crash the entire management interface.
*   **Recommendation**: Ensure every top-level route component is wrapped in a `PageErrorBoundary`.

### 3.3 Licensee Filtering Persistence
*   **Issue**: While helpers like `getUserLocationFilter` are used, ensure that all aggregator queries in `vaultHelpers.ts` consistently apply the `licensee` filter to avoid data leakage between different licensees in a multi-tenant environment.
*   **Impact**: Potential cross-tenant data visibility.
*   **Recommendation**: Audit all `VaultTransaction.aggregate` calls to ensure the first `$match` stage includes licensee filtering.

---

## 4. Feature Gaps

### 4.1 Cash Desks "Future Update"
*   **Issue**: The "Cash Desks" section is visible but several pages redirect to `notFound()` or are marked as placeholders.
*   **Impact**: Confusing UX for users who expect the feature to be active.
*   **Recommendation**: Either hide the entries or add "Coming Soon" tooltips/banners until implementation is complete.

---

**Last Updated**: February 2026
