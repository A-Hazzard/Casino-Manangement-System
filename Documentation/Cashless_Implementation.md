# Vault Management System - Phase 1 Implementation Plan

## Overview

This plan implements the **foundation** of the Vault Management System according to the FRD. Phase 1 focuses on core infrastructure that all other features depend on.

---

## User Review Required

> [!IMPORTANT]
> **Critical Design Decisions**
> 
> 1. **Denomination Set**: Assuming standard US denominations ($1, $5, $10, $20, $50, $100). Please confirm or provide the actual denomination set.
> 
> 2. **Multi-Location Support**: Phase 1 assumes single-location deployment. Transfers between locations will be Phase 4+. Confirm this is acceptable.
> 
> 3. **Ticket Validation**: How should ticket redemption be validated? Options:
>    - Manual entry with validation against ticket database
>    - Barcode scanner integration
>    - External API validation
> 
> 4. **Machine Data Integration**: How do we receive machine jackpot/lock-up data? Is there an existing API or manual entry?

---

## Proposed Changes

### Database Schema

#### **Collection: `vaultShifts`**

Tracks vault manager shifts and vault balance state.

```typescript
{
  _id: string,
  locationId: string,
  vaultManagerId: string,
  status: 'active' | 'closed',
  openedAt: Date,
  closedAt?: Date,
  openingBalance: number,
  openingDenominations: [
    { denomination: number, quantity: number }
  ],
  closingBalance?: number,
  closingDenominations?: [
    { denomination: number, quantity: number }
  ],
  reconciliations: [
    {
      timestamp: Date,
      previousBalance: number,
      newBalance: number,
      denominations: [{ denomination: number, quantity: number }],
      reason: string,
      comment: string // mandatory for audit
    }
  ],
  canClose: boolean, // BR-01: false if any cashier shifts active/pending
  createdAt: Date,
  updatedAt: Date
}
```

---

#### **Collection: `cashierShifts`**

Tracks individual cashier shifts with blind closing support.

