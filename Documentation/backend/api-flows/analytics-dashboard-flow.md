# Analytics Dashboard API Flow

This document details the high-level logic for providing top-level analytics for the Evo-One CMS dashboard via the `/api/analytics/dashboard` route.

## General Pattern
All analytics dashboard routes utilize the `withApiAuth` wrapper, which performs:
1.  **Token Verification**: Checks for a valid JWT in cookies or Authorization header.
2.  **Database Connection**: Ensures a stable connection to MongoDB.
3.  **Context Injection**: Provides the handler with the authenticated `user`, their `userRoles`, and an `isAdminOrDev` flag.

---

## 1. GET (Fetch Analytics)
Fetches aggregated financial and machine count data for the dashboard.

### Input Parameters
*   **Time Period**: `timePeriod` (e.g., Today, Yesterday, 7d, 30d, Custom).
*   **Date Range**: `startDate`, `endDate`.
*   **Licencee**: `licencee` ID filter.
*   **Currency**: `currency` for display and conversion.

### Processing Logic
1.  **Date Range Calculation**:
    *   Determines the comparison period (e.g., if "Today" is selected, the comparison is "Yesterday").
    *   Calculates start and end dates based on the requested `timePeriod`.
2.  **Financial Metrics**:
    *   Finds all machine meters within the current and comparison periods.
    *   Calculates total **Money In**, **Money Out**, and **Gross Revenue** for both periods.
    *   Computes percentage changes (growth/decline) between the current and previous periods.
3.  **Machine Status Counts**:
    *   Finds all active machines based on the licencee filter.
    *   Counts total machines.
    *   Identifies machines by `assetStatus` (e.g., Active, Maintenance, Storage).
    *   Determines online vs. offline status based on the last heartbeat.
4.  **Top Metrics**:
    *   Identifies top 5 machines by revenue.
    *   Identifies top 5 locations by revenue.
5.  **Location Grouping**:
    *   Aggregates data by location for the dashboard's location list.

### Response Structure
Returns a JSON object containing:
- `summary`: Current totals (Money In, Money Out, Gross, Machines).
- `comparison`: Percentage change versus previous period.
- `machines`: Breakdowns by status and online/offline.
- `lists`: Top machines, top locations, and full location breakdown.
- `currency`: The currency used for the returned amounts.
