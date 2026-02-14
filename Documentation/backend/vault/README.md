# Vault & Cashier Backend Documentation

## Overview
The Vault system is a multi-tenant accounting ledger for managing gaming operations cash flow. It uses a **double-entry-style** methodology where every movement of cash creates an immutable `VaultTransaction` record.

## Core Models

| Model | Collection | Purpose |
| :--- | :--- | :--- |
| **VaultShift** | `vaultshifts` | Tracks the central safe for a location. Stores `openingBalance`, `currentDenominations`, and `closingBalance`. |
| **CashierShift** | `cashiershifts` | Tracks individual cashier sessions. Stores `currentBalance` (live tracking) and `lastSyncedDenominations`. |
| **VaultTransaction** | `vaulttransactions` | Immutable ledger. Every move (payout, float, expense) is a transaction. |
| **Payout** | `payouts` | Details of customer payments. Linked to a transaction and a cashier shift. |
| **FloatRequest** | `floatrequests` | Liquidity requests between Cashier and Vault. |

## Key Processes

### 1. Shift Initialization
- **VM** starts a `VaultShift` with an opening denomination count.
- **Cashier** starts a `CashierShift` by requesting a starting float (which creates a `FloatRequest`).

### 2. Live Balance Tracking
- **Cashier Shifts** use `currentBalance` for real-time validation.
- **Payouts** decrement `currentBalance` but **do not** require bill selection.
- **Floats** are the only way bill denominations are synced to the cashier's digital stash.

### 3. Closing & Reconciliation
- **Blind Close:** Cashier submits physical counts. System calculates discrepancy.
- **Shift Review:** VM must approve any shifts with discrepancies before the Vault can be closed (**BR-01**).

## API Summary

### Vault Manager (VM) Endpoints
- `POST /api/vault/initialize`: Start the vault day and shift.
- `POST /api/vault/float-request/approve`: Approve/Deny/Edit cashier floats.
- `POST /api/vault/expense`: Record operational costs and upload receipts.
- `GET /api/vault/balance`: Get real-time vault status and Cash on Premises metric.
- `GET /api/vault/transactions`: Audit trail of all movements.

### Cashier (C) Endpoints
- `POST /api/cashier/shift/open`: Request initial float.
- `POST /api/cashier/payout`: Process Ticket or Hand Pay (amount only).
- `POST /api/vault/float-request`: Request more/return excess cash.
- `POST /api/cashier/shift/close`: Blind close submission.
