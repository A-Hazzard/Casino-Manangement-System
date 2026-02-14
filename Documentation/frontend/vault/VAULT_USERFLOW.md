# Vault & Cashier Comprehensive User Flow

This document maps every button, modal, and business logic path within the Vault Management system, ensuring 100% coverage of functional possibilities.

---

## 1. Vault Manager (VM) Role: Primary Operational Loop

### 1.1 Shift Initialization (The Opening) [Req: VM-1]
1. **Login & Session Start:** 
   - **Technical Initiation:** Next.js middleware/server actions verify the JWT session via `getUserFromServer()`. 
   - **Authorization Check:** The system verifies the user has one of the following roles in their `roles` array: `vault-manager`, `manager`, `admin`, or `developer`.
    - **Authority:** Verified against the `User` model (`users` collection) roles array.
   - **Location Context:** Uses `user.assignedLocations[0]` (from `User` model) to scope all subsequent database queries.
2. **Landing:** If no active shift is found, the dashboard displays the **Vault Shift Required** banner.
   - **Query:** `VaultShift.findOne({ locationId: assignedLocations[0], status: 'active' })` (from `vaultshifts` collection).
3. **Button: [Start Vault Shift]**
   - **Modal Path:** Opens the **"Open New Vault Shift"** modal.
   - **Data Fetch:** System queries the last closed shift at this location to populate the **"Expected Opening Balance"** display.
   - **Query:** `VaultShift.findOne({ locationId, status: 'closed' }).sort({ closedAt: -1 })` using fields `closingBalance` and `closingDenominations`.
4. **Action: [Yes, Start Vault Shift]**
   - **Model: `VaultShift`** -> Creates a new `active` record. Fields: `locationId`, `vaultManagerId`, `openingBalance`, `openingDenominations`.
   - **Model: `VaultTransaction`** -> Logs an immutable `vault_open` transaction [Req: BR-03]. Fields: `type`, `amount`, `vaultBalanceAfter`, `performedBy`.
5. **Result:** Dashboard UI enters **"Pending Reconciliation"** state.

### 1.2 Mandatory Opening Reconciliation [Req: VM-NEW]
1. **Trigger:** Immediately after starting a vault shift.
2. **System Behavior:** 
   - All Quick Actions (Add Cash, Remove Cash, Record Expense, etc.) are **DISABLED** and visually dimmed.
   - Cashier shift operations (Start Shift, Payouts) are **BLOCKED** system-wide for this location.
   - Recording expenses via the separate management page is **DISABLED**.
   - Attempting blocked actions triggers a toast notification instructing the VM to reconcile.
3. **Action: [Audit Required / Reconcile]**
   - VM must perform a physical count and submit via the Reconciliation modal.
   - **Visual Aid:** The "Audit Required" button in the Vault Status card pulses and spins until completed.
     - **Layout Note:** On mobile devices, this button moves below the "Vault Status" title to prevent overlapping.
   - **Model: `VaultShift`** -> `isReconciled` set to `true`.
4. **Result:** Full system functionality is unlocked.

### 1.3 Daily Vault Oversight [Req: VM-1, BR-03]
- **Card: Vault Status**
  - Displays: **"Current Vault Balance"** (`VaultShift.closingBalance` or `openingBalance`), **"Last Audit"** (`VaultShift.reconciliations.timestamp`), **"Manager on Duty"** (`User.profile.firstName` of `vaultManagerId`), and **"Cash on Premises"**.
   - **Query:** `GET /api/vault/balance?locationId=...` 
    - Fetches the active `VaultShift` from the `vaultshifts` collection.
    - Displays **"Cash on Premises"** calculated by summing: `VaultShift.closingBalance` + `Σ Active Cashier Balances` + `Total Machine Soft Counts`.
  - **Button: [Reconcile]**
    - Opens **"Verify Vault Balance"** modal.
    - Used to record an audit check of physical bills vs system count [Req: VM-1].
- **Card: Vault Inventory**
  - Displays physical bill counts for all denominations (100, 50, 20, 10, 5, 1).
  - **Live Logic:** `VaultShift.openingDenominations[denom].quantity` + `Σ VaultTransaction.denominations[denom].quantity` (where `to: 'vault'`) - `Σ VaultTransaction.denominations[denom].quantity` (where `from: 'vault'`).
