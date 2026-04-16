# Identity & Authentication API (`/api/auth`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Domain Overview

The Identity system manages secure access, session persistence, and multi-factor authorization. It uses a high-integrity JWT strategy combined with property-level assignment filtering and database context validation to prevent cross-database token reuse.

---

## 2. Core Endpoints

### 🔐 `POST /api/auth/login`
Authenticates a user and issues a secure session.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse & validate request body** — Extracts `identifier`, `password`, and optional `rememberMe` flag.
3. **Validate identifier format** — Checks if the identifier is an email (`/\S+@\S+\.\S+/`) or a username (min 3 characters). Returns `400` if neither.
4. **Extract client metadata** — Captures `ipAddress` and `user-agent` for security logging.
5. **Authenticate credentials** — Delegates to `authenticateUser()` which compares the password against the stored `bcrypt` hash. Returns `401` on failure.
6. **Generate JWT** — Creates an access token containing `{ userId, roles, sessionVersion, multiplier, dbContext }` and a separate `refreshToken`. The `dbContext` contains a hash of the current MongoDB URI to prevent cross-database token reuse.
7. **Set secure HTTP-only cookies** — Clears stale `token`/`refreshToken` cookies first. Cookie max-age is `30 days` if `rememberMe`, otherwise `7 days`. Cookie `secure` flag auto-detected via `getAuthCookieOptions(request)`.
8. **Return user profile** — Responds with `{ user, expiresAt, requiresPasswordUpdate, requiresProfileUpdate, invalidProfileFields }`.

---

### 🏁 `POST /api/auth/logout`
Terminates a session.

**Steps:**
1. Decode JWT to read the user ID.
2. **Increment `sessionVersion`** — Invalidates all currently issued tokens for that user across all devices.
3. **Clear cookies** — Sets `token` and `refreshToken` to empty with `expires: past`.

---

### 🎫 `GET /api/auth/current-user`
Returns the current authenticated user's full profile.

**Returns:** `{ user: { _id, username, emailAddress, roles, assignedLicencees, assignedLocations, multiplier, profile, ... } }`

---

### 🔑 `POST /api/auth/refresh`
Issues a new access token using the refresh token cookie.

---

### 🔒 `POST /api/auth/totp/setup` / `confirm` / `status` / `reset`
TOTP 2FA management endpoints. Setup returns a QR code URI. Confirm activates 2FA. Reset removes it (admin only).

### 🔒 `POST /api/auth/totp/recover/cashier` | `/vm`
Recovery flows for cashier and vault-manager roles respectively. Validates recovery code and issues a temporary bypass.

---

## 3. Security Architecture

### 🛡️ JWT Strategy (`jose`)
- **Algorithm**: HS256 with server-side `JWT_SECRET`.
- **Cookie**: HTTP-only, `SameSite=Lax`. `Secure` flag auto-detected from `x-forwarded-proto` header or request URL protocol — never hardcoded.
- **Payload**: `{ userId, roles, sessionVersion, multiplier, dbContext, assignedLocations, assignedLicencees, iat, exp }`.

### 🔄 Session Versioning (Kill Switch)
Every JWT contains a `sessionVersion` field. On each authenticated request, `getUserFromServer()` re-hydrates from the DB and compares. Mismatch = `401 Unauthorized`. The version is **incremented on logout and permission changes**, but **not on login** (to allow multi-device sessions).

### 🏦 Database Context Validation
The JWT embeds a hash of the current `MONGODB_URI`. The middleware validates this on every request. If the URI has changed (e.g. environment swap), the token is silently rejected and the user is redirected to login without an error — preventing cross-database data leakage.

### 🔢 Reviewer Multiplier Hydration
`getUserFromServer()` always overwrites the JWT's `multiplier` value with the live DB value (`dbUser.multiplier`). This ensures that multiplier changes made by an admin take effect immediately on the next API call — the user does not need to re-login.

---

## 4. Roles (9 Total)

| Role | Level | Key Permissions |
| :--- | :--- | :--- |
| `developer` | 1 (highest) | Full access, system config, migrations |
| `admin` | 2 | User management, licencee management, all reports |
| `manager` | 3 | Location reports, collection approval, vault oversight |
| `location admin` | 4 | Location-scoped management |
| `vault-manager` | 5 | Vault shifts, float approval, cash management |
| `cashier` | 6 | Cashier shifts, payouts, float requests |
| `technician` | 7 | Machine configuration, SMIB, firmware |
| `collector` | 8 | Collection report creation |
| `reviewer` | 9 (lowest) | Read-only financial views with multiplier-scaled figures |

---

## 5. Business Rules (BR-AUTH)

- **BR-AUTH-01**: Passwords hashed with `bcryptjs` (salt rounds: 10) before storage.
- **BR-AUTH-02**: Users with `isEnabled: false` receive `401` on login.
- **BR-AUTH-03**: Users with `deletedAt >= 2025-01-01` are blocked (soft-delete).
- **BR-AUTH-04**: Profile validation is enforced on login — weak passwords, missing legal name, phone, or date of birth flag `requiresPasswordUpdate` / `requiresProfileUpdate`.
- **BR-AUTH-05**: All auth events (success, failure, blocked, password change) are written to the activity log via `activityLogger.ts`.
- **BR-AUTH-06**: The `multiplier` field on `User` is always read from the DB on every authenticated request — JWT value is not trusted for this field.

---

**Technical Reference** — Security & Identity Team
