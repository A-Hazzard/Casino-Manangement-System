# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Evolution1 CMS** is a casino management system for real-time casino operations, financial tracking, and compliance monitoring. It operates in two modes controlled by `NEXT_PUBLIC_APPLICATION`:
- **CMS** — Dashboard, analytics, slot machine management, reporting
- **VAULT** — Cash management, cashier shifts, float requests, payouts

## Commands

```bash
# Development
pnpm run dev              # Start dev server at localhost:3000
pnpm run dev:turbo        # Dev with Turbopack

# Production
pnpm run build            # Build Next.js application 
pnpm run start            # Start production server

# Code Quality
pnpm run lint             # ESLint on .ts/.tsx files
pnpm run lint:fix         # Auto-fix ESLint issues
pnpm run type-check       # TypeScript type checking (tsc --noEmit)
pnpm run format           # Prettier formatting
pnpm run check            # type-check && lint

# Testing
pnpm run test             # Run Jest tests
pnpm run test:watch       # Jest in watch mode
pnpm run test:coverage    # Jest with coverage
```

Use **pnpm exclusively** — the project has pnpm-specific overrides in package.json.

## Architecture

### Stack
- **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS**, **MongoDB/Mongoose**
- **Zustand** for global state, **React Query (TanStack)** for server state
- **Shadcn/UI** + Radix UI + MUI for components
- **jose** for JWT, **bcryptjs** for passwords, **otplib** for TOTP/2FA
- **Infobip** for SMS, **SendGrid/Nodemailer** for email, **MQTT** for real-time device comms

### Directory Structure

```
app/
  (auth)/login/          # Login page (unauthenticated route group)
  api/                   # All API routes (Next.js App Router)
    auth/                # JWT login/logout/refresh/TOTP/password reset
    analytics/           # Dashboard metrics, charts, revenue
    reports/             # Comprehensive reporting
    locations/           # Location management
    cabinets/            # Cabinet/slot machine management
    machines/            # Machine details
    members/             # Member profiles
    sessions/            # Gaming session tracking
    collection-report/   # Collection reports (edit/delete with meter reversion)
    vault/               # Vault transactions, shifts
    cashier/             # Cashier operations
    users/               # User CRUD
    admin/               # Admin migrations
    lib/
      middleware/db.ts   # MongoDB singleton connection manager
      models/            # 30+ Mongoose schemas
      helpers/           # Business logic (auth, reports, meters, vault, etc.)
      utils/apiResponse.ts  # Standardized API response format
      services/          # External service integrations
  [feature pages]/       # Next.js page.tsx files (kept lean)

components/
  CMS/                   # CMS-specific components
  VAULT/                 # Vault-specific components
  shared/                # Layout, auth, UI, debug components
  ui/                    # Shadcn/UI base components

lib/
  constants/             # Roles, navigation constants
  hooks/                 # Custom React hooks
  store/                 # Zustand stores
  types/                 # Frontend TypeScript types
  utils/                 # Frontend utilities
  services/              # Frontend service layer
  providers/             # React context providers

shared/
  types/                 # Types used by both frontend and backend:
    auth.ts, api.ts, entities.ts, users.ts, vault.ts, analytics.ts, machines.ts, meters.ts
  utils/                 # Shared utilities
```

### API Response Standard

All API routes return a consistent format (see `app/api/lib/utils/apiResponse.ts`):

```typescript
// Success
{ success: true, data: T, message?: string, timestamp: string }

// Error
{ success: false, error: string, message: string, code?: string, details?: Record<string, unknown>, timestamp: string }
```

### Authentication Flow

1. `POST /api/auth/login` — validates credentials, issues HttpOnly JWT + refresh token cookies (7 days, 30 days if rememberMe)
2. All protected API routes manually verify the JWT from cookies
3. Page-level protection: `<ProtectedRoute requiredPage="...">` component
4. API-level: manual role checking in route handlers using `UserAuthPayload` from the token

**Roles** (hierarchy): `developer` > `admin` > `manager` > `location admin` > `vault-manager` > `cashier` > `technician` > `collector`

### Database Connection

`app/api/lib/middleware/db.ts` provides a singleton Mongoose connection with:
- Connection caching across hot reloads
- Automatic reconnection on URI changes
- Pool: minPoolSize=2, maxPoolSize=10
- Server-side only (throws if called from client)

Call `await connectToDatabase()` at the start of every API route handler.

## Critical Business Rules

### Gaming Day Offset

Business days run **8 AM to 8 AM Trinidad time (UTC-4)**, not midnight to midnight. This is stored as `gamingLocations.gameDayOffset` (default: 8) and must be applied to all financial metrics (dashboard, reports, analytics).

