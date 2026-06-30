# Evolution1 Casino Management System (CMS)

<div align="center">
  <img src="public/EOS_Logo.png" alt="EOS Logo" width="200"/>
</div>

**Evolution1 CMS** is a multi-tenant casino management system for real-time operations, financial tracking, compliance monitoring, and vault/cash desk operations. Built with Next.js App Router, TypeScript, MongoDB/Mongoose, and Zustand. Two operating modes (CMS + Vault) share one codebase, routed by the user's assigned role.

**Author:** Aaron Hazzard - Senior Software Engineer

## 🚀 Features

- 📊 **Dashboard with Real-Time Analytics** ([docs](Documentation/frontend/pages/dashboard-page.md))
  - Gaming day offset support for accurate financial reporting (8 AM → 8 AM Trinidad time)
  - Custom date ranges with time inputs
  - Multi-currency support with real-time conversion (USD, TTD, GYD, BBD, etc.)
- 🎮 **Slot Machine & Gaming Floor Management** ([docs](Documentation/frontend/pages/cabinets-page.md))
  - Real-time status monitoring and performance tracking
  - Remote SMIB configuration and firmware management (OTA via MQTT)
  - Developer DB Explorer for direct MongoDB introspection
- 💰 **Financial Tracking & Collection Reporting** ([docs](Documentation/collection-reports/frontend/collection-report-page.md))
  - **V1**: 3-Step collection wizard with machine meter entry and cash reconciliation
  - **V2**: Session-based capture wizard with camera overlay, meter verification, and review/submit
  - SAS meter comparison and time defaults auto-populated from previous collections
  - Edit/Delete reports with full meter reversion and `isEditing` transactional state
  - Variation checking with threshold alerts and confirmation dialogs
  - Movement Delta Method for accurate financial calculations
- 📍 **Location Management** ([docs](Documentation/frontend/pages/locations-page.md))
  - Grid/map toggle view with geospatial coordinates (React Leaflet)
  - Per-location gaming day offset configuration
  - Reviewer multiplier applied server-side to all financial metrics
- 👥 **Member Management** ([docs](Documentation/frontend/pages/members-page.md))
- 🎯 **Session Management** ([docs](Documentation/frontend/pages/sessions-page.md))
- 👥 **User & Licencee Administration** ([docs](Documentation/frontend/pages/administration-page.md))
- 🔐 **Secure Authentication** ([docs](Documentation/backend/api/auth-api.md))
  - Role-based access control (RBAC) — 10 roles from developer → reviewer
  - JWT token-based authentication with HttpOnly cookies
  - Multi-device session support with session invalidation on permission changes
  - TOTP 2FA with recovery flows
  - Mandatory post-login profile validation
- 📊 **Comprehensive Reports Module** ([docs](Documentation/backend/api/reports-api.md))
  - Dashboard, Locations, Machines, and Meters tabs
  - Gaming day offset integration for accurate reporting
- 🔐 **Vault Management System (VMS)** ([docs](Documentation/frontend/pages/vault-page.md))
  - Multi-tenant accounting ledger with double-entry style methodology
  - Real-time cashier shift tracking and denomination validation
  - Speed-optimized payouts for high-volume operations
  - Atomic immutable transaction history
  - Float requests, expenses, soft counts, end-of-day reports
  - Full-screen responsive mobile interface for field operations
- 🔁 **Reviewer Multiplier** — Per-user financial scaling applied server-side across all metric endpoints

## 🛠️ Tech Stack

