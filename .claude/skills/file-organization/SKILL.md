---
name: File Organization
description: Directory structure for shared code, frontend, backend, components, and utilities across the application.
---

# File Organization

Use to **understand the project structure** and place files in correct directories.

## Core Structure

```
project-root/
├── shared/                     # Shared code (frontend + backend)
│   ├── types/                  # Type definitions
│   │   ├── api.ts              # API request/response types
│   │   ├── entities.ts         # Core entities (User, Location, Machine)
│   │   ├── auth.ts             # Authentication types
│   │   ├── analytics.ts        # Dashboard/analytics types
│   │   └── index.ts            # Central export point
│   └── utils/                  # Shared utilities
│       └── [utility].ts        # Shared utility functions
│
├── app/                        # Next.js app directory
│   ├── (auth)/login/           # Unauthenticated routes
│   ├── page.tsx                # Dashboard home page
│   ├── [feature]/              # Feature directories
│   │   └── page.tsx            # Feature page
│   ├── api/                    # API routes
│   │   ├── lib/
│   │   │   ├── models/         # Mongoose models
│   │   │   ├── helpers/        # Business logic
│   │   │   ├── types/          # Backend-only types
│   │   │   ├── middleware/     # Database connection, auth
│   │   │   └── services/       # External service integrations
│   │   └── [feature]/
│   │       └── route.ts        # API endpoint
│   └── layout.tsx              # Root layout
│
├── lib/                        # Frontend utilities
│   ├── types/                  # Frontend-only types
│   ├── helpers/                # API call helpers
│   ├── hooks/                  # Custom React hooks
│   ├── store/                  # Zustand stores
│   ├── utils/                  # Frontend utilities
│   ├── contexts/               # React contexts
│   └── services/               # Frontend services
│
├── components/                 # React components
│   ├── ui/                     # Shadcn/UI base components
│   │   ├── skeletons/          # Page-specific skeleton loaders
│   │   └── [component].tsx     # UI component
│   ├── shared/                 # Shared components (layout, auth, debug)
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── PageLayout.tsx
│   ├── [feature]/              # Feature-specific components
│   └── CMS/                    # CMS mode components
│   └── VAULT/                  # Vault mode components
│
├── public/                     # Static assets
├── types/                      # Application-wide types
└── Documentation/              # Project documentation
```

- **Rules & Standards**: See [`ARCHITECTURE.md`](mdc:.instructions/rules/ARCHITECTURE.md) for the rules hierarchy.

## Directory Placement Rules

### `shared/types/` - Shared Types (Frontend + Backend)

Use for types referenced in both frontend and backend code. This is the **Single Source of Truth** for core data models.

```typescript
// shared/types/entities.ts
export type User = {
  _id: string;
  username: string;
  emailAddress: string;
  roles: string[];
};

// Used in:
// - Backend API routes
// - Frontend components
// - Frontend stores
```

**Files:**
- `api.ts` - API request/response types
- `entities.ts` - Core entity types
- `auth.ts` - Authentication types
- `analytics.ts` - Dashboard types
- `index.ts` - Export everything

### `lib/types/` - Frontend-Only Types

Use for types used only in frontend code.

```typescript
// lib/types/stores.ts
export type DashboardStore = {
  selectedLicencee: string;
  setSelectedLicencee: (licencee: string) => void;
};

// Used only in:
// - Frontend components
// - Frontend hooks
// - Frontend stores
```

### `app/api/lib/types/` - Backend-Only Types

Use for types used only in backend API code.

```typescript
// app/api/lib/types/reports.ts
export type MeterReportParams = {
  startDate: string;
  endDate: string;
  locationId?: string;
};

// Used only in:
// - API route handlers
// - Backend helpers
```

### `app/api/lib/helpers/` - Business Logic

Extract complex logic from API routes here.

```
app/api/lib/helpers/
├── auth.ts                    # Authentication logic
├── licenceeFilter.ts          # Licencee/location filtering
├── users/
│   └── users.ts              # User operations
├── reports/
│   ├── meters.ts             # Meter report calculations
│   ├── locations.ts          # Location report calculations
│   └── metersCurrency.ts     # Currency conversions
└── [feature]/
    └── [logic].ts
```

### `lib/helpers/` - Frontend API Helpers

Fetch and data transformation for frontend.

```
lib/helpers/
├── dashboard.ts              # Dashboard data fetching
├── locations.ts              # Locations data fetching
├── cabinets.ts              # Cabinets data fetching
└── [feature].ts
```

### `lib/hooks/` - Custom Hooks

Reusable stateful logic.

```
lib/hooks/
├── useLocationData.ts        # Locations data hook
├── useCabinetsData.ts        # Cabinets data hook
├── collectionReport/
│   ├── useCollectionReportData.ts
│   └── useCollectionReportFilters.ts
└── [feature]/
    └── use[FeatureName].ts
```

