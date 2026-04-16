# Activity Logs API Flow

This document details the high-level logic for managing activity logs via the `/api/activity-logs` route.

## General Pattern
All activity log routes utilize the `withApiAuth` wrapper, which ensures:
1.  **Token Verification**: Checks for a valid JWT in cookies or Authorization header.
2.  **Database Connection**: Ensures a stable connection to MongoDB.
3.  **Context Injection**: Provides the handler with the authenticated `user`, their `userRoles`, and an `isAdminOrDev` flag.

---

## 1. GET (Fetch Logs)
Fetches activity logs with support for advanced filtering and role-based access.

### Filters
*   **Actor**: `userId`, `username`, `email`.
*   **Action**: `action` (e.g., CREATE, UPDATE, DELETE).
*   **Target**: `resource` (e.g., machine, location), `resourceId`.
*   **Time Range**: `startDate`, `endDate`.
*   **Search**: Global search across username, email, description, and IDs.

### Role-Based Access Control (RBAC)
The API restricts which logs a user can see based on their role:
1.  **Admin / Developer**: Can see all logs without restriction.
2.  **Manager**:
    *   Retrieves `assignedLicencees`.
    *   Finds all locations and machines associated with those licencees.
    *   Finds all users who also share those licencees.
    *   Filters logs to only those involving these locations, machines, or users.
3.  **Location Admin**:
    *   Retrieves `assignedLocations`.
    *   Finds all machines and users associated with those specific locations.
    *   Filters logs to only those involving these locations, machines, or users.

### Execution Logic
1.  **Pagination**: Uses `page`, `limit`, and `skip`.
2.  **Search Ranking**: If a search term is provided, it uses a MongoDB aggregation pipeline to rank results by relevance (e.g., prefix match on username has higher weight).
3.  **Response**: Returns `{ activities: [], pagination: {} }`.

---

## 2. POST (Create Log)
Manually creates a new activity log entry.

### Steps
1.  **Parse Body**: Extracts `action`, `resource`, `resourceId`, etc.
2.  **Change Tracking**:
    *   If `previousData` and `newData` are provided, it calls `calculateChanges` to generate a diff description.
3.  **Enrichment**:
    *   Retrieves IP address and user agent from the request.
    *   Sets actor information (ID, email, role).
4.  **Save**: Persists the log document to MongoDB.
5.  **Response**: Returns `{ success: true, activityLog }`.
