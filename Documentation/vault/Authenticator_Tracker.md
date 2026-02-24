# Vault Authenticator Integration Checklist

## Overview
This file tracks the implementation of Google Authenticator (TOTP) across the Vault system. Authentication is required before performing critical POST requests.

## Implementation Status

### Vault Management (Managers)
- [x] **Vault Reconciliation** [x] *Test Case Completed*
- [x] Vault Initialization
- [x] Add Cash
- [x] Remove Cash
- [x] Record Expense
- [x] Collection Wizard (Finalize)
- [x] Soft Count (Finalize)
- [x] Close Vault Shift
- [x] **View Cashier Password**
- [ ] Void Transaction

### Cashier Actions
- [x] Open Shift (Float Request)
- [x] Ticket Redemption
- [x] Hand Pay
- [x] Float Increase Request
- [x] Float Decrease Request
- [x] Shift Close (Blind Close)

## Technical Requirements
- [x] TOTP Setup for Users (Secret Generation & QR Code)
- [x] Backend Verification Endpoint/Helper
- [x] Frontend Authenticator Modal Component
- [ ] Environment Variables Validation (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`)

## Outstanding
- [ ] Void Transaction modal (manager) - needs to be identified/created
- [ ] Env variable validation
