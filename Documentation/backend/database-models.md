# Database Models & Relationships

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.4.0

## Table of Contents

1. [Overview](#overview)
2. [Core Entity Hierarchy](#core-entity-hierarchy)
3. [Key Models Used in UI](#key-models-used-in-ui)
4. [Collections Model](#4-collections-model-collection-report-entries)
5. [CollectionReport Model](#5-collectionreport-model-report-summary)
6. [Vault Management Models](#6-vault-management-models-vms)
7. [User Model](#user-model-usert)

## Overview

This document provides comprehensive documentation of the database models and relationships used in the Evolution One Casino Management System. It covers the complete data architecture that drives all system functionality including dashboard analytics, financial reporting, collection management, and operational monitoring.

### Key Principles

- **Data Integrity**: All models maintain referential integrity and data consistency
- **Performance**: Optimized database design with proper indexing and relationships
- **Scalability**: Architecture supports growth and expansion
- **Compliance**: Models support regulatory reporting and audit requirements

### System Architecture

- **MongoDB**: Document-based database with flexible schema design
- **Mongoose ODM**: Object Document Mapping for data validation and relationships
- **TypeScript**: Strong typing for all database models and operations
- **Real-time Updates**: Live data synchronization across all system components

## Core Entity Hierarchy

```
Licencee (licencee.ts)
├── GamingLocation (gaminglocations.ts)
│   ├── Machine (machines.ts) - Primary UI data source
│   │   ├── Meter (meters.ts) - Financial metrics source
│   │   └── CollectionMetersHistory (embedded) - Collection data
│   ├── Collection (collections.ts) - Compliance reports
│   └── CollectionReport (collectionReport.ts) - Financial summaries
├── User (user.ts) - Authentication & permissions
├── Member (members.ts) - Player management
├── Vault (VMS Collections)
│   ├── VaultShift (vaultShift.ts)
│   ├── CashierShift (cashierShift.ts)
│   ├── FloatRequest (floatRequest.ts)
│   ├── Payout (payout.ts)
│   ├── VaultTransaction (vaultTransaction.ts) - Ledger
│   ├── VaultNotification (vaultNotification.ts)
│   ├── VaultCollectionSession (vault-collection-session.ts) - Draft collections
│   ├── MachineCollection (machineCollection.ts) - Finalized collection records
│   ├── SoftCount (softCount.ts) - Soft count records
│   └── InterLocationTransfer (interLocationTransfer.ts) - Cash transfers
└── Firmware (firmware.ts) - Firmware management
```

## Key Models Used in UI

### 1. Machines Model (Primary UI Data Source)

**Purpose**: Core model that drives most UI components including dashboard, reports, and machine management.

**Key Fields Used in UI**:

```typescript
Machine {
  _id: string;
  serialNumber: string;           // Machine identification
  gamingLocation: string;         // Links to GamingLocation
  loggedIn: boolean;              // Machine login state (online/offline for UI)
  machineStatus: string;          // Operational status (separate from login state)

  // SMIB / Connectivity
  relayId: string;                // SMIB controller identifier (if set = SMIB machine)
  lastActivity?: Date;            // Last SMIB heartbeat — stale >3min = offline SMIB
  smibBoard?: string;             // Physical SMIB board identifier
  smbId?: string;                 // Alternate SMIB identifier
  isWow?: boolean;                // WOW-synced machine (no relay, sync instead)
  connectionMode?: 'WOW' | 'SMIB' | 'NONE'; // How machine gets meter data
  smibConfig: SmibConfig;        // Device configuration
  smibVersion: {
    firmware: string;
    version: string;
  };

  // Financial Data (Primary UI Source)
  sasMeters: {
    drop: number;                 // Money In - used in Financial Metrics Cards
    totalCancelledCredits: number; // Money Out - used in Financial Metrics Cards
    coinIn: number;               // Handle - used in Machine Evaluation
    jackpot: number;              // Jackpot - displayed in Location Tables
    gamesPlayed: number;          // Games played - used for calculations
  };

  // Collection Data (for Collection Reports)
  collectionMeters: {
    metersIn: number;             // Current machine meter In (advanced on report creation)
    metersOut: number;            // Current machine meter Out
  };
  collectionMetersHistory: [{
    metersIn: number;             // Money in at collection start
    metersOut: number;            // Money out at collection start
    prevMetersIn: number;         // Baseline for deltas
    prevMetersOut: number;        // Baseline for deltas
    timestamp: Date;              // Collection timestamp
    locationReportId: string;     // Reference to report
  }];

  // Machine Configuration
  gameConfig: {
    theoreticalRtp: number;       // Used in Machine Evaluation
    maxBet: string;               // Machine limits
  };
}
```

### 2. Meters Model (Financial Metrics Source)

**Purpose**: Provides detailed financial metrics for reports and analytics.

**Critical Fields for API Queries**:

⚠️ **IMPORTANT**: Meters MUST have these fields for aggregation APIs to work:

```typescript
Meter {
  _id: string;
  machine: string;                // Links to Machine
  location: string;               // Links to GamingLocation

  // ⚠️ CRITICAL: Use readAt for date filtering (NOT timestamp or createdAt)
  readAt: Date;                   // Date filtering field used by ALL aggregation APIs

  // ⚠️ CRITICAL: movement field is REQUIRED for aggregation APIs
  movement: {
    drop: number;                 // Money In (DELTA for SAS_READ, always 0 for WOW_SYNC)
    totalCancelledCredits: number; // Money Out (DELTA for SAS_READ, always 0 for WOW_SYNC)
    coinIn: number;               // Handle - betting activity
    jackpot: number;              // Jackpot payouts
    gamesPlayed: number;          // Game activity
    gamesWon: number;             // Games won count (for member sessions)
    currentCredits: number;       // Current credits in machine
    totalWonCredits: number;      // Total credits won
    totalHandPaidCancelledCredits: number; // Hand-paid credits
  };

  // Source type — determines how downstream aggregation computes SAS values
  meterSource: 'COLLECTION_REPORT' | 'SAS_READ' | 'WOW_SYNC' | 'OTHER';
  isSupplemental: boolean;        // true = offline SMIB fallback meter
  isRamClear: boolean;            // true = pre-reset peak reading (RAM clear event)
  isSasCreated: boolean;          // false = manually entered, not from SAS relay

  // Top-level fields (duplicated for backward compatibility)
  drop: number;                   // For SAS_READ = per-reading abs; for WOW_SYNC = cumulative abs
  coinIn: number;
  coinOut: number;
  totalCancelledCredits: number;  // For SAS_READ = per-reading abs; for WOW_SYNC = cumulative abs
  jackpot: number;
  gamesPlayed: number;
  lastSasMeterAt?: Date;
  lastBillMeterAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### 3. GamingLocation Model (Location Management)

**Purpose**: Manages casino locations and aggregates machine data.

**Key Fields Used in UI**:

```typescript
GamingLocation {
  _id: string;
  name: string;                   // Location name for UI display
  "rel.licencee": string;         // Links to Licencee
  gameDayOffset: number;          // Gaming day start hour (0-23, default 8)
  country: string;                // Links to Country for currency detection
  geoCoords: {                    // Geographic coordinates for map display
    latitude: number;
    longitude: number;
  };
  membershipEnabled: boolean;     // Feature toggle
  locationMembershipSettings: {   // Membership configuration
    minimumPoints: number;
    billingMethod: string;
    // ...
  };
  isLocalServer: boolean;
  deletedAt?: Date;               // Soft delete flag
}
```

### 4. Collections Model (Collection Report Entries)

**Purpose**: Per-machine meter entry within a collection report. One document per machine per report.

```typescript
Collection {
  _id: string;
  locationReportId: string;       // Links to CollectionReport (empty = draft, set = finalized)
  isCompleted: boolean;           // false = draft, true = part of finalized report
  machineId: string;              // Links to Machine
  location: string;               // Links to GamingLocation
  collector: string;              // User ID of collector

  // Meter readings (collector-entered)
  metersIn: number;               // Physical meter In reading
  metersOut: number;              // Physical meter Out reading
  prevIn: number;                 // Previous meter In (calculated by backend on creation)
  prevOut: number;                // Previous meter Out (calculated by backend on creation)
  ramClear: boolean;              // RAM clear occurred
  ramClearMetersIn?: number;      // Pre-reset peak In
  ramClearMetersOut?: number;     // Pre-reset peak Out

  // Movement (calculated)
  movement: {
    drop: number;                 // metersIn - prevIn (with RAM clear handling)
    totalCancelledCredits: number; // metersOut - prevOut (with RAM clear handling)
    gross: number;                // drop - totalCancelledCredits
  };

  // SAS metrics snapshot (calculated from Meters collection)
  sasMeters: {
    sasStartTime: Date;           // SAS window start
    sasEndTime: Date;             // SAS window end
    drop: number;                 // SAS drop over window
    totalCancelledCredits: number; // SAS cancelled over window
    gross: number;                // SAS gross = drop - totalCancelledCredits
    jackpot: number;              // SAS jackpot over window
    gamesPlayed: number;          // SAS games played over window
  };

  // Meter document references (for manual meters)
  meterId?: string;               // Links to Meters._id (supplemental meter for offline SMIB)
  ramClearMeterId?: string;       // Links to Meters._id (RAM clear meter document)

  timestamp: Date;                // Collection timestamp
  notes?: string;                 // Collector notes
  createdAt: Date;
  updatedAt: Date;
}
```

### 5. CollectionReport Model (Report Summary)

**Purpose**: Parent document for a set of Collections at one location on one gaming day.

```typescript
CollectionReport {
  _id: string;
  locationReportId: string;       // Unique report identifier (used by Collections to link back)
  location: string;               // Location name (denormalized — NOT ObjectId)
  locationId: string;             // Location ObjectId string
  collector: string;              // User ID of collector
  licencee: string;               // Licencee context

  // Financial fields (set during creation, editable via edit modal)
  amountCollected: number;        // Physical cash collected
  amountToCollect: number;        // Expected amount (computed from formula)
  amountUncollected: number;      // difference
  variance: number;               // Manual variance input
  advance: number;                // Advance deduction
  partnerProfit: number;          // Partner profit share
  taxes: number;                  // Taxes deducted
  previousBalance: number;        // Carry-over from prior report
  balanceCorrection: number;      // Manual balance override
  currentBalance: number;         // Balance after this report

  // State tracking
  isEditing: boolean;             // true = being edited, histories not synced
  profitShare: number;            // Profit share percentage
  isPartnerCollection: boolean;   // Partner collection flag
  includeJackpot: boolean;        // Whether jackpot was subtracted from SAS gross for variation

  timestamp: Date;                // Report date
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. Vault Management Models (VMS)

The Vault Management System (VMS) is designed for strict audibility and cash control.

**VaultShift**

```typescript
{
  _id: string;
  locationId: string;
  vaultManagerId: string;
  status: "active" | "closed";
  openedAt: Date;
  openingBalance: number;
  openingDenominations: Denomination[];
  closingBalance?: number;
  reconciliations: VaultReconciliation[]; // Audit adjustment history
  canClose: boolean; // Managed by BR-01 logic
}
```

**CashierShift**

```typescript
{
  _id: string;
  cashierId: string;
  status: "pending_start" | "active" | "closed" | "pending_review";
  openingBalance: number;
  currentBalance: number; // Live calculated balance
  discrepancy?: number; // Populated on blind close mismatch
  discrepancyResolved: boolean;
}
```

**VaultTransaction (The Ledger)**

```typescript
{
  _id: string;
  locationId: string;
  type: "add_cash" | "remove_cash" | "expense" | "payout" | "float_increase" | "float_decrease" | "vault_open" | "vault_close";
  from: { type: string, id: string };
  to: { type: string, id: string };
  amount: number;
  denominations: Denomination[];
  vaultBalanceBefore: number;
  vaultBalanceAfter: number;
  isVoid: boolean;
  performedBy: string; // User ID
  timestamp: Date;
}
```

**FloatRequest**

```typescript
{
  _id: string;
  locationId: string;
  cashierId: string;
  cashierShiftId: string;
  vaultShiftId: string;
  type: "increase" | "decrease";
  requestedAmount: number;
  requestedDenominations: Denomination[];
  status: "pending" | "approved_vm" | "active" | "denied" | "cancelled";
  processedBy?: string;
}
```

**Payout**

```typescript
{
  _id: string;
  locationId: string;
  cashierId: string;
  cashierShiftId: string;
  type: "ticket" | "hand_pay";
  amount: number;
  ticketNumber?: string;
  machineId?: string;
  validated: boolean;
  transactionId: string; // Links back to VaultTransaction
}
```

**VaultNotification**

```typescript
{
  _id: string;
  locationId: string;
  type: "float_request" | "shift_review" | "low_inventory";
  title: string;
  message: string;
  timestamp: Date;
  status: "unread" | "read";
  urgent: boolean;
  referenceId?: string; // Links to Payout, Shift, or Request
}
```

---

## User Model (user.ts)

### Overview

The User model manages authentication, authorization, and user profile data for the Evolution One CMS system.

### Schema Structure

```typescript
interface User {
  _id: string; // Unique user identifier (string-based UUID)
  isEnabled: boolean; // Account enabled status (default: true)
  roles: string[]; // User roles: ['developer', 'admin', 'manager', 'location admin', 'vault-manager', 'cashier', 'technician', 'collector']
  username: string; // Required username (unique, indexed)
  emailAddress: string; // Email address (unique, indexed, required)
  assignedLocations?: string[]; // Array of location IDs user has access to
  assignedLicencees?: string[]; // Array of licencee IDs user has access to

  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: 'male' | 'female' | 'other';
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: Date | string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
    phoneNumber?: string;
    notes?: string;
  };

  profilePicture?: string; // Profile picture URL
  password: string; // Hashed password (bcrypt)
  passwordUpdatedAt?: Date; // Last password update timestamp
  sessionVersion?: number; // Session invalidation version (default: 1);
  loginCount?: number; // Number of successful logins
  lastLoginAt?: Date; // Last successful login timestamp
  deletedAt?: Date; // Soft delete timestamp
  createdAt: Date; // Account creation timestamp
  updatedAt: Date; // Last modification timestamp
}
```
