# Evolution1 Casino Management System (CMS)

<div align="center">
  <img src="public/EOS_Logo.png" alt="EOS Logo" width="200"/>
</div>

**Evolution1 CMS** is a robust casino management system for real-time casino operations, financial tracking, and compliance monitoring. It features a modern dashboard, detailed reporting, and comprehensive management of locations, cabinets, collections, and users.

**Author:** Aaron Hazzard - Senior Software Engineer

## 🚀 Features

- 📊 **Dashboard with Real-Time Analytics** ([docs](Documentation/pages/dashboard-page.md))
  - Gaming day offset support for accurate financial reporting
  - Custom date ranges with time inputs
  - Multi-currency support with real-time conversion
- 🎮 **Slot Machine & Gaming Floor Management** ([docs](Documentation/pages/cabinets-page.md))
  - Real-time status monitoring and performance tracking
  - Remote SMIB configuration and firmware management
- 💰 **Financial Tracking & Collection Reporting** ([docs](Documentation/pages/collection-report-page.md))
  - 3-Step collection wizard with machine meter entry and cash reconciliation
  - SAS meter comparison and time defaults auto-populated from previous collections
  - Edit/Delete reports with full meter reversion
  - Variation checking with threshold alerts and confirmation dialogs
  - Mobile-first responsive interface with portal dropdown for large location lists
  - Movement Delta Method for accurate financial calculations
- 📍 **Location Management** ([docs](Documentation/pages/locations-page.md))
  - Grid/map toggle view with geospatial coordinates
  - Per-location gaming day offset configuration
  - Reviewer multiplier applied server-side to all financial metrics
- 👥 **Member Management** ([docs](Documentation/pages/members-page.md))
- 🎯 **Session Management** ([docs](Documentation/pages/sessions-page.md))
- 👥 **User & Licencee Administration** ([docs](Documentation/pages/administration-page.md))
- 🔐 **Secure Authentication** ([docs](Documentation/api/auth-api.md))
  - Role-based access control (RBAC) — 9 roles from developer → reviewer
  - JWT token-based authentication with HttpOnly cookies
  - Multi-device session support
  - Session invalidation on permission changes (not on login)
  - TOTP 2FA with recovery flows
  - Mandatory post-login profile validation
- 📊 **Comprehensive Reports Module** ([docs](Documentation/api/reports-api.md))
  - Dashboard, Locations, Machines, and Meters tabs
  - Gaming day offset integration for accurate reporting
- 🔐 **Vault Management System (VMS)** ([docs](Documentation/pages/vault-page.md))
  - Multi-tenant accounting ledger with double-entry style methodology
  - Real-time cashier shift tracking and denomination validation
  - Speed-optimized payouts for high-volume operations
  - Atomic immutable transaction history
  - Full-screen responsive mobile interface for field operations
- 🔁 **Reviewer Multiplier** — Per-user financial scaling applied server-side across all metric endpoints

## 🛠️ Tech Stack

