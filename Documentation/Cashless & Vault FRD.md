# **Functional Requirements Document**

## **1\. Document Overview**

This document outlines the functional requirements for the Vault and Cashier management modules within the Membership System. The system is designed to handle "greenfield" (new) location deployments where no legacy data or accounts exist.

## **2\. System Actors & Roles**

### **2.1 Vault Manager (VM)**

* **Permissions:** High-level administrative access to the vault, machine collections, and cashier management.  
* **Constraint:** Only one (1) Vault Manager can be active at a location at any given time.

### **2.2 Cashier (C)**

* **Permissions:** Front-facing operations including payouts and float management.  
* **Constraint:** Multiple Cashiers can be active simultaneously, each managing an independent float.

## **3\. Functional Requirements: Vault Manager (VM)**

### **VM-1: Location Initialization (Vault Reconciliation)**

* **Requirement:** The system must allow the VM to initialize a new location by recording the starting cash balance and specific denominations.  
* **Purpose:** Establishes the "Source of Truth" for a new vault where no prior records exist.  
* **Recalibration:** Must allow periodic "Reconcile Vault" operations (e.g., monthly) to adjust system totals to match physical counts, including a mandatory comment field for audit purposes.

### **VM-2: Cashier Fleet Management**

* **Requirement:** The VM must be able to create Cashier accounts and assign temporary default passwords.  
* **Security:** The system must force a password reset upon the Cashier's first login to ensure the VM cannot impersonate the Cashier.  
* **Auditing:** VM must have read-access to all Cashier shift histories and activity logs (payouts, float changes).

### **VM-3: Dashboard & Notifications**

* **Requirement:** A real-time notification hub for the VM.  
* **Alert Types:**  
  * Pending Float Requests (Increase/Decrease).  
  * Shift Discrepancy Alerts (Unbalanced shifts).  
  * Notifications for "Pending Review" status on Cashier shifts.

### **VM-4: Machine Collections & Soft Counts**

* **Machine Collection:** VM must record the removal of cash from specific machines and tally it into the Vault balance at the end of the day.  
* **Soft Count:** System must support mid-shift "Soft Counts" where cash is removed from high-volume machines to replenish the Vault's liquid float without ending the day.

## **4\. Functional Requirements: Cashier (C)**

### **C-1: Authentication & Security**

* **First Login:** Mandatory password change workflow.  
* **Session Management:** Cashiers operate on independent shifts with unique opening/closing balances.

### **C-2: Payout Operations**

* **Requirement:** Support two payout methods:  
  1. **Ticket Redemption:** Validating and paying out printed tickets.  
  2. **Hand Pay:** Processing payouts for machine lock-ups/jackpots visible on the system.

### **C-3: Float Management**

* **Requirement:** Cashiers must be able to request float increases or decreases.  
* **Workflow:** Requests must be approved, denied, or edited by the active Vault Manager.

### **C-4: Security Feature: Blind Closing**

* **Requirement:** During the shift-end process, the Cashier must enter their physical cash count (by denomination) without the system revealing the "Expected Total."  
* **Validation:** If the Cashier’s input matches the system calculation, the shift closes.  
* **Discrepancy Logic:** If the count differs, the system must:  
  1. Lock the shift into a "Pending Review" status.  
  2. Alert the Vault Manager.  
  3. Prevent the Cashier from seeing the difference to avoid "pocketing" or "padding" the numbers.

## **5\. Business Rules & Constraints**

| ID | Rule Description |
| :---- | :---- |
| **BR-01** | **Shift Dependency:** A Vault Manager cannot close their shift if any Cashier shifts are currently "Active" or "Pending Review." |
| **BR-02** | **Denomination Tracking:** The system must track the quantity of every specific bill denomination for every transaction (Vault initialization, float requests, and closing counts). |
| **BR-03** | **Shift History:** All shifts must generate an immutable activity log (audit trail) detailing every transaction performed during that window. |
| **BR-04** | **Float Independence:** Cashiers working the same shift cannot share floats; each drawer is an isolated accounting unit. |

## 

## **6\. Technical Considerations (Architectural)**

