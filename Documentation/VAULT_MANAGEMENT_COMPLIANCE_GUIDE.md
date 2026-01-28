# Vault Management Compliance & Implementation Guide

**Author:** Antigravity (AI Assistant)  
**Date:** January 2026  
**Reference Document:** [Cashless & Vault FRD.md](./Cashless%20&%20Vault%20FRD.md)

## 1. Overview
This document provides a comprehensive mapping of the **Vault Management** module (`/vault/management`) against the functional requirements defined in the **Cashless & Vault FRD**. It explains the purpose of each feature and how it is intended to function in a real-world casino environment.

---

## 2. Vault Overview Dashboard (`/vault/management`)
The central hub for the **Vault Manager (VM)** to maintain the site's financial integrity.

### 2.1 Vault Status & Reconciliation
| Feature / Button | FRD Requirement | Real-World Scenario |
| :--- | :--- | :--- |
| **Vault Status Card** | **VM-1: Location Initialization** | **Purpose:** Establishes the "Source of Truth."<br>**Scenario:** A VM starts their shift at 8:00 AM. They verify the digital balance matches the physical vault before allowing cashiers to start shifts. |
| **Reconcile Button** | **VM-1: Recalibration** | **Purpose:** Adjusts digital totals to match physical counts with an audit trail.<br>**Scenario:** During a monthly audit, a $50 discrepancy is found. The VM uses this to force-correct the ledger and adds a mandatory comment: *"Monthly audit adjustment - cash box variance."* |

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
| **Temp Password Modal** | **Flow 2: Security (Non-repudiation)** | **Purpose:** Ensures the VM cannot know the Cashier's private credentials.<br>**Scenario:** Upon first login, the Cashier is forced to change their password. This prevents a VM from logging in as a cashier and stealing funds. |
| **Reset Password** | **VM-2: Staff Oversight** | **Purpose:** Restores access while maintaining password reset logic.<br>**Scenario:** A cashier returns from leave and forgets their password. The VM resets it, triggering the mandatory change flow again. |

---

## 4. Cash Movement (Collections & Counting)
Handles the flow of cash from the gaming floor back to the vault.

| Feature / Button | FRD Requirement | Real-World Scenario |
| :--- | :--- | :--- |
| **Machine Collections** | **VM-4: Machine Collections** | **Purpose:** Recording EOD cash removal from machine stackers.<br>**Scenario:** At the end of the gaming day, the VM removes cash boxes from machines and enters the totals here to increase the Vault's "Physical On-Hand" balance. |
| **Soft Count** | **VM-4: Soft Counts** | **Purpose:** Replenishing vault liquidity mid-shift without stopping machines.<br>**Scenario:** A popular slot machine's box is full by 4:00 PM. The VM clears it, records the soft count, and uses that cash to approve float requests from cashiers. |

---

## 5. Transactional Integrity & Auditing
Ensures every cent is traceable as per **BR-03**.

### 5.1 Recent Activity & Transactions
*   **The Ledger:** Every action (Add Cash, Remove Cash, Float Approval) creates a Permanent Transaction record.
*   **Denomination Tracking (BR-02):** The system tracks the quantity of every specific bill for every transaction. 
    *   *Real-World:* If a VM needs to dispense $500 in $5 bills, they can check the ledger to see if the vault has sufficient 5s before promising the cash to a cashier.

### 5.2 Business Rules Compliance
| ID | Requirement | Implementation in System |
| :--- | :--- | :--- |
| **BR-01** | **Shift Dependency** | The system prevents a VM from closing their shift or generating EOD reports if any Cashier shifts are still "Active" or "Pending Review." |
| **BR-02** | **Denom Tracking** | All data entry modals (Reconcile, Add Cash, Machine Collection) require a denomination breakdown, not just a total value. |
| **BR-04** | **Float Independence** | Cashier shifts are tracked by unique ID and User ID. Cash from Station A cannot be "merged" with Station B without a traceable transfer transaction. |

---

## 6. Real-World Decision Flow (Scenario)
1.  **Morning:** VM reconciles the Vault (**VM-1**).
2.  **Mid-Day:** Cashier 1 requests a $2,000 Float Increase via their dashboard (**C-3**).
3.  **Alert:** VM sees the notification (**VM-3**), confirms they have the denominations (**BR-02**), and approves the transfer.
4.  **EOD:** Cashier 1 performs a **Blind Close** (**C-4**). They count $50 above the expected.
5.  **Resolution:** Shift goes to "Pending Review." The VM uses the **Shift Review Panel** to find a missing payout entry in the logs and corrects the total with a comment.
