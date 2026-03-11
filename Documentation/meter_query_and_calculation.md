# Meter Queries and Calculation Logic

This document details how machine meters (Money In, Money Out, Gross) are queried, filtered by time, and calculated, including the application of location-specific gaming day offsets.

## 1. Frontend Query Generation
The frontend initiates the data fetch through the `fetchCabinets` (or `fetchCabinetTotals`) helper.

- **File:** `lib/helpers/cabinets/helpers.ts`
- **Logic:**
  - If a **Custom** date range is selected, it checks if specific times were chosen.
  - **With Time:** Uses `formatLocalDateTimeString` to send a localized timestamp (e.g., `2026-03-09T10:00:00-04:00`).
  - **Date Only:** Sends simple ISO date strings (e.g., `2026-03-09`).
- **Code Reference:** `lib/helpers/cabinets/helpers.ts` (Lines 74-100)

## 2. API Parameter Parsing
The backend API receives these parameters and prepares them for the gaming day offset system.

- **File:** `app/api/machines/aggregation/route.ts`
- **Logic:**
  - Extracts `timePeriod`, `startDate`, and `endDate`.
  - Determines if the date string is timezone-aware (contains 'T') or date-only.
  - Converts date-only strings to midnight UTC for normalization.
- **Code Reference:** `app/api/machines/aggregation/route.ts` (Lines 184-218)

## 3. Gaming Day Offset System
The system calculates a unique `rangeStart` and `rangeEnd` for each location based on its specific `gameDayOffset`.

- **File:** `lib/utils/gamingDayRange.ts`
- **Utility:** `getGamingDayRangesForLocations`
- **Logic:**
  - If a location has a `gameDayOffset` of 8 (8 AM), a "Today" query for March 9th actually queries from **March 9th 08:00:00** to **March 10th 07:59:59**.
  - This ensures that financial totals align with the location's operational day rather than calendar midnight.
- **Code Reference:** `app/api/machines/aggregation/route.ts` (Lines 264-272)

## 4. Database Aggregation
The metrics are aggregated from the `Meters` collection using MongoDB pipelines.

- **Collection:** `meters`
- **Key Fields:**
  - `movement.drop`: The delta in Money In since the last read.
  - `movement.totalCancelledCredits`: The delta in Money Out since the last read.
- **Logic:**
  - Filters by machine IDs and the calculated `readAt` range (respecting the gaming day).
  - Groups by machine to sum up the movements.
- **Code Reference:**
  - **Optimized (30d/7d):** `app/api/machines/aggregation/route.ts` (Lines 405-444)
  - **Standard (Today/Yesterday):** `app/api/machines/aggregation/route.ts` (Lines 703-720)

## 5. Denomination and Gross Calculation
After aggregating raw movements, the system applies the machine's specific multipliers.

- **Calculation:**
  - `Money In = Sum(movement.drop) * collectorDenomination`
  - `Money Out = Sum(movement.totalCancelledCredits) * collectorDenomination`
  - `Gross = Money In - Money Out`
- **Code Reference:** `app/api/machines/aggregation/route.ts` (Lines 493-497)

## 6. Summary Totals
For page-level summaries (Location Details or Cabinet Lists), the same logic is used but summarized into a single object.

- **File:** `lib/helpers/cabinets/helpers.ts` -> `fetchCabinetTotals`
- **API:** `/api/machines/aggregation/totals`
- **Logic:** Mirrors the aggregation logic but returns a single object with `moneyIn`, `moneyOut`, and `gross` for the entire selection.
