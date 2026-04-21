# Evolution One CMS — Master Documentation Hub

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Project Overview

Evolution One CMS is a full-stack casino management platform built on Next.js 16 (App Router), MongoDB, and TypeScript. It is a single unified application — routing and feature access are determined entirely by the user's assigned role. After login, each role is automatically directed to its designated interface:

- **CMS interface** (dashboard, analytics, cabinets, collections, members, sessions) — accessed by: `developer`, `admin`, `manager`, `location admin`, `reviewer`, `owner`, `technician`, `collector`
- **Vault interface** (cash management, shifts, float requests, payouts) — accessed by: `vault-manager`, `cashier`

---

## 2. Page-Level Guides (`/Documentation/pages`)

Technical and functional documentation for every frontend interface.

| Page | Document | Key Features Covered |
| :--- | :--- | :--- |
| **Dashboard** | [dashboard-page.md](./pages/dashboard-page.md) | Financial Pulse, Charts, Map, Top Performers |
| **Administration** | [administration-page.md](./pages/administration-page.md) | Users, Licencees, Activity Log, Role Inheritance |
| **Locations** | [locations-page.md](./pages/locations-page.md) | Grid/Map Toggle, Coordinate Mapping, Reviewer Multiplier |
| **Fleet / Cabinets** | [cabinets-page.md](./pages/cabinets-page.md) | Real-time Monitor, Remote Commands, Forensic Logs |
| **Members (CRM)** | [members-page.md](./pages/members-page.md) | Loyalty Points, KYC, Win/Loss, Profile View |
| **Operations (Pulse)** | [sessions-page.md](./pages/sessions-page.md) | Live Events (SSE), Replay Wizard, Active Count |
| **Collections Wizard** | [collection-report-page.md](./pages/collection-report-page.md) | 3-Step Wizard, Variation Checking, Mobile Modal, SAS Defaults |
| **Vault / Cage** | [vault-page.md](./pages/vault-page.md) | Shift Management, Blind Close, Ledger, TOTP |
| **System Config** | [system-config-page.md](./pages/system-config-page.md) | Firmware Repository, Migrations, Localization |
| **Login** | [login-page.md](./pages/login-page.md) | Auth Flow, TOTP, Profile Validation |
| **History Fix** | [history-fix-page.md](./pages/history-fix-page.md) | Meter Gap Correction, Bulk Repairs |
| **Engineering Standards** | [frontend-standards.md](./pages/frontend-standards.md) | Skeleton UX, Page Structure, Error Boundary |

---

## 3. API & Logic Documentation (`/Documentation/api`)

Technical reference for backend endpoints and core business logic.

| Module | Document | Core Logic / Endpoints |
| :--- | :--- | :--- |
| **Analytics Engine** | [calculation-engine.md](./api/calculation-engine.md) | Movement Delta, 8 AM Offset, Gaming Days, Reviewer Multiplier |
| **Dashboard API** | [dashboard-api.md](./api/dashboard-api.md) | Money-In Query, Parallel Aggregation, Filters |
| **Auth & IAM** | [auth-api.md](./api/auth-api.md) | JWT Strategy, Session Versioning, TOTP, 9 Roles |
| **Administration** | [administration-api.md](./api/administration-api.md) | RBAC, User CRUD, Multi-tenant Isolation |
| **Locations API** | [locations-api.md](./api/locations-api.md) | Property Config, Reviewer Multiplier, Coordinate Conversion |
| **Cabinets API** | [cabinets-api.md](./api/cabinets-api.md) | Hardware Fleet, Status Computation, Commands, Reviewer Multiplier |
| **Members API** | [members-api.md](./api/members-api.md) | Win/Loss Summation, Loyalty Ratios, KYC |
| **Collections API** | [collections-api.md](./api/collections-api.md) | Finalization, History Bridge, Profit Sharing, SAS Time Defaults |
| **Real-time Sync** | [sync-meters-api.md](./api/sync-meters-api.md) | MQTT Meter Handshake, Sync Accuracy |
| **Vault & Ledger** | [vault-api.md](./api/vault-api.md) | Double-Entry, Blind Close Security, 2FA Gate |
| **Exec Reporting** | [reports-api.md](./api/reports-api.md) | Month-end Audit, PDF/XLSX Gen, Summaries |
| **IoT / MQTT** | [mqtt-system.md](./api/mqtt-system.md) | Topic Hierarchy, QoS, Heartbeats, Raw SAS |
| **Forensic Audit** | [sessions-api.md](./api/sessions-api.md) | Event Mapping, Session IDs, Auto-Logout |
| **System Config** | [system-config-api.md](./api/system-config-api.md) | Firmware GridFS, Localization, Migrations |

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

- [Collection Report Variation Fix](./collection-report-variation-fix.md) — Variation mismatch root causes and fixes
- [Timezone Debugging](./timezone-debugging.md) — Trinidad timezone edge cases for cabinet detail queries

---

## 7. Critical System Rules (Quick Reference)

| Rule | Detail |
| :--- | :--- |
| **Gaming Day** | 8 AM → 8 AM Trinidad (UTC-4). Helper: `lib/utils/gamingDayRange.ts` |
| **Financial Calc** | Movement Delta Method — sum of `movement.*` fields only |
| **Multi-tenant** | All queries filtered by `userPayload.assignedLicencees` |
| **Reviewer Multiplier** | `value * (1 - user.multiplier)` applied server-side in all metric routes |
| **Cookies** | Never hardcode `secure: true` — use `getAuthCookieOptions(request)` |
| **React Imports** | Named imports only — never `import React from 'react'` |
| **Timezone Storage** | UTC in DB; convert to Trinidad for display and query ranges |
| **Audit Logging** | `activityLogger.ts` required for all CRUD + security events |

---

**Maintained By:** Evolution One Development Team  
**Lead Engineer:** Aaron Hazzard
