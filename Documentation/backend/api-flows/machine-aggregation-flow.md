# API Flow: Machine Aggregation (`/api/machines/aggregation`)

This flows describes the high-level logic and checks for the machines aggregation API, which powers the Cabinets and Dashboard tables.

```mermaid
sequenceDiagram
    participant Client
    participant API as aggregation/route.ts
    participant DB as MongoDB
    participant Auth as withApiAuth Helper

    Client->>API: GET /api/machines/aggregation
    API->>Auth: Wrap Request
    Auth->>DB: connectDB()
    Auth->>Auth: getUserFromServer()
    Auth-->>API: context (user, userRoles, isAdminOrDev)

    rect rgb(240, 240, 240)
    Note over API: STEP 1: Parse Params
    API->>API: Parse locationId, timePeriod, search, etc.
    end

    rect rgb(240, 240, 240)
    Note over API: STEP 2: Permissions Audit
    API->>API: getUserAccessibleLicenceesFromToken()
    API->>API: getUserLocationFilter() -> allowedLocationIds
    end

    rect rgb(240, 240, 240)
    Note over API: STEP 3: Aggregation Logic (optimized)
    alt TimePeriod in ['7d', '30d']
        API->>DB: Meters.aggregate (sequential 7/30 day buckets)
    else TimePeriod in ['Today', 'Yesterday', 'Custom']
        API->>DB: Meters.aggregate (batch sum of movements)
    end
    DB-->>API: raw metrics (moneyIn, moneyOut, jackpot, etc.)
    end

    rect rgb(240, 240, 240)
    Note over API: STEP 4: Jackpot & Calculations
    API->>API: rawMoneyOut = totalCancelledCredits
    API->>API: moneyOut = rawMoneyOut + (includeJackpot ? jackpot : 0)
    API->>API: gross = moneyIn - moneyOut
    API->>API: netGross = moneyIn - rawMoneyOut - jackpot
    end

    rect rgb(240, 240, 240)
    Note over API: STEP 5: Currency Conversion (Admin Only)
    API->>API: If "All Licencees" -> convert all to display currency
    end

    API-->>Client: 200 OK (Paginated Results)
```

## Detailed Logical Steps

### 1. Data Parsing & Validation
- **Authentication**: Using `withApiAuth` wrapper to ensure DB connection and user identification via JWT token.
- **Param Handling**: Handles both `licencee` and `licencee` spellings. Supports multiple `locationId` and `gameType` provided as comma-separated lists.

### 2. Permissions & Filtering
- **RBAC**: Fetches all licencees the user has access to.
- **Location Intersection**: Intersects requested locations with the user's permission set.
- **Admin Bypass**: If a developer/admin specifically requests a `locationId`, we bypass the allowed-set restriction to ensure they can see forensic data.
- **Technician Mode**: If a user is **only** a technician, `timePeriod` is forced to `LastHour` to focus on recent data.

### 3. Aggregation Strategy
- **Sequential (7d/30d)**: Focuses on day-by-day buckets for trending.
- **Batch (Today/Yesterday/Custom)**: Highly optimized sum of the `movement` object fields (deltas). Unlike cumulative meters, this is immune to RAM clears and meter wraps.

### 4. Financial Rules (Jackpot Logic)
- **Base Total**: `movement.totalCancelledCredits` is stored as the "Base" cancelled credits.
- **Total Money Out**: Conditionally adds `movement.jackpot` ONLY IF the `includeJackpot` flag is active for the licencee.
- **Gross Profit**: `Money In - Total Money Out`.
- **Net Profit**: Always subtracts both Cancelled Credits and Jackpots, providing "true" profitability data for internal review.

### 5. Multi-Currency Support (Conversion)
- **Native Currency**: Each machine's data is natively stored in the licencee's native currency (e.g., GYD, TTD).
- **Admin Conversion**: To provide a unified view, the API converts values on-the-fly (`Native -> USD -> DisplayCurrency`) when viewing across all licencees.