### `lib/store/` - Zustand Stores

Global application state.

```
lib/store/
├── dashboardStore.ts         # Dashboard state (licencee, theme)
├── userStore.ts             # User authentication state
└── [feature]Store.ts
```

### `lib/utils/` - Frontend Utilities

Pure utility functions.

```
lib/utils/
├── gamingDayRange.ts         # Gaming day calculations
├── licenceeAccess.ts         # Licencee access checks
├── currencyFormatter.ts      # Currency formatting
├── dateFormatter.ts          # Date formatting
└── [utility].ts
```

### `components/` - React Components

Organized by feature and type.

```
components/
├── ui/                       # Base UI components
│   ├── skeletons/            # Page skeletons
│   ├── Button.tsx
│   └── Card.tsx
├── shared/                   # Shared across pages
│   ├── Header.tsx
│   ├── PageLayout.tsx
│   └── ErrorBoundary.tsx
├── CMS/                      # CMS-specific features
│   ├── locations/
│   │   ├── LocationsPage.tsx
│   │   └── modals/
│   ├── cabinets/
│   │   ├── CabinetsPage.tsx
│   │   └── modals/
│   └── [feature]/
│       └── components
├── VAULT/                    # Vault-specific features
│   ├── VaultDashboard.tsx
│   └── [feature]/
└── [feature]/
    ├── [ComponentName].tsx
    └── sub-components/
```

### `app/api/` - API Routes

Mirror the feature structure.

```
app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── refresh/route.ts
├── reports/
│   ├── meters/route.ts
│   ├── locations/route.ts
│   └── machines/route.ts
├── locations/route.ts        # Main locations endpoint
├── cabinets/route.ts         # Cabinets endpoint
├── machines/
│   ├── route.ts
│   ├── status/route.ts
│   └── [id]/route.ts
├── lib/
│   ├── models/               # Mongoose schemas
│   │   ├── user.ts
│   │   ├── gaminglocations.ts
│   │   ├── machines.ts
│   │   └── meters.ts
│   ├── helpers/              # Business logic
│   ├── middleware/           # Database, auth
│   ├── types/               # Backend types
│   └── services/            # External services
└── [feature]/
    └── route.ts
```

## Import Path Aliases

```typescript
// Two aliases defined in tsconfig.json:
// @/*     → project root (e.g. @/lib/utils/..., @/components/..., @/app/api/...)
// @shared/* → shared/ directory (shorthand for shared types/utils)

// ✅ CORRECT — always use aliases, never relative paths for cross-directory imports
import { type User } from '@/shared/types/entities';         // Shared types
import { useLocationData } from '@/lib/helpers/locations';   // Frontend helpers
import { Button } from '@/components/ui/Button';             // Components
import { User } from '@/app/api/lib/models/user';            // Models (backend only)
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';

// ❌ WRONG — relative paths are fragile
import { type User } from '../../../shared/types/entities';
```

**Always `type` keyword for types — never `interface`:**

```typescript
// ✅
export type ReportParams = { startDate: string; endDate: string };

// ❌
export interface ReportParams { startDate: string; endDate: string }
```

## File Naming Conventions

- **Components**: `PascalCase` → `MyComponent.tsx`
- **Utilities**: `camelCase` → `myUtility.ts`
- **Types**: `camelCase` → `myTypes.ts`
- **Hooks**: `camelCase` → `useMyHook.ts`
- **Stores**: `camelCase` → `myStore.ts`
- **API routes**: `route.ts` → `app/api/[path]/route.ts`

## Organization Principles

1. **Shared code goes in `shared/`** - Used by both frontend and backend
2. **Frontend code goes in `lib/`** - React hooks, utilities, stores
3. **Backend code goes in `app/api/lib/`** - Models, helpers, middleware
4. **Components grouped by feature** - Each feature has its own directory
5. **Keep `app/` pages lean** - Offload logic to helpers and hooks
6. **Keep files under 500 lines** - Extract when too large
7. **Co-locate related files** - Feature components, hooks, and types together

## Code Colocation Example

```
lib/hooks/collectionReport/
├── useCollectionReportData.ts      # Main hook
├── useCollectionReportFilters.ts   # Filter logic hook
└── constants.ts                    # Feature constants (if any)

components/[feature]/
├── MyFeatureComponent.tsx          # Main component
├── MyFeatureModal.tsx              # Modal
└── sub-components/
    ├── MySubComponent.tsx          # Sub-component
    └── AnotherSubComponent.tsx
```

## Code Review Checklist

- ✅ Files in correct directory
- ✅ Shared types in `shared/types/`
- ✅ Frontend-only code in `lib/`
- ✅ Backend-only code in `app/api/lib/`
- ✅ Components organized by feature
- ✅ Helpers extracted to proper directories
- ✅ No circular imports
- ✅ Import paths use aliases (`@/...`)
- ✅ File naming follows conventions
- ✅ Files under 500 lines
