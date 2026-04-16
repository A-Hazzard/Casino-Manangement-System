# Financial System Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Money & Cash Management (`app/vault`)

The "Safe" where all physical cash is tracked.
- **Records**: Every dollar coming in or going out is written down and cannot be changed.
- **Audits**: Cashiers must count their money blindly (without seeing the computer total) to ensure honesty.
- **Security**: Large payments and safe access require a special code (TOTP) from a phone.

---

## 2. Include Jackpot Setting

This is a "Yes/No" switch that changes how profit is calculated for a location. 

### 2.1. How to Setup
1. Log in as an **Administrator**.
2. Go to the **Licensees** page.
3. Edit a specific Licensee.
4. Toggle the **"Include Jackpot"** switch and save.

### 2.2. The Calculation
This setting changes the **Net Gross** (Profit) for every machine:
- **If OFF**: `Net Gross = Bill In - Money Won`
- **If ON**: `Net Gross = Bill In - Money Won - Jackpots`

### 2.3. Example (Before vs. After)
Imagine a machine has the following totals:
- **Bill In**: $1,000
- **Money Won**: $400
- **Jackpots**: $100

| Setting | Formula | Resulting Net Gross |
| :--- | :--- | :--- |
| **Include Jackpot OFF** | `$1,000 - $400` | **$600** |
| **Include Jackpot ON** | `$1,000 - $400 - $100` | **$500** |

**Note**: This change happens instantly across all report pages, the live dashboard, and analytics charts for that licensee.

---

## 3. How We Count Money

The system uses specific rules to make sure no money is missed:
- **Daily Rules**: We count the day from 8 AM to 8 AM (Trinidad time). 
- **Delta Tracking**: We look at the "difference" between readings rather than just the total, so we know exactly what happened during a shift.
- **Broken Meters**: If a machine is reset (RAM Clear), the system "stitches" the old and new numbers together so you don't lose the data.

---

## 4. Reports & Charts (`app/reports`)

Tools to see how the business is doing.
- **Dashboards**: Fast charts showing if profit is going up or down.
- **Audit Tool**: Compares what the machine says electronically vs. what the collector actually counted.
- **File Export**: One-click buttons to get PDF or Excel files for your records.

---

## 5. Main Dashboard (`app/page.tsx`)

The "Pulse" of the company at a glance.
- **Tickers**: Live total of all money currently in the machines.
- **Map**: A real map showing which locations are performing the best.
- **Rankings**: A scoreboard for the best-performing games.

---

## 6. Collection Reports

The final step when a collector picks up cash from a location.

### 6.1. Calculated Profit (Gross)
The report shows two numbers to check for errors:
1.  **Hand Counted (Meter Gross)**: Calculated as `(Current Meter - Previous Meter)`. It is based on what the collector typed in.
2.  **Electronic (SAS Gross)**: Calculated by the machine's computer during the same time period.

### 6.2. Final Settlement
This section determines exactly how much cash is owed:
- **Partner Profit**: A percentage of the Gross (e.g., 50% of profit).
- **Taxes**: A percentage of the Gross taken by the government.
- **Advance**: Money repaid to the office for previous expenses.
- **Amount To Collect**: The sum of `Partner Profit + Taxes + Advance`.
- **Variance**: `Amount To Collect - Actual Cash in Bag`. (Helps find if cash was stolen or miscounted).

### 6.3. Reviewer Multiplier

Users with the `reviewer` role see a scaled-down view of all financial data on the Collection Report details page. This is used when a reviewer is entitled to only a portion of the revenue (e.g. a 50% revenue share).

**How it works:**

The reviewer's `multiplier` field (stored on the `User` document as a decimal) controls what fraction of the data is **hidden**. The visible share is the remainder:

```
scale = 1 - multiplier
```

| Stored `multiplier` | Reviewer sees |
| :--- | :--- |
| `0` (or not set) | 100% of all values (no change) |
| `0.5` | 50% of all values |
| `0.3` | 70% of all values |

**Fields affected (per-machine and location totals):**

- Drop / Cancelled
- Meters Gross, Net Gross, Jackpot
- SAS Gross, SAS Dropped, SAS Cancelled
- Variation
- Partner Profit, Taxes, Advance
- Amount To Collect, Collected Amount
- Previous Balance, Balance Correction, Current Balance, Variance

**Fields NOT affected** (always shown at full value):
- Machine count, Collection date, Location name, Notes, Reason for shortage, Correction reason, Variance reason.

**Where the logic lives:** `app/api/lib/helpers/accountingDetails.ts` — `getCollectionReportById()`. The `scale` factor is computed once from the authenticated user's token and multiplied uniformly across all output sections before the response is returned.

> **Note:** The multiplier only affects the *display* of data for the reviewer. Raw values stored in the database are never modified.

---

## 7. Meters Report

A detailed list of every lifetime reading the machine ever sent.

### 7.1. Simplified Field Calculations
Here is how we translate machine data into readable report fields:

| Report Field | Simple Meaning | Calculation Logic |
| :--- | :--- | :--- |
| **Meters In** | Total Bets | Every bet/spin is added to this lifetime total. |
| **Meters Out** | Player Wins | Lifetime value of all wins recorded by the machine's computer. |
| **Bill In** | Cash Inserted | Total value of bills put into the machine's cash box. |
| **Voucher Out** | Tickets Printed | Total value of all credits removed from the machine (e.g., printed tickets). |
| **Net Gross** | Machine Profit | `Bill In - Meters Out` (Optionally subtracts Jackpot). |

---

## 8. Financial Formulas Summary

| Metric | Calculation |
| :--- | :--- |
| **Gross Revenue** | `Bill In - Money Out` |
| **Hold %** | `(Gross Revenue / Meters In) * 100` |
| **Yield** | `Total Revenue / Days Active` |

---
**Maintained By**: Evolution One Development Team
