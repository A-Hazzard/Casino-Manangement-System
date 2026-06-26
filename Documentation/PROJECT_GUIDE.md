# Evolution One CMS — Master Documentation Hub

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.4.0

---

## 1. Project Overview

Evolution One CMS is a full-stack casino management platform built on Next.js 16 (App Router), MongoDB, and TypeScript. It is a single unified application — routing and feature access are determined entirely by the user's assigned role. After login, each role is automatically directed to its designated interface:

- **CMS interface** (dashboard, analytics, cabinets, collections, members, sessions) — accessed by: `developer`, `admin`, `manager`, `location admin`, `reviewer`, `owner`, `technician`, `collector`
- **Vault interface** (cash management, shifts, float requests, payouts) — accessed by: `vault-manager`, `cashier`

---

## 2. Page-Level Guides (`/Documentation/frontend/pages`)

Technical and functional documentation for every frontend interface.

| Page                      | Document                                                       | Key Features Covered                                          |
| :------------------------ | :------------------------------------------------------------- | :------------------------------------------------------------ |
| **Dashboard**             | [dashboard-page.md](./frontend/pages/dashboard-page.md)                 | Financial Pulse, Charts, Map, Top Performers                  |
| **Administration**        | [administration-page.md](./frontend/pages/administration-page.md)       | Users, Licencees, Activity Log, Role Inheritance              |
| **Locations**             | [locations-page.md](./frontend/pages/locations-page.md)                 | Grid/Map Toggle, Coordinate Mapping, Reviewer Multiplier      |
| **Fleet / Cabinets**      | [cabinets-page.md](./frontend/pages/cabinets-page.md)                   | Real-time Monitor, Remote Commands, Forensic Logs             |
| **Members (CRM)**         | [members-page.md](./frontend/pages/members-page.md)                     | Loyalty Points, KYC, Win/Loss, Profile View                   |
| **Operations (Pulse)**    | [sessions-page.md](./frontend/pages/sessions-page.md)                   | Live Events (SSE), Replay Wizard, Active Count                |
| **Collections Wizard**    | [collection-report-page.md](./frontend/pages/collection-report-page.md) | 3-Step Wizard, Variation Checking, Mobile Modal, SAS Defaults |
| **Vault / Cage**          | [vault-page.md](./frontend/pages/vault-page.md)                         | Shift Management, Blind Close, Ledger, TOTP                   |
| **System Config**         | [system-config-page.md](./frontend/pages/system-config-page.md)         | Firmware Repository, Migrations, Localization                 |
| **Login**                 | [login-page.md](./frontend/pages/login-page.md)                         | Auth Flow, TOTP, Profile Validation                           |
| **History Fix**           | [history-fix-page.md](./frontend/pages/history-fix-page.md)             | Meter Gap Correction, Bulk Repairs                            |
| **Engineering Standards** | [frontend-standards.md](./frontend/pages/frontend-standards.md)         | Skeleton UX, Page Structure, Error Boundary                   |

---

## 3. API & Logic Documentation (`/Documentation/backend/api`)

Technical reference for backend endpoints and core business logic.

| Module               | Document                                              | Core Logic / Endpoints                                            |
| :------------------- | :---------------------------------------------------- | :---------------------------------------------------------------- |
| **Analytics Engine** | [calculation-engine.md](./backend/api/calculation-engine.md)  | Movement Delta, 8 AM Offset, Gaming Days, Reviewer Multiplier     |
| **Dashboard API**    | [dashboard-api.md](./backend/api/dashboard-api.md)            | Money-In Query, Parallel Aggregation, Filters                     |
| **Auth & IAM**       | [auth-api.md](./backend/api/auth-api.md)                      | JWT Strategy, Session Versioning, TOTP, 10 Roles                  |
| **Administration**   | [administration-api.md](./backend/api/administration-api.md)  | RBAC, User CRUD, Multi-tenant Isolation                           |
| **Locations API**    | [locations-api.md](./backend/api/locations-api.md)            | Property Config, Reviewer Multiplier, Coordinate Conversion       |
| **Cabinets API**     | [cabinets-api.md](./backend/api/cabinets-api.md)              | Hardware Fleet, Status Computation, Commands, Reviewer Multiplier |
| **Members API**      | [members-api.md](./backend/api/members-api.md)                | Win/Loss Summation, Loyalty Ratios, KYC                           |
| **Collections API**  | [collections-api.md](./backend/api/collection-reports-api.md) | Finalization, History Bridge, Profit Sharing, SAS Time Defaults   |
| **Real-time Sync**   | [sync-meters-api.md](./backend/api/sync-meters-api.md)        | MQTT Meter Handshake, Sync Accuracy                               |
| **Vault & Ledger**   | [vault-api.md](./backend/api/vault-api.md)                    | Double-Entry, Blind Close Security, 2FA Gate                      |
| **Exec Reporting**   | [reports-api.md](./backend/api/reports-api.md)                | Month-end Audit, PDF/XLSX Gen, Summaries                          |
| **IoT / MQTT**       | [mqtt-system.md](./backend/api/mqtt-system.md)                | Topic Hierarchy, QoS, Heartbeats, Raw SAS                         |
| **Forensic Audit**   | [sessions-api.md](./backend/api/sessions-api.md)              | Event Mapping, Session IDs, Auto-Logout                           |
| **System Config**    | [system-config-api.md](./backend/api/system-config-api.md)    | Firmware GridFS, Localization, Migrations                         |

---

## 4. Architectural Pillars (`/Documentation/pillars`)

High-level strategic guides for the five pillars of the platform.

- [Identity & Admin](./pillars/identity-admin.md)
- [Floor Operations](./pillars/floor-operations.md)
- [Financials & Analytics](./pillars/financial-system.md)
- [Collections & Reconciliation](./pillars/collections-pillar.md)
- [Engineering & Platform](./pillars/engineering-guide.md)

---

## 5. Database Documentation (`/Documentation/backend`)

- [Database Models](./backend/database-models.md) — All 30+ Mongoose schemas with key fields

---

## 6. Bug Fix & Debugging Logs

- [Collection Report Variation Fix](./collection-reports/reference/collection-report-variation-fix.md) — Variation mismatch root causes and fixes
- [Timezone Debugging](./timezone-debugging.md) — Trinidad timezone edge cases for cabinet detail queries

---

## 7. Critical System Rules (Quick Reference)

| Rule                    | Detail                                                                   |
| :---------------------- | :----------------------------------------------------------------------- |
| **Gaming Day**          | 8 AM → 8 AM Trinidad (UTC-4). Helper: `lib/utils/gamingDayRange.ts`      |
| **Financial Calc**      | Movement Delta Method — sum of `movement.*` fields only                  |
| **Multi-tenant**        | All queries filtered by `userPayload.assignedLicencees`                  |
| **Reviewer Multiplier** | `value * (1 - user.multiplier)` applied server-side in all metric routes |
| **Cookies**             | Never hardcode `secure: true` — use `getAuthCookieOptions(request)`      |
| **React Imports**       | Named imports only — never `import React from 'react'`                   |
| **Timezone Storage**    | UTC in DB; convert to Trinidad for display and query ranges              |
| **Audit Logging**       | `activityLogger.ts` required for all CRUD + security events              |

---

**Maintained By:** Evolution One Development Team  
**Lead Engineer:** Aaron Hazzard
