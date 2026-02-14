# Remove Cash Modal Documentation
**Component:** `VaultRemoveCashModal`
**Trigger:** "Remove Cash" button on Vault Dashboard.

## Purpose
Records external cash removals from the vault (e.g., bank deposits or owner withdrawals).

## Inputs
1.  **Denominations:** Breakdown of bills being removed (via `DenominationInputGrid`).
2.  **Amount:** *Calculated automatically* based on denominations.
3.  **Destination:** Optional notes on where the funds are going (e.g., "Bank Deposit").

## Validation
*   **Funds Check:** Total amount cannot exceed current Vault Balance.
*   **Inventory Check:** Selected bill quantities cannot exceed actual counts in `VaultShift` current inventory.

## System Workflow
1.  **Authorization:** Requires `vault-manager` or higher roles.
2.  **Inventory Impact:** Decrements `VaultShift.currentDenominations` and `closingBalance` for the active shift.
3.  **Audit Trail:** Creates a `VaultTransaction` of type `remove_cash`.

## API Interface
*   **Endpoint:** `POST /api/vault/remove-cash`
*   **Body Example:**
    ```json
    {
      "denominations": [
        {"denomination": 100, "quantity": 5}
      ],
      "amount": 500,
      "notes": "Bank deposit"
    }
    ```
