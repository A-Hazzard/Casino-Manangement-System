# Vault Management System - Phase 2 Implementation Plan

## Overview

Phase 2 focuses on completing the core Cashier-side operational workflows, specifically **Float Management (C-3)** and **Payout Operations (C-2)**, which rely on the foundation laid in Phase 1 (DB Models, core Vault APIs).

## Objectives

1.  Implement the full Cashier Shift Open/Close flow.
2.  Implement the Float Request (increase/decrease) workflow, including VM approval.
3.  Implement Ticket Redemption and Hand Pay Payout mechanisms.
4.  Complete the VM side of the Cashier Blind Close process (Discrepancy Resolution).

## API Endpoints to Implement

| Endpoint                             | Method | Description                                                            | FRD Ref  |
| :----------------------------------- | :----- | :--------------------------------------------------------------------- | :------- |
| \`/api/cashier/shift/open\`          | POST   | Opens cashier shift and creates a float request.                       | C-1, C-3 |
| \`/api/vault/float-request\`         | GET    | List pending float requests for VM.                                    | VM-3     |
| \`/api/vault/float-request/approve\` | POST   | VM approves/denies/edits a float request.                              | C-3      |
| \`/api/vault/payout\`                | POST   | Records a payout (Ticket or Hand Pay).                                 | C-2      |
| \`/api/cashier/shift/review\`        | POST   | VM force-closes a pending review shift (edit balance & audit comment). | FRD-6    |
| \`/api/cashier/shift/current\`       | GET    | Get active shift details for cashier dashboard.                        | -        |

## Frontend Components to Implement

1.  **Cashier Shift Open Modal**: For requesting opening float denominations.
2.  **Float Request Management UI**: For Cashier to request, and VM to approve/deny.
3.  **Payout Forms**: Separate forms for Ticket Redemption and Hand Pay.
4.  **Shift Review Panel**: For VM to review 'pending_review' shifts, add audit comments, and force close.

## Dependencies on Phase 1

- Phase 1 APIs (\`/vault/initialize\`, \`/vault/shift/close\`, \`/vault/reconcile\`) must be stable.
- The correct database and authentication utility pattern must be established and applied across all APIs.