- **Card: Vault Recent Activity**
  - Displays the last 5 transactions.
  - **Query:** `VaultTransaction.find({ locationId, vaultShiftId }).sort({ timestamp: -1 }).limit(5)` (from `vaulttransactions` collection).
- **Section: Health Grid**
  - Real-time display: **Total Cash In**, **Total Cash Out**, **Net Cash Flow**, **Payouts**.
  - **Query:** Aggregates `VaultTransaction` records (filtered by current `VaultShift._id`) for the current shift period, grouping by `type` (e.g., `add_cash`, `remove_cash`, `expense`, `payout`).

### 1.3 Personnel Management [Req: VM-5]
- **Button: [Manage Cashiers]**
  - Redirects to: `/vault/management/cashiers`.
  - Displays: **"Active Cashiers"** table with pagination.
- **Action: [Create Cashier]**
  - Opens **"Create New Cashier"** modal.
  - **Inputs:** Username, First Name, Last Name, Email.
  - **Query:** `POST /api/users` creating a `User` record in the `users` collection with role `cashier`.
  - **Output:** Generates a temporary password displayed once in the **"Cashier Created"** modal.
- **Action: [Start Shift]** (Direct Override)
  - Opens **"Direct Shift Open"** modal.
  - **Action:** Allows VM to manually start a cashier's shift by providing an opening float.
  - **Model: `CashierShift`** (`cashiershifts` collection) -> Creates `active` record. Fields: `cashierId`, `locationId`, `openingBalance`, `status: 'active'`.
  - **Model: `VaultTransaction`** (`vaulttransactions` collection) -> Logs `cashier_shift_open` movement.
  - **Model: `VaultShift`** (`vaultshifts` collection) -> Atomic update: `$inc: { closingBalance: -amount }` (or `openingBalance` if first action).
- **Action: [Reset Password]**
  - Opens **"Reset Password"** modal.
  - **Query:** `POST /api/users/[id]/reset-password` -> Updates `User.tempPassword` and `User.tempPasswordChanged: false`.

### 1.4 Float & Handoff Requests [Req: C-3]
1. **Trigger:** Notifications appear in the **"Notification Bell"** or the **"Active Requests"** panel.
   - **Query:** `FloatRequest.find({ locationId, status: { $in: ['pending', 'approved_vm'] } })` (from `floatrequests` collection).
2. **Action: [Bell Click]** -> Displays list of alerts including **"Discrepancy Detected"** or **"Float Request"**.
3. **Panel: Active Requests**
   - **Label:** Shows status as **"Pending Approval"** (Orange) or **"Ready for Handoff"** (Green).
   - **Button: [Approve]**
     - **Field Change:** `FloatRequest.status` -> `approved_vm`.
     - **Model: `VaultNotification`** (`vaultnotifications` collection) -> Alerts the cashier.
   - **Button: [Edit]** -> VM adjusts the bills provided if the vault is short on certain denominations.
   - **Button: [Deny]** -> Prompts for reason; closes the loop.
   - **Button: [Confirm Receipt & Finalize Return]** (For `FloatRequest.type: 'decrease'`)
     - **Requirement:** VM must click this AFTER receiving physical cash from the cashier.
     - **Model: `VaultShift`** -> Atomic increment: `$inc: { closingBalance: +amount }`.
     - **Model: `VaultTransaction`** -> Logs `float_decrease` in `vaulttransactions` collection.

### 1.5 Cash Movements [Req: BR-03, VM-5]
- **Section: Quick Actions**
  - **Shared Business Logic:** Every action creates an immutable **`VaultTransaction`** and updates the **`VaultShift.closingBalance`** and `currentDenominations` in the respective collections.
  - **Button: [Add Cash]**
    - **Purpose:** Inflow from Bank/External.
    - **Query:** `POST /api/vault/add-cash`
  - **Button: [Remove Cash]**
    - **Purpose:** Outflow to Bank/External.
    - **Query:** `POST /api/vault/remove-cash`
  - **Button: [Record Expense]**
    - **Inputs:** Category Selection (e.g., *Utilities, Staff Salaries, Maintenance*), Amount, Notes.
    - **Query:** `POST /api/vault/expense` creating a `VaultTransaction` record with `type: 'expense'` and potentially an `attachmentId` (GridFS).
  - **Button: [Collection]**
    - **Purpose:** Recording cash dropped from a specific machine ID.
    - **Query:** `POST /api/vault/machine-collections` creating a `MachineCollection` record in `machinecollections` collection and a `VaultTransaction`.
  - **Button: [Soft Count]**
    - **Purpose:** Verifying the machine stack vs physical count.
    - **Query:** `POST /api/vault/soft-counts` creating a `SoftCount` record in `softcounts` collection and a `VaultTransaction`.

