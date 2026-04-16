# Licencee Management API Flow

This document details the high-level logic for managing licencees via the `/api/licencees` route.

## General Pattern
All licencee management routes utilize the `withApiAuth` wrapper, which performs:
1.  **Token Verification**: Checks for a valid JWT in cookies or Authorization header.
2.  **Database Connection**: Ensures a stable connection to MongoDB.
3.  **Context Injection**: Provides the handler with the authenticated `user`, their `userRoles`, and an `isAdminOrDev` flag.
4.  **Error Handling**: Catches any unhandled exceptions and returns a standardized 500 error response.

---

## 1. GET (Fetch Licencees)
Fetches one or more licencees based on access control and filters.

### Steps
1.  **Parse Parameters**: Extracts `licencee` filter from search params.
2.  **Determine Accessible Licencees**: Calls `getUserAccessibleLicenceesFromToken` to get the list of licencee IDs the current user is authorized to see.
3.  **Filter Logic**:
    *   **RBAC**: If user's access is limited (not 'all'), filters the licencee list to only those in the allowed IDs.
    *   **Manual Filter**: If a `licencee` ID or name is provided in the query params, further filters the list to only that specific licencee.
4.  **Pagination**:
    *   Extracts `page` and `limit` from query params.
    *   Caps the `limit` at 100 to prevent performance issues.
    *   Slices the formatted licencee list based on the calculated skip and limit.
5.  **Response**: Returns `{ licenceees: [], pagination: {} }`.

---

## 2. POST (Create Licencee)
Creates a new licencee in the system.

### Steps
1.  **Parse Body**: Extracts fields like `name`, `country`, `description`, etc.
2.  **Validation**: Ensures `name` and `country` are provided.
3.  **Persistence**:
    *   Calls the `createLicenceeHelper` function.
    *   Saves the licencee document to the database.
4.  **Response**: Returns `{ success: true, licencee: data }`.

---

## 3. PUT (Update Licencee)
Updates an existing licencee.

### Steps
1.  **Parse Body**: Extracts `_id` and updated fields.
2.  **Validation**: Ensures `_id` is provided.
3.  **Persistence**:
    *   Calls the `updateLicenceeHelper` function.
    *   Updates the licencee document in the database.
4.  **Response**: Returns updated licencee data.

---

## 4. DELETE (Delete Licencee)
Permanently removes a licencee.

### Steps
1.  **Parse ID**: Extracts `_id` from the request body.
2.  **Validation**: Ensures `_id` is provided.
3.  **Persistence**: Calls `deleteLicenceeHelper` to remove the document.
4.  **Response**: Returns `{ success: true }`.
