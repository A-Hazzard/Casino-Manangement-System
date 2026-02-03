# Vault API Documentation

**Author:** Antigravity (Google DeepMind)
**Last Updated:** January 2026
**Version:** 2.0.0

## Overview

The Vault Management API is a comprehensive financial module for casino operations. It handles vault initialization (Start Shift), cash movements (Add/Remove Cash), cashier float requests, payouts (Ticket Redemption & Hand Pay), and machine collections.

The system is built on a **Double-Entry Ledger Principle** (Ledger-based BR-03), where every balance change must have a corresponding `VaultTransaction` record.

## Technology Stack & Security

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT via `getUserFromServer()` helper
- **Auditing**: Comprehensive activity logging via `logActivity()`
- **Access Control**: Strict location-based filtering via `getUserLocationFilter()`

## Core Models

### 1. VaultShift (`vaultShift.ts`)
Tracks the active management shift for a location.
- **Purpose**: Controls the "Site Source of Truth". All cashier shifts must be linked to an active `VaultShift`.
- **Key Fields**: `locationId`, `vaultManagerId`, `openingBalance`, `closingBalance`, `status` ('active', 'closed').

### 2. CashierShift (`cashierShift.ts`)
Tracks an individual cashier's operational window.
- **Purpose**: Segregates cash handling by user.
- **Key Fields**: `cashierId`, `vaultShiftId`, `openingBalance`, `payoutsTotal`, `status` ('pending_start', 'active', 'closed', 'pending_review').

### 3. VaultTransaction (`vaultTransaction.ts`)
The immutable ledger of all cash movements.
- **Purpose**: Audit trail and source of truth for all balance calculations.
- **Key Fields**: `type`, `amount`, `denominations`, `from`, `to`, `performedBy`, `isVoid`.

### 4. FloatRequest (`floatRequest.ts`)
Manages requests for cash between cashiers and the vault.
- **Purpose**: Formal workflow for shift initiation and mid-shift float adjustments.
- **Key Fields**: `cashierId`, `requestedAmount`, `denominations`, `status` ('pending', 'approved', 'denied', 'edited').

### 5. Payout (`payout.ts`)
Records external payments to players.
- **Purpose**: Tracks hand pays and ticket redemptions.
- **Key Fields**: `type` ('ticket', 'hand_pay'), `amount`, `machineId`, `ticketNumber`.

---

## Management Endpoints

### Initializing the Vault (Start Shift)
`POST /api/vault/initialize`

**Purpose**: Starts the daily vault operation for a location.
- **Middleware**: `getUserFromServer`, `connectDB`.
- **Request**: `InitializeVaultRequest` (locationId, openingBalance, denominations).
- **Audit**: Logs `create` action on `location` resource.

### Adding Cash (Inflow)
`POST /api/vault/add-cash`

**Purpose**: Adds cash from external sources (Bank Withdrawal, Owner Injection).
- **Model**: Creates a `VaultTransaction` and updates `VaultShift.closingBalance`.
- **Denominations**: Mandatory breakdown required.

### Removing Cash (Outflow)
`POST /api/vault/remove-cash`

**Purpose**: Removes cash for Bank Deposits or ATM Fills.
- **Model**: Decrements `VaultShift.closingBalance`.

---

## Cashier Endpoints

### Opening a Shift
`POST /api/cashier/shift/open`

**Purpose**: Cashier requests to start their shift with a specific float amount.
- **Rule (BR-06)**: Only proceeds if an active `VaultShift` exists for the location.
- **Outcome**: Creates a `CashierShift` in `pending_start` status and a `FloatRequest`.

### Processing a Payout
`POST /api/vault/payout`

**Purpose**: Records a player payout and deducts it from the cashier's active float.
- **Validation**: Ensures the cashier has sufficient float before processing.
- **Model**: Creates a `Payout` and a `VaultTransaction` (Cashier -> External).

---

## Administrative & Audit Endpoints

### Vault Transactions (Audit Trail)
`GET /api/vault/transactions`

- **Purpose**: Fetches the ledger with filtering (type, status, date).
- **Response**: Includes `denominations` breakdown for every record.

### Vault Metrics
`GET /api/vault/metrics`

- **Purpose**: Returns real-time totals for `totalCashIn`, `totalCashOut`, and `netCashFlow`.

---

## Audit Trail Mechanism

Every critical action (Initialize, Add Cash, Remove Cash, Open Shift, Payout, Approve Float) must call the `logActivity` helper:

```typescript
await logActivity({
  userId,
  username,
  action: 'create' | 'update',
  details: 'Human readable description',
  metadata: {
     resource: 'location' | 'machine',
     resourceId: '...',
     ...
  }
});
```

This ensures full compliance with gaming regulations regarding financial tracking.
