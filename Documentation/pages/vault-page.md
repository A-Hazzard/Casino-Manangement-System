# Vault Management Page Implementation (`/vault`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Page Overview

Cage and Vault operations for property-wide cash management, shift lifecycle management, and cashier oversight. The page provides both a high-level financial summary and detailed tools for managing daily property liquidity.

---

## 2. Data & API Architecture (By Section)

### 💰 Vault Balance Card
The primary financial snapshot for the current vault shift.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Current Balance** | `balance` | `GET /api/vault/balance?locationId=` |
| **Opening Balance** | `openingBalance` | `GET /api/vault/balance?locationId=` |
| **Manager on Duty** | `managerOnDuty` | `GET /api/vault/balance?locationId=` |
| **Last Reconciliation** | `lastReconciliation` | `GET /api/vault/balance?locationId=` |
| **Shift Status** | `activeShiftId` / `isStale` | `GET /api/vault/balance?locationId=` |

- **Polling**: Refreshes on an interval to reflect real-time cash movements from cashier operations.
- **Implementation**: `VaultOverviewBalanceCard` component.

### 📦 Inventory Card
Denomination-level breakdown of physical cash inside the vault safe.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Denomination Grid** | `denominations[].value`, `denominations[].count` | `GET /api/vault/balance?locationId=` |
| **Total Cash** | `balance` | `GET /api/vault/balance?locationId=` |

- **Display**: Each denomination ($1, $5, $10, etc.) is shown as a counter row. The totals auto-sum from the denomination grid.
- **Implementation**: `VaultOverviewInventoryCard` component.

### 🏧 Float Requests Panel
Incoming cash requests from cashiers on the floor awaiting vault manager approval.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Requested By** | `requestedBy.name` | `GET /api/vault/float-request` |
| **Requested Amount** | `requestedAmount` | `GET /api/vault/float-request` |
| **Request Status** | `status` (pending/approved/denied) | `GET /api/vault/float-request` |

- **Polling**: The panel refreshes every 5 seconds to ensure no float request is missed by the vault manager.
- **Actions**: "Approve" triggers `POST /api/vault/float-request/approve`. "Deny" triggers a rejection response via the same endpoint.
- **Implementation**: `VaultOverviewFloatRequestsPanel` component.

### 📋 Shift Review Panel
Audit interface for reviewing cashier shift closures that have variances.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Cashier Name** | `cashierName` | `GET /api/vault/cashier-shift` |
| **Opening Float** | `openingBalance` | `GET /api/vault/cashier-shift` |
| **Closing Cash** | `closingBalance` | `GET /api/vault/cashier-shift` |
| **Discrepancy (Diff)** | `variance` | `GET /api/vault/cashier-shift` |

- **Visuals**: Rows with variance exceeding the Licencee's threshold are highlighted in red.
- **Actions**: "Resolve" accepts the variance; "Reject" sends the shift back to the Cashier with a note for correction.
- **Implementation**: `VaultOverviewShiftReviewPanel` component.

### 📊 Cash on Premises Metrics
A real-time summary of property-wide liquidity (visible to Vault Managers and above).
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Total Cash on Premises** | `totalCashOnPremises` | `GET /api/vault/balance?locationId=` |
| **Machine Money In (Today)** | `machineMoneyIn` | `GET /api/vault/balance?locationId=` |
| **Active Cashier Floats** | `cashierFloats` | `GET /api/vault/balance?locationId=` |

- **Formula**: `TotalCashOnPremises = VaultBalance + CashierFloats + MachineMeterDrop(Today)`.
- **Contextual**: Provides the "Full Picture" of total fiscal exposure across the property for risk management.

### 📜 Recent Activity
A chronological log of all cash movements within the current vault shift.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Transaction Type** | `type` (add/remove/float/expense) | `GET /api/vault/transactions` |
| **Amount** | `amount` | `GET /api/vault/transactions` |
| **Performed By** | `performedBy.name` | `GET /api/vault/transactions` |
| **Timestamp** | `timestamp` | `GET /api/vault/transactions` |

- **Implementation**: `VaultOverviewRecentActivitySection` component.

---

## 3. Vault Shift Lifecycle

The Vault operates in a strict shift-based model:

1. **Initialize Shift**: Opens the vault for the day. Triggers `POST /api/vault/initialize`.
   - Requires an opening denomination count and a designated Vault Manager.
2. **Add Cash**: Records cash brought into the vault (e.g. from a collection). Triggers `POST /api/vault/add-cash`.
3. **Remove Cash**: Records cash removed from the vault (e.g. bank run). Triggers `POST /api/vault/remove-cash`.
4. **Record Expense**: Logs a petty cash payment with a mandatory note and optional receipt photo upload. Triggers `POST /api/vault/expense`.
5. **Approve Float**: Transfers a defined cash amount from the vault to a cashier's till. Triggers `POST /api/vault/float-request/approve`.
6. **Close Shift (End of Day)**: Requires all cashier shifts to be `closed` or `resolved` first, then finalizes the vault balance. Triggers `POST /api/vault/end-of-day`.

---

## 4. Role-Based Access Control (RBAC)

- **Vault Manager**: Full access — can initialize shifts, approve floats, manage expenses, and close the day.
- **Cashier**: Restricted to their own shift dashboard and Float Request submission. Cannot see vault balances.
- **Manager / Admin**: Read-only access to vault financials and the ability to review and override cashier shift variances.
- **Developer**: Access to all tools including historical balance corrections.

---

## 5. Visual Identifiers

- 🔒 **Shift Lock**: The "Close Vault" button is disabled (with tooltip) while any Cashier shifts remain in `active` or `pending_review` state.
- 🔴 **Stale Shift**: A warning banner appears if the current vault shift spans more than one gaming day (`isStale: true`), indicating it was not properly closed the night before.
- 💰 **Balance Variance**: A coloured indicator (Green/Amber/Red) shows whether the vault is balanced, slightly off, or critically mismatched against the expected position.

---

## 6. Technical UI Standards

- **Skeleton UX**: `VaultBalanceSkeleton` and `ShiftReviewSkeleton` are used during hydration.
- **Optimistic UI**: Approving a float request instantly removes it from the panel while the API request processes in the background.
- **Polling Strategy**: The Float Requests Panel polls every 5 seconds using a `setInterval` to ensure instant notification for vault managers.

---
**Internal Document** - Engineering Team
