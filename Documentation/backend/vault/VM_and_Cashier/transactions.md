# Data Model: Vault Transactions
**Model:** `VaultTransaction`

## Purpose
The immutable ledger of all financial movements.

## Core Fields
*   `type`: Enum (e.g., `vault_open`, `payout`, `expense`).
*   `amount`: Signed integer (though often stored absolute, direction defined by `from`/`to`).
*   `from`: `{ type: 'vault' | 'cashier' | 'external', id?: string }`
*   `to`: `{ type: 'vault' | 'cashier' | 'external', id?: string }`
*   `denominations`: Array of `{ denomination: number, quantity: number }`.
*   `vaultBalanceBefore` / `vaultBalanceAfter`: Snapshots for auditing.

## Usage
*   **Auditing:** Used to reconstruct the vault state at any point in time.
*   **Denomination Tracking:** Used to calculate current on-hand bills (e.g., "How many $10s do we have?").
