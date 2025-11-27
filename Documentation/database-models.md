# Database Models & Relationships

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 27, 2025  
**Version:** 2.2.0

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
│   ├── Collection (collections.ts) - Collection reports
│   └── CollectionReport (collectionReport.ts) - Financial summaries
├── User (user.ts) - Authentication & permissions
└── Member (members.ts) - Player management
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
    timestamp: Date;              // Collection timestamp
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
    gamesWon: number;             // Games won count
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
  gamesWon: number;
  currentCredits: number;
  totalWonCredits: number;
  totalHandPaidCancelledCredits: number;

  // SAS Meters (embedded SAS data)
  sasMeters: {
    drop: number;
    coinIn: number;
    coinOut: number;
    totalCancelledCredits: number;
    jackpot: number;
    gamesPlayed: number;
    // ... other SAS fields
  };

  // Bill Validator Meters
  billMeters: {
    dollar1: number;
    dollar2: number;
    dollar5: number;
    // ... other denominations
    dollarTotal: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**API Query Pattern**:

```typescript
// ✅ CORRECT - How aggregation APIs query meters
db.collection('meters').aggregate([
  {
    $match: {
      machine: { $in: machineIds },
      readAt: { $gte: startDate, $lte: endDate }, // Use readAt, not timestamp
    },
  },
  {
    $group: {
      _id: '$machine',
      moneyIn: { $sum: '$movement.drop' }, // Use movement field
      moneyOut: { $sum: '$movement.totalCancelledCredits' },
    },
  },
]);

// ❌ INCORRECT - Will return $0 if missing movement field
db.collection('meters').aggregate([
  {
    $group: {
      moneyIn: { $sum: '$sasMeters.drop' }, // Wrong - aggregation uses movement
    },
  },
]);
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
  deletedAt?: Date;               // Soft delete flag
}
```

### 4. CollectionReport Model (Financial Summaries)

**Purpose**: Aggregates collection data for financial reporting.

**Key Fields Used in UI**:

```typescript
CollectionReport {
  _id: string;
  location: string;               // Links to GamingLocation
  date: string;                   // Report date

  // Financial Summary (UI Display)
  totalDrop: number;              // Total money in across location
  totalGross: number;             // Total gross revenue
  amountCollected: number;        // Total collected amount
  variance: number;               // Any discrepancies
}
```

## Financial Data Flow

### Primary Financial Flow: Machine → Meters → UI

```
Machine (machines.ts)
├── sasMeters - Current financial state (fallback data)
│   ├── drop → Money In (UI: Financial Metrics Cards)
│   ├── totalCancelledCredits → Money Out (UI: Financial Metrics Cards)
│   ├── coinIn → Handle (UI: Machine Evaluation)
│   └── jackpot → Jackpot (UI: Location Tables)
└── collectionMetersHistory - Collection data (UI: Collection Reports)
    ├── metersIn → Collection start amount
    └── metersOut → Collection end amount

Meter (meters.ts) - Primary data source
├── movement - Financial metrics (primary UI data)
│   ├── drop → Money In (UI: Dashboard, Reports)
│   ├── totalCancelledCredits → Money Out (UI: Dashboard, Reports)
│   ├── coinIn → Handle (UI: Machine Performance)
│   └── jackpot → Jackpot (UI: Location Performance)
└── readAt → Date filtering for reports

CollectionReport (collectionReport.ts) - Aggregated summaries
├── totalDrop → Location total Money In
├── totalGross → Location total Gross Revenue
└── amountCollected → Total collections
```

## Important Relationships

### 1. **Licencee → GamingLocation → Machine**

- **Purpose**: Multi-tenant architecture for casino management
- **UI Usage**: Location filtering and machine organization
- **Key Fields**: `rel.licencee` → `gamingLocation` → `_id`

### 2. **Machine → Meter (Financial Data)**

- **Purpose**: Primary financial metrics for UI components
- **UI Usage**: Dashboard, Reports, Machine Performance
- **Key Fields**: `machine._id` → `meter.machine`
- **Data Flow**: `meter.movement` → UI financial calculations

### 3. **Machine → CollectionMetersHistory (Collection Data)**

- **Purpose**: Collection-specific financial tracking
- **UI Usage**: Collection Reports and accounting details
- **Key Fields**: Embedded in `machine.collectionMetersHistory`
- **Data Flow**: Collection timestamps and meter readings

### 4. **GamingLocation → CollectionReport (Financial Summaries)**

- **Purpose**: Location-wide financial aggregation
- **UI Usage**: Location performance and financial summaries
- **Key Fields**: `location` → `collectionReport.location`
- **Data Flow**: Aggregated totals for location reporting

## Summary

This focused documentation covers the essential database models and relationships that drive the Evolution One Casino Management System UI:

### Key Models

- **Machines**: Primary UI data source with financial metrics and status
- **Meters**: Financial metrics source with movement data
- **GamingLocation**: Location management and organization
- **CollectionReport**: Financial summaries and aggregated data

### Core Financial Fields

- **Money In**: `movement.drop` (primary) / `sasMeters.drop` (fallback)
- **Money Out**: `movement.totalCancelledCredits` (primary) / `sasMeters.totalCancelledCredits` (fallback)
- **Gross Revenue**: Money In - Money Out
- **Handle**: `movement.coinIn` for betting activity
- **Jackpot**: `movement.jackpot` for large payouts

### UI Data Flow

- **Dashboard**: Financial Metrics Cards using Money In/Out/Gross
- **Reports**: Location and Machine performance with aggregated metrics
- **Collection Reports**: Collection-specific meter readings and history

### Critical Relationships

- **Licencee → GamingLocation → Machine**: Multi-tenant architecture
- **Machine → Meter**: Primary financial data source
- **Machine → CollectionMetersHistory**: Collection tracking
- **GamingLocation → CollectionReport**: Location aggregation

This focused approach ensures developers understand exactly which database fields and relationships drive the UI components and how to implement them correctly.
