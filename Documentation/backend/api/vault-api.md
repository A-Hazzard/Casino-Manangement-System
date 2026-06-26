# Vault & Ledger API (`/api/vault`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.4.0

---

## 1. Domain Overview

The Vault API manages the casino's on-premises cash operations through a strict shift-based ledger model. All vault access requires one of: `developer`, `admin`, `manager`, or `vault-manager` roles.

---

## 2. Core Endpoints

### 🏦 `GET /api/vault/balance`

Returns the full financial state of the current vault shift. Primary data source for the Vault Balance Card.

**Required Params**: `locationId`

**Steps:**

1. **Authenticate user** — Calls `getUserFromServer()`. Returns `401` if not authenticated.
2. **Check vault access** — Verifies the user has one of `developer`, `admin`, `manager`, or `vault-manager` in their `roles`. Returns `403` if not.
3. **Validate `locationId`** — Returns `400` if `locationId` is absent.
4. **Connect to database & fetch active shift** — Calls `VaultShiftModel.findOne({ locationId, status: 'active' })`.
   - If **no active shift**: Fetches the last closed shift to get the suggested opening balance, computes `lastAuditTime`, and returns an `isInitial: true` response.
5. **Fetch last transaction** — Queries `VaultTransaction.findOne({ vaultShiftId }).sort({ timestamp: -1 })` to get the most recent movement.
6. **Compute `lastReconciliation`** — Takes the `max()` timestamp from `activeShift.reconciliations[]`.
7. **Fetch Manager on Duty** — Calls `UserModel.findOne({ _id: activeShift.vaultManagerId })` to resolve the manager's full name from `profile.firstName + profile.lastName`.
8. **Calculate Cash on Premises**:
   - Counts active cashier shifts: `CashierShiftModel.countDocuments({ vaultShiftId, status: { $in: ['active', 'pending_review', 'pending_start'] } })` — used for the `canClose` guard.
   - Sums cashier float balances: `CashierShiftModel.find({ locationId, status: { $in: ['active', 'pending_review'] } })`.
   - Applies `getGamingDayRangeForPeriod('Today', gameDayOffset)` to compute the current gaming day window.
   - Aggregates today's machine meter drops from the `Meters` collection: `$group: { totalMoneyIn: $sum: movement.drop }`.
9. **Check EOD collection** — Queries `VaultCollectionSession.exists({ vaultShiftId, status: 'completed', isEndOfDay: true })` to set `isCollectionDone`.
10. **Check stale shift** — Calls `isShiftStaleBackend(activeShift.openedAt, locationId)` to determine if the shift spans more than one gaming day.
11. **Return full balance response** — Responds with `{ balance, denominations, managerOnDuty, canClose, blockReason, totalCashOnPremises, machineMoneyIn, cashierFloats, isCollectionDone, isStale, lastAudit }`.

---

### 🟢 `POST /api/vault/initialize`

Opens a new vault shift for the day.

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above role.
2. **Validate conflict** — Returns `409` if there is already an `active` shift for this location.
3. **Create vault shift** — Creates a new `VaultShift` document with `status: 'active'`, `openingBalance`, `openingDenominations`, and `vaultManagerId`.
4. **Log activity** — Writes a `VAULT_SHIFT_OPEN` event to `activitylogs`.
5. **Return** — Responds with `{ success: true, shift }`.

---

### 💵 `POST /api/vault/add-cash`

Records cash brought into the vault.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads `locationId`, `amount`, `reason`, `denominations`.
3. **Find active shift** — Returns `404` if no active shift found for the location.
4. **Update vault shift balance** — Increments `openingBalance` / `closingBalance` by `amount` on the `VaultShift` document.
5. **Create transaction record** — Creates a `VaultTransaction` with `type: 'add'`, `amount`, `performedBy`, and `reason`.
6. **Log activity** — Writes to `activitylogs`.
7. **Return updated balance** — Responds with `{ success: true, newBalance }`.

---

### 💸 `POST /api/vault/remove-cash`

