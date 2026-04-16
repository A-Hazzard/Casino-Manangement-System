# User Management API Flow

This document details the high-level logic for managing system users via the `/api/users` route.

## General Pattern
All user management routes utilize the `withApiAuth` wrapper, ensuring:
1.  **Token Verification**: Robust JWT check and user extraction.
2.  **Database Connection**: Consistent MongoDB connection management.
3.  **Context Injection**: Handlers receive `user`, `userRoles`, and `isAdminOrDev`.

---

## 1. GET (Fetch Users)
Fetches users with complex role-based routing and filtering.

### Key Logic
*   **Renaming/Aliasing**: Correctly handles destructuring `user: currentUser` to avoid collisions and satisfy linting.
*   **Permission Extraction**: Extracts `assignedLicencees` and `assignedLocations` from the current user's session.
*   **Routing based on `status` or `role`**:
    *   `status=deleted`: Routed to `handleDeletedUsersRequest` (Admin/Manager/Location Admin only).
    *   `role=cashier`: Routed to `handleCashiersRequest` (restricted access).
    *   Default: Routed to `handleAllUsersRequest`.

### RBAC Enforcement
*   **Admins/Developers**: Full access to all user lists.
*   **Managers**: Restricted to users within their assigned licencees.
*   **Location Admins**: Restricted to users within their assigned locations.

---

## 2. POST (Create User)
Creates a new user with strict validation requirements.

### Logic Flow
1.  **Mandatory Fields**: Validates existence of `username`, `emailAddress`, `password`, and `profile.gender`.
2.  **Email Validation**: Uses `validateEmail` utility.
3.  **Password Strength**: Uses `validatePasswordStrength` to enforce security standards.
4.  **Persistence**: Calls `createUserHelper` to hash passwords and save the document.
5.  **Conflict Handling**: Specifically catches and reports "Username already exists" or "Email already exists" with a 409 status code.

---

## 3. PUT (Update User)
Updates existing user details.

### Steps
1.  **ID Verification**: Ensures `_id` is provided in the body.
2.  **Helper Call**: Uses `updateUserHelper` to handle the update logic.
3.  **Post-processing**: Converts the updated Mongoose document to a plain object and ensures permissions are correctly formatted.

---

## 4. DELETE (Remove User)
Soft or hard deletes a user.

### Steps
1.  **ID Verification**: Ensures `_id` is provided.
2.  **Helper Call**: Uses `deleteUserHelper` to handle the removal.
3.  **Error Handling**: Returns a 404 if the user doesn't exist.
