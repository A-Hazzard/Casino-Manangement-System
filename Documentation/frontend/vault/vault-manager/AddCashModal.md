# Add Cash Modal Documentation
**Component:** `VaultAddCashModal`
**Trigger:** "Add Cash" button on Vault Dashboard.

## Purpose
Records external cash inflows into the vault (e.g., from the bank or owner capital).

## Inputs
1.  **Denominations:** Breakdown of bills being added (via `DenominationInputGrid`).
2.  **Amount:** *Calculated automatically* based on denominations.
3.  **Source:** Optional notes on the origin of the funds (e.g., "Bank Withdrawal", "Owner Drop").

## System Workflow
1.  **Authorization:** Requires `vault-manager` or higher roles.
2.  **Inventory Impact:** Increments `VaultShift.currentDenominations` and `closingBalance` for the active shift.
3.  **Audit Trail:** Creates a `VaultTransaction` of type `add_cash`.

## API Interface
*   **Endpoint:** `POST /api/vault/add-cash`
*   **Body Example:**
    ```json
    {
      "denominations": [
        {"denomination": 100, "quantity": 10},
        {"denomination": 20, "quantity": 50}
      ],
      "amount": 2000,
      "notes": "Bank top-up for weekend"
    }
    ```