| Category       | Technology                 | Version          |
| -------------- | -------------------------- | ---------------- |
| Framework      | Next.js (App Router)       | 16.0.7           |
| Language       | TypeScript                 | 5.9.3            |
| Styling        | Tailwind CSS               | 3.4.17           |
| Database       | MongoDB / Mongoose         | 6.17.0 / 8.18.1  |
| State (Global) | Zustand                    | 5.0.8            |
| State (Server) | TanStack React Query       | 5.90.7           |
| Auth           | jose (JWT)                 | 6.1.0            |
| Password       | bcryptjs                   | 3.0.2            |
| 2FA            | otplib (TOTP)              | 13.3.0           |
| UI Components  | Shadcn/UI + Radix UI + MUI | various          |
| Charts         | Recharts                   | 2.15.4           |
| Maps           | React Leaflet              | 5.0.0            |
| Animations     | Framer Motion              | 12.23.12         |
| HTTP Client    | Axios                      | 1.12.2           |
| Email          | Nodemailer                 | 8.0.1            |
| IoT            | MQTT                       | 5.14.1           |
| Export         | jsPDF + xlsx               | 3.0.2 / 0.18.5   |
| Validation     | Zod                        | 3.25.76          |
| E2E Testing    | Playwright (active suite)  | 1.58.2           |
| Google Drive   | googleapis (OAuth2)        | via googleapis   |
| Maps (Google)  | @react-google-maps/api     | via @react-google-maps/api |

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```sh
git clone https://gitlab.com/sunny-group/sas/evolution-one-cms.git
cd "evolution-one-cms"
```

### 2️⃣ Install bun (if you don't have it)

```sh
npm i -g bun@latest
```

### 3️⃣ Install Dependencies

```sh
bun install
```

### 4️⃣ Configure Environment

Create a `.env.local` file with the following:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
COOKIE_SECURE=false                 # set false for HTTP/LAN, auto-detected in production
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
MQTT_URI=your_mqtt_broker
MQTT_PUB_TOPIC=your_pub_topic
MQTT_SUB_TOPIC=your_sub_topic
```

### 5️⃣ Run the Development Server

```sh
bun run dev
```

Open http://localhost:3000 to see the application.

### 6️⃣ HTTPS Development (for mobile camera access)

```sh
bun run dev:https
```

Uses Next.js `--experimental-https`. Access via `https://your-ip:3000` on mobile devices. Accept the self-signed certificate warning to enable camera access for Collection Report V2 photo capture.

## 🐳 Docker Setup

### Build & Run Locally

```sh
docker build -t evolution1-cms:local .
docker run --rm -p 3000:3000 \
  -e MONGODB_URI="your_mongodb_uri" \
  -e JWT_SECRET="your_jwt_secret" \
  -e NODE_ENV="production" \
  evolution1-cms:local
```

### GitLab Container Registry

```sh
# Authenticate
docker login registry.gitlab.com

# Build & push
docker build -t registry.gitlab.com/sunny-group/sas/evolution-one-cms .
docker push registry.gitlab.com/sunny-group/sas/evolution-one-cms

# Run from registry (Windows)
docker run --rm -p 3000:3000 -e MONGODB_URI="..." -e JWT_SECRET="..." -e NODE_ENV="production" -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..." registry.gitlab.com/sunny-group/sas/evolution-one-cms

# Run from registry (Mac/Linux)
docker run --rm -p 3000:3000 \
  -e MONGODB_URI="..." \
  -e JWT_SECRET="..." \
  -e NODE_ENV="production" \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..." \
  registry.gitlab.com/sunny-group/sas/evolution-one-cms
```

## 🖥️ Development Commands

| Command                 | Description                               |
| ----------------------- | ----------------------------------------- |
| `bun run dev`           | Start development server (localhost:3000) |
| `bun run dev:https`     | Dev with HTTPS (camera access on mobile)  |
| `bun run build`         | Build production app (4GB heap)           |
| `bun run start`         | Start production server                   |
| `bun run lint`          | ESLint on .ts/.tsx files                  |
| `bun run lint:fix`      | Auto-fix ESLint issues                    |
| `bun run type-check`    | TypeScript type checking (4GB heap)       |
| `bun run format`        | Prettier formatting                       |
| `bun run check`         | type-check && lint (run before commits)   |
| `bun run test:e2e`      | Run Playwright E2E suite                  |
| `bun run test:e2e:ui`   | Playwright interactive UI (debugging)     |
| `bun run test:e2e:api`  | API-management spec only (Chromium)       |

