# API: Inter-Location Transfers
**Endpoint:** `POST /api/vault/transfers`
**Format:** `application/json`

## Purpose
Manages the movement of funds between different gaming locations (e.g., rebalancing cash across properties).

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `fromLocationId` | string | Yes | Source location ID |
| `toLocationId` | string | Yes | Destination location ID |
| `amount` | number | Yes | Total value of the transfer |
| `denominations` | array | Yes | Bill breakdown for the physical transfer |
| `notes` | string | No | Optional remarks |

## Logic
1.  **Authorization:** Requires access permissions to *both* the source and destination locations.
2.  **Request State:** Creates a record in `InterLocationTransfer` with status `pending`.
3.  **Approval Workflow:**
    *   The transfer does not impact balances until it is approved via the `/approve` endpoint.
    *   Upon approval, the source location's vault balance is decremented and the destination's is incremented.

## GET (List Transfers)
- **Endpoint:** `GET /api/vault/transfers?locationId=[ID]`
- Retrieves all transfers where the location is either the sender or the receiver.
- Supports pagination (`page`, `limit`).

## Models Used
- `InterLocationTransferModel` (`app/api/lib/models/interLocationTransfer.ts`)
- `VaultShiftModel` (During approval phase)
- `VaultTransactionModel` (During approval phase)
