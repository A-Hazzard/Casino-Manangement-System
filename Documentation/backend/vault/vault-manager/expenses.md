# API: Record Expense
**Endpoint:** `POST /api/vault/expense`
**Format:** `multipart/form-data`

## Purpose
Records operational expenses and deducts funds from the active vault shift's balance and denomination inventory.

## Request Parameters (FormData)
| Key | Type | Description |
| :--- | :--- | :--- |
| `category` | string | Expense category (e.g., Supplies, Repairs) |
| `amount` | number | Total expense amount |
| `description` | string | Description of the expense |
| `date` | string | ISO date string for the expense |
| `denominations` | string | JSON string of `Denomination[]` used for payment |
| `file` | file | (Optional) Receipt attachment |

## Models Used
- **VaultShift** (`app/api/lib/models/vaultShift.ts`): Updated to decrement `closingBalance` and update `currentDenominations`.
- **VaultTransaction** (`app/api/lib/models/vaultTransaction.ts`): Stores transaction record (type: `expense`, from: `vault`, to: `external`).
- **ActivityLog** (`app/api/lib/models/activityLog.ts`): Logs-recorded expense action.
- **GridFS**: Stores receipt file in `vault_attachments` bucket.

## Logic Flow
1.  **Auth & Validate:** Verify user roles and required fields.
2.  **File Upload:** If present, store file in GridFS and get `attachmentId`.
3.  **Inventory Check:** 
    *   Find active `VaultShift` for the manager.
    *   Verify `closingBalance` >= `amount`.
    *   Deduct `denominations` from shift's `currentDenominations` inventory.
    *   Block if any bill quantity is insufficient.
4.  **Transaction Record:** Create `VaultTransaction` with balance snapshots and used denominations.
5.  **Persistence:** Save transaction and update `VaultShift`.
6.  **Audit:** Call `logActivity` for tracking.

## Errors
- `400 Bad Request`: Missing fields, insufficient balance, or insufficient bill quantities.
- `401 Unauthorized`: User not logged in.
- `403 Forbidden`: Insufficient permissions (requires vault-manager or above).
- `500 Internal Server Error`: Database or file upload failure.
