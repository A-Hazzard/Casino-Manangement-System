# API: Cashier Payouts
**Endpoint:** `POST /api/cashier/payout`
**Format:** `application/json`

## Purpose
Records a cash payout to a customer by a cashier. This can be for a Ticket Redemption or a Hand Pay (Jackpot, Cancelled Credit).

## Input Parameters
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cashierShiftId` | string | Yes | ID of the active cashier shift |
| `type` | string | Yes | `ticket` or `hand_pay` |
| `amount` | number | Yes | Total value paid out |
| `ticketNumber` | string | Conditional | Required if type is `ticket` |
| `printedAt` | string | No | ISO Date from the physical ticket (Ticket only) |
| `machineId` | string | Conditional | Required if type is `hand_pay` |
| `reason` | string | No | Reason for Hand Pay (Jackpot, etc.) |
| `notes` | string | No | Optional remarks |

## Logic
1.  **Shift Context:** Verifies `cashierShiftId` is 'active'.
2.  **Validation:** 
    *   Ensures the cashier has enough system balance to cover the payout (check `shift.currentBalance`).
3.  **Persistence:**
    *   Creates a `Payout` record (stores total amount, no denominations).
    *   Creates a `VaultTransaction` (type: `payout`, from: `cashier`, to: `external`). Transaction `denominations` array is empty for payouts.
4.  **Balance Update:** 
    *   Updates `CashierShift.currentBalance` (deducts amount).
    *   Increments `CashierShift.payoutsTotal` and `payoutsCount`.

## Models Used
- `Payout` (`app/api/lib/models/payout.ts`)
- `CashierShift` (`app/api/lib/models/cashierShift.ts`)
- `VaultTransaction` (`app/api/lib/models/vaultTransaction.ts`)