| Category | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.0.7 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS | 3.4.17 |
| Database | MongoDB / Mongoose | 6.17.0 / 8.18.1 |
| State (Global) | Zustand | 5.0.8 |
| State (Server) | TanStack React Query | 5.90.7 |
| Auth | jose (JWT) | 6.1.0 |
| Password | bcryptjs | 3.0.2 |
| 2FA | otplib (TOTP) | 13.3.0 |
| UI Components | Shadcn/UI + Radix UI + MUI | various |
| Charts | Recharts | 2.15.4 |
| Maps | React Leaflet | 5.0.0 |
| Animations | Framer Motion | 12.23.12 |
| HTTP Client | Axios | 1.12.2 |
| SMS | Infobip SDK | 0.3.2 |
| Email | Nodemailer | 8.0.1 |
| IoT | MQTT | 5.14.1 |
| Export | jsPDF + xlsx | 3.0.2 / 0.18.5 |
| Validation | Zod | 3.25.76 |
| Testing | Jest + Playwright | 30.2.0 / 1.58.2 |

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
INFOBIP_BASE_URL=your_infobip_url
INFOBIP_API_KEY=your_infobip_key
```

### 5️⃣ Run the Development Server

```sh
bun run dev
```

Open http://localhost:3000 to see the application.

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

| Command | Description |
| --- | --- |
| `bun run dev` | Start development server (localhost:3000) |
| `bun run dev:turbo` | Start with Turbopack |
| `bun run build` | Build production app |
| `bun run start` | Start production server |
| `bun run lint` | ESLint on .ts/.tsx files |
| `bun run lint:fix` | Auto-fix ESLint issues |
| `bun run type-check` | TypeScript type checking (tsc --noEmit) |
| `bun run format` | Prettier formatting |
| `bun run check` | type-check && lint |
| `bun run test` | Run Jest tests |
| `bun run test:watch` | Jest in watch mode |
| `bun run test:coverage` | Jest with coverage |

## 🧪 Testing & Development Tools

### Go MongoDB Query Tool (`test/`)

A Go-based interactive CLI for database debugging without affecting the application.

```bash
cd test/
go run main.go
```

**Capabilities:** Machine search, meter data analysis by date range, licencee/location filtering, aggregation pipeline testing, performance measurement.

## 🏗️ Development Guidelines

### Package Management
- **Use `bun` exclusively** — the project has bun-specific overrides in `package.json`
- Always run `bun build` after changes; fix all errors before committing

### TypeScript
- **`type` over `interface`** for all type definitions
- **No `any`** — create proper type definitions
- Type locations: `shared/types/` (shared), `lib/types/` (frontend only), `app/api/lib/types/` (backend only)
- Strict mode enabled: `noUnusedLocals`, `noImplicitReturns`, `noFallthroughCases`

### React Imports (Critical)
```typescript
// ✅ CORRECT
import { useState, useEffect, FC } from 'react';