Records cash removed from the vault.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads `locationId`, `amount`, `reason`, `denominations`.
3. **Find active shift** — Returns `404` if no active shift found.
4. **Update vault shift balance** — Decrements `closingBalance` by `amount` on the `VaultShift` document.
5. **Create transaction record** — Creates a `VaultTransaction` with `type: 'remove'`, `amount`, `performedBy`, and `reason`.
6. **Log activity** — Writes to `activitylogs`.
7. **Return updated balance** — Responds with `{ success: true, newBalance }`.

---

### 🧾 `POST /api/vault/expense`

Records a vault expense.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads `locationId`, `amount`, `category`, `description`. Returns `400` if `category` or `description` is missing (BR-VMS-03).
3. **Find active shift** — Returns `404` if no active shift found.
4. **Update vault shift balance** — Decrements `closingBalance` by `amount`.
5. **Create transaction record** — Creates a `VaultTransaction` with `type: 'expense'`, `amount`, `category`, `description`, `performedBy`.
6. **Log activity** — Writes to `activitylogs`.
7. **Return updated balance** — Responds with `{ success: true, newBalance }`.

---

### 📊 `POST /api/vault/soft-counts`

Records denomination counts for vault reconciliation.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads `locationId`, `denominations`.
3. **Find active shift** — Returns `404` if no active shift found.
4. **Update shift denominations** — Stores the provided denomination breakdown on the `VaultShift` document.
5. **Return** — Responds with `{ success: true, denominations }`.

---

### ✅ `POST /api/vault/reconcile`

Records a reconciliation point on the active vault shift.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads `locationId`, `balance`, `denominations`.
3. **Find active shift** — Returns `404` if no active shift found.
4. **Append reconciliation** — Pushes a new entry into `VaultShift.reconciliations[]` with `timestamp`, `balance`, and `denominations`.
5. **Log activity** — Writes a `VAULT_RECONCILIATION` event.
6. **Return** — Responds with `{ success: true }`.

---

### 🏧 Float Requests

#### `GET /api/vault/float-request`

Returns float requests for the location.

**Required Params**: `locationId`

Returns pending and recent float requests for the active vault shift.

---

#### `POST /api/vault/float-request`

Creates a new float request from a cashier.

**Steps:**

1. **Authenticate & authorize** — Checks cashier or above role.
2. **Parse & validate body** — Reads `locationId`, `amount`, `reason`.
3. **Find active shift** — Returns `404` if no active vault shift found.
4. **Create float request** — Creates a `FloatRequest` document with `status: 'pending'`.
5. **Log activity** — Writes to `activitylogs`.
6. **Return** — Responds with `{ success: true, floatRequest }`.

---

#### `DELETE /api/vault/float-request`

Cancels a pending float request.

**Steps:**

1. **Authenticate & authorize** — Checks the requesting user owns the float request or has vault-manager role.
2. **Fetch float request** — Returns `404` if not found. Returns `409` if status is not `pending`.
3. **Delete** — Removes the `FloatRequest` document.
4. **Return** — Responds with `{ success: true }`.

---

#### `POST /api/vault/float-request/approve`

Approves and disburses a cash float from the vault to a cashier.

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Fetch float request** — Finds the `FloatRequest` by `_id`. Returns `404` if not found.
3. **Guard: Sufficient vault balance** — Returns `409` if `floatAmount > vaultBalance`.
4. **Atomic update** (same DB operation):
   - Sets `FloatRequest.status = 'approved'`.
   - Decrements `VaultShift.balance` by `floatAmount`.
   - Increments `CashierShift.currentBalance` for the requesting cashier by `floatAmount`.
5. **Create transaction record** — Creates a `VaultTransaction` with `type: 'float'`.
6. **Log activity** — Writes to `activitylogs`.
7. **Return** — Responds with `{ success: true }`.

---

#### `POST /api/vault/float-request/confirm`

Confirms a float has been physically received by the cashier.

**Steps:**

1. **Authenticate & authorize** — Checks cashier or above role.
2. **Fetch float request** — Returns `404` if not found. Returns `409` if status is not `approved`.
3. **Update status** — Sets `FloatRequest.status = 'confirmed'`.
4. **Return** — Responds with `{ success: true }`.

---

### 💰 Payouts

#### `POST /api/vault/payout`