* **Transactional Ledger:** Every movement of cash (Vault \-\> Cashier, Machine \-\> Vault) must be recorded as a transaction to maintain a running balance.  
* **Error Handling:** In the event of a "Pending Review" shift, the Vault Manager must have the authority to edit closing figures and provide an audit comment to force-close the shift.

# **User Flow**

# **1\. Introduction**

This document maps the primary user journeys for the Vault and Cashier modules. It focuses on the interaction between the physical handling of cash and the digital ledger, ensuring a clear audit trail and strict security "guardrails."

## **2\. Flow 1: New Location & Vault Initialization**

**Actor:** Vault Manager (VM)

**Goal:** Set the system "Source of Truth" for a brand-new site.

1. **Login:** VM logs into the system for the first time.  
2. **Navigate to Vault:** VM selects "New Shift".  
3. **Input Starting Figures:** VM enters the total physical cash on hand, broken down by specific denominations (e.g., 100x $20, 500x $10).  
4. **Official Start:** The system saves the count and sets the official starting balance for the location.  
5. **Start Shift:** VM initiates their active shift. The dashboard now unlocks for daily operations.

## **3\. Flow 2: Cashier Onboarding & First Login**

**Actors:** Vault Manager (VM) & Cashier (C)

**Goal:** Securely add a new staff member to the "fleet."

1. **Create Account (VM):** VM goes to "Manage Cashiers" and creates an account for the new Cashier.  
2. **Assign Temp Password (VM):** VM provides a temporary credential.  
3. **First Login (C):** Cashier logs in with temp credentials.  
4. **Mandatory Security Reset (C):** System immediately intercepts the session and forces a password change.  
   * *Why?* To prevent the VM from ever knowing the Cashier's private credentials (non-repudiation).  
5. **Enter Dashboard (C):** Once reset, the Cashier can view their shift options.

## **4\. Flow 3: The Daily "Happy Path" (Payouts & Floats)**

**Actor:** Cashier (C)

**Goal:** Facilitate customer payouts and maintain liquid drawer levels.

1. **Open Shift:** Cashier requests their starting float denominations.  
2. **Customer Payout:** \* The cashier scans a **Ticket** OR selects a **Hand Pay** from the UI.  
   * The system validates the amount.  
   * The cashier confirms payout; system decrements the Cashier's digital float balance.  
3. **Float Request:** \* The cashier realizes they are low on $10 bills.  
   * Cashier submits a "Float Increase" request for specific denominations.  
   * **VM Intervention:** VM receives a dashboard notification, then both VM and C approves the request, and physically hands over the cash.  
   * **Ledger Update:** System moves the balance from "Vault" to "Cashier Float."

## **5\. Flow 4: The End-of-Shift "Blind Close" & Resolution**

**Actors:** Cashier (C) & Vault Manager (VM)

**Goal:** Close the ledger while preventing internal fraud.

1. **Initiate Close (C):** Cashier counts their physical drawer.  
2. **Data Entry (C):** Cashier enters their physical counts into the system.  
   * *Constraint:* The system does **not** show the Cashier what the balance *should* be.  
3. **Validation Check:**  
   * **If Match:** Shift closes successfully.  
   * **If Discrepancy:**  
     * The system flags shift as "Pending Review."  
     * The cashier is notified of a discrepancy but **not** the amount.  
     * VM receives an "Unbalanced Shift" alert.  
4. **Discrepancy Resolution (VM):**  
   * VM reviews the Cashier's activity log.  
   * VM performs a manual recount.  
   * VM adjusts the final figure, adds a mandatory audit comment, and force-closes the shift.

## **6\. Flow 5: Soft Counts & End of Day**

**Actor:** Vault Manager (VM)

**Goal:** Consolidate machine cash into the Vault.

1. **Soft Count (Mid-Day):** VM identifies a machine full of cash. VM clears the machine, enters the amount in the system, and "deposits" it into the Vault to replenish float supply.  
2. **Machine Collection (EOD):** VM performs final collections from all machines.  
3. **End of Day Report:** VM verifies all Cashier shifts are closed (BR-01).  
4. **Close Vault Shift:** VM records the final Vault state and closes their session.  
   

