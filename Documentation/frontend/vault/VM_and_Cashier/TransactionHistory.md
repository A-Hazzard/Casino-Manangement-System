# Transaction History Documentation
**Component:** `TransactionHistoryTable`
**Route:** `/vault/history` (Shared Access)

## Overview
A detailed view of all digital money movements managed by `VaultTransactionModel`.

## Filtering & Access
*   **Vault Manager:** Sees ALL transactions for the location.
*   **Cashier:** Sees ONLY transactions related to their own `cashierShiftId`.

## Helper Types
*   `vault_open` / `vault_close`
*   `cashier_shift_open` / `cashier_shift_close`
*   `float_increase` / `float_decrease`
*   `payout`
*   `expense`
*   `machine_collection`

## Detailed View (Audit Trail)
Every transaction can be expanded to view:
- **Exact Denominations:** The bill breakdown used for that specific transaction (e.g., 5 x $20).
- **Participants:** Who performed the action, from where, and to where.
- **Notes:** Mandatory or optional comments explaining the reason.
- **Previous/Next Balance:** Snapshots of the balance before and after the event.

## Core Models
- `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`)

## Compliance Features
- **Immutability:** Transactions cannot be deleted; they can only be "Voided" (if implemented), leaving a permanent record.
- **Timestamping:** All entries use server-time for authoritative auditing.