## 🧪 Testing

End-to-end tests live in [`e2e/`](e2e/README.md) and run on **Playwright**. This is the active, maintained suite. (Jest is present in `devDependencies` for unit tests but has no configured script yet.)

```bash
bun run test:e2e          # All specs, all browsers (auto-starts the dev server)
bun run test:e2e:ui       # Interactive debugging UI

# Single spec, Chromium only
bunx playwright test e2e/tests/cabinets.spec.ts -c e2e/playwright.config.ts --project=chromium
```

For repeated local runs, start `bun run dev` first (Playwright reuses it) and add `--workers=1` to avoid OneDrive cold-compile flakiness. See [`e2e/README.md`](e2e/README.md) for the full layout, auth/mocking conventions, and page-object patterns.

## 🏗️ Development Guidelines

### Package Management

- **Use `bun` exclusively** — the project has bun-specific overrides in `package.json`
- Always run `bun run check` (type-check + lint) before committing

### TypeScript

- **`type` over `interface`** for all type definitions
- **No `any`** — create proper type definitions
- Type locations: `shared/types/` (shared), `lib/types/` (frontend only), `app/api/lib/types/` (backend only)
- Strict mode enabled: `noUnusedLocals`, `noImplicitReturns`, `noFallthroughCases`
- No comments in type files — names must be self-documenting

### React Imports (Critical)

```typescript
// ✅ CORRECT
import { useState, useEffect, FC } from 'react';

// ❌ WRONG — never import the React namespace
import React from 'react';
```

### File Organization

- `page.tsx` files are thin wrappers (<150 lines) — offload all logic to hooks/helpers
- API business logic in `app/api/lib/helpers/`
- Shared utilities in `lib/utils/` or `lib/helpers/`
- Components organized by feature in `components/CMS/` or `components/VAULT/`
- Feature subfolders: `tabs/`, `modals/`, `layouts/`, `details/`, `sections/`, `common/`, `forms/`, `tables/`, `cards/`, `skeletons/`, `mobile/`

### Database Queries

- **Always use Mongoose models** from `@/app/api/lib/models/` — never `db.collection()`
- **Use `findOne({ _id: id })` not `findById(id)`** — IDs are strings, not ObjectId
- **Type all queries** with `.lean<Type>()`, `.aggregate<Type>()`, or `.lean<Type>().cursor().toArray()` for large sets
- **Licencee filtering**: Always apply via `getUserLocationFilter()`; support both `licencee` and `licencee` spellings
- **Meters performance**: Use `.cursor({ batchSize: 1000 })` instead of `.exec()`; use `location` field directly, never `$lookup`

### Security & Cookies

- **Never hardcode `secure: true`** — use `getAuthCookieOptions()` from `lib/utils/cookieSecurity.ts`
- App runs on both HTTPS (domain) and HTTP (LAN IP), so cookie security must be auto-detected
- Always use `sameSite: 'lax'` — never `'none'`

### Timezone

- All dates stored UTC, displayed in Trinidad time (UTC-4)
- Use `lib/utils/gamingDayRange.ts` for gaming day offset calculations
- Business day: 8 AM → 8 AM Trinidad time (not midnight to midnight)
- Use `??` not `||` for offset so `0` is respected as valid

### Currency & Financial Display

- **Never hardcode `$`** or use `style: 'currency', currency: 'USD'` in components
- Use `formatCurrencyWithCodeString(amount, displayCurrency)` from `lib/utils/currency.ts`
- APIs pass `?currency=[displayCurrency]` so server converts; frontend displays, not converts
- Round to 2 decimals at display point: `Math.round(value * 100) / 100`
- Green for positive/income, Red for negative/expenses — use `getFinancialColorClass` from `lib/utils/financial/colors.ts`
- Reviewer scale: apply AFTER currency conversion via `getReviewerScale` from `app/api/lib/utils/reviewerScale.ts`

