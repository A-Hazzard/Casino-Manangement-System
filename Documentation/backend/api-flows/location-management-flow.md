# Location Management API Flow

This document details the high-level logic for managing gaming locations via the `/api/gaming-locations` route.

## General Pattern
All location management routes utilize the `withApiAuth` wrapper, which performs:
1.  **Token Verification**: Checks for a valid JWT in cookies or Authorization header.
2.  **Database Connection**: Ensures a stable connection to MongoDB.
3.  **Context Injection**: Provides the handler with the authenticated `user`, their `userRoles`, and an `isAdminOrDev` flag.
4.  **Error Handling**: Catches any unhandled exceptions and returns a standardized 500 error response.

---

## 1. GET (Fetch Locations)
Fetches one or more gaming locations based on licencee, IDs, and search params.

### Steps
1.  **Parse Parameters**: Extracts `licencee`, `licencees` (comma-separated), `ids` (comma-separated), and `includeDeleted` from search params.
2.  **Query Construction**:
    *   **Soft Delete Filter**: By default, excludes deleted locations (checks `deletedAt` is null or before 2025).
    *   **Licencee Filter**: If `licencees` or `licencee` provided, adds a filter to the `rel.licencee` field.
    *   **ID Filter**: If `ids` provided, overrides other filters and returns only those specific IDs.
3.  **Fetch Logic**:
    *   Finds matching locations using `GamingLocations.find(query)`.
    *   Selects only necessary fields (`_id`, `name`, `rel.licencee`) for performance.
    *   Sorts the results by name.
4.  **Formatting**:
    *   Maps results to a flattened structure.
    *   Extracts the primary licencee ID from the `rel.licencee` array or field.
5.  **Response**: Returns the formatted locations array.

---

## Example Response Format
```json
[
  {
    "_id": "64b1f...",
    "id": "64b1f...",
    "name": "The Grand Casino",
    "licenceeId": "64b2a..."
  }
]
```
