# Evolution One CMS - Master Documentation Hub

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.0.0

---

## 1. Project Overview
Welcome to the Evolution One Casino Management System. This hub provides a complete reference for all system components, including both high-level architecture and granular implementation details.

---

## 2. Page-Level Guides (`/Documentation/pages`)
Technical and functional documentation for every frontend interface.

| Page | Document | Key Features Covered |
| :--- | :--- | :--- |
| **Dashboard** | [dashboard-page.md](./pages/dashboard-page.md) | Financial Pulse, Charts, Map, Top Performers |
| **Administration** | [administration-page.md](./pages/administration-page.md) | Users, Licencees, Activity Log, Role Inheritance |
| **Locations** | [locations-page.md](./pages/locations-page.md) | Grid/Map Toggle, Coordinate Mapping, Hold% |
| **Fleet / Cabinets** | [cabinets-page.md](./pages/cabinets-page.md) | Real-time Monitor, Remote Commands, Forensic Logs |
| **Members (CRM)** | [members-page.md](./pages/members-page.md) | Loyalty Points, KYC, Win/Loss, Profile View |
| **Operations (Pulse)** | [sessions-page.md](./pages/sessions-page.md) | Live Events (SSE), Replay Wizard, Active Count |
| **Collections Wizard** | [collection-report-page.md](./pages/collection-report-page.md) | 3-Step Wizard, Soft Count, Variance Audit |
| **Vault / Cage** | [vault-page.md](./pages/vault-page.md) | Shift Management, Blind Close, Ledger, TOTP |
| **System Config** | [system-config-page.md](./pages/system-config-page.md) | Firmware Repository, Migrations, Localization |
| **Engineering Stds** | [frontend-standards.md](./pages/frontend-standards.md) | Skeleton UX, Page Structure, Error Boundary |

---

## 3. API & Logic Documentation (`/Documentation/api`)
Technical reference for backend endpoints and core business logic.

| Module | Document | Core Logic / Endpoints |
| :--- | :--- | :--- |
| **Analytics Engine** | [calculation-engine.md](./api/calculation-engine.md) | Movement Delta, 8 AM Offset, Gaming Days |
| **Dashboard API** | [dashboard-api.md](./api/dashboard-api.md) | Money-In Query, Parallel Aggregation, Filters |
| **Auth & IAM** | [auth-api.md](./api/auth-api.md) | JWT Strategy, Session Versioning, TOTP |
| **Adminsitration** | [administration-api.md](./api/administration-api.md) | RBAC, User CRUD, Multi-tenant Isolation |
| **Locations API** | [locations-api.md](./api/locations-api.md) | Property Config, Quotas, Coordinate Conversion |
| **Machines API** | [machines-api.md](./api/machines-api.md) | Hardware Fleet, Status Computation, Commands |
| **Members API** | [members-api.md](./api/members-api.md) | Win/Loss Summation, Loyalty Ratios, KYC |
| **Collections API** | [collections-api.md](./api/collections-api.md) | Finalization, History Bridge, Profit Sharing |
| **Rel-time Sync** | [sync-meters-api.md](./api/sync-meters-api.md) | MQTT Meter Handshake, Sync Accuracy |
| **Vault & Ledger** | [api/vault-api.md](./api/vault-api.md) | Double-Entry, Blind Close Security, 2FA Gate |
| **Exec Reporting** | [reports-api.md](./api/reports-api.md) | Month-end Audit, PDF/XLSX Gen, Summaries |
| **IOT / MQTT** | [mqtt-system.md](./api/mqtt-system.md) | Topic Hierarchy, QoS, Heartbeats, Raw SAS |
| **Forensic Audit** | [sessions-api.md](./api/sessions-api.md) | Event Mapping, Session IDs, Auto-Logout |

---

## 4. Architectural Pillars (`/Documentation/pillars`)
High-level strategic guides for the five pillars of the platform.

- [Identity & Admin](./pillars/identity-admin.md)
- [Floor Operations](./pillars/floor-operations.md)
- [Financials & Analytics](./pillars/financial-system.md)
- [Collections & Reconciliation](./pillars/collections-pillar.md)
- [Engineering & Platform](./pillars/engineering-guide.md)

---
**Maintained By**: Evolution One Development Team
**Lead Engineer**: Aaron Hazzard
