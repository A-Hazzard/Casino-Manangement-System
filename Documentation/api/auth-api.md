# Identity & Authentication API (`/api/auth`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.2.0

---

## 1. Domain Overview

The Identity system manages secure access, session persistence, and multi-factor authorization. It uses a high-integrity JWT strategy combined with property-level assignment filtering.

---

## 2. Core Endpoints

### 🔐 `POST /api/auth/login`
Authenticates a user and issues a secure session.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse & validate request body** — Extracts `identifier`, `password`, and optional `rememberMe` flag.
3. **Validate identifier format** — Checks if the identifier looks like an email (`/\S+@\S+\.\S+/`) or a username (min 3 characters). Returns `400` if neither.
4. **Extract client metadata** — Captures the requester's `ipAddress` and `user-agent` header for security logging.
5. **Authenticate credentials** — Delegates to `authenticateUser()` helper which hashes the password and compares it against the stored `bcrypt` hash. Returns `401` on failure.
6. **Generate JWT** — Creates an access token containing `{ userId, roles, sessionVersion, activeLocation }` and a separate `refreshToken`.
7. **Set secure HTTP-only cookies** — Clears any existing stale `token`/`refreshToken` cookies first, then sets new ones. Cookie max-age is `30 days` if `rememberMe`, otherwise `7 days`.
8. **Return user profile** — Responds with `{ user, expiresAt, requiresPasswordUpdate, requiresProfileUpdate }`.

---

### 🏁 `POST /api/auth/logout`
Terminates a session.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Decode JWT** — Reads the user ID from the current `token` cookie.
3. **Increment `sessionVersion`** — Updates the `sessionVersion` field on the `User` document in the DB. This immediately invalidates all currently issued tokens for that user across all devices.
4. **Clear cookies** — Sets `token` and `refreshToken` cookies to empty with `expires: past`.

---

### 🎫 `GET /api/auth/session`
Returns the current authenticated user's identity.

**Steps:**
1. **Read `token` cookie** — Decodes the JWT from the HTTP-only cookie.
2. **Verify session version** — Fetches the user from the DB and compares the JWT `sessionVersion` against the stored value. Returns `401` if mismatched (user was logged out or suspended).
3. **Return profile** — Returns `{ user, roles, assignedLicencees, assignedLocations }`.

---

## 3. Security Architecture

### 🛡️ JWT Strategy (`jose`)
- **Algorithm**: HS256 with a server-side `JWT_SECRET`.
- **Cookie**: HTTP-only, `Secure`, `SameSite=Strict`. Cannot be accessed by JavaScript.
- **Payload**: `{ userId, activeLocation, roles, sessionVersion, iat, exp }`.

### 🔄 Session Versioning (Kill Switch)
- Every JWT contains a `v` (version) field. On each authenticated request, the middleware compares it against the `sessionVersion` stored in the User document.
- If they don't match (e.g. password was changed, account was disabled), the request is rejected as `401 Unauthorized` regardless of whether the token is otherwise valid.

---

## 4. Business Rules (BR-AUTH)

- **BR-AUTH-01**: Passwords must be hashed using `Bcrypt` (salt rounds: 10) before storage.
- **BR-AUTH-02**: Users with `isEnabled: false` receive `401` on login attempt.
- **BR-AUTH-03**: 5 consecutive failed login attempts lock the account for 30 minutes.

---
**Technical Reference** - Security & Identity Team
