# Vault & Cashier Inventory System

This document outlines the core logic behind the multi-tier inventory tracking system in the Evolution One CMS.

## Core Concepts

### 1. Multi-Tier Tracking
The system tracks cash at two primary levels:
- **Vault Level:** The central safe for a gaming location. Managed via `VaultShift`.
- **Cashier Level:** Individual payout desks or "floats". Managed via `CashierShift`.

### 2. Denomination-Specific States
Every cash-handling entity tracks not just a total dollar amount, but a specific breakdown of bill quantities:
- `100s`, `50s`, `20s`, `10s`, `5s`, `1s`.
- **Note:** Denominations are primarily for liquidity movements (Floats/Vault initialization). Individual cashier payouts do not require denomination selection.

### 3. Inventory Snapshots
Models like `VaultShift` maintain three critical snapshots:
- **Opening:** The starting state of the vault.
- **Current (Running):** Real-time inventory updated by every transaction.
- **Closing:** The final confirmed state after reconciliation.

---

## Vault Shift Lifecycle (Vault Manager)

### Step 1: Initialization (Starting the Day)
- **Model:** `VaultShift`
- **Logic:** The manager enters the physical bill counts found in the vault.
- **Fields:** `openingBalance`, `openingDenominations`.
- **Inventory Sync:** `currentDenominations` is initialized as a copy of `openingDenominations`.

### Step 2: Live Operations
As transactions occur, the `currentDenominations` in the active `VaultShift` are updated:
- **Cash Inflow (Collections, Soft Counts, Add Cash):** Bill quantities are *incremented*.
- **Cash Outflow (Expenses, Remove Cash, Float Issuance):** Bill quantities are *decremented*.
- **Integrity Check:** The system verifies that the required bill quantities exist in the `currentDenominations` BEFORE allowing an outflow transaction.

### Step 3: Reconciliation & Closing
- **Logic:** The manager performs a physical count at the end of their shift.
- **Process:**
  1. Any variance between the `currentDenominations` (system) and the physical count must be recorded as a `reconciliation` event.
  2. The `reconciliations` array stores the `previousBalance`, `newBalance`, and a mandatory `comment`.
  3. Once resolved, the `status` changes to `closed`.

---

## Cashier Shift Lifecycle (Cashier)

### Step 1: Opening (Receiving Float)
- **Model:** `CashierShift`
- **Logic:** Triggered when a Vault Manager issues a float to a cashier.
- **Source:** Funds are moved from `VaultShift.currentDenominations` to `CashierShift.openingDenominations`.

### Step 2: Live Operations
- **Payouts:** When a cashier pays out a ticket or manual payment, the system decrements the `currentBalance`. **No bill selection is required.**
- **Float Refill/Adjust:** Cashiers can request more funds or return excess funds using specific denominations. Float approvals sync the `lastSyncedDenominations`.

### Step 3: Blind Closing (C-4 Compliance)
- **Concept:** Cashiers must not see the system's "Expected Balance" while closing.
- **Logic:**
  1. Cashier enters their physical bill counts into `cashierEnteredDenominations`.
  2. The system calculates the `expectedClosingBalance` based on `opening + adjustments - payouts`.
  3. The `discrepancy` field stores the difference.
  4. The shift enters `pending_review` status.

### Step 4: Vault Manager Review
- **Logic:** The Vault Manager reviews the cashier's blind close.
- **Actions:** 
  - Acceptance of variance (logs the discrepancy).
  - Adjustment of balance (if a count error is found).
  - Final resolution updates the `VaultShift` to reflect the returned cash.

---

## Data Models Reference

| Item | Model File | Purpose |
| :--- | :--- | :--- |
| **Vault Shift** | `vaultShift.ts` | Tracks central safe inventory and state. |
| **Cashier Shift** | `cashierShift.ts` | Tracks individual cashier sessions and blind closes. |
| **Vault Transaction** | `vaultTransaction.ts` | The audit trail for every move (type, from, to, amount, denoms). |
| **Denomination** | Included in both | Unified schema for `{ denomination, quantity }`. |
