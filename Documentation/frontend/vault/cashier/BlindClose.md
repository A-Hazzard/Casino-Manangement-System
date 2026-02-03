# Blind Close Documentation
**Flow:** Cashier End of Shift

## Concept
The "Blind Close" is a security feature that forces the cashier to count their physical cash *without* knowing what the system thinks they *should* have. This prevents theft by ensuring discrepancies are recorded for management review.

## UI Workflow
1.  **Trigger:** Cashier clicks "End Shift".
2.  **Modal:** "Enter Closing Count".
    *   *Input:* Denomination inputs (x100, x50, etc.).
    *   *Total:* Auto-calculated sum of inputs.
    *   *Hidden:* "Expected Balance" is NOT shown.
3.  **Submission:**
    *   **Scenario A (Match):** System accepts. Shift closes.
        *   *Configurable:* May still require VM sign-off.
    *   **Scenario B (Variance):** Shift status -> "Pending Review".
        *   *Message:* "Shift submitted. Please see manager."

## Frontend logic
*   The `expectedBalance` is purposefully *not* sent to the frontend during this phase, or at least not displayed.
*   The comparison logic happens entirely on the **Backend**.