### Auditing & Logging

- Use `app/api/lib/helpers/activityLogger.ts` for all significant CRUD operations and security events
- Required for regulatory compliance — log before/after values for data changes

## 🏗️ Project Structure

```
Evolution1 CMS/
├── app/
│   ├── api/                       # All API routes (Next.js App Router)
│   │   ├── auth/                  # JWT login/logout/refresh/TOTP/password reset
│   │   ├── analytics/             # Dashboard metrics, charts, revenue
│   │   ├── reports/               # Location & machine reports
│   │   ├── locations/             # Location management + search-all
│   │   ├── cabinets/              # Cabinet/machine details and aggregation
│   │   ├── collections/           # Last collection time, check first collection
│   │   ├── collection-reports/    # Collection report CRUD (V1)
│   │   ├── collection-reports-v2/ # Session-based capture wizard (V2)
│   │   │   ├── sessions/          # Session CRUD + submit
│   │   │   ├── machines/          # Machine capture data + last-collection-time
│   │   │   ├── upload/            # Image upload to Google Drive
│   │   │   ├── drive-files/       # Drive file retrieval
│   │   │   └── custom-meters/     # Custom meter readings
│   │   ├── vault/                 # Vault transactions, shifts, float requests
│   │   ├── cashier/               # Cashier operations
│   │   ├── users/                 # User CRUD
│   │   ├── members/               # Member profiles
│   │   ├── sessions/              # Gaming session tracking
│   │   ├── metrics/               # Trend and meter metrics
│   │   ├── mqtt/                  # Real-time device comms
│   │   ├── admin/                 # Admin operations (resolve machine names)
│   │   ├── dev/                   # Developer DB Explorer (schema introspection + queries)
│   │   └── lib/
│   │       ├── middleware/db.ts        # MongoDB singleton connection
│   │       ├── models/                # 30+ Mongoose schemas
│   │       ├── helpers/               # Business logic (100+ helpers, grouped by domain)
│   │       │   ├── collectionReport/  # V1 collection report logic
│   │       │   ├── collectionReportV2/# V2 session-based logic
│   │       │   ├── vault/             # Vault operations
│   │       │   ├── reports/           # Report generation
│   │       │   ├── cabinets/          # Cabinet operations
│   │       │   ├── locations/         # Location operations
│   │       │   ├── auth/              # Authentication helpers
│   │       │   ├── dev/               # DB Explorer helpers
│   │       │   └── currency/          # Currency conversion
│   │       ├── utils/                 # Backend utilities (reviewerScale, etc.)
│   │       └── types/                 # Backend-only types
│   ├── (auth)/login/              # Login page
│   ├── vault/                     # Vault module pages
│   │   ├── management/            # Vault management (overview, transactions, floats, etc.)
│   │   │   ├── cash-desks/
│   │   │   ├── cashiers/
│   │   │   ├── expenses/
│   │   │   ├── floats/
│   │   │   ├── reports/end-of-day/
│   │   │   ├── soft-counts/
│   │   │   ├── transfers/
│   │   │   └── transactions/
│   │   ├── cashier/               # Cashier operations (payouts, shifts, float-requests, activity)
│   │   └── notifications/
│   ├── collection-report/         # Collection reporting pages
│   │   ├── report/[reportId]/     # Report details
│   │   └── report/session/[sessionId]/ # V2 session details
│   ├── locations/                 # Locations list + [slug] details
│   ├── cabinets/                  # Cabinets list + [slug] details (+ developer DB Explorer)
│   ├── members/                   # Members list + [id] profile
│   ├── sessions/                  # Sessions list + event details
│   ├── reports/                   # Reports page (Locations, Machines, Meters tabs)
│   ├── administration/            # Administration page (users, licencees, activity logs)
│   ├── developer/                 # Developer DB Explorer page
│   ├── collections/               # Collections list
│   ├── collection/                # Collection page
│   ├── install/                   # Installation/setup page
│   └── unauthorized/              # Unauthorized access page
├── components/
│   ├── CMS/                       # CMS-specific components (domain-organized)
│   │   ├── collectionReport/      # Collection report components (V1 + V2)
│   │   ├── reports/               # Reports tab components
│   │   ├── administration/        # Admin components (user modals, tables)
│   │   └── cabinets/              # Cabinet components (including developer/)
│   ├── VAULT/                     # Vault-specific components
│   ├── shared/
│   │   ├── ui/                    # Shared UI components
│   │   │   └── skeletons/         # Page-specific skeleton loaders (18 files)
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── PageLayout.tsx
│   ├── layout/                    # Layout components
│   └── ui/                        # Shadcn/UI base components
│       └── skeletons/             # Feature-specific skeletons (10 files)
├── lib/
│   ├── hooks/                     # Custom React hooks (domain-organized)
│   │   ├── collectionReport/      # Collection report hooks (useNewCollectionModal, etc.)
│   │   ├── vault/                 # Vault hooks
│   │   └── reports/               # Report hooks
│   ├── store/                     # Zustand stores (13 stores, one per domain)
│   ├── types/                     # Frontend TypeScript types
│   ├── utils/                     # Frontend utilities (currency, movement, gamingDay, etc.)
│   ├── helpers/                   # Frontend service/helper layer
│   ├── contexts/                  # React context providers
│   └── constants/                 # Constants (roles, collection tabs, etc.)
├── shared/
│   ├── types/                     # Types shared by frontend and backend (single source of truth)
│   └── utils/                     # Shared utilities (dateFormat, etc.)
├── Documentation/                 # Comprehensive documentation
│   ├── frontend/                  # Frontend documentation
│   │   └── pages/                 # Per-page frontend documentation
│   ├── backend/                   # Backend documentation
│   │   └── api/                   # Per-endpoint backend documentation
│   ├── collection-reports/        # Collection reports documentation
│   └── pillars/                   # High-level architectural guides
├── .instructions/                 # AI-readable rules and domain guides
│   ├── rules/                     # Engineering standards (type-safety, nextjs-rules, etc.)
│   ├── collection-reports-guidelines.md
│   ├── collection-report-ai-context.md
│   ├── gaming-day-offset-system.md
│   ├── isediting-system.md
│   ├── licencee-access-context.md
│   ├── authorization.md
│   └── vault-FRD.md
├── .claude/                       # Claude Code skills and context
│   ├── skills/                    # 11 operational skills
│   ├── collection-report-study.md
│   ├── collection-report-v2-plan.md
│   └── CONTEXT.md
├── e2e/                           # Playwright end-to-end test suite
└── proxy.ts                       # Next.js Edge middleware (auth guard)
```