**Do NOT apply** to: collection reports, activity logs, user sessions (use raw event timestamps).

Helper: `lib/utils/gamingDayRange.ts`

Example: At 2 AM Trinidad on Nov 11 → current gaming day is Nov 10 8 AM → Nov 11 8 AM.

### Financial Calculations — Movement Delta Method

Financial reporting uses **sum of movement fields** from meter readings, not calculated/derived values. This ensures accuracy across reads.

### Licensee Access Context

Multi-tenant: users are assigned to specific licensees and/or locations. All API responses must be filtered by the user's assigned licensees. Frontend passes licensee context in every request. See `.cursor/licensee-access-context.md`.

### Timezone

All dates stored in UTC. Display and query conversion to Trinidad (UTC-4). Never hardcode timezone offsets; use the timezone utilities.

### Audit Logging

Use `app/api/lib/helpers/activityLogger.ts` to log all significant CRUD operations and security events (logins, permission changes). Required for regulatory compliance.

## Cookie & HTTP/HTTPS Security Rules

> **Full reference:** See `Documentation/http-https-cookie-rules.md`

This app runs on both HTTPS (production domain) and HTTP (LAN IP access e.g. `192.168.8.2`).
Cookies with `secure: true` are **silently dropped** by browsers on HTTP connections, breaking auth entirely.

### The Rule: Never Hardcode `secure: true`

Always use the `isSecureContext()` utility from `lib/utils/cookieSecurity.ts`:

```typescript
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';

// Setting cookies
const options = getAuthCookieOptions(request, { maxAge: 60 * 60 * 24 * 7 });
response.cookies.set('token', jwtToken, options);

// Clearing cookies (logout/middleware)
response.cookies.set('token', '', { ...getAuthCookieOptions(request), expires: new Date(0) });
```

The helper detects HTTPS via:
1. `COOKIE_SECURE` env var (explicit override, useful for edge cases)
2. `x-forwarded-proto` header (set by reverse proxies like nginx/Caddy)
3. Request URL protocol as fallback
4. `NODE_ENV === 'development'` → always `false`

### Environment Variable

```bash
# .env.local — force HTTP mode (dev / LAN IP access)
COOKIE_SECURE=false

# .env.production — usually leave unset (auto-detected from x-forwarded-proto)
# Only set COOKIE_SECURE=false if production is served over plain HTTP with no proxy
```

### Files That Must Use This Pattern

Every file calling `response.cookies.set()`:
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/refresh/route.ts`
- `proxy.ts` (middleware — use request headers directly, no env var available in Edge)

### sameSite

Always use `sameSite: 'lax'`. Never use `sameSite: 'none'` (requires `secure: true` and breaks HTTP).

---

## TypeScript Conventions

- Use `type` over `interface`
- **No `any`** — create proper types
- Type locations: `shared/types/` (shared frontend+backend), `lib/types/` (frontend only), `app/api/lib/types/` (backend only)
- Strict mode is enabled with `noUnusedLocals`, `noImplicitReturns`, `noFallthroughCases`
- Path alias `@/*` maps to root; `@shared/*` maps to `shared/`

## Key Environment Variables

```
MONGODB_URI              # MongoDB connection string
JWT_SECRET               # JWT signing secret
NEXT_PUBLIC_APPLICATION  # "CMS" or "VAULT" (controls app mode)
COOKIE_SECURE            # "true" | "false" — overrides auto-detection of secure cookie flag
                         # Leave unset in production (auto-detects from x-forwarded-proto)
                         # Set to "false" for LAN/IP HTTP access or dev environments
SENDGRID_API_KEY         # Email via SendGrid
INFOBIP_BASE_URL / INFOBIP_API_KEY   # SMS
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY      # Maps
MQTT_URI / MQTT_PUB_TOPIC / MQTT_SUB_TOPIC  # Real-time device comms
```

## Documentation

Comprehensive docs live in `Documentation/` and `.cursor/`:
- `Documentation/TECHNICAL_HANDBOOK.md` — system standards, RBAC, UI patterns
- `Documentation/timezone.md` — Trinidad time handling
- `Documentation/financial-metrics-guide.md` — calculation methods
- `Documentation/http-https-cookie-rules.md` — HTTP/HTTPS cookie security rules ← NEW
- `.cursor/gaming-day-offset-system.md` — gaming day concept (critical)
- `.cursor/licensee-access-context.md` — multi-tenant permissions
- `.cursor/vault-FRD.md` — Vault functional requirements
- `Documentation/frontend/` — per-page frontend docs
- `Documentation/backend/` — per-endpoint backend docs
