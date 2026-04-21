# CLAUDE.md — Absolute Master Context

This file is the single source of truth for architectural invariants, data integrity, and system philosophy for the Evolution One CMS project. It provides comprehensive guidance for development, operations, and compliance.

## 🏗️ Project & Architectural Foundations

### 1. Overview
**Evolution1 CMS** is a casino management system for real-time operations, financial tracking, and compliance. It is a unified application where routing and features are determined by the user's assigned role.

### 2. Multi-Tenant Isolation & Access Control
- **Licencee Isolation**: Every user belongs to one or more `assignedLicencees`. Data leakage between licencees is a critical failure.
- **Intersection Logic (Critical)**: 
    - **Managers**: See ALL locations under their `assignedLicencees`.
    - **Collectors/Location Admins/Technicians**: See ONLY `assignedLocations` that ALSO belong to their `assignedLicencees`.
- **Role Hierarchy**: 1. Developer, 2. Owner, 3. Admin, 4. Manager, 5. Location Admin, 6. Vault-Manager, 7. Cashier, 8. Technician, 9. Collector, 10. Reviewer.
- **Session Invalidation**: Changes to roles, licencees, or locations MUST increment `sessionVersion` on the user document to force re-login.

### 3. The Financial Reviewer Scale
The `reviewer` role sees a scaled-down version of all currency metrics to protect actual business performance data.
- **Formula**: `scale = 1 - multiplier` (e.g., multiplier 0.30 results in 0.70 scale).
- **Rule**: If `reviewer` role is missing or `multiplier` is null/0, `scale = 1`.

---

## 💰 Financial & Collection Systems

### 1. Business Day & Gaming Day Offset
- **Trinidad Time (UTC-4)**: Business days run **8 AM to 8 AM**, not midnight.
- **Rollover Rule**: If local time < 8 AM, queries for "Today" MUST resolve to the previous calendar day's 8 AM start.
- **Application**: Applied to financial metrics (dashboard, reports, analytics). Do NOT apply to collection reports or user sessions.

### 2. `isEditing` — The Transactional State
The system uses the `isEditing` flag on `CollectionReport` documents to manage data integrity.
- **State 2 (isEditing: true)**: Report is "Checked Out". Collections are being modified, machine histories are NOT yet synced. Unsafe for financial reporting.
- **State 3 (isEditing: false)**: Report is "Finalized". Machine histories are synchronized; record is auditable.

### 3. Collection Data Invariants
- **Synchronization**: `locationReportId` and `isCompleted` MUST be kept in sync.
- **prevIn / prevOut Priority**: 
    1. Primary: The `metersIn/Out` from the machine's actual previous completed collection.
    2. Fallback: The `machine.collectionMeters` values.
- **Movement Delta**: `movement.gross` is the ground truth. Recalculations are ONLY permitted in the "Add Entry" phase; once saved, `movement.gross` is fixed.

---

## 💻 Technical Standards & Conventions

### 1. Database (MongoDB)
- **ID Pattern**: Use **String IDs** for everything (`_id: string`, NOT `ObjectId`).
- **Query Tools**: Always use `findOne({ _id: id })`. **NEVER use `findById`**.
- **Deleted State**: Use `$or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }]` for legacy vs active records.
- **Models**: Always use imported Mongoose models from `app/api/lib/models/`.

### 2. TypeScript & Naming Conventions (CRITICAL)
- **No `any`**: Create proper types or use `unknown`.
- **No Single-Letter Variables**: Never use `s`, `c`, `i`, etc. Use descriptive names like `sum`, `collection`, `index`.
- **Naming**: Use `type` over `interface`. Path aliases: `@/*` = root, `@shared/*` = `shared/`.
- **Section Comments**: Use `// ============================================================================` separators with domain-specific labels.

### 3. React & Frontend
- **React Imports**: NEVER import the React namespace. Use `import { useState, FC } from 'react'`.
- **Loading States**: Every page/modal MUST have a matching skeleton in `components/ui/skeletons/`. No generic spinners.
- **Component Structure**: 1. Hooks → 2. Computed → 3. Handlers → 4. Effects → 5. Render.

### 4. Cookie & HTTP/HTTPS Security
- **The Rule**: Never hardcode `secure: true`. 
- **Usage**: Always use `getAuthCookieOptions()` from `lib/utils/cookieSecurity.ts`.
- **Lax**: Always use `sameSite: 'lax'`.

---

## 🚀 Operations & Tooling

### 1. Commands
Use **bun exclusively** for all operations.
- `bun run dev` - Start dev server at localhost:3000
- `bun run check` - Run type-check && lint before committing
- `bun run build` - Build Next.js application
- `bun run test` - Run Jest tests

### 2. Key Environment Variables
- `MONGODB_URI`, `JWT_SECRET`, `COOKIE_SECURE`
- `SENDGRID_API_KEY`, `INFOBIP_BASE_URL`/`INFOBIP_API_KEY`
- `MQTT_URI`, `MQTT_PUB_TOPIC`, `MQTT_SUB_TOPIC`

### 3. File Map & References
- **Licencee Filtering**: `app/api/lib/helpers/licenceeFilter.ts`
- **Reviewer Scale**: `app/api/lib/utils/reviewerScale.ts`
- **Gaming Day**: `lib/utils/gamingDayRange.ts`
- **Permissions**: `lib/utils/permissions/client.ts` / `server.ts`
- **DB Middleware**: `app/api/lib/middleware/db.ts`
- **Color Utilities**: `lib/utils/financial/colors.ts`

---

## 🏦 Vault vs CMS Environments
Developed behaviors differ based on `process.env.APPLICATION`:
- **CMS Mode**: Casino management metrics.
- **VAULT Mode**: Cash desk management (Vault balance, Floats, Transfers).
- **Routing**: Users are redirected to `/vault-management` in VAULT mode + authorized roles.
