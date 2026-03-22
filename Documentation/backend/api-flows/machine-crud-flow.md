# Machine CRUD API Flow

This document details the high-level logic for managing gaming machines via the `/api/machines` route.

## General Pattern
All machine management routes utilize the `withApiAuth` wrapper, which performs:
1.  **Token Verification**: Checks for a valid JWT in cookies or Authorization header.
2.  **Database Connection**: Ensures a stable connection to MongoDB.
3.  **Context Injection**: Provides the handler with the authenticated `user`, their `userRoles`, and an `isAdminOrDev` flag.
4.  **Error Handling**: Catches any unhandled exceptions and returns a standardized 500 error response.

---

## 1. GET (Fetch Machines)
Fetches one or more gaming machines based on ID or Location.

### Steps
1.  **Parse Parameters**: Extracts `id`, `locationId`, and `archived` from search params.
2.  **Validation**: Ensures at least an `id` or `locationId` is provided.
3.  **Fetch Logic**:
    *   **By ID**:
        1.  Finds the machine using `findOne({ _id: id })`.
        2.  Verifies the user has access to the machine's location using `checkUserLocationAccess`.
        3.  If no access and not Admin/Dev, returns 403 Forbidden.
    *   **By Location**:
        1.  Verifies the user has access to the specified `locationId`.
        2.  Filters out archived (deleted) machines unless the `archived=true` flag is set.
        3.  Fetches all matching machines from the database.
4.  **Timezone Normalization**: Converts all timestamps in the result to Trinidad Time.
5.  **Response**: Returns `{ success: true, data: results }`.

---

## 2. POST (Create Machine)
Creates a new gaming machine in the system.

### Steps
1.  **Parse Body**: Extracts fields like `serialNumber`, `smibBoard`, `gamingLocation`, etc.
2.  **Field Validation**:
    *   **Serial Number**: Must be at least 3 characters.
    *   **SMIB Board**: Must be exactly 12 hexadecimal characters and end with 0, 4, 8, or c.
3.  **Normalization**:
    *   Converts `serialNumber` to uppercase.
    *   Converts `smibBoard` to lowercase.
4.  **Persistence**:
    *   Generates a new MongoDB ID.
    *   Sets `isSasMachine` based on `isCronosMachine` toggle.
    *   Saves the machine document to the database.
5.  **Cache Revalidation**: Triggers `revalidatePath` for `/cabinets` and `/machines` to update the frontend.
6.  **Response**: Returns the created machine data with Trinidad Time conversion.

---

## 3. PUT (Update Machine)
Updates an existing gaming machine.

### Steps
1.  **Parse ID**: Extracts the machine `id` from search params.
2.  **Find & Update**:
    *   Uses `findOneAndUpdate({ _id: id }, { $set: data }, { new: true })`.
    *   Returns 404 if the machine doesn't exist.
3.  **Cache Revalidation**: Triggers `revalidatePath`.
4.  **Response**: Returns the updated machine data.

---

## 4. DELETE (Delete Machine)
Removes a machine from the active list.

### Steps
1.  **Parse ID**: Extracts the machine `id` from search params.
2.  **Identify Delete Type**:
    *   **Hard Delete**: Permanently removes the document. Only allowed for Admin/Dev.
    *   **Soft Delete**: Sets `deletedAt` and `updatedAt` to the current timestamp.
3.  **Persistence**: Performs `deleteOne` or `findOneAndUpdate` based on authorization and request parameters.
4.  **Cache Revalidation**: Triggers `revalidatePath`.
5.  **Response**: Returns a success message.