### 1.6 Discrepancy Resolution [Req: C-4]
1. **Trigger:** Status badge **"Review Required"** appears on a cashier's account when a count mismatch occurs.
2. **Panel: Shift Reviews**
   - Displays: **"Expected"**, **"Entered"**, and **"Discrepancy"** amounts.
3. **Button: [Review & Resolve]**
   - Opens individual resolution view where VM can edit the **Final Balance** and provide an **Audit Comment**.
4. **Action: [Force Close]**
   - **Requirement:** VM assumes legal responsibility for the count.
   - **Model: `CashierShift`** -> Status set to `closed`. Note: `auditComment` is saved.
   - **Model: `VaultTransaction`** -> Logs the finalized return of cash to the Vault safe.
   - **Query:** `POST /api/cashier/shift/resolve`.

### 1.7 Close Day (The Final Walk) [Req: BR-01]
1. **Button: [Close Day]** in Header.
2. **Constraint Check:** System validates no active/pending cashier shifts.
   - **Technical Logic:** `activeCashierShifts > 0` triggers **"Closing Blocked"** state in the UI.
3. **Modal: "End of Day / Close Vault"** 
   - Displays: **"Expected Closing Balance"** vs. **"Physical Count"**.
4. **Action: [Confirm & Close Vault]**
   - **Action:**
     - **Model: `VaultShift`** -> Sets `status: 'closed'`, `closedAt`, `closingBalance`, `closingDenominations`.
     - **Model: `VaultTransaction`** -> Logs `vault_close` record.
   - **Query:** `POST /api/vault/shift/close`.

---

## 2. Cashier (C) Role: Transactional Workflow

