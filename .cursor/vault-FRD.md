# Functional Requirements Document: Vault & Cash Desk Management (VAULT)

## 1. Project Overview

The **VAULT** application is a dedicated interface for secure cash desk operations, float management, and vault balancing. It is a secondary application mode within the Dynamic1 ecosystem, toggled via environment variables.

**Core Business Logic:**
- The system tracks the flow of cash between:
    - **External Sources (Bank/Owner) → Vault**
    - **Vault ↔ Cash Desks (Floats)**
    - **Machines/Tables → Vault (Collections/Drops)**
    - **Vault → Expenses (Operations)**

---

## 2. Technical Architecture & Refactoring Plan

### 2.1 Environment-Based Routing

- **Condition:** `process.env.APPLICATION === 'VAULT'`
- **Behavior:** On login, if the user role is authorized, redirect specifically to `/vault-management`.
- **Global Layout:** The `RootLayout` will detect the environment and wrap the application in the `VaultLayoutWrapper`.

### 2.2 Folder Structure (Refactor)

To ensure clean separation and scalability, the `components/` directory will be restructured:

```
components/
├── CMS/              # Specific to Casino Management System
├── VAULT/            # Specific to Cash Desk/Vault Application
└── shared/           # Shared logic & UI
    ├── layout/       # Sidebar (Flexible), Header, ProfileModal
    ├── auth/         # Login components, Role-based guards
    └── ui/           # Buttons, Inputs, Tables, Modals
```

### 2.3 Shared Sidebar Strategy

The Sidebar must be refactored to be **Config-Driven**:
- **CMS Mode:** Displays links for Meters, Collections, Machines, etc.
- **VAULT Mode:** Displays links for Vault Overview, Transactions, Float Management, and Transfers.
- **Shared Profile:** User name, role, and logout remain constant.

---

## 3. Access Control & Role Gates

### 3.1 Role Authorization

Only the following roles are authorized to access the VAULT application:
- Developer
- Admin
- Location Admin
- Manager

### 3.2 Unauthorized Access

If an unauthorized user (e.g., Cashier without specific permissions or a standard User) attempts to log in to the Vault environment:
- **Display:** the Unauthorized Component
- **Message:**  
  ```
  Access Denied. Your role [RoleName] does not have permission to access Vault Management. Please contact your manager.
  ```
- **Persistence:** The sidebar remains visible to allow the user to **Logout**.

---

## 4. Functional Requirements (VAULT)

### FR-1.0: Role Selection (Developer/Admin Only)

- **Requirement:** If the user is a Developer, Manager, Admin, or Location Admin, the system must show a **"Role/Application Selection"** screen upon entry.
- **Bypass:** If `process.env.APPLICATION` is set and the user is **not** one of these high-level roles, bypass this screen and load the specific application directly.

**UI Design: Role Selection Screen**
```
+---------------------------------------------------------------+
|  [Logo: Dynamic1 CMS]                                         |
|                                                               |
|          Welcome back, Aaron (Developer)                      |
|          Please select your workspace:                        |
|                                                               |
|  +-----------------------+     +---------------------------+  |
|  |                       |     |                           |  |
|  |   [Icon: CasinoChip]  |     |     [Icon: Safe/Vault]    |  |
|  |                       |     |                           |  |
|  |   Casino Management   |     |      Vault Management     |  |
|  |        System         |     |                           |  |
|  |                       |     |                           |  |
|  |   [ Access Dashboard ]|     |     [ Access Vault ]      |  |
|  |                       |     |                           |  |
|  +-----------------------+     +---------------------------+  |
|                                                               |
+---------------------------------------------------------------+
```

---

### FR-2.0: Vault Overview (Main Dashboard)

**Requirement:** The central hub for the Vault Manager. It must show the current "Health" of the vault immediately.

