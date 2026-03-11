# Shift Lifecycle: Blind Close & Resolution
**Shared Logic:** Vault Manager & Cashier Contexts

## Summary
The "Blind Close" is a security feature designed to prevent cashiers from "balancing to the books." They must report what they physically have without knowing what the system expects.

---

## Part 1: The Blind Close (Cashier Interface)
**Route:** `/vault/cashier` -> **End Shift**

1.  **System Lock:** Upon clicking "End Shift", the cashier is prevented from further payouts.
2.  **Physical Count:** The cashier uses the `DenominationInputGrid` to enter the quantity of every bill in their drawer.
3.  **Submission:** The cashier clicks "Submit & Close".
4.  **Security Constraint:** The system **DOES NOT** show if the count was correct. It only shows "Awaiting Review" if there is a mismatch.

---

## Part 2: The Review (Vault Manager Interface)
**Route:** `/vault/management` -> **Shift Review Panel**

If the cashier's entered balance != the system's expected balance, the shift enters `pending_review` status.

### Manager View:
*   **Expected:** `Opening + Increases - Decreases - Payouts`.
*   **Entered:** `Final Physical Count entered by Cashier`.
*   **Variance:** The discrepancy amount.

### Manager Actions:
1.  **Resolve (Accept):** Accepts the cashier's count as the final truth. The discrepancy is logged as a performance variance.
2.  **Adjust (Override):** If the manager recounts and finds the error (e.g., cashier missed $100), the manager enters the corrected amount.

---

## Part 3: Physical Move back to Vault
Regardless of whether there was a discrepancy, the **Resolved Amount** (Physical Bills) is logically and legally moved from the Cashier's account back to the **Vault Account**.

*   **Logic:** `VaultShift.currentDenominations` increments by the confirmed bill counts.
*   **Finalization:** The cashier shift is marked `closed`, and the Vault Manager can proceed to close the main `VaultShift` (EOD).