### 2.1 Orientation & Security
1. **First Login:** Intercepted by **Password Reset Modal**. User cannot view dashboard until updated.
2. **Status Banner:** Shows "Vault is Closed", "Reconciliation Pending" (if VM hasn't reconciled), or "Ready to Start".
3. **Constraint:** Cashiers cannot open a shift, process ticket redemptions, or request floats until the Vault Manager has performed the mandatory opening reconciliation.
4. **UI Feedback:** All action buttons on the cashier dashboard and payout pages are visually dimmed (low opacity) and show a "Reconciliation Pending" toast if clicked prematurely.

### 2.2 Shift Initialization [Req: C-3]
1. **Button: [Start Shift]**
2. **Modal: "Start New Shift"**
   - Cashier selects denominations for starting float.
   - **Action:**
     - **Model: `FloatRequest`** -> Creates record in `floatrequests` with `type: 'increase'`.
     - **Model: `VaultNotification`** -> Creates record in `vaultnotifications` collection to alert the VM.
3. **Banner: "Waiting for Approval"** -> Cashier can click **[Cancel Request]**.
4. **Banner: "Shift Approved!"** (VM has approved)
   - **Button: [Confirm & Receive Cash]** -> **CRITICAL:** Cashier clicks AFTER matching physical cash.
   - **Action:**
     - **Model: `CashierShift`** -> Status set to `active` in `cashiershifts` collection.
     - **Model: `FloatRequest`** -> Status set to `approved` in `floatrequests` collection.
     - **Model: `VaultTransaction`** -> Immutable link created via `transactionId` in `vaulttransactions`.
   - **Logic:** Only after this click does the shift move to `active` and balance becomes available.

### 2.3 Gaming Floor Operations [Req: C-2, C-3, BR-03]
- **Button: [Ticket Redemption]**
  - **Action:**
    - **Model: `Payout`** -> Creates record in `payouts` collection with `type: 'ticket'`.
    - **Model: `CashierShift`** -> **Query:** `$inc: { currentBalance: -amount }` on the active record in `cashiershifts`.
- **Button: [Hand Pay]**
  - **Action:**
    - **Model: `Payout`** -> Creates record in `payouts` collection with `type: 'hand_pay'`.
- **Buttons: [Request Float Increase] / [Request Float Decrease]**
  - **Action:** Similar to Initialization. VM must approve/confirm before shift balance updates.
  - **Model: `FloatRequest`** -> Tracks the lifecycle from `pending` -> `approved_vm` -> `active`.

### 2.4 Blind Close (The Shift End) [Req: C-4]
1. **Button: [End Shift]**
2. **Modal: "End Shift / Blind Close"**
   - **Label:** **"Expected balance is hidden"** warning displayed.
3. **Action:** Cashier counts physical cash and enters denominations.
   - **Label:** **"Confirm Count & Close"** button.
   - **Model: `CashierShift`** -> Updates `cashierEnteredBalance`, `cashierEnteredDenominations`, and `expectedClosingBalance`.
   - **Logic:** System compares `CashierShift.cashierEnteredBalance` with `CashierShift.expectedClosingBalance` (calculated).
4. **Outcome A (Match):**
   - **Action:** `CashierShift` status -> `closed`. `VaultTransaction` logs the cash return to Vault safe.
5. **Outcome B (Mismatch):**
   - **Banner:** Displays **"Under Review"** on the dashboard.
   - **Action:** `CashierShift` status -> `pending_review`.
   - **Action:** `VaultNotification` created for VM to alert of the mismatch.

---

---

## 4. Multi-Tier Inventory Tracking Logic

### 4.1 Vault Level Inventory
The system tracks physical bill counts within the vault safe.
- **Initialization:** `VaultShift` inputs opening quantities.
- **Live Calculation:**
  - **Logic:** `Live Qty = VaultShift.openingDenominations[denom].quantity + Σ VaultTransaction.denominations[denom].quantity (where to: 'vault') - Σ VaultTransaction.denominations[denom].quantity (where from: 'vault')`.
  - **Query:** `VaultTransaction.aggregate` on the `vaulttransactions` collection filtering by `locationId`, `vaultShiftId`, and `type`.
- **Constraint Check:** System prevents transactions that would result in negative bill counts (Liquid Asset Validation) by checking against current state stored in `VaultShift.currentDenominations`.

### 4.2 Cashier Level Inventory
- **Opening:** Cashiers start with specific denominations (Opening Float).
- **Payouts:** Individual redemptions/payouts deduct from the **Current Balance** (total dollar value).
  - **Query:** Atomic update on `CashierShift` (`cashiershifts` collection) using `$inc: { currentBalance: -amount }`.
- **Note:** Denomination input is *not* required for each payout to ensure speed during peak floor times.
- **Resolution:** Final physical counts are entered via denominations during Blind Close [Req: C-4].

### 4.3 UI Features: Vault Inventory Card
- **Location:** Vault Overview Dashboard.
- **Display:** Six-cell grid ($100 to $1).
- **Indicators:** 
  - **Bill Count:** Physical quantity of bills.
  - **Total Value:** Calculated currency value.
  - **Low Stock Warn (RED):** Triggers if any denomination quantity < 20.

---

## 5. Fail-Safes & Compliance Logic

- **Blind Closing (C-4):** Expected balances are hidden until the shift is submitted to prevent "balancing to the books."
- **Mandatory Opening Audit:** System-wide lockout of transactions until the opening balance is physically reconciled.
- **Immutable Ledger (BR-03):** Transactions cannot be deleted; they must be **voided**, creating a reverse-entry in the audit trail.
- **Location Isolation:** Users only see cashiers and machines assigned to their specific locations.


## 6. Enhanced Vault Manager Features (Phase 2)

### 6.1 Activity Log Monitoring

**Purpose:** Comprehensive audit trail of all vault operations.

**Access:** `/vault/management/activity-log`

**Features:**
- View all transactions for assigned locations
- Filter by cashier, machine ID, date range, transaction type
- **Machine Audit**: Select a specific machine to see its entire lifecycle (Collections, Soft Counts, Historical Variances).
- Export activity logs to CSV
- Pagination for large datasets
 
**Query:** `GET /api/vault/activity-log?locationId=...&cashierId=...&machineId=...&startDate=...&endDate=...`

**Use Cases:**
- Audit cashier performance
- Track vault cash movements
- Investigate discrepancies
- Compliance reporting
---

### 6.2 Cashier Detail Views

**Access:** Click cashier name in Manage Cashiers table (`/vault/management/cashiers`)

**Modal Flow:**
1. **Selection Modal** appears with options:
   - View Activity Log
   - View Shift History
2. Select an option to open respective modal
3. Use **Back** button to return to selection
4. **Close** button exits all modals

**Activity Log Modal:**
- All transactions performed by cashier
- Payouts, float requests, shift operations
- Timestamp, type, amount details
- **Note:** Does NOT show denomination details (logging only)

**Shift History Modal:**
- All shifts: active, closed, pending_review
- Opening/closing balances
- Discrepancies and resolutions
- Shift duration and metrics
- Expandable rows for shift details

---

### 6.3 Enhanced Machine Operations

#### Soft Count - 3-Panel Interface

**Purpose:** Record physical cash removal from machines without editing meter values.

**Layout:**

**Left Panel (Machine List):**
- All machines from location
- Live meter data display:
  - Money In (from meters)
  - Money Out (from meters)
  - Gross (calculated: In - Out)
- Selection checkboxes

**Center Panel (Count Form):**
- Selected machine details
- Denomination input fields
- Physical count total (auto-calculated)
- Variance display: Physical vs Gross
- Color coding: Green (match), Red (variance)
- Notes field
 
**Right Panel (Contextual Data):**
- **Default View**: Queued soft counts (batch processing).
- **History View**: Last 5 collections/soft counts for the **currently selected machine**.
- Displays Date, Amount, and Variance Trends to help VM identify bin issues or count errors on the spot.
- **Submit All** button (batch submission)

**Key Logic:**
- Soft count tracks physical removal
- **Does NOT edit meter values** (critical requirement)
- Creates `VaultTransaction` with type `soft_count`
- Updates vault balance

---

#### Machine Collection - Same Pattern

**Purpose:** Record official machine drops.

**Features:**
- Identical 3-panel layout as soft count
- Machine list with meter data
- Collection form with denominations
- Queue system for batch processing

---

### 6.4 Pending Reviews Dashboard

**Location:** Main vault dashboard (`/vault/management`)

**Card: "Pending Reviews"**

**Displays:**
- Unbalanced cashier shifts (status: `pending_review`)
- Badge with count of pending items
- For each shift:
  - Cashier name
  - Expected closing balance
  - Entered closing balance
  - Discrepancy amount (highlighted in red)
  - Time pending
  - Urgency indicator (>24 hours)

**Quick Actions:**
- **Review** button opens resolution modal
- VM can adjust balance or accept cashier count
- Audit comment required
- After resolution, card updates automatically

**Workflow:**
1. Cashier closes shift with discrepancy
2. Shift goes to `pending_review` status
3. Appears in Pending Reviews card
4. VM clicks "Review"
5. Resolves discrepancy (adjust or accept)
6. Adds audit comment
7. Force closes shift
8. Card clears, shift closes

**Query:** `CashierShift.find({ locationId, status: 'pending_review' })`

---

### 6.5 Vault Notification Center

**Access:** `/vault/notifications`

**Features:**
- Dedicated dashboard for operational alerts (Low Inventory, Pending Floats, Discrepancies).
- **Categorization**: Color-coded alerts (Info, Warning, Error, Success).
- **State Management**: Notifications sync with active shift status.
- **Bulk Actions**: Mark all as read or clear entire queue.

**Model:** `VaultNotification`

---

### 6.6 End-of-Day Tallying & Coverage

**Logic:** Ensures 100% floor accountability before vault closure.

**Features:**
1. **Full Asset Fetch**: Closure process queries ALL active machines at the location.
2. **Collection Check**: Compares asset list against `machinecollections` for the current date.
3. **Modal Integration**: The "Close Vault" modal displays a real-time tally (e.g., "12 / 15 Machines Collected").
4. **Coverage Warning**: Prevents closure without acknowledgment if machines are missing from the daily count.

**Query:** `generateEndOfDayReport` helper aggregates `MachineModel.find` vs `MachineCollectionModel.find`.

---

**Last Updated:** February 13, 2026
