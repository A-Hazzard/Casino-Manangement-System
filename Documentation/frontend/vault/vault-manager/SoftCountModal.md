# Soft Count Modal Documentation
**Component:** `VaultSoftCountModal`
**Trigger:** "Soft Count" button on Vault Dashboard.

## Purpose
Records mid-day cash removal from machine bill validators to replenish the vault's float without performing a full collection.

## Inputs
1.  **Machine ID:** Selection of the machine being tapped.
2.  **Denominations:** Breakdown of bills removed.
3.  **Amount:** *Calculated automatically* based on denominations.
4.  **Notes:** Optional justification or details.

## Integration
- Uses **SoftCountForm** (`components/VAULT/machine/SoftCountForm.tsx`) as its internal form.
- Transitions the user workflow from a page-based UI to a faster modal-based UI.

## API Interaction
- **Endpoint:** `POST /api/vault/soft-counts`
- **Format:** `application/json`
- **Body:**
  ```json
  {
    "machineId": "string",
    "amount": "number",
    "denominations": [{ "denomination": number, "quantity": number }],
    "notes": "string"
  }
  ```
- **Models Used:**
  - `SoftCountModel` (`app/api/lib/models/softCount.ts`): Records the soft count event.
  - `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`): Records the inflow (type: `soft_count`).
  - `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`): Increments `closingBalance`.

## Success Behavior
- Closes the modal.
- Shows success toast: "Soft count recorded: $[Amount]".
- Updates Vault Inventory and Balance immediately.
