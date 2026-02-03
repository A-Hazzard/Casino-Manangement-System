# Vault & Cashier Frontend Documentation

## Dashboard Structure
The vault system is split into two primary contexts based on user roles:

### 1. Vault Management (`/vault/management`)
**For Vault Managers (VM)**
- **Overview:** Real-time metrics for vault balance, active cashiers, and recent transactions.
- **Cashier Management:** Manage the "fleet" (create/reset/monitor cashiers).
- **Collections:** Record machine drops and soft counts.
- **Ledger:** Detailed audit trail of all cash movements.

### 2. Cashier Dashboard (`/vault/cashier`)
**For Cashiers (C)**
- **Shift Control:** Start/End shift buttons.
- **Payouts:** Forms for **Ticket Redemption** and **Hand Pay** (simplified total-amount entry).
- **Float Tools:** Requesting increases or returning excess denominations to the vault.
- **Activity:** View personal transaction history for the current shift.

## Key UI Components

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **DenominationInputGrid** | `shared/ui/DenominationInputGrid.tsx` | Standardized grid for entering bill counts. |
| **TicketRedemptionForm** | `cashier/payouts/TicketRedemptionForm.tsx` | Manual entry for ticket #, amount, and date. |
| **HandPayForm** | `cashier/payouts/HandPayForm.tsx` | Manual entry for machine, amount, and reason. |
| **MachineSearchSelect** | `shared/ui/machine/MachineSearchSelect.tsx` | Optimized lookup for payout machines. |

## Important Workflows

### The "Cash Register" Payout Flow
Unlike Vault operations which require strict bill-by-bill counting, Cashier payouts are designed for speed:
1. Select Payment Type (Ticket/Handpay).
2. Enter the **Total Amount**.
3. Submit. The system updates your `currentBalance` automatically.

### Liquidity & Denominations
Denominations are only required for:
- Starting a shift.
- Mid-shift float increases/decreases.
- Ending a shift (Blind Close).

## Notification Icons
- **Green trending up:** Pending float request.
- **Red alert:** Shift discrepancy detected.
- **Orange Clock:** Shift pending vault manager review.
