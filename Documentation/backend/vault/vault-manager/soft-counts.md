# API: Soft Counts
**Endpoint:** `POST /api/vault/soft-counts`
**Format:** `application/json`

## Purpose
Records a soft count (mid-day cash removal) to replenish vault funds during live operations.

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `machineId` | string | Yes | ID of the machine tapped |
| `amount` | number | Yes | Total value removed |
| `denominations` | array | Yes | Breakdown of bills removed |
| `notes` | string | No | Optional remarks |

## Models Used
- **SoftCount** (`app/api/lib/models/softCount.ts`): Records the soft count metadata.
- **VaultTransaction** (`app/api/lib/models/vaultTransaction.ts`): Creates transaction (type: `soft_count`, from: `machine`, to: `vault`).
- **VaultShift** (`app/api/lib/models/vaultShift.ts`): Updates `closingBalance`.

## Logic Flow
1.  Verify active `VaultShift` for the current user.
2.  Retrieve `locationId` from the shift.
3.  Store `SoftCount` object.
4.  Create and save `VaultTransaction` representing the inflow.
5.  Update `VaultShift.closingBalance` to reflect the added funds.

## Response
- `200 OK`: Returns success status and created records.
- `400 Bad Request`: No active shift found.