**UI Design: Vault Dashboard**
```
+-----------------------------------------------------------------------+
| Header: [Breadcrumb: Home > Vault] | Date: Jan 15, 2025 | Loc: Vegas  |
+-----------------------------------------------------------------------+
|                                                                       |
| [ INFO CARD: VAULT STATUS ]                                           |
| +-----------------------------------------+                           |
| |  Current Vault Balance:  $ 100,000.00   |                           |
| |  Last Audit: Today, 8:00 AM             |                           |
| |  Manager on Duty: Kento Masaki          |                           |
| +-----------------------------------------+                           |
|                                                                       |
| [ SECTION: CASH DESKS STATUS ]                                        |
| +----------------------+  +----------------------+                    |
| | Desk 1: Main Floor   |  | Desk 2: VIP Area     |                    |
| | Cashier: Penny H.    |  | Cashier: Jake J.     |                    |
| | Float: $5,000        |  | Float: $8,000        |                    |
| | Status: [OPEN] (Grn) |  | Status: [CLOSED](Red)|                    |
| +----------------------+  +----------------------+                    |
|                                                                       |
| [ SECTION: ACTIONS ]                                                  |
| +-------------+   +--------------+   +----------------+               |
| | [Add Cash]  |   | [Remove Cash]|   | [Record Expense]|              |
| +-------------+   +--------------+   +----------------+               |
|                                                                       |
| [ SECTION: RECENT TRANSACTIONS TABLE ]                                |
| | Date/Time | Type         | User      | Amount    | Status    |      |
| |-----------|--------------|-----------|-----------|-----------|      |
| | 10:05 AM  | Drop         | Kento M.  | +$10,000  | Completed |      |
| | 09:30 AM  | Float Increase| Penny H. | -$500     | Pending   |      |
| | 08:15 AM  | Expense      | Kento M.  | -$120     | Completed |      |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

### FR-3.0: Cash Movements (Modals)

**Requirement:** Simple, secure forms for moving money.

**UI Design: Add Cash Modal**
```
+-------------------------------------------------------+
|  Add Cash to Vault                                [X] |
+-------------------------------------------------------+
|  Source of Funds:                                     |
|  [ Dropdown: Bank Withdrawal / Owner Injection / Drop ]|
|                                                       |
|  Amount:                                              |
|  [ $ 0.00                    ]                        |
|                                                       |
|  Note / Reference:                                    |
|  [ Enter slip number or reason... ]                   |
|                                                       |
|  [ Cancel ]                        [ CONFIRM ADD ]    |
+-------------------------------------------------------+
```

**UI Design: Remove Cash Modal**
```
+-------------------------------------------------------+
|  Remove Cash from Vault                           [X] |
+-------------------------------------------------------+
|  Destination:                                         |
|  [ Dropdown: Bank Deposit / Owner Draw / Float Incr. ]|
|                                                       |
|  Amount:                                              |
|  [ $ 0.00                    ]                        |
|                                                       |
|  Note / Reference:                                    |
|  [ Enter reason for removal...    ]                   |
|                                                       |
|  [ Cancel ]                     [ CONFIRM REMOVE ]    |
+-------------------------------------------------------+
```

---

### FR-4.0: Expense Recording

**Requirement:** A specific form of "Remove Cash" tagged as an operational expense.

**UI Design: Record Expense Modal**
```
+-------------------------------------------------------+
|  Record Operational Expense                       [X] |
+-------------------------------------------------------+
|  Category:                                            |
|  [ Dropdown: Stationery / Cleaning / Maintenance / F&B]|
|                                                       |
|  Amount:                                              |
|  [ $ 0.00                    ]                        |
|                                                       |
|  Description:                                         |
|  [ Bought printer paper...        ]                   |
|                                                       |
|  Date:                                                |
|  [ Today (Default)            ]                       |
|                                                       |
|  [ Cancel ]                     [ RECORD EXPENSE ]    |
+-------------------------------------------------------+
```

---

## 5. UI & Design Specifications

### 5.1 The "Vault Dashboard" Layout (Technical)

- Header: Dynamic Date/Time, Location Name.
- Grid Layout: Responsive Grid (CSS Grid/Flexbox).
- Top Row: Metric cards.
- Middle: Action Buttons (Large, touch-friendly).
- Bottom: "Table of Transactions" with filters.

### 5.2 Component Flexibility (Shared Folder)

- **ProfileValidationComp**: Must accept a `context` prop (`'CMS' | 'VAULT'`) to determine which validation rules or fields to display.
- **Sidebar**: Must use a `navConfig` object injected at the layout level.

---

## 6. Prototyping & Data Handling

- **Constraint:** NO live API connections for the initial Vault build.
- **Implementation:** Use static arrays (mock data) inside the components to simulate:
    - `mockTransactions[]`
    - `mockCashDesks[]`
    - `mockVaultBalance = 50000`
- **Future-Proofing:** All components must use prop-driven data so they can be easily switched to `useQuery` later.

---

## 7. Developer Notes

> **Note:** This FRD assumes that the base authentication and database connection logic is already handled by the existing CMS core. This feature focuses purely on the UI separation and the unique logic of the Vault workflow.
