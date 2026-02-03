# Vault Initialization Process (Starting the Shift)
**Route:** `/vault/management`
**Trigger:** **Apply/Start Day** button (Visible only when no shift is active).

## Purpose
The first action of the day. Establishes the opening inventory of the central safe.

## The Initialization Modal (`VaultInitializeModal`)
1.  **Opening Balance:** The total dollar value found in the safe.
2.  **Denomination Breakdown:** A grid where the manager enters the quantity of each bill type found:
    - `100s`, `50s`, `20s`, `10s`, `5s`, `1s`.
    - **Validation:** The sum of denominations must match the total `Opening Balance` field.
3.  **Notes:** Optional field for recording safe conditions or hand-over notes.

## System Workflow
1.  **Authorization:** Only users with `vault-manager`, `admin`, or `manager` roles can initialize the vault.
2.  **Snapshot:** The system saves the inputs into `VaultShift.openingDenominations`.
3.  **Live State:** The `VaultShift.currentDenominations` is populated with the same values to begin real-time subtraction/addition during operations.
4.  **Dashboard Unlock:** Once initialized, "Quick Actions" like **Add Cash**, **Issue Float**, and **Expenses** become enabled.

## Business Rules
- **One per Location:** Only one active vault shift can exist per location ID at any given time.
- **Sequentiality:** A new shift cannot be started until the previous one is fully `closed` and reconciled.