Records a manual payout from the vault.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads `locationId`, `amount`, `reason`.
3. **Find active shift** — Returns `404` if no active shift found.
4. **Guard: Sufficient balance** — Returns `409` if payout exceeds vault balance.
5. **Update vault shift balance** — Decrements `closingBalance` by `amount`.
6. **Create transaction record** — Creates a `VaultTransaction` with `type: 'payout'`, `amount`, `reason`.
7. **Log activity** — Writes to `activitylogs`.
8. **Return updated balance** — Responds with `{ success: true, newBalance }`.

---

#### `GET /api/vault/payouts`

Returns payout history for the active vault shift.

**Required Params**: `locationId`

Queries `VaultTransaction` records filtered by `type: 'payout'` for the current shift.

---

### 🔄 Transfers

#### `POST /api/vault/transfers`

Initiates a vault-to-vault or vault-to-cage transfer.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads `locationId`, `targetLocationId`, `amount`, `reason`.
3. **Find active shift** — Returns `404` if no active shift found for source location.
4. **Guard: Sufficient balance** — Returns `409` if transfer exceeds vault balance.
5. **Create transfer record** — Creates a `VaultTransfer` document with `status: 'pending'`.
6. **Log activity** — Writes to `activitylogs`.
7. **Return** — Responds with `{ success: true, transfer }`.

---

#### `GET /api/vault/transfers`

Returns transfer history for the location.

**Required Params**: `locationId`

Queries transfer records for the active vault shift.

---

#### `POST /api/vault/transfers/approve`

Approves a pending transfer.

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Fetch transfer** — Returns `404` if not found. Returns `409` if status is not `pending`.
3. **Atomic update** — Sets `VaultTransfer.status = 'approved'`. Decrements source vault balance, increments target vault balance.
4. **Create transaction records** — Creates two `VaultTransaction` records (debit on source, credit on target).
5. **Log activity** — Writes to `activitylogs`.
6. **Return** — Responds with `{ success: true }`.

---

### 📋 Collection Session

#### `GET /api/vault/collection-session`

Returns collection session data for the active vault shift.

**Required Params**: `locationId`

Returns the current and recent collection sessions associated with the vault shift.

---

#### `POST /api/vault/collection-session`

Creates or updates a vault collection session (cashier drop recording).

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Parse & validate body** — Reads session details and denomination breakdown.
3. **Find active shift** — Returns `404` if no active shift found.
4. **Upsert collection session** — Creates or updates the `VaultCollectionSession` document.
5. **Return** — Responds with `{ success: true, session }`.

---

#### `POST /api/vault/collection-session/finalize`

Finalizes a collection session, marking it as completed.

**Steps:**

1. **Authenticate & authorize** — Checks vault access roles.
2. **Fetch collection session** — Returns `404` if not found.
3. **Update status** — Sets `VaultCollectionSession.status = 'completed'` and records `finalizedAt`.
4. **Log activity** — Writes to `activitylogs`.
5. **Return** — Responds with `{ success: true }`.

---

### 🔒 End-of-Day (EOD) Report

#### `GET /api/vault/end-of-day`

Generates and retrieves the EOD report as JSON.

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Fetch active shift** — Returns `404` if no active shift found.
3. **Gather report data** — Aggregates vault balance, transactions, collections, cashier shifts, and reconciliation points for the current shift.
4. **Generate report** — Computes EOD totals (opening balance, total adds, total removes, total expenses, total payouts, net movement, closing balance).
5. **Return** — Responds with `{ success: true, report }` containing the full EOD report as JSON.

---

#### `POST /api/vault/end-of-day`

Exports the EOD report as a CSV file download.

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Fetch active shift** — Returns `404` if no active shift found.
3. **Generate CSV** — Builds CSV content from the same EOD data as the GET endpoint.
4. **Return** — Responds with CSV file download (`Content-Type: text/csv`, `Content-Disposition: attachment`).

---

### 🔒 `POST /api/vault/shift/close`