```typescript
{
  _id: string,
  locationId: string,
  cashierId: string,
  vaultShiftId: string, // parent vault shift
  status: 'active' | 'closed' | 'pending_review',
  openedAt: Date,
  closedAt?: Date,
  
  // Opening
  openingBalance: number,
  openingDenominations: [
    { denomination: number, quantity: number }
  ],
  
  // Closing (C-4: Blind Close)
  cashierEnteredBalance?: number, // what cashier physically counted
  cashierEnteredDenominations?: [
    { denomination: number, quantity: number }
  ],
  expectedClosingBalance?: number, // system calculation
  closingBalance?: number, // final approved balance
  closingDenominations?: [
    { denomination: number, quantity: number }
  ],
  
  // Discrepancy handling
  discrepancy?: number,
  discrepancyResolved: boolean,
  vmReviewNotes?: string,
  vmAdjustedBalance?: number,
  reviewedBy?: string, // VM user ID
  reviewedAt?: Date,
  
  // Metrics
  payoutsTotal: number,
  payoutsCount: number,
  floatAdjustmentsTotal: number,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### **User Management Rules**
- **BR-07 (Inheritance)**: When a Vault Manager creates a cashier account, the cashier automatically inherits the `assignedLocations` and `assignedLicensees` of the creating manager. This is enforced at the API level (helper `createUser`).

---

#### **Collection: `vaultTransactions`**

Immutable ledger of all cash movements (BR-03).

```typescript
{
  _id: string,
  locationId: string,
  timestamp: Date,
  type: 'vault_open' | 'vault_close' | 'vault_reconciliation' | 
        'cashier_shift_open' | 'cashier_shift_close' | 
        'float_increase' | 'float_decrease' | 
        'payout' | 'machine_collection' | 'soft_count' | 'expense',
  
  // Movement tracking
  from: {
    type: 'vault' | 'cashier' | 'machine' | 'external',
    id?: string // cashier ID, machine ID, etc.
  },
  to: {
    type: 'vault' | 'cashier' | 'machine' | 'external',
    id?: string
  },
  
  amount: number,
  denominations: [
    { denomination: number, quantity: number }
  ],
  
  // Balance tracking
  vaultBalanceBefore?: number,
  vaultBalanceAfter?: number,
  cashierBalanceBefore?: number,
  cashierBalanceAfter?: number,
  
  // References
  vaultShiftId?: string,
  cashierShiftId?: string,
  floatRequestId?: string,
  payoutId?: string,
  
  // Audit
  performedBy: string, // user ID
  notes?: string,
  auditComment?: string, // mandatory for reconciliations
  
  // Immutability
  isVoid: boolean,
  voidReason?: string,
  voidedBy?: string,
  voidedAt?: Date,
  
  createdAt: Date
}
```

---

#### **Collection: `floatRequests`**

Cashier float increase/decrease requests (C-3).

```typescript
{
  _id: string,
  locationId: string,
  cashierId: string,
  cashierShiftId: string,
  vaultShiftId: string,
  
  type: 'increase' | 'decrease',
  
  // Request
  requestedAmount: number,
  requestedDenominations: [
    { denomination: number, quantity: number }
  ],
  requestNotes?: string,
  requestedAt: Date,
  
  // Approval
  status: 'pending' | 'approved' | 'denied' | 'edited',
  approvedAmount?: number,
  approvedDenominations?: [
    { denomination: number, quantity: number }
  ],
  processedBy?: string, // VM user ID
  processedAt?: Date,
  vmNotes?: string,
  
  // Transaction reference
  transactionId?: string, // link to vaultTransactions
  
  createdAt: Date,
  updatedAt: Date
}
```

---

#### **Collection: `payouts`**

Individual payout records (C-2).

```typescript
{
  _id: string,
  locationId: string,
  cashierId: string,
  cashierShiftId: string,
  
  type: 'ticket' | 'hand_pay',
  amount: number,
  
  // Ticket redemption
  ticketNumber?: string,
  ticketBarcode?: string,
  printedDate?: Date, // FRD Requirement: tracking the ticket's printed date
  
  // Hand pay
  machineId?: string,
  machineName?: string,
  jackpotType?: string,
  
  // Validation
  validated: boolean,
  validationMethod?: string,
  
  // Audit
  timestamp: Date,
  cashierFloatBefore: number,
  cashierFloatAfter: number,
  
  // Transaction reference
  transactionId: string, // link to vaultTransactions
  
  notes?: string,
  createdAt: Date
}
```

---

### Business Rule Enforcement (Validation Logic)

#### **VM-Constraint: Single Active Manager**
- **Rule**: Only one (1) Vault Manager shift can be `active` at a location at any given time.
- **Implementation**: The `POST /api/vault/shift/open` and `POST /api/vault/initialize` endpoints must check for existing active shifts for the target `locationId` before proceeding.

#### **VM-5: Expense Categorization**
- **Rule**: Expenses must be categorized (e.g., "Maintenance", "Supplies", "Cleaning", "Player Promotion").
- **Implementation**: The `VaultTransaction` schema (type: 'expense') and the `POST /api/vault/expense` endpoint must include a `category` field.

---

### API Endpoints

#### **Vault Management**

##### **[NEW] `POST /api/vault/initialize`**
Initialize vault for new location (VM-1).

**Request:**
```typescript
{
  locationId: string,
  openingBalance: number,
  denominations: [
    { denomination: number, quantity: number }
  ],
  notes?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  vaultShift: VaultShift,
  transaction: VaultTransaction
}
```

---

##### **[NEW] `POST /api/vault/shift/open`**
Start vault manager shift.

**Request:**
```typescript
{
  locationId: string,
  openingBalance: number,
  denominations: [
    { denomination: number, quantity: number }
  ]
}
```

---

##### **[NEW] `POST /api/vault/shift/close`**
Close vault manager shift (with BR-01 validation).

**Request:**
```typescript
{
  vaultShiftId: string,
  closingBalance: number,
  denominations: [
    { denomination: number, quantity: number }
  ]
}
```

**Validation:**
- Check no active cashier shifts
- Check no pending review cashier shifts
- Return error if BR-01 violated

---

##### **[NEW] `POST /api/vault/reconcile`**
Reconcile vault balance (VM-1).

**Request:**
```typescript
{
  vaultShiftId: string,
  newBalance: number,
  denominations: [
    { denomination: number, quantity: number }
  ],
  reason: string,
  comment: string // mandatory
}
```

---

##### **[NEW] `GET /api/vault/balance`**
Get current vault balance.

**Response:**
```typescript
{
  success: boolean,
  balance: number,
  denominations: [
    { denomination: number, quantity: number }
  ],
  lastReconciliation?: Date,
  activeShiftId?: string
}
```

---

#### **Cashier Shifts**

##### **[NEW] `POST /api/cashier/shift/open`**
Open cashier shift (creates float request).

**Request:**
```typescript
{
  locationId: string,
  requestedFloat: number,
  denominations: [
    { denomination: number, quantity: number }
  ]
}
```

**Flow:**
1. Validate that the requesting user is the cashier (Vault Manager cannot start for them)
2. Check for active Vault Manager shift at the specified location (BR-06)
3. Ensure the cashier is actually assigned to that location
4. Create float request
5. Notify VM
6. Wait for VM approval
7. Create shift when approved

---

##### **[NEW] `POST /api/cashier/shift/close`**
Close cashier shift with blind closing (C-4).

**Request:**
```typescript
{
  shiftId: string,
  physicalCount: number,
  denominations: [
    { denomination: number, quantity: number }
  ]
}
```

**Response (CRITICAL - Blind Close):**
```typescript
{
  success: boolean,
  status: 'closed' | 'pending_review',
  message: string,
  // DO NOT include expected balance or discrepancy amount
  // Only return status
}
```

**Logic:**
1. Calculate expected balance from transactions
2. Compare with cashier's physical count
3. If match: Close shift, return success
4. If mismatch:
   - Set status to 'pending_review'
   - Create notification for VM
   - **DO NOT** tell cashier the expected amount
   - **DO NOT** tell cashier the discrepancy amount
   - Return generic "pending review" message

---

##### **[NEW] `GET /api/cashier/shift/current`**
Get current active shift for logged-in cashier.

**Response:**
```typescript
{
  success: boolean,
  shift?: CashierShift,
  currentBalance: number,
  payoutsToday: number,
  floatAdjustments: number
}
```

---

#### **Transactions**

##### **[NEW] `GET /api/vault/transactions`**
Get transaction history with filters.

**Query Params:**
- `locationId`: string
- `startDate`: Date
- `endDate`: Date
- `type`: TransactionType[]
- `cashierId`: string (optional)
- `limit`: number
- `offset`: number

---

##### **[NEW] `POST /api/vault/transaction/void`**
Void a transaction (requires VM permission).

**Request:**
```typescript
{
  transactionId: string,
  reason: string,
  auditComment: string
}
```

---

### Frontend Components

#### **[MODIFY] [/vault/management/page.tsx](file:///c:/Users/pc/OneDrive/Documents/Github/evolution-one-cms/app/vault/management/page.tsx)**

Replace placeholder with:
- Vault balance card
- Active cashiers widget
- Pending float requests
- Quick actions (Start Shift, Reconcile, etc.)

---

#### **[NEW] `components/VAULT/overview/VaultBalanceCard.tsx`**

Display:
- Current balance
- Denomination breakdown
- Last reconciliation
- Reconcile button

---

#### **[NEW] `components/VAULT/overview/ActiveCashiersWidget.tsx`**

Display:
- List of active cashiers
- Their current float
- Shift duration
- Quick actions

---

#### **[NEW] `components/VAULT/overview/FloatRequestsPanel.tsx`**

Display:
- Pending float requests
- Approve/Deny actions
- Request details

---

#### **[MODIFY] [/vault/cashier/shifts/page.tsx](file:///c:/Users/pc/OneDrive/Documents/Github/evolution-one-cms/app/vault/cashier/shifts/page.tsx)**

Replace placeholder with:
- Start shift button
- Active shift dashboard
- End shift (blind close) flow
- Shift history

---

#### **[NEW] `components/VAULT/cashier/shifts/BlindCloseModal.tsx`**

**CRITICAL COMPONENT** - Implements C-4:
- Denomination input fields
- **NO display of expected balance**
- Submit button
- Handle pending review response

---

#### **[NEW] `components/VAULT/cashier/shifts/ShiftDashboard.tsx`**

Display during active shift:
- Current float
- Payouts processed
- Float adjustments
- Shift duration

---

### Helper Functions

#### **[NEW] `lib/helpers/vault/calculations.ts`**

```typescript
// Calculate expected cashier closing balance
export function calculateExpectedBalance(
  openingBalance: number,
  payouts: Payout[],
  floatAdjustments: FloatRequest[]
): number;

