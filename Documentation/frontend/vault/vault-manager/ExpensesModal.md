# Expenses Modal Documentation
**Component:** `VaultRecordExpenseModal`
**Trigger:** "Expenses" button on Vault Dashboard.

## Purpose
Allows the Vault Manager to record cash taken *out* of the vault for operational reasons (not safe counts or float distribution).

## Inputs
1.  **Category:** Dropdown (e.g., "Supplies", "Repairs", "Bills", "Licenses", "Other").
2.  **Denominations:** **Required** breakdown of specific bills used (via `DenominationInputGrid`).
3.  **Amount:** *Calculated automatically* based on selected denominations.
4.  **Date:** Defaults to today.
5.  **Description:** Mandatory text field describing the expense.
6.  **Attachment:** Optional file upload (image/PDF) for receipts.

## Validation
*   **Funds Check:** Total amount cannot exceed current Vault Balance.
*   **Inventory Check:** Selected bill quantities cannot exceed actual counts in `VaultShift` current inventory.
*   **Form Validation:** Category, breakdown (> $0), and description are required.
*   **Permissions:** Only `vault-manager`, `manager`, `admin`, `developer`.

## API Interaction
*   **Endpoint:** `POST /api/vault/expense`
*   **Format:** `FormData` (multipart/form-data)
    *   `category`: string
    *   `amount`: number string
    *   `description`: string
    *   `date`: ISO date string
    *   `denominations`: JSON string of `Denomination[]`
    *   `file`: File object (optional)
*   **Models Used:**
    *   `VaultTransactionModel` (`app/api/lib/models/vaultTransaction.ts`): Stores the transaction record.
    *   `VaultShiftModel` (`app/api/lib/models/vaultShift.ts`): Updates `closingBalance` and `currentDenominations` of the active shift.
    *   `GridFS` (MongoDB): Stores the attachment file in `vault_attachments` bucket.

## Post-Submission
*   **On Success:**
    *   Modal closes and state resets.
    *   Vault Balance and Inventory update immediately via UI refresh.
    *   Toast notification shows the final recorded amount.