> **Per-directory READMEs** document local conventions next to the code:
> [`app/api/lib/models/`](app/api/lib/models/README.md) ·
> [`components/`](components/README.md) ·
> [`lib/hooks/`](lib/hooks/README.md) ·
> [`lib/store/`](lib/store/README.md) ·
> [`e2e/`](e2e/README.md) ·
> [`Documentation/backend/`](Documentation/backend/README.md).
> AI/agent contributors: see [`CLAUDE.md`](CLAUDE.md) for architectural invariants and coding standards.

## 📊 Documentation Index

### Page Documentation (`Documentation/frontend/pages/`)

- [Dashboard](Documentation/frontend/pages/dashboard-page.md)
- [Locations](Documentation/frontend/pages/locations-page.md)
- [Cabinets / Fleet](Documentation/frontend/pages/cabinets-page.md)
- [Collection Report](Documentation/collection-reports/frontend/collection-report-page.md)
- [Members](Documentation/frontend/pages/members-page.md)
- [Sessions](Documentation/frontend/pages/sessions-page.md)
- [Administration](Documentation/frontend/pages/administration-page.md)
- [Vault](Documentation/frontend/pages/vault-page.md)
- [Login](Documentation/frontend/pages/login-page.md)
- [Frontend Standards](Documentation/frontend/pages/frontend-standards.md)