// Validate denomination totals
export function validateDenominations(
  denominations: Denomination[]
): { valid: boolean; total: number };

// Check if vault can close (BR-01)
export function canCloseVaultShift(
  cashierShifts: CashierShift[]
): { canClose: boolean; reason?: string };
```

---

## Verification Plan

### Manual Testing

#### **Test 1: Vault Initialization (VM-1)**

**Prerequisites:**
- New location with no vault data
- User with `vault-manager` role

**Steps:**
1. Log in as vault manager
2. Navigate to `/vault/management`
3. Click "Initialize Vault" or "Start Shift"
4. Enter opening balance: $10,000
5. Enter denominations:
   - $100 × 50 = $5,000
   - $20 × 200 = $4,000
   - $10 × 100 = $1,000
6. Add notes: "Initial vault setup"
7. Submit

**Expected Result:**
- Vault shift created with status 'active'
- Transaction created with type 'vault_open'
- Vault balance card shows $10,000
- Denomination breakdown matches input

**Database Validation:**
```javascript
// Run in MongoDB shell
db.vaultShifts.findOne({ locationId: "test-location" })
db.vaultTransactions.find({ type: "vault_open" }).sort({ createdAt: -1 }).limit(1)
```

---

#### **Test 2: Cashier Shift Open with Float Request**

**Prerequisites:**
- Active vault shift
- User with `cashier` role

**Steps:**
1. Log in as cashier
2. Navigate to `/vault/cashier/shifts`
3. Click "Start Shift"
4. Request float: $2,000
5. Enter denominations:
   - $20 × 50 = $1,000
   - $10 × 50 = $500
   - $5 × 100 = $500
6. Submit request

**Expected Result:**
- Float request created with status 'pending'
- Cashier sees "Waiting for approval" message
- VM receives notification

**VM Approval:**
7. Log in as vault manager
8. Navigate to `/vault/management`
9. See pending float request in notifications
10. Click "Approve"

**Expected Result:**
- Float request status changes to 'approved'
- Cashier shift created with status 'active'
- Transaction created with type 'cashier_shift_open'
- Vault balance decreases by $2,000
- Cashier sees active shift dashboard

---

#### **Test 3: Blind Close - Matching Balance (C-4)**

**Prerequisites:**
- Active cashier shift with $2,000 opening balance
- No payouts or float adjustments made

**Steps:**
1. Log in as cashier
2. Navigate to `/vault/cashier/shifts`
3. Click "End Shift"
4. Enter physical count (should match $2,000):
   - $20 × 50 = $1,000
   - $10 × 50 = $500
   - $5 × 100 = $500
5. **VERIFY**: System does NOT show expected balance
6. Submit

**Expected Result:**
- Shift closes successfully
- Status changes to 'closed'
- Transaction created with type 'cashier_shift_close'
- Vault balance increases by $2,000
- Success message shown

---

#### **Test 4: Blind Close - Discrepancy (C-4)**

**Prerequisites:**
- Active cashier shift with $2,000 opening balance
- No payouts or float adjustments made

**Steps:**
1. Log in as cashier
2. Navigate to `/vault/cashier/shifts`
3. Click "End Shift"
4. Enter INCORRECT physical count ($1,950):
   - $20 × 50 = $1,000
   - $10 × 45 = $450
   - $5 × 100 = $500
5. **VERIFY**: System does NOT show expected balance
6. Submit

**Expected Result:**
- Shift status changes to 'pending_review'
- Cashier sees: "Your shift is under review. Please contact your manager."
- **VERIFY**: Cashier does NOT see:
  - Expected balance ($2,000)
  - Discrepancy amount ($50)
- VM receives "Unbalanced Shift" notification

**VM Review:**
7. Log in as vault manager
8. Navigate to pending shift review
9. See cashier entered: $1,950
10. See expected: $2,000
11. See discrepancy: -$50
12. Add review notes: "Recount confirmed $1,950"
13. Adjust balance to $1,950
14. Force close shift

**Expected Result:**
- Shift status changes to 'closed'
- Final balance set to $1,950
- Vault balance increases by $1,950
- Audit trail includes VM notes

---

#### **Test 5: Vault Cannot Close with Active Cashiers (BR-01)**

**Prerequisites:**
- Active vault shift
- At least one active cashier shift

**Steps:**
1. Log in as vault manager
2. Navigate to `/vault/management`
3. Click "End Shift"

**Expected Result:**
- Error message: "Cannot close vault shift. Active cashier shifts must be closed first."
- List of active cashiers shown
- Vault shift remains open

---

### Database Validation Queries

After each test, run these queries to verify data integrity:

```javascript
// Check vault shift
db.vaultShifts.findOne({ _id: "shift-id" })

