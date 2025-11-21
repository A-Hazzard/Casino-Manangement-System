## API Security Hardening Plan

### 1. Objectives
- Ensure every API handler enforces the exact same authentication and authorization rules as the frontend components that call it.
- Prevent unauthenticated or tampered requests (e.g., forged `_id`, role spoofing, or licensee escalation) from reaching business logic.
- Provide a repeatable structure so new endpoints are secure by default.

### 2. Threat Model & Current Controls
- **Threats**
  - Anonymous callers hitting `/api/*` directly.
  - Users replaying stale JWTs after their licensee/role assignments changed.
  - Clients posting arbitrary `_id`/`role` fields hoping the backend trusts them.
  - Horizontal privilege escalation by requesting data for disallowed licensees or locations.
- **Existing Controls**
  - `getUserFromServer()` validates JWT signatures, sessionVersion, and rehydrates roles/licencees from Mongo.
  - Frontend hides navigation and data when `shouldShowNavigationLinkDb` or `shouldShowNoLicenseeMessage` fail.
  - Licensee/location filtering helpers (see `.cursor/licensee-access-context.md` and `app/api/lib/helpers/licenseeFilter.ts`).
- **Gaps**
  - Many route handlers only check for a token but do not assert role-based permissions.
  - Not all handlers re-check licensee intersection before running queries.
  - No uniform “defense block” that ties user `_id`, verified role set, and request-level authorization checks together.

### 3. Guiding Principles
1. **Single Source of Truth** – Trust only the server-side `CurrentUser` returned by `getUserFromServer()`. Ignore `_id`, `role`, or licensee data sent by clients.
2. **Defense Blocks** – Every API entry point must: (a) authenticate, (b) authorize role + licensee access, (c) log/trace the decision.
3. **Licensee Parity** – Any dataset filtered by `selectedLicencee` on the frontend must apply `getUserLicenseeFilter()` (or equivalent) before DB operations.
4. **Minimal Exposure** – Reject requests early with consistent error responses (`401` unauthenticated, `403` unauthorized).
5. **Composable Assertions** – Provide helper utilities (e.g., `assertRoleAccess`, `assertLicenseeScope`) so route modules combine the rules they need without duplicating code.

### 4. Proposed Architecture
#### 4.1 Core Helper (`requireApiUser`)
```ts
import { NextRequest } from 'next/server';
import { getUserFromServer } from '@/app/api/lib/helpers/users';

export async function requireApiUser() {
  const user = await getUserFromServer();
  if (!user?._id) {
    throw new ApiError(401, 'Authentication required');
  }
  return user as CurrentUser;
}
```
- Ensures `_id` comes from verified JWT + DB record (session version already validated).
#### 4.2 Authorization Helpers
- `assertRoleAccess(user, allowedRoles)` – normalizes roles, checks membership, throws `403` otherwise.
- `assertLicenseeScope(user, requestedLicensee)` – resolves allowed licensees/locations using `licenseeFilter.ts`; ensures the requested licensee matches.
- `buildApiAuthContext(request)` – returns `{ user, roles, allowedLicensees, allowedLocations }` to be reused inside handler.

#### 4.3 Middleware Pattern
1. `const auth = await buildApiAuthContext(req);`
2. `assertRoleAccess(auth, ['developer', 'admin', ...]);`
3. Apply licensee filters before DB queries:
   ```ts
   const licensee = getLicenseeFromSearchParams(req);
   const { matchStage } = applyLicenseeFilter(auth, licensee);
   ```
4. For mutations referencing a user `_id`, enforce ownership or elevated roles:
   ```ts
   ensureUserMatches(auth, targetUserId); // or require developer/admin.
   ```

#### 4.4 Error & Logging Scheme
- Central `ApiError` class with `status` and `code`.
- `handleApiError` helper to map to consistent JSON payload `{ success: false, error: { code, message } }`.
- Log unauthorized attempts with `_id`, roles, route, and requested licensee for auditing.

### 5. Implementation Roadmap
We will harden endpoints page-by-page following the primary navigation order from `AppSidebar`:
1. **Dashboard (`/`)**
   - Audit all API routes consumed by dashboard widgets (e.g., metrics, charts).
   - Add `buildApiAuthContext`, enforce developer/admin/manager rules, and licensee filters.
2. **Locations (`/locations`)**
3. **Cabinets (maps to machines APIs)**
4. **Collection Report**
5. **Sessions**
6. **Members**
7. **Reports**
8. **Administration**

For each page group:
- Inventory frontend data fetches (React Query hooks, loaders).
- Trace to corresponding `/api/*` handlers.
- Apply the defense block: authentication, role gate, licensee/location filtering, and audit logging.
- Update tests (unit or integration) to cover unauthorized scenarios.

### 6. Deliverables
- `lib/utils/apiAuth.ts` (new helper module) containing `requireApiUser`, `assertRoleAccess`, `assertLicenseeScope`, and `buildApiAuthContext`.
- Updated API route handlers that import the helper instead of ad-hoc checks.
- Documentation updates (this file + per-feature READMEs if needed).
- Optional automated check (ESLint rule or codemod) to flag routes missing the helper (stretch goal).

### 7. Success Criteria
- All navigation-linked endpoints reject unauthenticated calls with `401`.
- Role or licensee mismatches return `403` with consistent messaging.
- Server logs capture denied attempts for auditing without leaking sensitive info.
- Frontend behavior remains unchanged for authorized users (parity maintained).

