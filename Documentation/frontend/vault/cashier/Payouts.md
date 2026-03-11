# Cashier Payouts Documentation
**Components:** `TicketRedemptionForm`, `HandPayForm`
**Route:** `/vault/cashier` (Modals)

## Overview
Payouts are the primary transaction performed by cashiers on the gaming floor. They deduct from the cashier's current "Stash" (System Balance) and record machine/ticket info for audit.

## Design Philosophy: Speed Over Inventory
Unlike Vault Manager operations which require bill-by-bill counts (denominations), Cashier Payouts are **Amount-Only**.
*   **Reason:** High-volume operations during peak times require rapid processing.
*   **Inventory Sync:** Physical bill tracking for cashiers is resolved during the **Blind Close** process.

---

## 1. Ticket Redemption
**Manual Entry Path:**
1.  Enter **Ticket Number** (Alpha-numeric).
2.  Enter **Redemption Amount**.
3.  Select **Issue Date** (Date the ticket was printed).
4.  **Balance Check:** System blocks submission if `Amount > Stash Balance`.

**Features:**
*   **Dynamic Summary:** Shows a visual card of what is being redeemed.
*   **Shortfall Alert:** Informs the cashier exactly how much more they need to request from the vault if their stash is too low.

---

## 2. Hand Pay (Jackpot / Canceled Credit)
**Manual Entry Path:**
1.  Select **Source Machine** using the `MachineSearchSelect` (Search by Asset #, Serial, or Name).
2.  Enter **Hand Pay Payout** amount.
3.  Enter **Reason** (e.g., Jackpot, Progressive, Machine Lock-up).

**Features:**
*   **Machine Index:** Real-time lookup ensures hand-pays are linked to legitimate machine IDs in the system.
*   **Oversight:** These transactions appear immediately in the Vault Manager's "Recent Activity" ledger for monitoring.

---

## Technical Details (API Interface)
*   **Endpoint:** `POST /api/cashier/payout`
*   **Payload Example:**
    ```json
    {
      "type": "ticket",
      "amount": 500.00,
      "ticketNumber": "T-123456",
      "printedAt": "2026-02-14T10:00:00Z"
    }
    ```
*   **State Impact:** Atomic update to `CashierShift.currentBalance` via `$inc`.
