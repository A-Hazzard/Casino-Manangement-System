# Vault Management Compliance & Implementation Guide

**Author:** Antigravity (AI Assistant)  
**Date:** January 2026  
**Reference Document:** [Cashless & Vault FRD.md](./Cashless%20&%20Vault%20FRD.md)

## 1. Overview
This document provides a comprehensive mapping of the **Vault Management** module (`/vault/management`) against the functional requirements defined in the **Cashless & Vault FRD**. It details the practical operational workflows for Vault Managers (VM) and Cashiers.

---

## 2. Vault Overview Dashboard (`/vault/management`)
The central hub for the **Vault Manager (VM)** to maintain the site's financial integrity.

### 2.1 Vault Status & Reconciliation
| Feature / Button | FRD Requirement | Real-World Scenario |
| :--- | :--- | :--- |
| **Vault Status Card** | **VM-1: Location Initialization** | **Purpose:** Establishes the "Source of Truth."<br>**Scenario:** A VM starts their shift at 8:00 AM. They verify the digital balance matches the physical vault before allowing cashiers to start shifts. |
| **Reconcile Button** | **VM-1: Recalibration** | **Purpose:** Adjusts digital totals to match physical counts with an audit trail.<br>**Scenario:** During a monthly audit, a $50 discrepancy is found. The VM uses this to force-correct the ledger and adds a mandatory comment: *"Monthly audit adjustment - cash box variance."* |
| **Expenses Button** | **VM-5: Expenses** | **Purpose:** Log operational cash payouts directly from the vault.<br>**Scenario:** The manager pays $100 cash for emergency cleaning supplies. This creates a transaction record and decreases the vault balance immediately. |

### 2.2 Oversight & Alerts
| Feature / Button | FRD Requirement | Real-World Scenario |
| :--- | :--- | :--- |
| **Notification Bell** | **VM-3: Dashboard & Notifications** | **Purpose:** Real-time visibility into operational needs.<br>**Scenario:** A Cashier runs out of $10 bills and sends a Float Increase request. The VM sees an immediate alert and can respond before the cashier is forced to stop service. |
| **Shift Review Panel** | **VM-3 & C-4: Discrepancy Resolution** | **Purpose:** Management of "Pending Review" shifts (failed Blind Closes).<br>**Scenario:** A cashier counts their drawer and is $20 short. The shift locks. The VM uses this panel to perform a manual count, review the cashier's logs, and resolve the variance. |

---

## 3. Personnel Management (`/vault/management/cashiers`)
Satisfies the security and onboarding requirements for the "Fleet."

| Feature / Button | FRD Requirement | Real-World Scenario |
| :--- | :--- | :--- |
| **Create Cashier** | **VM-2: Fleet Management** | **Purpose:** Controlled account creation for staff.<br>**Scenario:** A new employee joins the team. The VM creates their account and assigns a temporary password. |
| **Reset Password** | **VM-2: Staff Oversight** | **Purpose:** Restores access while maintaining password reset logic.<br>**Scenario:** A cashier returns from leave and forgets their password. The VM resets it. |

---

## 4. Cash Movement Operations
Handles the flow of cash from the gaming floor back to the vault.

| Feature / Button | FRD Requirement | Real-World Scenario |
| :--- | :--- | :--- |
| **Machine Collections** | **VM-4: Machine Collections** | **Purpose:** Recording EOD cash removal from machine stackers.<br>**Scenario:** At the end of the gaming day, the VM removes cash boxes from machines and enters the totals here to increase the Vault's "Physical On-Hand" balance. |
| **Soft Count** | **VM-4: Soft Counts** | **Purpose:** Replenishing vault liquidity mid-shift without stopping machines.<br>**Scenario:** A popular slot machine's box is full by 4:00 PM. The VM clears it, records the soft count, and uses that cash to approve float requests from cashiers. |

---

## 5. Transactional Integrity & Auditing
Ensures every cent is traceable as per **BR-03**.

### 5.1 Recent Activity & Transactions
*   **The Ledger:** Every action (Add Case, Expense, Float Approval) creates a Permanent Transaction record.
*   **Denomination Tracking (BR-02):** The system tracks the quantity of every specific bill for every transaction. Note: Expenses might be total-only if configured, but generally require denominations.

### 5.2 Business Rules Compliance
| ID | Requirement | Implementation in System |
| :--- | :--- | :--- |
| **BR-01** | **Shift Dependency** | The system prevents a VM from closing their shift if any Cashier shifts are still "Active" or "Pending Review." |
| **BR-02** | **Denom Tracking** | **Strict Tracking:** Required for Vault initialization, Float Requests, and Cashier Closing Counts.<br>**Simplified Tracking:** Individual payouts (Tickets/Hand Pays) are total-amount only and do not require bills to be selected. |
| **BR-04** | **Float Independence** | Cashier shifts are tracked by unique ID. Cash from Station A cannot be "merged" with Station B. |

---

## 6. Comprehensive Practical User Flow

This section details the **Full Business Scenario** from start to finish, covering Manager Initialization, Cashier Shifts, Expenses, and Daily Close.

### Phase 1: The Morning Open (Vault Manager)
**Goal:** Open the Vault and prepare for business (8:00 AM).

1.  **Login:** VM logs into `/vault`.
    *   *System Check:* If url is `/vault`, auto-redirects to `/vault/management`.
