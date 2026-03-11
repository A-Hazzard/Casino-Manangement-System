# Vault Management Data Journey Map

This document outlines a complete data flow for a Vault Manager (VM) shift, tracking expected inputs, calculations, overview impacts, and final End-of-Day (EOD) report values.

## Initial State & Assumptions
*   **Location:** Main Casino Floor
*   **Gaming Day:** Offset starts at 8:00 AM.
*   **Starting Vault Balance (System):** $50,000
    *   Denominations: 200x $100, 400x $50, 400x $20, 200x $10
*   **No Active Cashier Floats or Machine Drops Yet.**
*   **Previous Shift:** Closed correctly.

---

## Step 1: Open Vault Shift
The Vault Manager starts the shift and verifies the opening balance.

*   **Action:** VM confirms physical count of $50,000 matches system balance.
*   **Input:** $50,000 opening balance, correct denomination counts.
*   **Expected Dashboard Overview Impact:**
    *   Vault Balance: $50,000 
    *   Total Cash on Premises: $50,000
    *   Total Cash In (Today): $0
    *   Total Cash Out (Today): $0
    *   Net Flow: $0
    *   Shift Status: Active

---

## Step 2: Open Cashier Shift (Float Request)
A cashier requests a float to begin taking transactions.

*   **Action:** Cashier requests $5,000 float. VM approves and dispenses.
*   **Input:** Request for $5,000 (10x$100, 40x$50, 100x$20). Transaction type: `cashier_shift_open` (which is a Vault -> Cashier movement).
*   **Expected Dashboard Overview Impact:**
    *   Vault Balance: $45,000 (System deducts $5k)
    *   Cashier Floats: $5,000 (1 Active Cashier)
    *   Total Cash on Premises: $50,000 (Remains unchanged: $45k + $5k)
    *   Total Cash Out: $5,000
    *   Net Flow: -$5,000

---

## Step 3: Add Cash (Bank Deposit)
The location receives a scheduled cash delivery from the bank to top up the vault.

*   **Action:** VM records cash coming in from the bank.
*   **Input:** $20,000 (200x$100). Transaction type: `vault_deposit` or `fill` (External -> Vault).
*   **Expected Dashboard Overview Impact:**
    *   Vault Balance: $65,000 ($45k + $20k)
    *   Total Cash In: $20,000
    *   Total Cash Out: $5,000 (From earlier float)
    *   Net Flow: +$15,000 ($20k - $5k)
    *   Total Cash on Premises: $70,000 ($65k Vault + $5k Cashier)

---

## Step 4: Create Expense
The VM pays an emergency plumber in cash directly from the vault.

*   **Action:** VM logs a cash expense.
*   **Input:** $500 (5x$100). Transaction type: `expense`.
*   **Expected Dashboard Overview Impact:**
    *   Vault Balance: $64,500 ($65k - $500)
    *   Expenses (Today): $500
    *   Total Cash Out: $5,500 ($5k float + $500 expense)
    *   Net Flow: +$14,500 ($20k IN - $5.5k OUT)
    *   Total Cash on Premises: $69,500 ($64.5k Vault + $5k Cashier)

---

## Step 5: Cashier Payout (Handpay)
The active cashier needs extra cash to perform a large handpay redemtpion that exceeds their current float.

*   **Action:** Cashier performs a $2,000 handpay. They request $1,000 fill from the vault, OR the cashier pays out of their float and we track the vault's total interaction.
*   *Note: For this test, let's say the cashier just logs the payout. The EOD report tracks total payouts.*
*   **Input (if payout is logged centrally or drawn from vault):** Let's simulate the VM dispensing the payout directly if cashiers don't hold enough: $2,000 payout. Transaction type: `payout`.
*   **Expected Dashboard Overview Impact:**
    *   Vault Balance: $62,500 ($64.5k - $2k)
    *   Total Payouts: $2,000
    *   Total Cash Out: $7,500 ($5k float + $500 exp + $2k payout)
    *   Net Flow: +$12,500 ($20k IN - $7.5k OUT)
    *   Total Cash on Premises: $67,500 ($62.5k Vault + $5k Cashier)

---

## Step 6: Soft Count (Machine Drops)
The collection team performs mid-day drops on several machines and deposits the counted cash into the vault.

*   **Action:** VM accepts the soft count drop.
*   **Input:** Machine A drops $1,500. Machine B drops $2,500. Total = $4,000. Transaction type: `soft_count` (Machine -> Vault).
*   **Expected Dashboard Overview Impact:**
    *   Vault Balance: $66,500 ($62.5k + $4k)
    *   Machine Drops (Today): $4,000 
    *   Total Cash In: $24,000 ($20k bank + $4k drop)
    *   Net Flow: +$16,500 ($24k IN - $7.5k OUT)
    *   Total Cash on Premises: $71,500 ($66.5k Vault + $5k Cashier)

---

## Step 7: Close Cashier Shift (Return Float)
The cashier finishes their shift and returns their float plus any cash they took in (let's assume they broke exactly even for simplicity).

*   **Action:** Cashier returns exactly $5,000. VM verifies and closes the cashier shift.
*   **Input:** $5,000 returned to Vault. Transaction type: `cashier_shift_close` (Cashier -> Vault).
*   **Expected Dashboard Overview Impact:**
    *   Vault Balance: $71,500 ($66.5k + $5k)
    *   Cashier Floats: $0
    *   Total Cash In: $29,000 ($24k + $5k)
    *   Net Flow: +$21,500 ($29k IN - $7.5k OUT)
    *   Total Cash on Premises: $71,500 (All contained in the Vault now)

---

## Step 8: Vault Reconciliation (Discrepancy)
The VM counts the physical vault before closing but drops a $100 bill under the desk (or makes a miscount). The physical count is less than the system balance.

*   **Action:** VM performs a reconciliation count.
*   **Input:** Physical Count entered as $71,400. Reason: "Miscount/Missing $100".
*   **Expected Dashboard Overview Impact:**
    *   System Balance (Internal): updates to $71,400 to match reality going forward.
    *   Variance Recorded: -$100 (Difference between previous $71.5k and new $71.4k).
    *   Physical Count: $71,400.

---

## Step 9: Close Vault Shift & Generate EOD Report
The VM closes the shift and reviews the End-of-Day Report.

### Expected EOD Report Values

#### Summary Statistics
*   **Total Managed (Total On Premises):** $71,400
*   **Net Flow:** $21,500 
    * *Note: Net flow might not include the reconciliation variance depending on how the frontend calculates `metrics.totalInflows - metrics.totalOutflows`. The $100 loss isn't strictly an "outflow" transaction, it's a variance.*
*   **Expenses:** $500
*   **Payouts:** $2,000
*   **Variance:** -$100

#### Detailed Distribution
*   **Main Vault:** $71,400
*   **Machine Drops (Uncollected in machines):** $0 (Assuming all drops were collected and no new money went into machines in this test simulation).
*   **Cashier Floats:** $0

#### Mid-Day Soft Counts Table
*   **Machine A:** $1,500
*   **Machine B:** $2,500

#### Closing Float - Denomination Breakdown (Approximation)
*   **Total Value:** $71,400
*   *(The exact count of $100s, $50s, etc., should mathematically equal $71,400 based on the net exchanges).*

#### Shift Status Checks
*   **Shift Status:** Closed
*   **Previous Shift Active Warning:** False/None
