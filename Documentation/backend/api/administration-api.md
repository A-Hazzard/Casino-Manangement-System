# Administration & Core IAM API (`/api/users` & `/api/licencees`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.4.0

---

## 1. Domain Overview

The Administration API handles the platform's multi-tenant hierarchy. It manages the full lifecycle of Users and Licencees, enforcing strict role-based access control (RBAC) and data isolation across the global property floor.

---

## 2. Route Map

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users` | Personnel directory with RBAC scoping |
| POST | `/api/users` | Create a new user |
| PUT | `/api/users` | Update an existing user |
| DELETE | `/api/users` | Soft-delete a user |
| GET | `/api/users/[id]` | Get user by ID |
| GET | `/api/users/counts` | Role/status counts |
| GET | `/api/users/check-username` | Validate username availability |
| GET | `/api/users/check-password` | Validate password strength |
| GET | `/api/users/[id]/test-assignments` | Get test role assignments |
| GET | `/api/licencees` | Corporate entity profiles |

---

## 3. Core Endpoints

### 👥 `GET /api/users`

Returns the personnel directory with RBAC-filtered scoping.

**Steps:**

1. **Authenticate user** — Calls `getUserFromServer()` to read the current user from the JWT cookie.
2. **Resolve roles & permissions** — Extracts `roles`, `assignedLicencees`, and `assignedLocations` from the user payload. Computes boolean flags: `isAdmin`, `isManager`, `isLocationAdmin`, `isVaultManager`.
3. **Parse query params** — Reads `status` (`all`/`active`/`disabled`/`deleted`), `role`, `search`, `page`, `limit`.
4. **Route to appropriate handler**:
   - If `status === 'deleted'`: Calls `handleDeletedUsersRequest()` — only accessible by Admins and Managers.
   - If `role === 'cashier'`: Calls `handleCashiersRequest()` — accessible by Admins, Managers, and Vault Managers (used for shift assignment).
   - Default: Calls `handleAllUsersRequest()` — the main personnel directory.
5. **Each handler applies RBAC scoping**:
   - **Manager**: Filters to users within `assignedLicencees` only.
   - **Location Admin**: Filters to users with matching `assignedLocations`.
   - **Vault Manager**: Only returns users with `Cashier` role.
6. **Return paginated list** — Responds with `{ users, pagination }`.

---

### 🆕 `POST /api/users`

Creates a new system user with mandatory validation.

**Steps:**

1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse request body** — Reads `username`, `emailAddress`, `password`, `roles`, `profile`, `assignedLocations`, `assignedLicencees`, `isEnabled`, `tempPassword`.
3. **Validate username** — Returns `400` if `username` is missing or not a string.
4. **Validate email format** — Calls `validateEmail(emailAddress)`. Returns `400` if format is invalid.
5. **Validate profile gender** — Returns `400` if `profile.gender` is missing (required for jurisdictional reporting).
6. **Validate password strength** — Calls `validatePasswordStrength(password)`. Returns `400` with the list of unmet requirements (e.g. "Must contain uppercase", "Must be at least 8 characters") if the password is too weak.
7. **Create user** — Delegates to `createUserHelper({ username, emailAddress, password, roles, profile, ... })`. This helper checks for username/email uniqueness and returns `409 Conflict` if either already exists. Hashes the password with bcrypt before saving.
8. **Return created user** — Responds with `{ success: true, user }` at `201 Created` (password is stripped from response).

---

### ✏️ `PUT /api/users`

Updates an existing user record.

**Steps:**

1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse request body** — Reads `_id` and `...updateFields`.
3. **Validate user ID** — Returns `400` if `_id` is missing.
4. **Update user** — Delegates to `updateUserHelper(_id, updateFields)`. This helper: checks the target user exists, validates role escalation prevention (you cannot promote a user above your own role), applies all field changes, and logs the mutation.
5. **Format response** — Converts the Mongoose document to a plain object and ensures `assignedLocations`/`assignedLicencees` are correctly formatted.
6. **Return updated user** — Responds with `{ success: true, user }` at `200 OK`.

---

### 🗑️ `DELETE /api/users`

Soft-deletes a user account.

**Steps:**

1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse request body** — Reads `_id`.
3. **Validate user ID** — Returns `400` if `_id` is missing.
4. **Delete user** — Delegates to `deleteUserHelper(_id)`. This sets `deletedAt = Date.now()` and `isEnabled = false` rather than permanently removing the document.
5. **Return success** — Responds with `{ success: true }` at `200 OK`. Returns `404` if user not found.

---

### 🏢 `GET /api/licencees`

Returns corporate entity profiles.

**Steps:**

1. **Connect to database** — Establishes the Mongoose connection.
2. **Authenticate user** — Verifies the request is from an authorized user.
3. **Fetch licencees** — Queries the `Licencee` collection with an aggregation that counts linked `GamingLocations` and active `Machines`.
4. **Return list** — Responds with `{ licencees }`.

---

### 📜 `GET /api/activity-logs`

Returns the system-wide mutation audit stream.

**Steps:**

1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse params** — Reads `userId`, `action`, `startDate`, `endDate`, `page`, `limit`.
3. **Build query** — Constructs a `$match` with optional filters for `userId`, `action`, and `timestamp` range.
4. **Fetch logs** — Queries the `ActivityLog` collection, sorted by `timestamp desc`.
5. **Return paginated results** — Responds with `{ logs, pagination }`.

---

## 4. Role Hierarchy (RBAC)

The system enforces a strict vertical hierarchy (10 roles):

| Rank | Role | Typical Scope |
|------|------|---------------|
| 1 | Developer | Full system access |
| 2 | Owner | Full licencee access |
| 3 | Admin | Full licencee access |
| 4 | Manager | All locations under assigned licencees |
| 5 | Location Admin | Assigned locations only |
| 6 | Vault Manager | Cash desk operations |
| 7 | Cashier | Cashier shift operations |
| 8 | Technician | Machine maintenance |
| 9 | Collector | Collection data entry |
| 10 | Reviewer | Read-only (financially scaled) |

- You **cannot** create, edit, or assign a role ranked above your own.
- Attempts return `403 Forbidden`.

### 🛡️ Session Integrity

The `sessionVersion` field in the JWT must match the value in the User document. If a user is suspended or their password is changed, the version is incremented — immediately invalidating all their active sessions across all devices.

---

**Technical Reference** - Engineering & Compliance Team