Closes the vault shift for the day.

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Fetch active shift** — Returns `404` if no active shift.
3. **Guard (BR-VMS-01)** — Counts cashier shifts with `status: { $in: ['active', 'pending_review'] }`. Returns `409` with `blockReason` message if any are still open.
4. **Close the shift** — Updates `VaultShift` with `status: 'closed'`, `closedAt: Date.now()`, `closingBalance`, `closingDenominations`.
5. **Log activity** — Writes a `VAULT_SHIFT_CLOSE` event.
6. **Return** — Responds with `{ success: true }`.

---

### 👤 Cashier Shift Management

#### `GET /api/vault/cashier-shift/history`

Returns cashier shift history for the location.

**Required Params**: `locationId`

Returns past and active cashier shifts associated with the vault shift.

---

#### `POST /api/vault/cashier-shift/force-close`

Force-closes a cashier shift that is stuck or abandoned.

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Fetch cashier shift** — Returns `404` if not found. Returns `409` if shift is already closed.
3. **Update status** — Sets `CashierShift.status = 'closed'`, records `closedAt`, and processes any outstanding float return.
4. **Log activity** — Writes to `activitylogs`.
5. **Return** — Responds with `{ success: true }`.

---

#### `POST /api/vault/cashier-shift/direct-open`

Opens a cashier shift directly without a float request (for walk-in scenarios).

**Steps:**

1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Parse & validate body** — Reads `cashierId`, `locationId`, `initialBalance`.
3. **Find active vault shift** — Returns `404` if no active vault shift found.
4. **Create cashier shift** — Creates a `CashierShift` document with `status: 'active'` and the provided `initialBalance`.
5. **Log activity** — Writes to `activitylogs`.
6. **Return** — Responds with `{ success: true, cashierShift }`.

---

### 📈 Metrics

#### `GET /api/vault/metrics`

Returns aggregated vault metrics for reporting.

**Required Params**: `locationId`, `startDate`, `endDate`

Queries vault transactions and shifts within the date range to compute totals for adds, removes, expenses, payouts, and net movement.

---

#### `GET /api/vault/metrics/breakdown`

Returns a detailed breakdown of vault metrics by category.

**Required Params**: `locationId`, `startDate`, `endDate`

Returns per-category expense totals, transaction counts, and daily trend data.

---

### 🌐 `GET /api/vault/overview/global`

Returns a global overview across all vault shifts for the user's assigned locations.

Aggregates balance, shift status, and activity summaries for all locations the user has access to.

---

### 🔔 Notifications

#### `GET /api/vault/notifications`

Returns vault notifications for the user (pending approvals, alerts, stale shift warnings).

---

#### `POST /api/vault/notifications`

Dismisses or marks a vault notification as read.

**Steps:**

1. **Parse body** — Reads `notificationId` and `action` (e.g., `dismiss`, `mark_read`).
2. **Update notification** — Updates the notification document status.
3. **Return** — Responds with `{ success: true }`.

---

### 📜 `GET /api/vault/activity-log`

Returns the activity log for the vault shift.

**Required Params**: `locationId`

Returns chronological `activitylogs` entries for the current vault shift (shift open, adds, removes, approvals, etc.).

---

### 📑 `GET /api/vault/transactions`

Returns transaction history for the vault.

**Required Params**: `locationId`

Returns all `VaultTransaction` records for the active shift, sorted by timestamp descending.

---

### 📂 `GET /api/vault/shifts/[id]`

Returns details for a specific vault shift by ID.

**Path Param**: `id` — The vault shift ID.

Returns the full shift document including opening/closing balances, reconciliation history, and associated metadata.

---

## 3. Business Rules (BR-VMS)

- **BR-VMS-01**: A Vault Shift cannot be closed while any Cashier Shifts are `active` or `pending_review`.
- **BR-VMS-02**: Float approvals are blocked if the approved amount exceeds the current vault balance.
- **BR-VMS-03**: All `Expense` records require a `category` and `description` — returns `400` otherwise.

### 🧮 Cash on Premises Formula (Step 8 in GET /balance)

```
totalCashOnPremises = vaultBalance + cashierFloats + machineMoneyIn(today)
```

Where `machineMoneyIn(today)` is the sum of `Meters.movement.drop` for the current gaming day window, giving management a real-time picture of the property's total cash exposure.

---

**Technical Reference** - Cage & Finance Team
