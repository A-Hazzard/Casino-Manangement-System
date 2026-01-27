# Vault Management System Pages

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** January 2026
**Version:** 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [File Information](#file-information)
3. [Vault Management Pages](#vault-management-pages)
   - [Vault Overview](#vault-overview)
   - [Cash Desks](#cash-desks)
   - [Floats](#floats)
   - [Expenses](#expenses)
   - [Transactions](#transactions)
   - [Transfers](#transfers)
   - [Reports](#reports)
4. [Cashier Pages](#cashier-pages)
   - [Payouts](#payouts)
   - [Shifts](#shifts)
   - [Float Requests](#float-requests)
5. [API Endpoints](#api-endpoints)
6. [State Management](#state-management)
7. [Authorization](#authorization)
8. [Key Functions](#key-functions)

## Overview

The Vault Management System is a comprehensive cash management module for casino operations. It provides separate interfaces for vault managers and cashiers, with role-based access control and specialized workflows for cash handling, float management, expense tracking, and financial reporting.

### Key Features

- **Dual Interface**: Separate management and cashier interfaces
- **Role-Based Access**: Vault Manager and Cashier roles with different permissions
- **Cash Tracking**: Real-time vault balance and cash desk monitoring
- **Float Management**: Float allocation and tracking across locations
- **Expense Tracking**: Comprehensive expense recording and categorization
- **Transaction History**: Complete audit trail of all vault operations
- **Transfer Management**: Inter-location and inter-desk transfer operations
- **Reporting**: End-of-day and cash-on-premises reporting
- **Responsive Design**: Desktop and mobile optimized layouts

## File Information

### Component Structure

- **Vault Components**: `components/VAULT/` directory
- **Shared Components**: Uses `components/shared/` for common UI elements
- **Authorization**: `lib/utils/vault/authorization.ts` for access control

### Access Control

- **Vault Manager Access**: `hasVaultAccess()` function checks for vault-related roles
- **Cashier Access**: `hasCashierAccess()` function checks for cashier roles
- **Unauthorized Component**: `components/VAULT/VaultUnauthorized.tsx` displays access denied message

## Vault Management Pages

### Vault Overview

**File:** `app/vault/management/page.tsx`
**URL Pattern:** `/vault/management`
**Component:** `VaultOverviewPageContent` (`components/VAULT/overview/VaultOverviewPageContent.tsx`)

**Purpose:** Main dashboard for vault management with balance overview, cash desk status, and quick actions.

**Features:**
- Vault balance card with current balance
- Cash desk status cards
- Performance/stats overview
- Recent activity section
- Quick actions (Add Cash, Remove Cash, Record Expense)
- Transaction table with filtering

**Components:**
- `VaultBalanceCard` - Main balance display
- `VaultCashDeskCard` - Cash desk status cards
- `VaultMetricCard` - Performance metrics
- `VaultQuickActionsSection` - Quick action buttons
- `VaultRecentActivitySection` - Recent transactions
- `VaultAddCashModal` - Add cash to vault
- `VaultRemoveCashModal` - Remove cash from vault
- `VaultRecordExpenseModal` - Record expense

**API Endpoints:**
- `GET /api/vault/overview` - Vault overview data
- `POST /api/vault/transactions` - Create transaction (add/remove cash, expense)

---

### Cash Desks

**File:** `app/vault/management/cash-desks/page.tsx`
**URL Pattern:** `/vault/management/cash-desks`
**Status:** Placeholder (to be implemented)

**Purpose:** Cash desk management and tracking.

**Features:**
- Cash desk listing
- Cash desk status
- Cash desk history
- Cash desk configuration

**Note:** Currently shows placeholder message. Implementation pending.

---

### Floats

**File:** `app/vault/management/floats/page.tsx`
**URL Pattern:** `/vault/management/floats`
**Component:** `VaultFloatTransactionsPageContent` (`components/VAULT/floats/VaultFloatTransactionsPageContent.tsx`)

**Purpose:** Float management and tracking across locations.

**Features:**
- Float allocation tracking
- Float transaction history
- Float requests management
- Float reconciliation

**Components:**
- `VaultCashierFloatsTable` - Desktop table view
- `VaultCashierFloatsMobileCards` - Mobile card view
- `VaultFloatTransactionsTable` - Transaction table
- `VaultFloatTransactionsMobileCards` - Mobile transaction cards

**API Endpoints:**
- `GET /api/vault/floats` - Float data
- `GET /api/vault/floats/transactions` - Float transaction history
- `POST /api/vault/floats` - Create float allocation
- `PATCH /api/vault/floats/[id]` - Update float

---

### Expenses

**File:** `app/vault/management/expenses/page.tsx`
**URL Pattern:** `/vault/management/expenses`

**Purpose:** Expense tracking and categorization.

**Features:**
- Expense recording
- Expense categorization
- Expense history
- Expense reporting

**API Endpoints:**
- `GET /api/vault/expenses` - Expense listing
- `POST /api/vault/expenses` - Create expense
- `PATCH /api/vault/expenses/[id]` - Update expense

---

### Transactions

**File:** `app/vault/management/transactions/page.tsx`
**URL Pattern:** `/vault/management/transactions`
**Component:** `VaultTransactionsPageContent` (`components/VAULT/transactions/VaultTransactionsPageContent.tsx`)

**Purpose:** Complete transaction history and audit trail.

**Features:**
- Transaction listing with filtering
- Transaction details
- Transaction search
- Transaction export

**Components:**
- `VaultTransactionsTable` - Desktop table view
- `VaultTransactionsMobileCards` - Mobile card view

**API Endpoints:**
- `GET /api/vault/transactions` - Transaction listing
- `GET /api/vault/transactions/[id]` - Transaction details

---

### Transfers

**File:** `app/vault/management/transfers/page.tsx`
**URL Pattern:** `/vault/management/transfers`
**Component:** `VaultTransfersPageContent` (`components/VAULT/transfers/VaultTransfersPageContent.tsx`)

**Purpose:** Inter-location and inter-desk transfer management.

**Features:**
- Transfer creation
- Transfer approval workflow
- Transfer history
- Transfer tracking

**Components:**
- `VaultTransfersTable` - Desktop table view
- `VaultTransfersMobileCards` - Mobile card view

**API Endpoints:**
- `GET /api/vault/transfers` - Transfer listing
- `POST /api/vault/transfers` - Create transfer
- `PATCH /api/vault/transfers/[id]` - Update transfer status

---

### Reports

#### End of Day Reports

**File:** `app/vault/management/reports/end-of-day/page.tsx`
**URL Pattern:** `/vault/management/reports/end-of-day`
**Component:** `VaultEndOfDayReportsPageContent` (`components/VAULT/reports/end-of-day/VaultEndOfDayReportsPageContent.tsx`)

**Purpose:** End-of-day financial reporting.

**Features:**
- Daily closing reports
- Cash reconciliation
- Variance analysis
- Report export

**API Endpoints:**
- `GET /api/vault/reports/end-of-day` - End of day report data
- `POST /api/vault/reports/end-of-day` - Generate report

#### Cash on Premises Reports

**File:** `app/vault/management/reports/cash-on-premises/page.tsx`
**URL Pattern:** `/vault/management/reports/cash-on-premises`
**Component:** `VaultCashOnPremisesPageContent` (`components/VAULT/reports/cash-on-premises/VaultCashOnPremisesPageContent.tsx`)

**Purpose:** Cash on premises reporting and tracking.

**Features:**
- Cash on premises calculation
- Location-wise breakdown
- Historical tracking
- Report export

**API Endpoints:**
- `GET /api/vault/reports/cash-on-premises` - Cash on premises data

---

## Cashier Pages

### Payouts

**File:** `app/vault/cashier/payouts/page.tsx`
**URL Pattern:** `/vault/cashier/payouts`
**Component:** `VaultPayoutsPageContent` (`components/VAULT/cashier/payouts/VaultPayoutsPageContent.tsx`)

**Purpose:** Player payout processing and management.

**Features:**
- Payout processing
- Payout history
- Payout verification
- Payout approval workflow

**Components:**
- `VaultPayoutsTable` - Desktop table view
- `VaultPayoutsMobileCards` - Mobile card view

**API Endpoints:**
- `GET /api/vault/payouts` - Payout listing
- `POST /api/vault/payouts` - Create payout
- `PATCH /api/vault/payouts/[id]` - Update payout status

---

### Shifts

**File:** `app/vault/cashier/shifts/page.tsx`
**URL Pattern:** `/vault/cashier/shifts`

**Purpose:** Cashier shift management and tracking.

**Features:**
- Shift creation
- Shift history
- Shift reconciliation
- Shift reporting

**API Endpoints:**
- `GET /api/vault/shifts` - Shift listing
- `POST /api/vault/shifts` - Create shift
- `PATCH /api/vault/shifts/[id]` - Update shift

---

### Float Requests

**File:** `app/vault/cashier/float-requests/page.tsx`
**URL Pattern:** `/vault/cashier/float-requests`
**Component:** `VaultFloatRequestsPageContent` (`components/VAULT/cashier/float-requests/VaultFloatRequestsPageContent.tsx`)

**Purpose:** Float request management for cashiers.

**Features:**
- Float request creation
- Float request approval
- Float request history
- Float request tracking

**Components:**
- `VaultFloatRequestsTable` - Desktop table view
- `VaultFloatRequestsMobileCards` - Mobile card view

**API Endpoints:**
- `GET /api/vault/float-requests` - Float request listing
- `POST /api/vault/float-requests` - Create float request
- `PATCH /api/vault/float-requests/[id]` - Update float request status

---

## API Endpoints

### Vault Management Endpoints

- `GET /api/vault/overview` - Vault overview dashboard data
- `GET /api/vault/balance` - Current vault balance
- `GET /api/vault/cash-desks` - Cash desk listing
- `GET /api/vault/floats` - Float data
- `GET /api/vault/floats/transactions` - Float transaction history
- `GET /api/vault/expenses` - Expense listing
- `GET /api/vault/transactions` - Transaction history
- `GET /api/vault/transfers` - Transfer listing
- `GET /api/vault/reports/end-of-day` - End of day reports
- `GET /api/vault/reports/cash-on-premises` - Cash on premises reports

### Cashier Endpoints

- `GET /api/vault/payouts` - Payout listing
- `GET /api/vault/shifts` - Shift listing
- `GET /api/vault/float-requests` - Float request listing

### Transaction Endpoints

- `POST /api/vault/transactions` - Create transaction (add cash, remove cash, expense)
- `PATCH /api/vault/transactions/[id]` - Update transaction
- `DELETE /api/vault/transactions/[id]` - Delete transaction

---

## State Management

### Zustand Stores

Vault-related state is managed through Zustand stores:

- **Vault Store**: `lib/store/vaultStore.ts` (if exists)
- **User Store**: `lib/store/userStore.ts` - User data and roles for authorization

### Component State

- Local state for form inputs and UI interactions
- API response caching
- Loading states for async operations

---

## Authorization

### Access Control Functions

**File:** `lib/utils/vault/authorization.ts`

1. **`hasVaultAccess(roles)`**
   - Checks if user has vault manager access
   - Returns `true` if user has vault-related roles
   - Used by all vault management pages

2. **`hasCashierAccess(roles)`**
   - Checks if user has cashier access
   - Returns `true` if user has cashier roles
   - Used by all cashier pages

### Unauthorized Access

- **Component:** `VaultUnauthorized` (`components/VAULT/VaultUnauthorized.tsx`)
- **Display:** Shows access denied message when user lacks required permissions
- **Message:** Guides user to contact manager or customer support

---

## Key Functions

### Data Fetching

- Vault data fetching functions in `lib/helpers/vault/` (if exists)
- API integration with error handling
- Loading state management

### Form Handling

- Transaction creation forms
- Float request forms
- Expense recording forms
- Transfer creation forms

### Validation

- Input validation for all forms
- Amount validation for financial transactions
- Date validation for reports

---

## Notes

- **Separate Application**: Vault system is a separate module with its own component structure
- **Role-Based UI**: Different interfaces for vault managers vs cashiers
- **Audit Trail**: All transactions are logged for compliance
- **Real-Time Updates**: Balance and status updates in real-time
- **Mobile Support**: All pages have mobile-optimized layouts
- **Future Enhancements**: Cash desks page is placeholder for future implementation

---

## Related Documentation

- **[Vault API Documentation](../backend/vault-api.md)** - Backend API reference (if exists)
- **[Authorization Guide](../AUTHENTICATION_AND_AUTHORIZATION_GUIDE.md)** - Role-based access control
- **[Dual Application Architecture](../DUAL_APPLICATION_ARCHITECTURE.md)** - CMS and Vault system architecture
