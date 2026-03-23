# Financial Calculation Engine (The Core)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 23, 2026  
**Version:** 4.0.0

---

## 1. System Overview

The Calculation Engine is the mathematical foundation of Evolution One. It is responsible for transforming raw hex-meters and periodic snapshots into a consistent, audit-ready financial timeline.

---

## 2. Primary Accounting Methodologies

### 💹 The "Movement Delta" Method
This is the **primary method** for all Dashboard and Real-time reporting.
- **How "Money In" works**: Instead of looking at cumulative meter values, the system pre-calculates the "diff" between every 15-minute SAS poll.
- **Query Snippet**: 
  ```typescript
  // Summing the pre-calculated diffs in the Meters collection
  { $sum: "$movement.drop" }
  ```
- **Why?**: This prevents "Ghost Revenue" issues during RAM clears or hardware swaps. If a machine's cumulative meter resets to 0, only the 15-minute movement is affected, preserving the historical truth.

---

## 3. Logic: Gross vs. Net Revenue

### 💎 Jackpot Interaction (Gross vs. Net Revenue)
The system supports two reporting "Visions" based on the Licencee's `includeJackpot` flag.

- **Vision A (Default Gross)**: `Money Out = Base Cancelled Credits`. Jackpots are treated as separate operational expenses.
- **Vision B (Additive Gross)**: `Money Out = Base Cancelled Credits + Jackpots`. All payouts to players are consolidated into a single "Money Out" figure.
- **Universal Net Gross**: Regardless of the `includeJackpot` flag, the system always calculates `Net Gross = Money In - Base Cancelled Credits - Jackpots`. This provides the true "bottom line" profit for internal review.

#### The Formula (Implementation)
The aggregation engine applies the logic as follows:
```typescript
const moneyOut = rawMoneyOut + (includeJackpot ? jackpot : 0);
const gross = moneyIn - moneyOut;
const netGross = moneyIn - rawMoneyOut - jackpot;
```
- **Role Detection**: The engine detects the `includeJackpot` flag from the Licencee model at the moment of API query to ensure the Dashboard, Cabinets Table, and Collection Report always show identical numbers.

---

## 4. Time & Gaming Day Normalization

### 🕒 The 8 AM Offset (Trinidad Standard)
Casino operations do not end at midnight. The engine uses a "Gaming Day" logic:
- **How it works**: A session occurring at 3 AM on Tuesday is attributed to the "Monday Gaming Day."
- **Logic**: Implementation resides in `getGamingDayRangeForPeriod.ts`. It shifts the audit window by `-8 hours` before querying the database.

### 🌐 UTC Baseline
- **Storage**: All timestamps are stored as **UTC** in MongoDB.
- **Data Transfer**: The API transmits pure UTC ISO strings to the client, maintaining a single source of truth and avoiding manual server-side offsets.
- **Display**: The application utilizes the **user's browser local timezone** for all UI formatting. This ensures managers in any part of the world (e.g., Japan, London, or Trinidad) see data correctly relative to their own local time without hardcoded system shifts.

---

## 5. Failure Recovery & Bridges

### 🌉 RAM Clear Bridge Logic
When hardware is reset, cumulative meters drop to zero. 
- **The Check**: `if (currentMeter < previousMeter)`.
- **The Fix**: The engine detects the reset and uses the **Floor Count** (or the movement from the last 15 mins) to bridge the gap, preventing the system from showing negative revenue.

### 🚧 History Gaps
If a SMIB is offline for a week, the engine identifies the "Missing Period" and generates a `Bridge entry` during the next collection to maintain continuity in the 30-day performance charts.

---
**Core Technical Document** - Evolution One Engineering
