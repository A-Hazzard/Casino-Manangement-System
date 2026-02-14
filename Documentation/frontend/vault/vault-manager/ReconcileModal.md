# Vault Reconciliation Modal Documentation
**Component:** `VaultReconcileModal`
**Trigger:** "Reconcile" button on Vault Dashboard.

## Purpose
The internal audit tool for Vault Managers to verify system balances against physical cash counts.

## Two Types of Reconciliation

### 1. Mandatory Opening Reconciliation [BR-X]
When a Manager starts a day, they MUST perform an initial reconciliation before most "Quick Actions" (Add/Remove Cash, Floats) become enabled.
*   **Purpose:** Ensures the Manager accepts responsibility for the opening balance.

### 2. Spot Checks (Mid-Shift)
Can be performed at any time to verify the safe's contents during a shift change or audit.

## Workflow
1.  **System Expectation:** The modal displays the `System Balance` and bill breakdown the vault *should* have.
2.  **Physical Entry:** The manager enters the quantities found during the physical count.
3.  **Variance Check:** The modal highlights discrepancies in real-time.
4.  **Submission:** Manager clicks "Confirm Audit".

## Logic & Persistence
*   **Result:** A `Reconciliation` record is added to the `VaultShift.reconciliations` array.
*   **Audit Trail:** Creates a `VaultTransaction` of type `vault_reconcile`.
*   **Impact:** Updates the "Last Audit" timestamp on the main dashboard status card.

## API Interface
*   **Endpoint:** `POST /api/vault/reconcile`
*   **Payload Example:**
    ```json
    {
      "denominations": [...],
      "notes": "Weekly spot check audit"
    }
    ```
