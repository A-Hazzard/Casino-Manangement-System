# Evolution One CMS - Complete Project Guide

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** January 2026  
**Version:** 4.1.0
## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [TypeScript Type Safety](#typescript-type-safety)
4. [Database Models & Relationships](#database-models--relationships)
5. [Financial Metrics System](#financial-metrics-system)
6. [Timezone Management](#timezone-management)
7. [Gaming Day Offset System](#gaming-day-offset-system)
8. [Currency Conversion System](#currency-conversion-system)
9. [Role-Based Access Control](#role-based-access-control)
10. [Performance Optimization Strategies](#performance-optimization-strategies)
11. [Auditing and Logging](#auditing-and-logging)
12. [Vault Management System](#vault-management-system)
13. [Development Guidelines](#development-guidelines)

---

## Project Overview

The Evolution One Casino Management System is a comprehensive Next.js-based platform for managing casino operations, including machine monitoring, financial reporting, collection management, player tracking, and vault operations.

### Technology Stack

- **Framework**: Next.js 16.0.7 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB with Mongoose ODM
- **Styling**: Tailwind CSS
- **Authentication**: JWT with role-based access control
- **State Management**: Zustand stores
- **UI Components**: Shadcn/ui

### Key Features

- Real-time machine monitoring and status tracking
- Comprehensive financial reporting and analytics
- Collection management with automated calculations
- Multi-licensee support with currency conversion
- Role-based access control with hierarchical permissions
- Gaming day offset system for flexible business day boundaries
- Audit logging for regulatory compliance
- **Vault Management**: Comprehensive cash handling and cashier oversight
- **SMIB Management**: OTA firmware updates and real-time device control

---

## System Architecture

### Folder Structure

```
evolution-one-cms/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth pages
│   ├── api/                     # API routes
│   │   └── lib/
│   │       ├── helpers/         # Backend business logic
│   │       ├── models/          # Mongoose models
│   │       ├── types/           # Backend-specific types
│   │       └── utils/           # Backend utilities
│   ├── locations/               # Location pages
│   ├── cabinets/                # Cabinet/machine pages
│   ├── reports/                 # Reports pages
│   ├── vault/                   # Vault management pages
│   └── ...
├── components/                   # React components
│   ├── CMS/                     # CMS-specific components
│   ├── VAULT/                   # Vault-specific components
│   └── shared/                  # Reusable UI components
├── lib/                         # Frontend libraries
│   ├── helpers/                 # Frontend data fetching
│   ├── utils/                   # Pure utilities
│   ├── types/                   # Frontend-specific types
│   ├── hooks/                   # Custom React hooks
│   ├── store/                   # Zustand stores
│   └── contexts/                # React contexts
├── shared/                      # Shared code
│   └── types/                   # Shared type definitions
└── Documentation/               # Project documentation
```

### Core Principles

- **Type Safety**: Comprehensive TypeScript with strict typing
- **Separation of Concerns**: Clear boundaries between frontend/backend/shared
- **Performance**: Optimized queries with cursors and proper indexing
- **Security**: JWT authentication with role-based access control
- **Maintainability**: Well-documented, modular code structure

---

## TypeScript Type Safety

### Three-Tier Type System

#### 1. Shared Types (`shared/types/`)

Types used across both frontend and backend:

- `shared/types/database.ts` - Database-related types
- `shared/types/entities.ts` - Core entity types (Licencee, GamingLocation, Machine, etc.)
- `shared/types/api.ts` - API request/response types
- `shared/types/common.ts` - Common utility types (TimePeriod, DateRange, etc.)
- `shared/types/auth.ts` - Authentication types
- `shared/types/analytics.ts` - Analytics and dashboard types
- `shared/types/smib.ts` - SMIB management types
- `shared/types/vault.ts` - Vault operations types
- `shared/types/index.ts` - Central export point

#### 2. Frontend Types (`lib/types/`)

Types specific to frontend components and UI logic:

- Component props and UI state
- Frontend-specific utilities
- Report filters and configurations

#### 3. Backend Types (`app/api/lib/types/`)

Types specific to API routes and backend logic:

- Database operations
- API request/response types
- Backend utilities
- Pipeline stages for aggregations

### Core Type Safety Rules

1. **Prefer `type` over `interface`** - Better performance and tree-shaking
2. **No `any` allowed** - Create proper type definitions
3. **No underscore prefixes** - Never prefix variables with underscores
4. **Type organization** - All types in appropriate directories
5. **Check dependencies** - Always verify usage before deleting types/functions
6. **Avoid duplication** - Import and re-export from shared types

### Type Validation Workflow

Before creating or modifying types that represent backend data:

1. **Trace the data flow** from API endpoint to frontend usage
2. **Check the original API source** in `app/api/` routes
3. **Verify database schema** if the type represents database entities
4. **Ensure shared types match** the actual API response structure
5. **Verify frontend usage** aligns with the updated types

---

## Database Models & Relationships

### Core Entity Hierarchy

```
Licencee (licencee.ts)
├── GamingLocation (gaminglocations.ts)
│   ├── Machine (machines.ts) - Primary UI data source
│   │   ├── Meter (meters.ts) - Financial metrics source
│   │   └── CollectionMetersHistory (embedded) - Collection data
│   ├── Collection (collections.ts) - Collection reports
│   └── CollectionReport (collectionReport.ts) - Financial summaries
├── User (user.ts) - Authentication & permissions
├── Member (members.ts) - Player management
├── Vault (vault-related collections)
│   ├── FloatRequest (floatRequests.ts)
│   ├── Payout (cashDeskPayouts.ts)
│   └── Shift (shifts.ts)
└── Firmware (firmware.ts) - Firmware management
```

### Key Models

#### Machines Model (Primary UI Data Source)

```typescript
Machine {
  _id: string;
  serialNumber: string;
  manufacturer: string;           // Machine manufacturer (mandatory)
  gamingLocation: string;         // Links to GamingLocation
  status: "online" | "offline";
  relayId: string;               // SMIB controller identifier
  smibConfig: SmibConfig;        // Device configuration
  smibVersion: {
    firmware: string;
    version: string;
  };

  // Financial Data (Primary UI Source)
  sasMeters: {
    drop: number;                 // Money In
    totalCancelledCredits: number; // Money Out
    coinIn: number;               // Handle
    jackpot: number;
    gamesPlayed: number;
  };

  // Collection Data
  collectionMetersHistory: [{
    metersIn: number;
    metersOut: number;
    timestamp: Date;
    locationReportId: string;
  }];
}
```

#### Meters Model (Financial Metrics Source)

**CRITICAL FIELDS FOR API QUERIES:**

```typescript
Meter {
  _id: string;
  machine: string;                // Links to Machine
  location: string;               // Links to GamingLocation (CRITICAL for optimization)

  // ⚠️ CRITICAL: Use readAt for date filtering (NOT timestamp or createdAt)
  readAt: Date;                   // Date filtering field used by ALL aggregation APIs

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
}
```

**API Query Pattern:**

```typescript
// ✅ CORRECT - How aggregation APIs query meters
Meters.aggregate([
  {
    $match: {
      location: { $in: locationIds }, // Use location field directly (uses index)
      readAt: { $gte: startDate, $lte: endDate }, // Use readAt, not timestamp
    },
  },
  {
    $group: {
      _id: '$location',
      moneyIn: { $sum: '$movement.drop' }, // Use movement field
      moneyOut: { $sum: '$movement.totalCancelledCredits' },
    },
  },
]);
```

#### GamingLocation Model

```typescript
GamingLocation {
  _id: string;
  name: string;
  "rel.licencee": string;         // Links to Licencee
  gameDayOffset: number;          // Gaming day start hour (0-23, default 8)
  country: string;                // Links to Country for currency detection
  geoCoords: {
    latitude: number;
    longitude: number;
  };
  membershipEnabled: boolean;     // Feature toggle
  locationMembershipSettings: {   // Membership configuration
    minimumPoints: number;
    billingMethod: string;
    // ... other settings
  };
  deletedAt?: Date;               // Soft delete flag
}
```

### Important Relationships

1. **Licencee → GamingLocation → Machine** - Multi-tenant architecture
2. **Machine → Meter** - Primary financial data source
3. **Machine → CollectionMetersHistory** - Collection tracking
4. **GamingLocation → CollectionReport** - Location aggregation

### Database Query Standards

#### Use Mongoose Models, Never Direct Collection Access

```typescript
// ✅ CORRECT - Use Mongoose model
import { Member } from '@/app/api/lib/models/members';
const members = await Member.find(query).lean();
const count = await Member.countDocuments(query);

// ❌ INCORRECT - Direct collection access
const members = await db.collection('members').find(query).toArray();
```

#### MongoDB Query Methods

```typescript
// ✅ CORRECT - Use findOne with string IDs
const session = await MachineSession.findOne({ _id: sessionId });

// ❌ INCORRECT - findById expects ObjectId
const session = await MachineSession.findById(sessionId);
```

#### Licensee & Location Filtering

All API routes must respect user's accessible licensees and locations:

```typescript
const licensee = searchParams.get('licensee') || searchParams.get('licencee');
const allowedLocationIds = await getUserLocationFilter(licensee || undefined);

if (allowedLocationIds !== 'all') {
  matchStage.gamingLocation = { $in: allowedLocationIds };
}
```

---

## Financial Metrics System

### Core Financial Metrics

#### Money In (Drop)

- **Definition**: Total money physically inserted into slot machines by players
- **Data Source**: `movement.drop` field in meter readings
- **UI Usage**: Primary metric in Financial Metrics Cards and Dashboard

#### Money Out (Total Cancelled Credits)

- **Definition**: Amount of money removed from machines through manual payouts
- **Data Source**: `movement.totalCancelledCredits` field in meter readings
- **UI Usage**: Displayed in Financial Metrics Cards and Location Tables

#### Gross Revenue

- **Definition**: Net earnings after payouts (Money In - Money Out)
- **Calculation**: `gross = moneyIn - moneyOut`
- **UI Usage**: Primary financial metric in all reports and dashboards

#### Handle (Coin In)

- **Definition**: Total value of bets placed in machines
- **Data Source**: `movement.coinIn` field in meter readings
- **UI Usage**: Used in Machine Evaluation and Performance Analysis

### Financial Calculations

#### Primary Gross Revenue Calculation

```
Gross = Money In - Money Out
```

Where:

- **Money In** = `movement.drop` (total money physically inserted)
- **Money Out** = `movement.totalCancelledCredits` (manual payouts)

#### SAS GROSS Calculation (Movement Delta Method)

**Formula:**

```
SAS GROSS = Sum(movement.drop) - Sum(movement.totalCancelledCredits)
```

**Data Source:** `meters` collection  
**Time Period:** Uses SAS time periods from collections  
**Implementation:** Used across all pages (Collection Reports, Cabinets, Location Details, Dashboard)

#### Collection System Calculations

```
Collection Drop = Current Meters In - Previous Meters In
Collection Cancelled = Current Meters Out - Previous Meters Out
Collection Gross = Collection Drop - Collection Cancelled
```

#### Amount to Collect Calculation

```
Amount to Collect = Total Gross - Variance - Advance - Partner Profit + Previous Balance
```

#### Partner Profit Calculation

```
Partner Profit = Floor((Total Gross - Variance - Advance) × Profit Share % ÷ 100) - Taxes
```

### Data Sources

#### Primary Data Fields Used in UI

```typescript
// Core financial fields used in UI
type UIFinancialFields = {
  // Movement data (primary source)
  movement: {
    drop: number; // Money In - physical cash inserted
    totalCancelledCredits: number; // Money Out - manual payouts
    coinIn: number; // Handle - total bets placed
    jackpot: number; // Jackpot payouts
    gamesPlayed: number; // Total games played
  };

  // Machine embedded data (fallback)
  sasMeters: {
    drop: number; // Money In fallback
    totalCancelledCredits: number; // Money Out fallback
    coinIn: number; // Handle fallback
    jackpot: number; // Jackpot fallback
    gamesPlayed: number; // Games played fallback
  };
};
```

### API Implementation Standards

```typescript
// ✅ CORRECT - Primary fields used in UI
const moneyIn = meterData.movement.drop;
const moneyOut = meterData.movement.totalCancelledCredits;
const gross = moneyIn - moneyOut;
const handle = meterData.movement.coinIn;
const jackpot = meterData.movement.jackpot;
const gamesPlayed = meterData.movement.gamesPlayed;

// ✅ FALLBACK - Use sasMeters when movement data unavailable
const moneyInFallback = machineData.sasMeters.drop;
const moneyOutFallback = machineData.sasMeters.totalCancelledCredits;
```

**Important**: Always use `readAt` field for date filtering on meter data:

```typescript
// ✅ CORRECT - Use readAt for meter date queries
const metersQuery = {
  machine: machineId,
  readAt: { $gte: startDate, $lte: endDate },
};
```

---

## Timezone Management

### Overview

The system implements comprehensive timezone management for Trinidad and Tobago (UTC-4). All date fields are automatically converted from UTC (stored in database) to Trinidad local time for display and user interaction.

### Key Principles

- **Consistency**: All dates displayed in Trinidad local time (UTC-4)
- **Accuracy**: Automatic conversion between UTC storage and local display
- **Reliability**: No daylight saving time complications (Trinidad doesn't observe DST)
- **Performance**: Efficient timezone conversion with minimal overhead

### Trinidad Timezone (UTC-4)

- **Offset:** UTC-4 (4 hours behind UTC)
- **No Daylight Saving Time:** Trinidad and Tobago does not observe DST
- **Year-round consistency:** The offset remains constant throughout the year

### Core Timezone Utilities

**Location**: `app/api/lib/utils/timezone.ts`

#### Key Functions

- `utcToTrinidadTime(utcDate: Date): Date` - Converts UTC to Trinidad time
- `trinidadTimeToUtc(trinidadDate: Date): Date` - Converts Trinidad time to UTC
- `getCurrentTrinidadTime(): Date` - Returns current Trinidad local time
- `formatTrinidadTime(utcDate: Date, options?: Intl.DateTimeFormatOptions): string` - Formats UTC dates as Trinidad time strings
- `convertResponseToTrinidadTime<T>(data: T, additionalDateFields?: string[]): T` - Main utility for converting API response data
- `createTrinidadDateRangeFilter(startDate: Date | string, endDate: Date | string): { $gte: Date; $lte: Date }` - Creates MongoDB date range queries in UTC

### Date Fields Automatically Converted

Common date fields automatically detected and converted:

- `createdAt`, `updatedAt`, `deletedAt`
- `readAt`, `timestamp`, `date`
- `startTime`, `endTime`, `lastActivity`
- `lastLogin`, `lastPwUpdatedAt`
- `collectionTime`, `previousCollectionTime`
- And many more business-specific fields

### API Implementation

```typescript
// Example API route implementation
import { convertResponseToTrinidadTime } from '@/app/api/lib/utils/timezone';

export async function GET() {
  const users = await User.find();
  // Automatically converts all date fields to Trinidad time
  return NextResponse.json({
    success: true,
    data: convertResponseToTrinidadTime(users),
  });
}
```

### Date Range Queries

```typescript
import { createTrinidadDateRangeFilter } from '@/app/api/lib/utils/timezone';

// Frontend sends Trinidad time, convert to UTC for database query
const dateRange = createTrinidadDateRangeFilter(startDate, endDate);

const results = await Meters.find({
  readAt: dateRange,
});
```

---

## Gaming Day Offset System

### Overview

The Gaming Day Offset system allows gaming locations to define their business day boundaries instead of using standard midnight-to-midnight calendar days. This ensures financial reporting aligns with actual business operations.

**Key Principle:**  
Instead of "12:00 AM to 11:59 PM", a gaming day runs from a configurable hour (e.g., 8 AM today to 8 AM tomorrow).

### Core Concepts

#### Gaming Day Offset

- **Definition**: The hour (0-23) when a new gaming day begins for a location
- **Default Value**: 8 (8 AM Trinidad time)
- **Storage**: `gamingLocations.gameDayOffset` field in MongoDB

#### Trinidad Time = UTC-4

**Critical Rule**: All dates are stored in UTC in the database, but users interact in Trinidad time (UTC-4).

**Conversion Formula:**

- Trinidad midnight (12:00 AM) = 4:00 AM UTC
- Trinidad 8 AM = 12:00 PM UTC
- Trinidad 11:59 PM = 3:59 AM UTC (next day)

### When Gaming Day Offset Applies

Gaming day offset is used for **ALL financial metrics** from meter data:

✅ **Dashboard totals** - System-wide financial summaries  
✅ **Location reports** - Aggregated location metrics  
✅ **Machine reports** - Individual machine financials  
✅ **Cabinet aggregation** - All machines list  
✅ **Bill validator data** - Gaming session tracking  
✅ **Reports page** - All tabs (Locations, Machines, Meters)  
✅ **ALL time periods** - Today, Yesterday, 7d, 30d, **AND Custom**

### When Gaming Day Offset Does NOT Apply

Standard calendar time filtering (midnight-to-midnight) is used for:

❌ **Collection reports** - Filter by collection timestamp  
❌ **Activity logs** - Filter by action timestamp  
❌ **User sessions** - Filter by session timestamp

These use **event timestamps**, not gaming day boundaries.

### Time Period Calculations

#### Today

- **Gaming Day Start**: Current date at `gameDayOffset` hour (e.g., 8 AM)
- **Gaming Day End**: Next date at `gameDayOffset` hour (e.g., tomorrow 8 AM)
- **If current time < gameDayOffset**: Use previous gaming day

#### Yesterday

- **Gaming Day Start**: Previous date at `gameDayOffset` hour
- **Gaming Day End**: Current date at `gameDayOffset` hour

#### 7d / 30d

- **Start**: `gameDayOffset` hours ago from now, going back 7/30 days
- **End**: Current time
- **Per-location**: Each location uses its own `gameDayOffset`

### Implementation

**Location**: `lib/utils/gamingDayRange.ts`

```typescript
// Get gaming day range for a location
const gamingDayRange = getGamingDayRangeForPeriod(
  timePeriod,
  gameDayOffset, // e.g., 8 for 8 AM
  customStartDate,
  customEndDate
);

// Returns: { rangeStart: Date, rangeEnd: Date } in UTC
```

### Critical Fix (November 11, 2025)

**Problem:** Dashboard showing $0 before gaming day start  
**Solution:** Check if current hour is before gaming day start, use previous gaming day if so

```typescript
const currentHour = nowLocal.getUTCHours();
const todayBase =
  currentHour < gameDayStartHour
    ? yesterday // Still in yesterday's gaming day!
    : today; // In today's gaming day
```

---

## Currency Conversion System

### Overview

The currency conversion system provides accurate multi-licensee financial data aggregation with proper currency conversion. The system handles locations and machines belonging to different licensees with different currencies, as well as unassigned locations that use country-based currency detection.

### Key Principles

- **Accuracy**: Native currency detection → USD → Display currency conversion
- **Flexibility**: Support for locations with/without licensees
- **Consistency**: Unified conversion across all endpoints
- **Performance**: Efficient conversion with minimal overhead

### Supported Currencies

- **USD** - US Dollar (base currency, rate: 1.0)
- **TTD** - Trinidad & Tobago Dollar (rate: 6.75)
- **GYD** - Guyanese Dollar (rate: 207.98)
- **BBD** - Barbados Dollar (rate: 2.0)

### Currency Mappings

**Location**: `lib/helpers/rates.ts`

```typescript
// Exchange rates (USD as base)
const FIXED_RATES: ExchangeRates = {
  USD: 1.0,
  TTD: 6.75,
  GYD: 207.98,
  BBD: 2.0,
};

// Licensee to currency mapping
const LICENSEE_CURRENCY = {
  TTG: 'TTD',
  Cabana: 'GYD',
  Barbados: 'BBD',
};

// Country to currency mapping (for unassigned locations)
const COUNTRY_CURRENCY_MAP = {
  'Trinidad and Tobago': 'TTD',
  'Trinidad & Tobago': 'TTD',
  Trinidad: 'TTD',
  Guyana: 'GYD',
  Barbados: 'BBD',
};
```

### Conversion Functions

```typescript
// Convert from native currency to USD
export function convertToUSD(value: number, licenseeOrCurrency: string): number;

// Convert from USD to target currency
export function convertFromUSD(
  value: number,
  targetCurrency: CurrencyCode
): number;

// Get currency for a country
export function getCountryCurrency(countryName: string): CurrencyCode;

// Get currency for a licensee
export function getLicenseeCurrency(licenseeName: string): CurrencyCode;
```

### Conversion Flow

1. **Detect Native Currency**:
   - If location has licensee → Use licensee's currency
   - If location has no licensee → Use country's currency
   - Fallback to USD

2. **Convert to USD** (if needed):
   - Native Currency → USD using exchange rate

3. **Convert to Display Currency** (if needed):
   - USD → Display Currency using exchange rate

### When Conversion Applies

- **Admin/Developer viewing "All Licensees"**: Always converts to selected display currency
- **Single Licensee View**: Shows native currency (no conversion needed)
- **Multi-Licensee Aggregation**: Converts all to display currency for accurate totals

### API Implementation

```typescript
// Check if conversion is needed
const shouldConvert = shouldApplyCurrencyConversion(licensee);

if (shouldConvert) {
  // Get native currency for location
  const nativeCurrency =
    getLicenseeCurrency(licenseeName) ||
    getCountryCurrency(countryName) ||
    'USD';

  // Convert: Native → USD → Display
  const usdValue = convertToUSD(moneyIn, nativeCurrency);
  const displayValue = convertFromUSD(usdValue, displayCurrency);
}
```

---

## Role-Based Access Control

### System Overview

The system implements a hierarchical role-based access control (RBAC) system where users can have multiple roles, and their highest priority role determines their access level.

### Role Hierarchy

1. **Developer** - Full platform access with all permissions
2. **Admin** - High-level administrative functions with most system access
3. **Manager** - Operational oversight with management-level permissions
4. **Location Admin** - Location-specific management within assigned locations
5. **Vault Manager** - Vault management operations
6. **Cashier** - Cashier operations
7. **Technician** - Technical operations focused on machines and systems
8. **Collector** - Collection operations focused on money collection

### Access Control Philosophy

#### Multi-Role Users

- Users can have multiple roles assigned
- Access is determined by the highest priority role
- Example: A user with "Collector" + "Developer" gets full platform access

#### Progressive Access Model

- Higher roles inherit permissions from lower roles
- Each role has specific restrictions and allowances
- Direct link access allows specific use cases without navbar exposure

### Page Access Strategy

#### Dashboard Access

- **Allowed**: Developer, Admin, Manager, Location Admin
- **Restricted**: Vault Manager, Cashier, Technician, Collector

#### Machines Page

- **Allowed**: Developer, Admin, Manager, Location Admin, Technician, Collector
- **Rationale**: Machine data is needed for collections and technical operations

#### Locations Page

- **Allowed**: Developer, Admin, Manager, Location Admin, Collector
- **Restricted**: Vault Manager, Cashier, Technician
- **Direct Link Access**: Technicians can access location details via direct links

#### Members Page

- **Allowed**: Developer, Admin, Manager
- **Restricted**: Location Admin, Vault Manager, Cashier, Technician, Collector
- **Direct Link Access**: Location Admin and Technicians can access member details via direct links

#### Collection Reports Page

- **Allowed**: Developer, Admin, Manager, Location Admin, Collector
- **Restricted**: Vault Manager, Cashier, Technician

#### Sessions Page

- **Allowed**: Developer, Admin, Manager, Location Admin, Technician
- **Restricted**: Vault Manager, Cashier, Collector

#### Administration Page

- **Allowed**: Developer, Admin, Manager
- **Rationale**: System administration requires high security clearance

#### Vault Management System
The Vault Management System (VMS) handles cash movements, cashier shifts, float requests, and financial reconciliation.

- **Vault Dashboard:** Optimized grid for top 4 cashiers, real-time health metrics, and advanced charting.
- **Expenses Management:** Centralized tracking of operational costs with a default 7-day historical view.
- **Shift System:** Strict mandatory reconciliation for opening and blind-closing for cashiers.
- **Ledger:** Atomic tracking of every bill movement with full audit trails.

#### Location-Based Access

- Users can only see licensees for locations they have access to
- Multi-licensee users see "All" option for their accessible licensees
- Data filtering ensures users only see relevant information

#### Security Implementation

- All data queries filtered by user's accessible locations
- Licensee selection limited to user's permissions
- "All" option shows data for all accessible licensees

### Navigation Strategy

#### Navbar Hiding

- Navigation links hidden for roles without access
- Prevents confusion and unauthorized access attempts
- Clean interface based on user permissions

#### Direct Link Access

- Specific pages accessible via direct links for certain roles
- Technicians can access location details when needed
- Location Admins and Technicians can access member details when needed
- Maintains security while allowing necessary access

### Permission Checking System

The system uses a dual-layer permission checking approach:

1. **Local Permission Checks** (`lib/utils/permissions.ts`):
   - Fast client-side permission validation
   - Role-based page and tab access control
   - Navigation link visibility control

2. **Database Permission Checks** (`lib/utils/permissionsDb.ts`):
   - Server-side permission validation
   - Real-time user role verification
   - Fallback for security-sensitive operations

### Route Protection

All pages are protected using the `ProtectedRoute` component:

```typescript
<ProtectedRoute requiredPage="locations">
  <PageContent />
</ProtectedRoute>
```

---

## Performance Optimization Strategies

### Critical Performance Rules

#### 1. Cursor Usage for Meters Aggregations

**MANDATORY**: All `Meters.aggregate()` calls MUST use `.cursor({ batchSize: 1000 })` instead of `.exec()`

**Why:**

- Prevents loading large result sets into memory at once
- Significantly improves performance for 7d/30d periods
- Reduces memory usage and prevents timeouts

**Implementation:**

```typescript
// ✅ CORRECT - Use cursor for Meters aggregations
const results: Array<Record<string, unknown>> = [];
const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });

for await (const doc of cursor) {
  results.push(doc as Record<string, unknown>);
}

// ❌ INCORRECT - Don't use exec() for Meters
const results = await Meters.aggregate(pipeline).exec();
```

#### 2. Location Field Direct Access

**MANDATORY**: When aggregating Meters by location, use the `location` field directly

**Why:**

- Eliminates expensive `$lookup` operations from meters → machines → locations
- Uses existing index: `{ location: 1, readAt: 1 }`
- 10-20x performance improvement for 7d/30d periods

**Implementation:**

```typescript
// ✅ CORRECT - Use location field directly
const pipeline: PipelineStage[] = [
  {
    $match: {
      location: { $in: allLocationIds }, // Filter by location directly (uses index)
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $group: {
      _id: '$location', // Group by location field directly (no lookup needed!)
      totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
      totalCancelledCredits: {
        $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
      },
    },
  },
];

// ❌ INCORRECT - Expensive $lookup operation
const pipeline: PipelineStage[] = [
  {
    $match: {
      machine: { $in: allMachineIds },
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $lookup: {
      from: 'machines',
      localField: 'machine',
      foreignField: '_id',
      as: 'machineDetails',
    },
  },
  { $unwind: '$machineDetails' },
  {
    $addFields: { locationId: { $toString: '$machineDetails.gamingLocation' } },
  },
  {
    $group: {
      _id: '$locationId', // Much slower!
    },
  },
];
```

#### 3. N+1 Query Pattern Elimination

**MANDATORY**: Consolidate multiple sequential queries into single aggregations

**Pattern to Avoid:**

```typescript
// ❌ INCORRECT - N+1 query pattern
for (const location of locations) {
  const machines = await Machine.find({ gamingLocation: location._id });
  const machineIds = machines.map(m => m._id);
  const metrics = await Meters.aggregate([... { machine: { $in: machineIds } } ...]);
}
```

**Correct Pattern:**

```typescript
// ✅ CORRECT - Batch queries
const allLocationIds = locations.map(loc => loc._id);
const allMachines = await Machine.find({ gamingLocation: { $in: allLocationIds } }).lean();
const allMachineIds = allMachines.map(m => m._id);
const allMetrics = await Meters.aggregate([... { machine: { $in: allMachineIds } } ...]);
// Combine results in memory
```

#### 4. Gaming Day Offset Handling

For per-location gaming day offsets:

1. **Aggregate globally** with a wide date range
2. **Filter in memory** by location-specific gaming day ranges
3. **Avoid per-location aggregations** in loops

```typescript
// ✅ CORRECT - Global aggregation + in-memory filtering
const globalStart = earliestGamingDayStart;
const globalEnd = latestGamingDayEnd;

const aggregation = await Meters.aggregate([
  {
    $match: {
      location: { $in: allLocationIds },
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $group: {
      _id: '$location',
      totalDrop: { $sum: '$movement.drop' },
      minReadAt: { $min: '$readAt' },
      maxReadAt: { $max: '$readAt' },
    },
  },
]);

// Filter by gaming day ranges in memory
for (const agg of aggregation) {
  const locationId = String(agg._id);
  const gamingDayRange = gamingDayRanges.get(locationId);
  if (!gamingDayRange) continue;

  // Check overlap between aggregated range and location's gaming day range
  const hasOverlap =
    agg.minReadAt <= gamingDayRange.rangeEnd &&
    agg.maxReadAt >= gamingDayRange.rangeStart;
  if (hasOverlap) {
    // Use this aggregation result
  }
}
```

### Performance Targets

- **7d period**: <10 seconds (target: 5-10s)
- **30d period**: <15 seconds (target: 10-15s)
- **No timeouts**: All queries should complete within maxTimeMS limits
- **Memory efficiency**: Use cursors to prevent memory issues

### Query Optimization Checklist

When optimizing an API:

1. ✅ Use `.cursor({ batchSize: 1000 })` for all `Meters.aggregate()` calls
2. ✅ Use `location` field directly instead of `$lookup` to machines
3. ✅ Eliminate N+1 patterns with batch queries
4. ✅ Use `.lean()` for read-only queries
5. ✅ Use proper indexes (verify `{ location: 1, readAt: 1 }` exists on Meters)
6. ✅ Set appropriate `maxTimeMS` (120000ms for complex aggregations)
7. ✅ Use `allowDiskUse: true` for large aggregations

---

## Auditing and Logging

### API Logging Standards

#### Required Implementation

- **Use `APILogger` utility** (`app/api/lib/utils/logger.ts`) for all API endpoints
- **Log all CRUD operations** with success/failure status, duration, and context
- **Include user identification** when available for audit trail
- **Log security-relevant events** (login attempts, permission changes, data access)

#### Log Format

```
[timestamp] [level] [METHOD endpoint] duration - message [context]
```

#### Example Implementation

```typescript
import { apiLogger } from '../lib/services/loggerService';

export async function GET(request: NextRequest) {
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    const users = await getUsersFromDatabase();
    apiLogger.logSuccess(context, 'Users retrieved successfully', {
      count: users.length,
    });
    return NextResponse.json({ users });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    apiLogger.logError(context, 'Failed to retrieve users', errorMessage);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}
```

---

## Vault Management System

### Overview
The Vault Management System (VMS) is a specialized module for cash handling, float management, and cashier oversight. It operates in parallel with the CMS but uses a different layout and navigation context.

### Key Components
- **Vault Layout Wrapper**: `VaultLayoutWrapper.tsx` provides VAULT-specific navigation.
- **Float Management**: Tracking increase/decrease requests for cash desks.
- **Shift Management**: Cashier shift opening, closing, and reconciliation.
- **Financial Metrics**: Real-time tracking of vault liquidity, cashier floats, and machine soft counts.
- **Payouts**: Processing player payouts through the vault system.
- **Expense History**: Default 7-day view for recorded petty cash expenses.

---

## Development Guidelines

### Code Organization

#### File Structure

- **API routes**: `app/api/[path]/route.ts` - Maximum 400-500 lines
- **Helper functions**: `app/api/lib/helpers/[feature].ts` - Extract complex logic
- **Components**: `components/[feature]/[ComponentName].tsx` - Maximum 400-500 lines
- **Custom hooks**: `lib/hooks/[feature].ts` - Reusable stateful logic
- **Utilities**: `lib/utils/[utility].ts` - Pure functions

#### Separation of Concerns

- **API logic** → `app/api/lib/helpers/`
- **Frontend data fetching** → `lib/helpers/`
- **Pure utilities** → `lib/utils/` or `utils/`
- **UI components** → `components/`
- **Reusable UI** → `components/ui/`

### Code Quality Standards

#### TypeScript

- **Strict mode enabled** - All type errors must be resolved
- **No `any` types** - Create proper type definitions
- **No underscore prefixes** - Never prefix variables with underscores
- **Type organization** - All types in appropriate directories

#### ESLint

- **Never ignore ESLint rule violations**
- **Address all warnings and errors immediately**
- **Run `bun lint` regularly**
- **Use auto-fix when possible**: `bun lint --fix`

#### Comments & Documentation

- **File-level JSDoc** for all API routes, pages, and complex components
- **Step-by-Step Comments** in API routes with visual separators
- **Section comments** in components for organization
- **Remove redundant comments** that restate well-named code

### Security Guidelines

- **No secrets in client code** - All sensitive configuration in environment variables
- **Input validation and sanitization** - Validate all input on server side
- **Route protection** - Use middleware for authentication and authorization
- **HTTPS enforcement** - All communications must use secure protocols
- **Session management** - Secure JWT token handling with proper expiration

### Performance Standards

- **Memoize expensive computations** - Use `useMemo` for calculated values
- **Debounce user input** - Prevent excessive API calls
- **Avoid rendering waterfalls** - Batch network requests when possible
- **Track performance metrics** - Log slow operations (>1000ms)
- **Use proper code-splitting** - Lazy load large components
- **Implement proper cleanup** - Remove event listeners, timeouts, subscriptions

### Loading States & Skeleton Loaders

**MANDATORY**: Every page and component with async data MUST use specific skeleton loaders

- **Content-specific skeletons** - Each page/tab has its own skeleton matching exact layout
- **Visual accuracy** - Exact dimensions, spacing, and structure as real content
- **Use Shadcn Skeleton component** - Located in `components/shared/ui/skeletons/`
- **NO generic loading states** - Never use "Loading..." text or generic spinners

---

## Related Documentation

For detailed implementation guidelines, refer to:

- **Frontend Guidelines**: `Documentation/frontend/FRONTEND_GUIDELINES.md`
- **Backend Guidelines**: `Documentation/backend/BACKEND_GUIDELINES.md`
- **Performance Optimization Guide**: `Documentation/PERFORMANCE_OPTIMIZATION_GUIDE.md`
- **Next.js Rules**: `.cursor/rules/nextjs-rules.mdc`

---

**Last Updated**: January 2026  
**Version**: 5.0.0  
**Maintained By**: Evolution One CMS Development Team

### Critical Performance Rules

#### 1. Cursor Usage for Meters Aggregations

**MANDATORY**: All `Meters.aggregate()` calls MUST use `.cursor({ batchSize: 1000 })` instead of `.exec()`

**Why:**

- Prevents loading large result sets into memory at once
- Significantly improves performance for 7d/30d periods
- Reduces memory usage and prevents timeouts

**Implementation:**

```typescript
// ✅ CORRECT - Use cursor for Meters aggregations
const results: Array<Record<string, unknown>> = [];
const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });

for await (const doc of cursor) {
  results.push(doc as Record<string, unknown>);
}

// ❌ INCORRECT - Don't use exec() for Meters
const results = await Meters.aggregate(pipeline).exec();
```

#### 2. Location Field Direct Access

**MANDATORY**: When aggregating Meters by location, use the `location` field directly

**Why:**

- Eliminates expensive `$lookup` operations from meters → machines → locations
- Uses existing index: `{ location: 1, readAt: 1 }`
- 10-20x performance improvement for 7d/30d periods

**Implementation:**

```typescript
// ✅ CORRECT - Use location field directly
const pipeline: PipelineStage[] = [
  {
    $match: {
      location: { $in: allLocationIds }, // Filter by location directly (uses index)
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $group: {
      _id: '$location', // Group by location field directly (no lookup needed!)
      totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
      totalCancelledCredits: {
        $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
      },
    },
  },
];

// ❌ INCORRECT - Expensive $lookup operation
const pipeline: PipelineStage[] = [
  {
    $match: {
      machine: { $in: allMachineIds },
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $lookup: {
      from: 'machines',
      localField: 'machine',
      foreignField: '_id',
      as: 'machineDetails',
    },
  },
  { $unwind: '$machineDetails' },
  {
    $addFields: { locationId: { $toString: '$machineDetails.gamingLocation' } },
  },
  {
    $group: {
      _id: '$locationId', // Much slower!
    },
  },
];
```

#### 3. N+1 Query Pattern Elimination

**MANDATORY**: Consolidate multiple sequential queries into single aggregations

**Pattern to Avoid:**

```typescript
// ❌ INCORRECT - N+1 query pattern
for (const location of locations) {
  const machines = await Machine.find({ gamingLocation: location._id });
  const machineIds = machines.map(m => m._id);
  const metrics = await Meters.aggregate([... { machine: { $in: machineIds } } ...]);
}
```

**Correct Pattern:**

```typescript
// ✅ CORRECT - Batch queries
const allLocationIds = locations.map(loc => loc._id);
const allMachines = await Machine.find({ gamingLocation: { $in: allLocationIds } }).lean();
const allMachineIds = allMachines.map(m => m._id);
const allMetrics = await Meters.aggregate([... { machine: { $in: allMachineIds } } ...]);
// Combine results in memory
```

#### 4. Gaming Day Offset Handling

For per-location gaming day offsets:

1. **Aggregate globally** with a wide date range
2. **Filter in memory** by location-specific gaming day ranges
3. **Avoid per-location aggregations** in loops

```typescript
// ✅ CORRECT - Global aggregation + in-memory filtering
const globalStart = earliestGamingDayStart;
const globalEnd = latestGamingDayEnd;

const aggregation = await Meters.aggregate([
  {
    $match: {
      location: { $in: allLocationIds },
      readAt: { $gte: globalStart, $lte: globalEnd },
    },
  },
  {
    $group: {
      _id: '$location',
      totalDrop: { $sum: '$movement.drop' },
      minReadAt: { $min: '$readAt' },
      maxReadAt: { $max: '$readAt' },
    },
  },
]);

// Filter by gaming day ranges in memory
for (const agg of aggregation) {
  const locationId = String(agg._id);
  const gamingDayRange = gamingDayRanges.get(locationId);
  if (!gamingDayRange) continue;

  // Check overlap between aggregated range and location's gaming day range
  const hasOverlap =
    agg.minReadAt <= gamingDayRange.rangeEnd &&
    agg.maxReadAt >= gamingDayRange.rangeStart;
  if (hasOverlap) {
    // Use this aggregation result
  }
}
```

### Performance Targets

- **7d period**: <10 seconds (target: 5-10s)
- **30d period**: <15 seconds (target: 10-15s)
- **No timeouts**: All queries should complete within maxTimeMS limits
- **Memory efficiency**: Use cursors to prevent memory issues

### Query Optimization Checklist

When optimizing an API:

1. ✅ Use `.cursor({ batchSize: 1000 })` for all `Meters.aggregate()` calls
2. ✅ Use `location` field directly instead of `$lookup` to machines
3. ✅ Eliminate N+1 patterns with batch queries
4. ✅ Use `.lean()` for read-only queries
5. ✅ Use proper indexes (verify `{ location: 1, readAt: 1 }` exists on Meters)
6. ✅ Set appropriate `maxTimeMS` (120000ms for complex aggregations)
7. ✅ Use `allowDiskUse: true` for large aggregations

---

## Auditing and Logging

### API Logging Standards

#### Required Implementation

- **Use `APILogger` utility** (`app/api/lib/utils/logger.ts`) for all API endpoints
- **Log all CRUD operations** with success/failure status, duration, and context
- **Include user identification** when available for audit trail
- **Log security-relevant events** (login attempts, permission changes, data access)

#### Log Format

```
[timestamp] [level] [METHOD endpoint] duration - message [context]
```

#### Example Implementation

```typescript
import { apiLogger } from '../lib/services/loggerService';

export async function GET(request: NextRequest) {
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    const users = await getUsersFromDatabase();
    apiLogger.logSuccess(context, 'Users retrieved successfully', {
      count: users.length,
    });
    return NextResponse.json({ users });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    apiLogger.logError(context, 'Failed to retrieve users', errorMessage);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}
```

### Activity Logging Requirements

#### Data Change Tracking

- **Track all user actions** that modify system data or access sensitive information
- **Record before/after values** for data changes to enable rollback and audit
- **Include IP addresses and user agents** for security investigation
- **Store logs in dedicated collections** with proper indexing for performance

#### Log Retention

- **Implement log retention policies** according to regulatory requirements
- **Archive old logs** while maintaining accessibility for investigations
- **Ensure secure storage** with encryption for sensitive audit data

### Compliance Considerations

#### Gaming Regulations

- **Detailed audit trails** for all financial transactions
- **Transaction integrity** monitoring and verification
- **User access logging** for privileged operations
- **Data modification tracking** with full audit trails

#### Data Protection Laws

- **Personal data access logging** for GDPR/privacy compliance
- **Data modification tracking** with user attribution
- **Access pattern monitoring** for security analysis
- **Consent and permission tracking** for data processing

---

## Development Guidelines

### Code Organization

#### File Structure

- **API routes**: `app/api/[path]/route.ts` - Maximum 400-500 lines
- **Helper functions**: `app/api/lib/helpers/[feature].ts` - Extract complex logic
- **Components**: `components/[feature]/[ComponentName].tsx` - Maximum 400-500 lines
- **Custom hooks**: `lib/hooks/[feature].ts` - Reusable stateful logic
- **Utilities**: `lib/utils/[utility].ts` - Pure functions

#### Separation of Concerns

- **API logic** → `app/api/lib/helpers/`
- **Frontend data fetching** → `lib/helpers/`
- **Pure utilities** → `lib/utils/` or `utils/`
- **UI components** → `components/`
- **Reusable UI** → `components/ui/`

### Code Quality Standards

#### TypeScript

- **Strict mode enabled** - All type errors must be resolved
- **No `any` types** - Create proper type definitions
- **No underscore prefixes** - Never prefix variables with underscores
- **Type organization** - All types in appropriate directories

#### ESLint

- **Never ignore ESLint rule violations**
- **Address all warnings and errors immediately**
- **Run `bun lint` regularly**
- **Use auto-fix when possible**: `bun lint --fix`

#### Comments & Documentation

- **File-level JSDoc** for all API routes, pages, and complex components
- **Step-by-step comments** in API routes with visual separators
- **Section comments** in components for organization
- **Remove redundant comments** that restate well-named code

### Security Guidelines

- **No secrets in client code** - All sensitive configuration in environment variables
- **Input validation and sanitization** - Validate all input on server side
- **Route protection** - Use middleware for authentication and authorization
- **HTTPS enforcement** - All communications must use secure protocols
- **Session management** - Secure JWT token handling with proper expiration

### Performance Standards

- **Memoize expensive computations** - Use `useMemo` for calculated values
- **Debounce user input** - Prevent excessive API calls
- **Avoid rendering waterfalls** - Batch network requests when possible
- **Track performance metrics** - Log slow operations (>1000ms)
- **Use proper code-splitting** - Lazy load large components
- **Implement proper cleanup** - Remove event listeners, timeouts, subscriptions

### Loading States & Skeleton Loaders

**MANDATORY**: Every page and component with async data MUST use specific skeleton loaders

- **Content-specific skeletons** - Each page/tab has its own skeleton matching exact layout
- **Visual accuracy** - Exact dimensions, spacing, and structure as real content
- **Use Shadcn Skeleton component** - Located in `components/ui/skeletons/`
- **NO generic loading states** - Never use "Loading..." text or generic spinners

---

## Related Documentation

For detailed implementation guidelines, refer to:

- **Frontend Guidelines**: `Documentation/frontend/FRONTEND_GUIDELINES.md`
- **Backend Guidelines**: `Documentation/backend/BACKEND_GUIDELINES.md`
- **Performance Optimization Guide**: `Documentation/PERFORMANCE_OPTIMIZATION_GUIDE.md`
- **Next.js Rules**: `.cursor/rules/nextjs-rules.mdc`

---

**Last Updated**: January 2026  
**Version**: 4.1.0  
**Maintained By**: Evolution One CMS Development Team