// ❌ WRONG — never import the React namespace
import React from 'react';
```

### File Organization
- `page.tsx` files are thin wrappers — offload all logic to hooks/helpers
- API business logic in `app/api/lib/helpers/`
- Shared utilities in `lib/utils/` or `lib/helpers/`
- Components organized by feature in `components/CMS/` or `components/VAULT/`

### Security & Cookies
- **Never hardcode `secure: true`** — use `getAuthCookieOptions(request)` from `lib/utils/cookieSecurity.ts`
- App runs on both HTTPS (domain) and HTTP (LAN IP), so cookie security must be auto-detected
- Always use `sameSite: 'lax'` — never `'none'`

### Timezone
- All dates stored UTC, displayed in Trinidad time (UTC-4)
- Use `lib/utils/gamingDayRange.ts` for gaming day offset calculations
- Business day: 8 AM → 8 AM Trinidad time (not midnight to midnight)

### Auditing & Logging
- Use `app/api/lib/helpers/activityLogger.ts` for all significant CRUD operations and security events
- Required for regulatory compliance — log before/after values for data changes

## 🏗️ Project Structure

```
Evolution1 CMS/
├── app/
│   ├── api/                   # All API routes (Next.js App Router)
│   │   ├── auth/              # JWT login/logout/refresh/TOTP/password reset
│   │   ├── analytics/         # Dashboard metrics, charts, revenue
│   │   ├── reports/           # Location & machine reports
│   │   ├── locations/         # Location management
│   │   ├── machines/          # Machine/cabinet details and aggregation
│   │   ├── collections/       # Last collection time, check first collection
│   │   ├── collection-reports/ # Collection report CRUD
│   │   ├── vault/             # Vault transactions, shifts, float requests
│   │   ├── cashier/           # Cashier operations
│   │   ├── users/             # User CRUD
│   │   ├── members/           # Member profiles
│   │   ├── sessions/          # Gaming session tracking
│   │   ├── metrics/           # Trend and meter metrics
│   │   ├── mqtt/              # Real-time device comms
│   │   └── lib/
│   │       ├── middleware/db.ts      # MongoDB singleton connection
│   │       ├── models/               # 30+ Mongoose schemas
│   │       ├── helpers/              # Business logic
│   │       └── utils/apiResponse.ts  # Standardized API responses
│   ├── (auth)/login/          # Login page
│   ├── vault/                 # Vault module pages (14 pages)
│   ├── collection-report/     # Collection reporting pages
│   ├── locations/             # Locations list + [slug] details
│   ├── cabinets/              # Cabinets list + [slug] details
│   ├── members/               # Members list + [id] profile
│   ├── sessions/              # Sessions list + event details
│   ├── reports/               # Reports page
│   └── administration/        # Administration page
├── components/
│   ├── CMS/                   # CMS-specific components
│   ├── VAULT/                 # Vault-specific components
│   └── shared/                # Layout, auth, UI, debug components
├── lib/
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # Zustand stores (13 stores)
│   ├── types/                 # Frontend TypeScript types
│   ├── utils/                 # Frontend utilities
│   ├── helpers/               # Frontend service/helper layer
│   └── contexts/              # React context providers
├── shared/
│   └── types/                 # Types shared by frontend and backend
├── Documentation/             # Comprehensive documentation
│   ├── pages/                 # Per-page frontend documentation
│   ├── api/                   # Per-endpoint backend documentation
│   ├── pillars/               # High-level architectural guides
│   └── backend/               # Database model documentation
├── test/                      # Go-based MongoDB query tool
└── proxy.ts                   # Next.js Edge middleware (auth guard)
```

## 📊 Documentation Index

### Page Documentation (`Documentation/pages/`)
- [Dashboard](Documentation/pages/dashboard-page.md)
- [Locations](Documentation/pages/locations-page.md)
- [Cabinets / Fleet](Documentation/pages/cabinets-page.md)
- [Collection Report](Documentation/pages/collection-report-page.md)
- [Members](Documentation/pages/members-page.md)
- [Sessions](Documentation/pages/sessions-page.md)
- [Administration](Documentation/pages/administration-page.md)
- [Vault](Documentation/pages/vault-page.md)
- [Login](Documentation/pages/login-page.md)
- [Frontend Standards](Documentation/pages/frontend-standards.md)

### API Documentation (`Documentation/api/`)
- [Auth & IAM](Documentation/api/auth-api.md)
- [Calculation Engine](Documentation/api/calculation-engine.md)
- [Collections API](Documentation/api/collections-api.md)
- [Dashboard API](Documentation/api/dashboard-api.md)
- [Locations API](Documentation/api/locations-api.md)
- [Machines API](Documentation/api/machines-api.md)
- [Members API](Documentation/api/members-api.md)
- [Reports API](Documentation/api/reports-api.md)
- [Sessions API](Documentation/api/sessions-api.md)
- [Vault & Ledger API](Documentation/api/vault-api.md)
- [MQTT System](Documentation/api/mqtt-system.md)
- [Sync Meters API](Documentation/api/sync-meters-api.md)
- [System Config API](Documentation/api/system-config-api.md)

### Master Hub
- [Project Guide](Documentation/PROJECT_GUIDE.md) — complete documentation index

## ✨ Core Principles

- **Build Integrity**: Zero-error builds required before every commit
- **Type Safety**: Comprehensive TypeScript coverage, no `any`
- **No React Namespace**: Named imports only (`import { useState } from 'react'`)
- **Timezone Consistency**: All dates stored UTC, displayed Trinidad time (UTC-4)
- **Gaming Day Offset**: Financial reporting aligned with 8 AM gaming day boundary
- **Movement Delta Method**: All financial calculations use sum of movement fields
- **Secure Cookies**: Auto-detected secure context — never hardcode `secure: true`
- **Audit Logging**: All significant operations logged for regulatory compliance
- **Multi-Tenant**: All API responses filtered by user's assigned licencees

---

**Last Updated:** April 2026
