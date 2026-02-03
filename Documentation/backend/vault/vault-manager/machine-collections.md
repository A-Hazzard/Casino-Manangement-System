# API: Machine Collections
**Endpoint:** `POST /api/vault/machine-collections`
**Format:** `application/json`

## Purpose
Records a machine cash collection, creating a specific collection record and a vault inflow transaction.

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `machineId` | string | Yes | ID of the machine |
| `amount` | number | Yes | Total value collected |
| `denominations` | array | Yes | Breakdown of collected bills |
| `notes` | string | No | Optional remarks |

## Models Used
- **MachineCollection** (`app/api/lib/models/machineCollection.ts`): Primary record for the machine event.
- **VaultTransaction** (`app/api/lib/models/vaultTransaction.ts`): Inflow record (type: `machine_collection`, from: `machine`, to: `vault`).
- **VaultShift** (`app/api/lib/models/vaultShift.ts`): Increments `closingBalance` and updates `currentDenominations`.

## Logic Flow
1.  **Shift Context:** Verifies manager has an 'active' `VaultShift`.
2.  **Location Context:** Retrieves `locationId` from the active shift.
3.  **Persistence:**
    *   Saves `MachineCollection` record with `nanoid`.
    *   Saves `VaultTransaction` linked to the collection.
    *   Updates `VaultShift.closingBalance`.
4.  **Balance Integrity:** Recalculates `closingBalance` based on transaction `vaultBalanceAfter`.

## Response
- `200 OK`: Returns the created `collection` and `transaction` objects.
- `400 Bad Request`: Missing fields or no active shift.
- `403 Forbidden`: Insufficient permissions.