2.  **Initialize Vault (Start Shift):**
    *   *Visual:* Dashboard shows "Vault Closed" or "Initialize Vault" button if no active shift exists.
    *   *Action:* Click **"Start Day" / "Initialize"**.
    *   *Logic:* System checks the **Last Closing Balance** from the previous day (e.g., $5,000).
    *   *Modal:* Displays "Expected Opening Balance: $5,000".
    *   *Scenario A (Match):* VM counts safe, finds $5,000. Clicks **Confirm**.
    *   *Scenario B (Variance):* VM finds $4,950. Edits amount to $4,950. System requires a comment ("Lost $50 overnight?").
    *   *API:* POST `/api/vault/initialize` (creates new Vault Shift).
3.  **Result:** Vault is now **ACTIVE**. Cashier operations are enabled.

### Phase 2: The Cashier Shift Start (Cashier)
**Goal:** Cashier gets their float to start working (8:15 AM).

1.  **Login:** Cashier logs into their dashboard.
2.  **Request Float:**
    *   *Action:* Click **Start Shift**.
    *   *Input:* Requests standard float of **$200** (20 x $10 bills).
    *   *System Check:* If VM hasn't performed Phase 1, this is **BLOCKED** ("Vault is not open").
3.  **VM Approval:**
    *   VM receives specific notification.
    *   *Action:* VM clicks **Approve**.
    *   *System Validation:* Checked `Vault Balance ($4,950) >= Requested ($200)`. Approved.
    *   *Money Move:* Vault decreases to $4,750. Cashier Shift becomes **ACTIVE**.

### Phase 3: Mid-Day Operations & Payouts
**Goal:** Handle real-world cash events (12:00 PM).

1.  **Ticket Redemption (Cashier):**
    *   *Scenario:* Customer presents a $50.25 ticket.
    *   *Action:* Cashier enters Ticket #, Amount ($50.25), and Date from ticket.
    *   *System:* Decrements Cashier's `currentBalance` by $50.25. **No bills selected.**
2.  **Hand Pay (Cashier):**
    *   *Scenario:* Machine 101 has a $1,000 Jackpot.
    *   *Action:* Cashier selects Machine 101, enters $1,000, and selects "Jackpot".
    *   *Result:* Balance decreases. VM notified of the transaction.
3.  **Operational Expense (Manager):**
    *   *Scenario:* Need to pay window cleaner $50 cash.
    *   *Action:* VM goes to **Vault Dashboard -> Expenses**.
    *   *Input:* Amount: $50, Category: "Maintenance", Note: "Window Cleaner". Requires Denominations.
    *   *Result:* Vault Balance decreases to $4,700. Transaction type `expense` recorded.
4.  **Float Refill (Soft Count):**
    *   *Scenario:* Vault is running low on $20 bills.
    *   *Action:* VM clears a Slot Machine (Bill Validator).
    *   *Input:* Enters **Soft Count** of $500 (25 x $20).
    *   *Result:* Vault Balance increases to $5,200.

### Phase 4: Cashier Shift Close (Blind)
**Goal:** Cashier A finishes shift (4:00 PM).

1.  **End Shift:**
    *   *Action:* Cashier clicks **End Shift**.
    *   *Restriction:* Cannot see "Expected Balance" (Blind Close).
2.  **Count:** Cashier counts drawer. Enters **$300**.
    *   *Reality:* System expected $300 (Float $200 + Profit $100).
3.  **Submit:** Shift status -> **Pending Review** (or Closed if exact).

### Phase 5: End of Day & Reconciliation
**Goal:** Manager closes the shop (10:00 PM).

1.  **Review Pending Shifts:**
    *   VM sees Cashier A is "Pending Review" (or just listed).
    *   VM physically verifies the $300 returned by Cashier A.
    *   *Action:* **Resolve/Confirm Shift**.
    *   *Money Move:* $300 returns to Vault. Vault Balance: $5,500.
2.  **Machine Collections:**
    *   VM collects remaining drop boxes. Enters **$10,000**.
    *   Vault Balance: $15,500.
3.  **Close Vault Shift:**
    *   *Action:* Click **Close Day**.
    *   *System Check:* Are all Cashiers Closed? (Yes).
    *   *Input:* VM counts physical safe. Enters **$15,500**.
    *   *Result:* Shift Closed. Report Generated.
    *   **This $15,500 becomes tomorrow's "Suggested Opening Balance".**

---

## 7. Documentation Structure
Reference for developers finding specific logic.

### 7.1 Frontend (`Documentation/frontend`)
*   **`/vault/management`**:
    *   `VaultDashboard.md`: Overview of the Metrics and Status cards.
    *   `ExpensesModal.md`: Documentation for the Expense entry UI.
*   **`/vault/cashier`**:
    *   `CashierDashboard.md`: The Cashier-facing interface for shift requests.
    *   `BlindClose.md`: The UI logic for hiding expected balances.
*   **`/vault/VM_and_Cashier`**:
    *   `TransactionHistory.md`: Shared component for viewing logs.

### 7.2 Backend (`Documentation/backend`)
*   **`/vault/management`**:
    *   `initialize.md`: `POST /api/vault/initialize` (Opening logic).
    *   `expenses.md`: `POST /api/vault/expense` (Expense logic).
*   **`/vault/cashier`**:
    *   `shift-open.md`: Logic for requesting floats.
    *   `shift-resolve.md`: Logic for VM resolving discrepancies.
*   **`/vault/VM_and_Cashier`**:
    *   `transactions.md`: `VaultTransactionModel` and logging.

