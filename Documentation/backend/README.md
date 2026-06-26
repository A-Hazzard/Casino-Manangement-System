# Backend Documentation Overview

Evolution One CMS is a full-stack casino management platform built on **Next.js 15 (App Router)**, **MongoDB (Mongoose)**, and **TypeScript**, run entirely with **Bun**. This document covers the backend architecture, API conventions, environment setup, and deployment.

---

## 1. Technology Stack

| Layer                     | Technology                              |
| :------------------------ | :-------------------------------------- |
| Framework                 | Next.js 15 (App Router, Route Handlers) |
| Runtime / Package Manager | Bun                                     |
| Database                  | MongoDB via Mongoose v8+                |
| Auth                      | JWT (jose) stored in HTTP-only cookies  |
| Real-time                 | MQTT (slot machine telemetry)           |
| Email                     | Gmail (SMTP) + SendGrid                 |
| SMS                       | Infobip                                 |
| Maps                      | Google Maps API                         |

---

## 2. Directory Structure

```
app/api/                        # All Next.js Route Handlers
  lib/
    helpers/                    # Reusable server-side business logic
      licenceeFilter.ts         # Multi-tenant location access checks
      apiWrapper.ts             # withApiAuth HOC
    middleware/
      db.ts                     # MongoDB connection middleware
    models/                     # Mongoose schemas (single source of truth)
    utils/
      reviewerScale.ts          # Reviewer financial scale utility
lib/
  utils/
    gamingDayRange.ts           # 8 AM → 8 AM gaming day offset (Trinidad UTC-4)
    cookieSecurity.ts           # getAuthCookieOptions() — never hardcode secure:true
    permissions/
      client.ts                 # Client-side page/nav access checks
      server.ts                 # Server-side DB permission checks (must mirror client.ts)
  constants/
    roles.ts                    # UserRole type and role constants
shared/
  types/                        # Centralized TypeScript types (single source of truth)
```

---

## 3. Running the Project

> All commands use **Bun exclusively**. Never use other packagem managers such as npm, pnpm or yarn.

```bash
bun run dev        # Start dev server at localhost:3000
bun run build      # Production build
bun run start      # Start production server
bun run check      # Type-check + lint (run before committing)
bun run test:e2e   # Playwright end-to-end tests
```

---

## 4. Environment Variables

### 4.1 Minimum Required to Run (Dev)

These are the only variables the app strictly needs to start and function locally:

```env
# Core
NODE_ENV=development
MONGODB_URI=mongodb://<user>:<pass>@<host>:<port>/<db>?authSource=admin

# Auth
JWT_SECRET=<your-secret>
NEXTAUTH_SECRET=<your-nextauth-secret>

# Cookie security — set to "false" for LAN/HTTP access; leave unset in production
COOKIE_SECURE=false
```

### 4.2 Full Environment Reference

```env
# ==========================================
# 1. CORE
# ==========================================
NODE_ENV=development
API_BASE_URL=http://localhost:3000
# "false" for LAN/IP HTTP access. Leave unset in production (auto-detects HTTPS via x-forwarded-proto).
COOKIE_SECURE=false

# ==========================================
# 2. DATABASE
# ==========================================
MONGODB_URI=mongodb://<user>:<pass>@<host>:<port>/<db>?authSource=admin

# Migration URIs (only needed for data migration scripts)
SRC_MONGODB_URI=mongodb://...
DST_MONGODB_URI=mongodb://...

# ==========================================
# 3. AUTHENTICATION & SECURITY
# ==========================================
JWT_SECRET=<long-random-string>
NEXTAUTH_SECRET=<base64-random-string>
DEFAULT_PASSWORD=<default-user-password>
ENABLE_E2E_AUTH=true

# ==========================================
# 4. MQTT (Slot Machine Real-time Telemetry)
# ==========================================
MQTT_URI=mqtt://<user>:<pass>@<host>:<port>
MQTT_PUB_TOPIC=sas/gy/server
MQTT_CFG_TOPIC=smib/config
MQTT_SUB_TOPIC=sas/relay/

# ==========================================
# 5. EXTERNAL SERVICES
# ==========================================

# Email — Gmail SMTP
GMAIL_USER=<gmail-address>
GMAIL_APP_PASSWORD=<gmail-app-password>
EMAIL_USER=<display-from-address>

# Email — SendGrid (alternative)
SENDGRID_API_KEY=SG.<key>

# Google Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key>
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-<secret>

# SMS — Infobip
INFOBIP_BASE_URL=https://<subdomain>.api.infobip.com
INFOBIP_API_KEY=<key>
```

---

## 5. Docker Deployment

The Dockerfile builds a production image using **Node 20 Alpine + Bun**. Only three build-time ARGs are required; runtime secrets are injected by CI/CD (GitLab CI) at deploy time.

```dockerfile
# Required build args — passed via --build-arg or CI/CD variables
ARG NODE_ENV
ARG MONGODB_URI
ARG JWT_SECRET
```

