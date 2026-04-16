# Vault & Ledger API (`/api/vault`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

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

### 🏧 `POST /api/vault/float-request/approve`
Disburses a cash float from the vault to a cashier.

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

### 🔒 `POST /api/vault/end-of-day`
Closes the vault shift for the day.

**Steps:**
1. **Authenticate & authorize** — Checks `vault-manager` or above.
2. **Fetch active shift** — Returns `404` if no active shift.
3. **Guard (BR-VMS-01)** — Counts cashier shifts with `status: { $in: ['active', 'pending_review'] }`. Returns `409` with `blockReason` message if any are still open.
4. **Close the shift** — Updates `VaultShift` with `status: 'closed'`, `closedAt: Date.now()`, `closingBalance`, `closingDenominations`.
5. **Log activity** — Writes a `VAULT_SHIFT_CLOSE` event.
6. **Return** — Responds with `{ success: true }`.

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
