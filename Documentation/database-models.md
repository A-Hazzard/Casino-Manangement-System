# Database Models & Relationships

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Version:** 3.0.0

## Table of Contents

1. [Overview](#overview)
2. [Core Entity Hierarchy](#core-entity-hierarchy)
3. [Key Models Used in UI](#key-models-used-in-ui)
4. [Financial Data Flow](#financial-data-flow)
5. [Important Relationships](#important-relationships)
6. [Model Specifications](#model-specifications)
7. [Data Relationships](#data-relationships)
8. [Business Logic](#business-logic)

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
  status: "online" | "offline";   // Machine status for UI display
  relayId: string;               // SMIB controller identifier
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
  collectionMetersHistory: [{
    metersIn: number;             // Money in at collection start
    metersOut: number;            // Money in at collection end
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
  timestamp: Date;                // Original meter timestamp (fallback)

  // ⚠️ CRITICAL: movement field is REQUIRED for aggregation APIs
  movement: {
    drop: number;                 // Money In - primary financial metric
    totalCancelledCredits: number; // Money Out - primary financial metric
    coinIn: number;               // Handle - betting activity
    jackpot: number;              // Jackpot payouts
    gamesPlayed: number;          // Game activity
    gamesWon: number;             // Games won count (for member sessions)
    currentCredits: number;       // Current credits in machine
    totalWonCredits: number;      // Total credits won
    totalHandPaidCancelledCredits: number; // Hand-paid credits
  };

  // Top-level fields (duplicated for backward compatibility)
  drop: number;
  coinIn: number;
  coinOut: number;
  totalCancelledCredits: number;
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

### 4. Vault Management Models (VMS)

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
  _id: string;              // Unique user identifier (string-based UUID)
  isEnabled: boolean;       // Account enabled status (default: true)
  roles: string[];          // User roles: ['developer', 'admin', 'manager', 'location admin', 'vault-manager', 'cashier', 'technician', 'collector']
  username: string;         // Required username (unique, indexed)
  emailAddress: string;     // Email address (unique, indexed, required)
  assignedLocations?: string[];  // Array of location IDs user has access to
  assignedLicensees?: string[];  // Array of licensee IDs user has access to

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

  profilePicture?: string;   // Profile picture URL
  password: string;          // Hashed password (bcrypt)
  passwordUpdatedAt?: Date;  // Last password update timestamp
  sessionVersion?: number;   // Session invalidation version (default: 1);
  loginCount?: number;       // Number of successful logins
  lastLoginAt?: Date;        // Last successful login timestamp
  deletedAt?: Date;          // Soft delete timestamp
  createdAt: Date;           // Account creation timestamp
  updatedAt: Date;           // Last modification timestamp
}
```