### API Documentation (`Documentation/backend/api/`)

- [Auth & IAM](Documentation/backend/api/auth-api.md)
- [Calculation Engine](Documentation/backend/api/calculation-engine.md)
- [Collections API](Documentation/collection-reports/api/collections-api.md)
- [Dashboard API](Documentation/backend/api/dashboard-api.md)
- [Locations API](Documentation/backend/api/locations-api.md)
- [Machines API](Documentation/backend/api/machines-api.md)
- [Members API](Documentation/backend/api/members-api.md)
- [Reports API](Documentation/backend/api/reports-api.md)
- [Sessions API](Documentation/backend/api/sessions-api.md)
- [Vault & Ledger API](Documentation/backend/api/vault-api.md)
- [MQTT System](Documentation/backend/api/mqtt-system.md)
- [Sync Meters API](Documentation/backend/api/sync-meters-api.md)
- [System Config API](Documentation/backend/api/system-config-api.md)

### AI & Agent Context

- [CLAUDE.md](CLAUDE.md) — Architectural invariants, system philosophy, coding standards
- [Collection Reports Guidelines](.instructions/collection-reports-guidelines.md) — Critical collection report rules
- [Collection Report AI Context](.instructions/collection-report-ai-context.md) — Comprehensive AI context for collection reports
- [Licencee Access Control](.instructions/licencee-access-context.md) — Multi-tenant data isolation rules
- [Gaming Day Offset System](.instructions/gaming-day-offset-system.md) — Business day calculation rules
- [isEditing System](.instructions/isediting-system.md) — Transactional state management
- [Authorization & RBAC](.instructions/authorization.md) — Role-based access control

### Master Hub

- [Project Guide](Documentation/PROJECT_GUIDE.md) — complete documentation index

## 🏗️ Refactoring Status

All 22 oversized API routes (>500 lines) have been refactored to helpers. All routes are now under 500 lines. Frontend Phase 1 complete (25 interface→type conversions, single-letter renames, Record<string,unknown> removals, JSDoc additions, oversized page splits).

**Pre-existing type-check errors** (known, not yet fixed):
- `DashboardDesktopLayout.tsx:221` / `DashboardMobileLayout.tsx:197` — Location type mismatch
- `ReportsLocationsTab.tsx:646,648` — `Record<string,unknown>[]` not assignable
- `vaultHelpers.ts:564,617,808,1046` — Date→string cast

## ✨ Core Principles

- **Build Integrity**: Zero-error builds required before every commit (`bun run check`)
- **Type Safety**: Comprehensive TypeScript coverage, no `any`, no `Record<string, unknown>` for domain data
- **No React Namespace**: Named imports only (`import { useState } from 'react'`)
- **Timezone Consistency**: All dates stored UTC, displayed Trinidad time (UTC-4)
- **Gaming Day Offset**: Financial reporting aligned with 8 AM gaming day boundary
- **Movement Delta Method**: All financial calculations use sum of movement fields
- **Secure Cookies**: Auto-detected secure context — never hardcode `secure: true`
- **Audit Logging**: All significant operations logged for regulatory compliance
- **Multi-Tenant**: All API responses filtered by user's assigned licencees (intersection logic)
- **Licencee Isolation**: Data leakage between licencees is a critical failure
- **Single Source of Truth**: Shared types in `shared/types/`, no duplication between frontend/backend

---

**Last Updated:** June 30, 2026