**Build:**

```bash
docker build \
  --build-arg NODE_ENV=production \
  --build-arg MONGODB_URI=mongodb://... \
  --build-arg JWT_SECRET=... \
  -t evolution-one-cms .
```

**Run:**

```bash
docker run -p 3000:3000 evolution-one-cms
```

> In CI/CD, all environment variables are injected as GitLab CI variables — the Dockerfile `ARG`/`ENV` wiring picks them up automatically. No `.env` file is shipped inside the image.

---

## 6. API Design Patterns

### `withApiAuth` Wrapper

Every standard route is wrapped in `withApiAuth`. This HOC handles:

- **Authentication** — verifies the JWT from the HTTP-only cookie.
- **Database** — ensures the MongoDB connection is established.
- **User context** — injects `user`, `userRoles`, and `isAdminOrDev` into the handler.
- **Global error handling** — catches unhandled exceptions and returns standard JSON errors.

```typescript
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user, userRoles, isAdminOrDev }) => {
    // Handler logic here
  });
}
```

### ID Pattern

All document IDs are **strings**, never `ObjectId`. Always query with:

```typescript
Model.findOne({ _id: id }); // NEVER Model.findById(id)
```

### Soft Deletes

```typescript
{
  $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2026-01-01') } }];
}
```

---

## 7. Security & RBAC

### Role Hierarchy

| Priority | Role             | Access Level                                        |
| :------- | :--------------- | :-------------------------------------------------- |
| 1        | `developer`      | Full platform                                       |
| 2        | `owner`          | Full administrative                                 |
| 3        | `admin`          | Administrative                                      |
| 4        | `manager`        | Operational oversight, all licencee locations       |
| 5        | `location admin` | Assigned locations only (falls back to licencee)    |
| 6        | `vault-manager`  | Vault / cage operations                             |
| 7        | `cashier`        | Cashier operations                                  |
| 8        | `technician`     | Technical operations                                |
| 9        | `collector`      | Collection operations (strictly assigned locations) |
| 10       | `reviewer`       | Read-only                                           |

### Multi-Tenant Isolation (Critical)

- Every user belongs to one or more `assignedLicencees`. Data leakage between licencees is a critical failure.
- **Managers** see ALL locations under their `assignedLicencees`.
- **Collectors / Technicians** see ONLY `assignedLocations` that also belong to their `assignedLicencees` (strict intersection).
- **Location Admins / Reviewers** see `assignedLocations` if set; otherwise fall back to all licencee locations.

Key file: `app/api/lib/helpers/licenceeFilter.ts`

### Session Invalidation

Changes to a user's roles, licencees, or locations **must** increment `sessionVersion` on the user document to force re-login.

### Reviewer Financial Scale

The `reviewer` role receives scaled-down financial values: `scale = 1 - multiplier`. Always apply via the utility — never inline:

```typescript
import { getReviewerScale } from '@/app/api/lib/utils/reviewerScale';
const scale = getReviewerScale(userPayload);
```

### Cookie Security

Never hardcode `secure: true`. Always use:

```typescript
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
```

---

## 8. Key Business Logic

### Gaming Day Offset

The business day runs **8 AM → 8 AM Trinidad Time (UTC-4)**. All meter-based financial queries must apply this offset.

```typescript
import { gamingDayRange } from '@/lib/utils/gamingDayRange';
```

> Do NOT apply the offset to collection reports or user session timestamps.

### `isEditing` — Transactional State

`CollectionReport.isEditing` controls data integrity:

- `true` (Checked Out) — collections are being modified; machine histories are NOT synced. Unsafe for financial reporting.
- `false` (Finalized) — machine histories are synchronized; record is auditable.

### Movement Delta

`movement.gross` is the ground truth for financial calculations. Use the **Movement Delta Method** — sum `movement.*` fields from meters. Never use a cumulative-only approach for periodic analysis.

---

## 9. Documentation Links

| Topic                        | Document                                                                     |
| :--------------------------- | :--------------------------------------------------------------------------- |
| Architectural invariants (AI/agents) | [CLAUDE.md](../../CLAUDE.md)                                          |
| All API modules              | [Project Guide](../PROJECT_GUIDE.md)                                         |
| Mongoose models catalog      | [app/api/lib/models/README.md](../../app/api/lib/models/README.md)           |
| Database Models              | [database-models.md](./database-models.md)                                   |
| Page & Tab Access            | [api-flows/page-auth-restrictions.md](./api-flows/page-auth-restrictions.md) |
| Vault Flows                  | [vault-api.md](./api/vault-api.md)                                          |
| Collection Reports (Backend) | [collections-technical-deep-dive.md](./api/collections-technical-deep-dive.md) |
| RBAC & Authorization         | [.instructions/authorization.md](../../.instructions/authorization.md)       |

---

_Last Updated: June 25, 2026 — v4.4.0 — Maintained by the Evolution One Development Team — Lead Engineer: Aaron Hazzard_
