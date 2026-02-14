# Cashier Float Requests Documentation
**Component:** `CashierFloatRequest`
**Route:** `/vault/cashier` (Modal)

## Overview
Float requests are the mechanism by which cashiers receive money from the main vault or return excess cash to the safe.

## Request Types

### 1. Opening Float (Initialization)
Triggered when the cashier clicks **"Start Shift"**. This is a special type of `float_increase` that also marks the beginning of the cashier's session.

### 2. Float Increase (Replenishment)
Used during the shift if the cashier's stash is too low to fulfill payouts.
*   **Visual Trigger:** Appears as a "Request From Vault" button in payout forms when balance is insufficient.

### 3. Float Decrease (Return)
Used if the cashier has accumulated too much cash (e.g., from an error or large return) and needs to move it to the safe for security.

---

## The Workflow Loop

### 1. Request Phase (Cashier)
*   Cashier selects the required amount using the `DenominationInputGrid`.
*   **Requirement:** Mid-shift requests *must* use denominations to ensure the Vault Manager knows exactly which bills to prepare.
*   **Status:** Becomes `pending`.

### 2. Processing Phase (Awaiting Manager)
*   The dashboard shows a "Waiting for Approval" banner.
*   The cashier can **Cancel** the request if it was made in error.

### 3. Confirmation Phase (Physical Hand-over)
*   Once the Vault Manager clicks "Approve" (and provides physical cash), the cashier's dashboard shows "Request Approved".
*   **Crucial Step:** The cashier must click **"Confirm & Receive Cash"** only *after* they have physical possession of the bills.
*   **Finalization:** Balance is only added to the `stash` after this final confirmation.

---

## Technical Details (API Interface)
*   **Endpoint:** `POST /api/vault/float-request`
*   **Payload Example:**
    ```json
    {
      "type": "increase",
      "amount": 1000,
      "denominations": [
        {"denomination": 100, "quantity": 10}
      ],
      "notes": "Need bills for high-payout machine"
    }
    ```
