# Machine Collection Modal - Purpose & Explanation

## Overview
The **Machine Collection Modal** is a critical workflow tool used during the **End of Shift** process for Vault Managers. It allows vault staff to systematically collect cash from gaming machines and record the physical counts.

## When It's Used
- **Triggered**: When a Vault Manager attempts to close their shift
- **Requirement**: Before closing a vault shift, all machine drops must be collected and recorded
- **Purpose**: Ensures accurate cash accountability and reconciliation

## The Collection Process

### 1. **Session-Based Workflow**
- When opened, the modal creates or resumes a "Collection Session"
- This session persists even if the modal is closed accidentally
- All entries are saved incrementally (not lost if browser crashes)

### 2. **Three-Panel Interface**

#### Left Panel: Machine Selector
- Shows all machines at the location
- Indicates which machines have already been collected (checkmark)
- Search functionality to quickly find specific machines
- Color-coded status (collected vs. pending)

#### Middle Panel: Entry Form (The Form You're Asking About)
This is where the vault staff enters the collection data for a selected machine.

**Fields Explained:**

1. **Bill In Meter** (Optional)
   - The current reading from the machine's bill acceptor meter
   - Used for verification purposes
   - Helps detect if the physical count matches what the machine reports

2. **Expected Drop Amount** ⓘ
   - **Purpose**: The amount you *expect* to collect based on:
     - System calculations (current meter - previous meter)
     - Printed drop tickets from the machine
     - Previous collection records
   - **Why It Matters**: Allows you to detect discrepancies *before* finalizing
   - **Variance Calculation**: Physical Count - Expected Drop = Variance
     - **Positive Variance** = You collected MORE than expected (surplus)
     - **Negative Variance** = You collected LESS than expected (shortage)

3. **Physical Count** (Required)
   - The actual cash counted from the machine's drop box
   - Broken down by denomination ($100, $50, $20, $10, $5, $2, $1)
   - This is the TRUTH - what you actually have in hand

4. **Variance Display**
   - Automatically calculated
   - Shows if there's a discrepancy
   - Alerts you to investigate before finalizing

5. **Collection Notes**
   - Free-text field for documenting:
     - Reasons for variance
     - Machine condition issues
     - Unusual circumstances

#### Right Panel: Session List
- Shows all machines collected in this session
- Running total of all collections
- Ability to remove entries if a mistake was made

### 3. **Finalization**
- Once all machines are collected, click "Finish Collection"
- This:
  - Adds all collected cash to the vault balance
  - Creates a permanent record in `machinecollections` database
  - Closes the collection session
  - Allows the vault shift to be closed

## Why This Matters for End-of-Day Reports

### Current State
Machine collections are **NOT** currently displayed in the End-of-Day report.

### What Should Be Added
The End-of-Day report should include a section showing:
- Total amount collected from machines
- Number of machines collected
- List of individual machine collections with:
  - Machine name/number
  - Amount collected
  - Variance (if any)
  - Collection timestamp
  - Collector name

This data is stored in the `machinecollections` collection and should be queried for the gaming day range.

## Design Issues You Mentioned

### Current Problems:
1. **Form doesn't match cashier forms** - Uses different styling/layout
2. **Center section feels cluttered** - Too many visual elements competing
3. **No info icons** - Users don't understand what "Expected Drop" means

### Recommended Fixes:
1. Use consistent form styling with Label + Input pattern (like cashier forms)
2. Add tooltip icons (ⓘ) next to "Bill In Meter" and "Expected Drop Amount"
3. Simplify the denomination entry cards
4. Use clearer visual hierarchy
5. Match the color scheme and spacing of other vault forms
