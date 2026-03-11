# Collections Modal Documentation
**Component:** `VaultCollectionModal`
**Trigger:** "Machine Collection" button on Vault Dashboard.

## Purpose
Records cash collections from gaming machines into the vault. This replaces the dedicated collection page with a centralized modal.

## Inputs
1.  **Machine ID:** Dropdown or search input to select the machine.
2.  **Denominations:** Breakdown of bills collected from the machine.
3.  **Amount:** *Calculated automatically* based on denominations.
4.  **Notes:** Optional field for collection details (defaults to "Manual collection entry").

## Integration
- Uses **MachineCollectionForm** (`components/VAULT/machine/MachineCollectionForm.tsx`) as its internal form.
- Disables submission during the loading state to prevent double entry.

## API Interaction
- **Endpoint:** `POST /api/vault/machine-collections`
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
  - `MachineCollectionModel` (`app/api/lib/models/machineCollection.ts`): Stores the machine-specific collection record.
  - `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`): Categorizes inflow (type: `machine_collection`).
  - `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`): Increments `closingBalance` and updates `currentDenominations`.

## Success Behavior
- Closes the modal.
- Shows success toast: "Collection recorded for [Machine]: $[Amount]".
- Triggers a balance refresh on the main dashboard.