// Check all transactions for a shift
db.vaultTransactions.find({ vaultShiftId: "shift-id" }).sort({ timestamp: 1 })

// Verify balance calculations
db.vaultTransactions.aggregate([
  { $match: { vaultShiftId: "shift-id" } },
  { $group: {
    _id: null,
    totalIn: { $sum: { $cond: [{ $eq: ["$to.type", "vault"] }, "$amount", 0] } },
    totalOut: { $sum: { $cond: [{ $eq: ["$from.type", "vault"] }, "$amount", 0] } }
  }}
])

// Check for orphaned records
db.cashierShifts.find({ vaultShiftId: { $exists: false } })
db.floatRequests.find({ cashierShiftId: { $exists: false } })
```

---

## System Implementation Details (Finalized)

1. **Denomination Set**: Confirmed and implemented as: $1, $5, $10, $20, $50, $100.
2. **Ticket Validation**: Implemented via manual entry with validation against the system payout ledger.
3. **Machine Data Integration**: Jackpot and Lock-up data is provided via real-time SMIB/Meters events.
4. **Multi-Location**: Phase 1 focus confirmed. Inter-location transfers were explored but deferred to emphasize local vault stability.
5. **Testing**: Verified through comprehensive manual test cases in production-equivalent environment.

---

**Last Updated:** January 2026  
**Status:** **CLOSED - COMPLETED**
