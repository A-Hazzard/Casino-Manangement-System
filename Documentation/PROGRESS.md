# Evolution One CMS — Project Progress & Status

**Author:** Aaron Hazzard — Senior Software Engineer  
**Document Version:** 4.4.0  
**Last Updated:** June 5, 2026  
**Classification:\*\* Internal Engineering Document

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Application Modes](#4-application-modes)
5. [Pages & Features Built](#5-pages--features-built)
   - 5.1 [CMS Mode — Operator Interface](#51-cms-mode--operator-interface)
   - 5.2 [Vault Mode — Cash Management Interface](#52-vault-mode--cash-management-interface)
   - 5.3 [Shared / Auth Pages](#53-shared--auth-pages)
6. [API Surface](#6-api-surface)
7. [Core Technical Systems](#7-core-technical-systems)
8. [Database Models](#8-database-models)
9. [Security & Compliance](#9-security--compliance)
10. [Recent Engineering Work](#10-recent-engineering-work)
11. [Documentation Coverage](#11-documentation-coverage)
12. [Current Bugs](#12-current-bugs)
13. [Currently Working On](#13-currently-working-on)

---

## 1. Project Overview

**Evolution One CMS** is a full-stack, multi-tenant Casino Management System purpose-built for real-time cabinet monitoring, financial analytics, cash operations, and regulatory compliance. It is deployed in live casino environments across multiple properties and licencees, with a field-facing mobile interface and a back-office management portal.

The system is designed to replace fragmented, paper-based processes with a single source of truth for cabinet performance, revenue reconciliation, and vault cash tracking — all under strict audit and role-based access controls.

---

## 2. Technology Stack

| Layer           | Technology                   | Version |
| :-------------- | :--------------------------- | :------ |
| Framework       | Next.js (App Router)         | 16.x    |
| Language        | TypeScript                   | 5.x     |
| Styling         | Tailwind CSS                 | 3.x     |
| Database        | MongoDB                      | 7.x     |
| ODM             | Mongoose                     | 8.x     |
| State (Global)  | Zustand                      | 4.x     |
| State (Server)  | TanStack React Query         | 5.x     |
| UI Components   | Shadcn/UI, Radix UI, MUI     | Latest  |
| Authentication  | JWT (jose), bcryptjs, otplib | Latest  |
| Real-time       | MQTT (via HiveMQ / SMIB)     | —       |
| Email           | SendGrid / Nodemailer        | —       |
| SMS             | Infobip                      | —       |
| Maps            | Google Maps API              | —       |
| Package Manager | bun                          | 9.x     |
| Runtime         | Node.js                      | 20.x    |

---

## 3. System Architecture

### Hosting Model

- **Next.js App Router** — All pages are React Server Components by default; client components opt in with `"use client"`.
- **MongoDB** — Single document store with 30+ Mongoose schemas, compound indexes for fleet-wide queries, soft deletes on all core entities.
- **MQTT Broker** — Real-time two-way communication channel between the CMS server and each SMIB (Slot Machine Interface Board) unit.

### Core Architectural Patterns

- **Multi-tenant**: All data is scoped to a `Licencee`. Users are assigned to specific licencees and/or locations. Every API response is filtered by the requesting user's access grants.
- **Role Hierarchy**: 9 discrete roles with descending privilege: `developer → admin → manager → location admin → vault-manager → cashier → technician → collector → reviewer`.
- **Gaming Day Offset**: Financial periods run 08:00 AM → 08:00 AM (Trinidad UTC-4), not calendar midnight. This offset is stored per-location and applied to all aggregation queries.
- **Movement Delta Method**: Financial metrics are derived from pre-calculated 15-minute movement diffs stored in the `Meters` collection — not from cumulative counters. This eliminates ghost revenue caused by RAM clears or hardware swaps.
- **Standardized API Responses**: All API routes return `{ success, data, message, timestamp }` for success and `{ success, error, message, code, details, timestamp }` for errors.

### Cookie Security

The system operates on both HTTPS (public domain) and HTTP (LAN IP access e.g., `192.168.x.x`). A custom `isSecureContext()` utility auto-detects the correct cookie `secure` flag from `x-forwarded-proto` headers or the `COOKIE_SECURE` environment variable, preventing authentication breakage on LAN deployments.

---

## 4. Role-Based Routing

The application is a single unified deployment. After login, users are automatically redirected to their designated landing page based on their assigned role — there is no separate "CMS mode" or "Vault mode" build. Role-based routing is handled by `lib/utils/roleBasedRedirect.ts`.

| Role                                 | Landing Page             | Interface                    |
| :----------------------------------- | :----------------------- | :--------------------------- |
| `developer`                          | `/` (Dashboard)          | Full CMS access              |
| `admin`, `manager`, `location admin` | `/` (Dashboard)          | Full CMS access              |
| `reviewer`, `owner`                  | `/locations`             | Read-only financial view     |
| `vault-manager`                      | `/vault/management`      | Vault management interface   |
| `cashier`                            | `/vault/cashier/payouts` | Cashier operations interface |
| `technician`                         | `/cabinets`              | Cabinet management only      |
| `collector`                          | `/collection-report`     | Collection reports only      |

All pages, navigation, and features are gated at the component and API level by the user's role — not by any build-time or environment-level flag.

---

## 5. Pages & Features Built

### 5.1 CMS — General Casino Management Interface

#### Dashboard (`/`)

Real-time KPI cards (Money In/Out, Jackpot & Gross Revenue) with cabinet online/offline counts, revenue totals, and map visualization. Revenue trend charts (hourly/daily/weekly/monthly granularity), top-performing locations & cabinets leaderboard, and an interactive geographic map with colour-coded property markers (green = fully online, amber = partial, grey = offline). Global filter bar controls licencee scope and time period across all sections simultaneously. Currency auto-converts to the selected licencee's local currency (TTD, GYD, etc.). Dashboard auto-refreshes every 180 seconds. Gaming day offset applied to all figures.

#### Locations (`/locations`, `/locations/[slug]`)

Aggregated financial metrics per property based on each location's gaming period (`gameDayOffset`). Summary bar shows fleet-wide Money In, Money Out and Gross across the selected scope. Table supports multi-column sorting and filtering by licencee, cabinet type, and online status — clicking the "Offline" pill instantly filters to problem properties. Interactive map syncs with the table (clicking a map marker scrolls to the matching row). Reviewer multiplier scaling applied server-side. Location detail view (`/locations/[slug]`) shows a per-cabinet financial breakdown, membership stats, and geographic coordinates.

#### Cabinets (`/cabinets`, `/cabinets/[slug]`)

Full fleet management with remote MQTT commands (SYNC, LOCK, UNLOCK) and cabinet configurations inclusive of SMIB and accounting denomination settings. Fleet table filters by location, manufacturer, online status, and cabinet type (Slot/VGT/Roulette/Terminal) with case-insensitive search across serial number, asset name, and game title. Details drawer (`/cabinets/[slug]`) is tabbed: **Accounting** (Money In/Out, Gross, Net Gross, Jackpot), **Live SAS Meters** (Coin In/Out, Current Credits, Total Drop), **Bill Validator** (denomination breakdown and subtotals), and **Audit Logs** (cabinet events). Each tab fetches lazily. SMIB Configuration panel (developer/technician only) exposes SMIB IP, SAS address, polling interval, and MQTT topic with live push via `POST /api/mqtt/update-cabinet-config`. Firmware OTA update and device restart also available from the details drawer.

#### Members (`/members`, `/members/[id]`)

CRM hub for player identity, loyalty management, and win/loss analytics. List view with debounced search (350ms) across name, member ID and phone, filterable by licencee, location, and KYC status, paginated at 50 per page. Member 360 profile (`/members/[id]`) is tabbed: **Overview** (personal details, KYC documents), **Sessions** (full gaming session history), **Points History**, **Documents**, and **Win/Loss Report** (total won/lost across all sessions). KYC status and tier/points balance tracked per member.

#### Sessions (`/sessions`, `/sessions/[sessionId]/[cabinetId]/events`)

Real-time floor monitoring and session forensic replay. Session history table filterable by search (ID/asset/member), licencee, and date range. Session details drawer shows start/end time, computed duration, status, loyalty settings active during play (points multiplier, tier bonus), and a full forensic event feed (Card-In, Spin, Win, Card-Out) sourced from MQTT events. Live Operations Ticker (Server-Sent Events) pushes jackpots, door opens, and high-value card-ins to the floor view without a page refresh.

#### Collection Report (`/collection-report`, `/collection-report/report/[reportId]`)

Multi-step financial wizard for reconciling electronic cabinet meters with physical cash collection. Full multi-tier check validation for cash variations. Desktop and mobile layouts with feature parity. Skeleton loader shown on every fetch trigger, not just initial load.

**Four tabs:**

- **Reports History** — Finalized audit log of all past collections; filterable by licencee, location, collector, and date range; variance flagged per report
- **Monthly Revenue Report** — Property-level aggregated financial summaries for tax and accounting handover; PDF and Excel export
- **Manager Schedule** — All properties with last collection date and cabinet count; rows highlighted red/orange based on age.
- **Collectors Schedule** — Field staff task list; switches to card-based mobile checklist for one-handed operation

**3-Step Collection Wizard** (`CollectionReportNewCollectionModal` / `CollectionReportMobileNewCollectionModal`):

1. **Property & Asset Selection** — Location dropdown rendered via React portal (`createPortal` to `document.body`) to escape `overflow: hidden` clipping; auto-sizes width to longest location name; supports 248+ locations. Cabinet list with live SAS sync per cabinet.
2. **Meter & Cash Verification** — Physical Meter In/Out entry; auto-calculates `Movement Gross = (Current In − Prev In) − (Current Out − Prev Out)`; RAM clear toggle reveals `ramClearMeters` fields; collection time defaults to 1 minute before the `gameDayOffset` boundary; SAS start time auto-populated from the last completed collection for that cabinet (`GET /api/collection-reports/last-collection-time`).
3. **Financial Reconciliation & Commit** — The system compares the physical cash collected against the electronic meter reading and flags any difference. If the variance is unusually large, the collector must acknowledge the discrepancy and provide a note before the report can be submitted. The system also checks the submitted figures against historical averages and requires explicit confirmation if any value appears abnormal.

**Edit Collection** — Full edit modal (desktop + mobile) with meter reversion on save, SAS time pre-population, and soft delete with audit trail. Edit modal defaults to showing the cabinets list so green "Added to Collection" indicators are visible.

#### Reports (`/reports`)

Consolidated reporting hub aggregating collection data, cabinet performance, and financial summaries across whole fleets or single properties for regulatory and internal reporting.

#### Administration (`/administration`)

Management hub for users, corporate entities (licencees), gaming locations, and platform audit logging. Access is role-gated per tab.

- **Personnel Management** — Create, edit, suspend users; assign roles and location access; suspension immediately invalidates the user's active session (`sessionVersion` increment)
- **Corporate Entity Registry** — Licencee configuration: `includeJackpot` flag, currency, contact info, location quota (developer only)
- **Gaming Locations** — Configure properties: gaming day offset, membership settings, coordinates
- **Collector Assignment** — Assign field collectors to routes
- **Firmware Management** — Upload and OTA-deploy firmware to SMIB devices
- **Platform Audit Stream** — Immutable forensic log of all system mutations; clicking a row shows a JSON diff of before/after state
- **Geographic Zone Manager** — Country and jurisdictional defaults (currency code, tax rate)

---

### 5.2 Vault Interface — Cash Desk Management

The Vault Management System (VMS) is a strict audit-grade cash control platform. Every cash movement is recorded as an immutable `VaultTransaction` ledger entry with before/after balances. The vault operates on a shift-based model with full denomination tracking, variance detection, and TOTP-gated mutations for security-critical operations.

---

#### Vault Shift Lifecycle

The vault follows a strict daily lifecycle enforced at the API level:

1. **Initialize / Open Vault** — Vault Manager counts and enters physical denominations to open the shift. Sets opening balance. Triggers `POST /api/vault/initialize`.
2. **Add Cash** — Records cash brought into the vault (e.g. from a cabinet collection or bank delivery). Linked to specific collection records. Triggers `POST /api/vault/add-cash`.
3. **Remove Cash** — Records cash removed from the vault (e.g. bank run, cash transfer). Triggers `POST /api/vault/remove-cash`.
4. **Float Approval** — Transfers a defined cash amount from the vault to a cashier's till. Triggers `POST /api/vault/float-request/approve`.
5. **Expense Recording** — Logs a petty cash payment with mandatory category note. Triggers `POST /api/vault/expense`.
6. **Soft Count** — Records physical denomination count mid-shift for reconciliation. Triggers `POST /api/vault/soft-counts`.
7. **Close Vault (End of Day)** — Only available after all cashier shifts are `closed` or `resolved`. Finalizes vault balance and generates end-of-day summary. Triggers `POST /api/vault/shift/close`.

**Stale Shift Detection**: If the current vault shift spans more than one gaming day without being closed, a warning banner is shown (`isStale: true`) alerting the vault manager to resolve the previous day before proceeding.

---

#### Vault Dashboard (`/vault`)

The primary operational hub for vault managers. Displays all live information needed to manage daily cash operations on one screen.

**Vault Balance Card** — Live snapshot of the current shift: current vault balance, opening balance, manager on duty, last reconciliation timestamp, and shift status. Polls on a refresh interval.

**Denomination Inventory** — Physical denomination-level breakdown of cash currently inside the vault safe ($1, $5, $10, $20, $50, $100 counters). Auto-sums to the total balance. Updated on every add/remove cash operation.

**Float Requests Panel** — Incoming float requests from cashiers on the floor awaiting approval. Polls every 5 seconds so no request is missed. Each entry shows the requesting cashier, requested amount with denomination breakdown, and time submitted. Approve triggers immediate vault-to-cashier transfer; Deny sends a rejection notification. Approved requests are removed from the panel optimistically while the API processes.

**Shift Review Panel** — Queue of cashier shifts that have been closed and submitted for vault manager review. Rows with variance above the licencee-defined threshold are highlighted in red. Actions: **Resolve** (accept the variance and close the shift) or **Reject** (return to cashier with a note for correction).

**Cash on Premises Metrics** — Property-wide liquidity summary: total cash on premises (`VaultBalance + CashierFloats + MachineDropToday`), active cashier float total, and today's machine Money In. Gives management a full fiscal exposure view for risk oversight.

**Recent Activity** — Chronological feed of all cash movements within the current vault shift (type, amount, performed by, timestamp).

---

#### Vault Management (`/vault/management`)

Vault manager control centre. Aggregates all management-level vault tools under one roof: shift overview, cashier roster, float request history, soft counts, and access to all sub-pages.

---

#### Transactions (`/vault/management/transactions`)

Immutable ledger view of every vault transaction across the current and historical shifts. Filterable by transaction type: `add_cash`, `remove_cash`, `expense`, `payout`, `float_increase`, `float_decrease`, `vault_open`, `vault_close`. Each record shows: type, amount, denomination breakdown, performed by, before/after vault balance, and timestamp. No records are ever deleted — this is the audit trail.

---

#### Float Requests (`/vault/management/floats`)

Full history and management of all float requests. Shows pending requests requiring approval, previously approved requests with disbursement details, and denied requests with rejection notes. Vault managers can action pending requests directly from this page. Cashiers see only their own request history from the cashier-side view.

**Float Request Status Flow**: `pending` → `approved_vm` → `active` (funds disbursed to cashier) / `denied`

---

#### Expenses (`/vault/management/expenses`)

Record and categorize operational petty cash expenditures against the current vault shift. Each expense requires a category, amount, denomination breakdown, and mandatory note. All expenses reduce the vault balance and are logged as `VaultTransaction` records. Linked to the active vault shift so they appear in the end-of-day summary.

---

#### Transfers (`/vault/management/transfers`)

Inter-location cash transfer management. Allows vault managers to initiate and track cash movements between properties with full denomination breakdown. Transfers require approval and generate ledger entries at both the sending and receiving location. Approval triggers `POST /api/vault/transfers/approve`.

---

#### End-of-Day Reports (`/vault/management/reports/end-of-day`)

Closing summary report generated when the vault shift is finalized. Includes: opening balance, total cash added, total cash removed, total expenses, total payouts, total float disbursements, net position, any reconciliation adjustments, and final closing balance. Used for management sign-off and accounting handover.

---

#### Activity Log (`/vault/management/activity-log`)

Immutable, filterable audit trail of all vault-level operations: who performed what action, on which record, at what time, with before/after state. Covers shift opens/closes, float approvals, cash movements, expense records, and manual reconciliations. Cannot be edited or deleted.

---

#### Cash Desks (`/vault/management/cash-desks`)

Overview of all cashier desk assignments and their current float allocations. Shows which cashier is assigned to each desk, the current float balance on each desk, and whether the desk's shift is active, closed, or pending review. Managers can view desk history and reassign desks as needed.

---

#### Cashiers (`/vault/management/cashiers`)

Cashier roster management panel. Shows all cashier users, their current shift status (active/closed/no shift), current float balance, any open discrepancy flags, and a link to their full shift history. Vault managers can force-close a cashier's shift from this page if the cashier is unresponsive or unavailable. Triggers `POST /api/vault/cashier-shifts/force-close`.

---

#### Soft Counts (`/vault/management/soft-counts`)

Mid-shift physical cash count interface. Vault managers enter denomination-level physical counts for the vault. The system compares the physical count against the running electronic balance and flags any discrepancy. Soft count records are stored and used to support end-of-day reconciliation. Triggers `POST /api/vault/soft-counts`.

---

#### Notifications (`/vault/notifications`)

Real-time notification feed for vault-level alerts: float requests awaiting approval, cashier shift closures requiring review, stale shift warnings, variance flags, and system alerts. Notifications are prioritized — critical items (high-variance shifts, long-pending float requests) are surfaced to the top. Notifications are marked as read on interaction.

---

#### Cashier — Dashboard (`/vault/cashier`)

The cashier's primary working screen during their shift. Shows the cashier's current float balance (updated after every transaction), a breakdown of payouts processed so far during the shift, pending float request status, and quick-action buttons for the most common operations (process payout, request float top-up). Only the logged-in cashier's own data is visible.

---

#### Cashier — Payouts (`/vault/cashier/payouts`)

The primary cashier workflow. Processes two types of player payouts:

- **Hand Pay** — Large jackpot or promotional payouts paid directly in cash. Requires amount, denomination breakdown, and optional notes.
- **Ticket Redemption** — Validates a TITO (Ticket In / Ticket Out) voucher number, retrieves the face value, and records the cash disbursement.

Each payout reduces the cashier's float balance and is immediately logged as a `VaultTransaction`. Requires TOTP verification for payouts above the licencee-defined threshold.

---

#### Cashier — Float Requests (`/vault/cashier/float-requests`)

Interface for cashiers to request additional cash from the vault when their float is running low (or to return excess cash). Cashier enters the requested denomination breakdown and submits. The vault manager sees the request appear in the Float Requests Panel in real time (5-second polling). Cashier can track the status of their request (pending, approved, denied) from this page. Approved requests are reflected in the cashier's float balance immediately.

---

#### Cashier — Shifts (`/vault/cashier/shifts`)

Full shift history for the logged-in cashier. Each entry shows: opening float, all payouts processed, all float adjustments received, closing count entered, system-calculated closing balance, variance, and review status (pending review, resolved, rejected). Rejected shifts can be resubmitted with a corrected closing count.

**Blind Close**: When closing a shift, cashiers enter their physical denomination count without seeing the system's expected balance. This prevents "working backwards" to match numbers and ensures the variance is genuine.

---

#### Cashier — Activity (`/vault/cashier/activity`)

Personal transaction history for the cashier: every payout, float adjustment, and shift event tied to the logged-in cashier, across all shifts. Filterable by date and transaction type. Read-only.

---

### 5.3 Shared / Auth Pages

#### Login (`/login`)

Secure login with username/password, optional TOTP (Time-based One-Time Password) 2FA challenge, SMIB-aware session management, and "Remember Me" (30-day token). Redirects users to their role-appropriate landing page after login.

#### 2FA Recovery (`/auth/recovery/2fa`)

Self-service TOTP recovery flow for users who have lost their authenticator device. Vault manager and cashier roles have dedicated supervised recovery paths.

#### Unauthorized (`/unauthorized`)

Role-gate fallback page shown when a user attempts to access a page beyond their assigned permissions.

---

## 6. API Surface

The system exposes approximately **100+ API route handlers** organized by domain.

### Authentication (`/api/auth/*`)

`POST login` · `POST logout` · `POST refresh` · `POST refresh-token` · `POST forgot-password` · `GET current-user` · `POST clear-all-tokens` · `POST clear-token` · `POST clear-session` · `PATCH profile/update-email` · `GET/POST totp/setup` · `POST totp/confirm` · `POST totp/reset` · `POST verify-totp` · `POST totp/recover/verify` · `POST totp/recover/cashier` · `POST totp/recover/vm`

### Analytics (`/api/analytics/*`)

`GET dashboard` · `GET charts` · `GET reports` · `GET cabinets` · `GET cabinets/stats` · `GET locations` · `GET logistics` · `GET hourly-revenue` · `GET cabinet-hourly` · `GET top-cabinets` · `GET jackpot-trends` · `GET winloss-trends` · `GET handle-trends` · `GET plays-trends` · `GET manufacturer-performance`

### Locations (`/api/locations/*`, `/api/reports/locations`)

`GET/POST/PATCH/DELETE locations` · `GET locations/[locationId]` · `GET locations/[locationId]/cabinets` · `GET locations/[locationId]/cabinets/[cabinetId]` · `GET locations/search-all` · `GET locations/membership-count` · `GET reports/locations`

### Cabinets & Meters (`/api/cabinets/*`, `/api/metrics/*`)

`GET cabinets/aggregation` · `GET/PATCH/DELETE cabinets/[cabinetId]` · `GET cabinets/by-id` · `GET cabinets/by-id/events` · `POST smib/meters` · `POST smib/restart` · `POST smib/ota-update` · `POST smib/nvs-action` · `GET metrics/meters`

### Collections (`/api/collections/*`, `/api/collection-reports/*`)

`GET/POST/PATCH/DELETE collections` · `GET collections/last-collection-time` · `GET collections/check-first-collection` · `GET/POST collectionReport` · `GET collectionReport/locations` · `GET/PATCH/DELETE collection-reports/[reportId]` · `POST collection-reports/fix-report` · `GET collection-reports/check-all-issues` · `GET collection-reports`

### Members & Sessions (`/api/members/*`, `/api/sessions/*`)

`GET/POST/PATCH/DELETE members` · `GET members/[id]/sessions` · `GET sessions` · `GET sessions/[id]/events`

### Vault (`/api/vault/*`)

`POST vault/initialize` · `POST vault/shift/close` · `POST vault/add-cash` · `POST vault/remove-cash` · `POST vault/reconcile` · `POST vault/payout` · `POST vault/float-request/approve` · `POST vault/soft-counts` · `POST vault/collection-session/finalize` · `POST vault/transfers/approve` · `POST vault/cashier-shift/direct-open` · `POST vault/cashier-shift/force-close`

### Cashier (`/api/cashier/*`)

`POST cashier/shift/open` · `POST cashier/shift/close` · `POST cashier/shift/resolve` · `POST cashier/shift/reject` · `POST cashier/shift/cancel` · `GET cashier/shift/current` · `GET cashier/shifts` · `POST cashier/payout`

### Administration (`/api/users`, `/api/licencees`, `/api/gaming-locations`, etc.)

`GET/POST/PATCH/DELETE users` · `GET/POST/PATCH licencees` · `GET/POST/PATCH/DELETE gaming-locations` · `GET/POST collectors` · `GET/POST/DELETE firmwares` · `POST firmwares/migrate` · `GET manufacturers` · `GET/POST system-config`

### MQTT (`/api/mqtt/*`)

`POST mqtt/discover-smibs` · `POST mqtt/config/publish` · `POST mqtt/config/request` · `POST mqtt/update-cabinet-config`

### Admin Utilities (`/api/admin/*`)

`POST admin/reconnect-db` · `POST admin/create-indexes` · `POST admin/repair-sas-times` · `GET admin/auth/events` · `GET admin/auth/metrics` · `POST admin/migrations/rename-licencee` · `GET admin/cashiers`

---

## 7. Core Technical Systems

### 7.1 Financial Calculation Engine

**Movement Delta Method**: The primary accounting methodology. Instead of reading cumulative SAS meter values (which reset on RAM clears), the system stores the 15-minute movement delta per meter read. All revenue aggregation sums `movement.drop`, `movement.totalCancelledCredits`, and `movement.jackpot` from the `Meters` collection.

**Gross vs. Net Revenue (includeJackpot flag)**: Licencees may configure whether jackpot payouts are included in "Money Out" for reporting purposes:

- **Vision A (Default Gross)**: Money Out = Cancelled Credits only; jackpots reported separately.
- **Vision B (Additive Gross)**: Money Out = Cancelled Credits + Jackpots.
- **Universal Net Gross**: Always calculated as `Money In − Cancelled Credits − Jackpots`, regardless of flag.

**RAM Clear Bridge Logic**: If `currentMeter < previousMeter`, the engine detects a hardware reset and bridges the gap using the last 15-minute movement to prevent negative revenue.

**History Gap Bridging**: If a SMIB is offline for an extended period, a bridge entry is generated on the next collection to maintain continuity in performance charts.

**Gaming Day Offset**: All financial queries are windowed to the gaming day boundary (default 8 AM Trinidad time / UTC-4). A session at 3 AM on Tuesday is attributed to Monday's gaming day. Implemented in `lib/utils/gamingDayRange.ts` and `getGamingDayRangesForLocations()`.

### 7.2 Reviewer Multiplier System

Users with a `multiplier` field (0–1) see scaled financial figures across all metric endpoints. The formula `displayedValue = rawValue × (1 − multiplier)` is applied server-side after currency conversion. For example, a reviewer with `multiplier = 0.95` sees 5% of raw values. `multiplier: null` disables scaling (full values shown).

Applied in: `GET /api/reports/locations`, `GET /api/locations/search-all`, `GET /api/locations/[locationId]`, `GET /api/locations/[locationId]/cabinets/[cabinetId]`, `GET /api/cabinets/aggregation`, `GET /api/cabinets/[cabinetId]`, `GET /api/metrics/meters`.

### 7.3 Real-Time MQTT Infrastructure

- **Heartbeat**: SMIB units publish to the MQTT broker every 60 seconds. The CMS updates `cabinet.lastActivity` on each heartbeat to drive online/offline status.
- **Online Detection**: A cabinet is considered `online` if `aceEnabled: true` OR `lastActivity` is within the last 3 minutes (BR-CAB-01).
- **Command Bus**: Remote commands published to `sunbox/[cabinetId]/command`. Supported: `SYNC`, `LOCK`, `UNLOCK`, firmware OTA, NVS actions, restart.
- **SAS Data**: 15-minute polls generate new `Meter` documents with movement deltas. `readAt` is the authoritative date-filtering field for all aggregation queries.

### 7.4 Authentication System

- **JWT**: Issued as HttpOnly cookies on login. Access token (7-day default, 30-day with "Remember Me"). Refresh token endpoint auto-rotates the JWT.
- **TOTP / 2FA**: Optional per-user TOTP via `otplib`. Setup, confirm, verify, and reset flows. Supervised recovery paths for vault manager and cashier roles.
- **Session Versioning**: `user.sessionVersion` allows immediate server-side invalidation of all active sessions without requiring token expiry.
- **`getUserFromServer()`**: Every protected API call re-hydrates the user from the live database (not just the JWT payload), ensuring role changes and multiplier updates take effect immediately without re-login.

### 7.5 Multi-Tenant Access Control

- `user.assignedLicencees[]` — controls which licencee data is visible.
- `user.assignedLocations[]` — restricts access to specific properties within a licencee.
- `getUserLocationFilter()` — helper that builds the correct MongoDB filter based on user role and assignments.
- Admins and developers see all licencees; all other roles are scoped to their assignments.

### 7.6 Currency Conversion

Admin and developer users viewing a multi-licencee dashboard can select a display currency. The currency conversion is applied after raw metric aggregation and before the reviewer multiplier scaling, ensuring all values are consistently reported in the selected currency.

---

## 8. Database Models

The system uses **30+ Mongoose schemas** across two primary domains:

### Core CMS Models

| Model              | Purpose                                                 |
| :----------------- | :------------------------------------------------------ |
| `Licencee`         | Top-level multi-tenant entity                           |
| `GamingLocation`   | Casino property, gaming day offset, membership settings |
| `Cabinet`          | Cabinet hardware record, SMIB config, SAS meters        |
| `Meter`            | 15-minute financial snapshots with movement deltas      |
| `Collection`       | Draft collection entries (one per cabinet per session)  |
| `CollectionReport` | Finalized collection batch (parent of Collections)      |
| `User`             | Authentication, roles, multiplier, assigned access      |
| `Member`           | Player card profile, points, tier                       |
| `CabinetSession`   | Gaming session records per cabinet                      |
| `CabinetEvent`     | Individual SAS events within a session                  |
| `AcceptedBill`     | Bill validator denomination tracking                    |
| `Firmware`         | Firmware versions and deployment records                |

### Vault (VMS) Models

| Model                    | Purpose                                  |
| :----------------------- | :--------------------------------------- |
| `VaultShift`             | Vault manager shift lifecycle            |
| `CashierShift`           | Cashier shift with live balance tracking |
| `VaultTransaction`       | Immutable cash ledger (every movement)   |
| `FloatRequest`           | Cashier → Vault float request workflow   |
| `Payout`                 | Ticket and hand-pay payout records       |
| `SoftCount`              | Physical cash count records              |
| `VaultNotification`      | Real-time alert records                  |
| `VaultCollectionSession` | Draft machine collection session         |
| `MachineCollection`      | Finalized machine collection record      |
| `InterLocationTransfer`  | Cross-property cash transfer             |

---

## 9. Security & Compliance

- **Audit Logging**: All significant CRUD operations and security events (login, role change, permission grant) are written to an immutable activity log via `activityLogger.ts`. Required for regulatory compliance.
- **RBAC**: Every API route performs explicit role checking. Page-level protection via `<ProtectedRoute requiredPage="...">`.
- **Password Security**: bcrypt hashing with appropriate cost factor. Password change tracking via `passwordUpdatedAt`.
- **Cookie Security**: HttpOnly cookies; `sameSite: 'lax'`; `secure` flag auto-detected per request (never hardcoded).
- **Soft Deletes**: Core entities use `deletedAt` timestamps rather than hard deletion, preserving the audit trail.
- **Variance Thresholds**: Collection reports enforce mandatory notes when cash variance exceeds licencee-defined thresholds.
- **Variation Checking**: Before committing a collection, the system compares submitted meter values against historical averages and requires manager acknowledgment for anomalous readings.

---

## 10. Recent Engineering Work

This section records notable technical work completed during the v4.3.0 development cycle.

### Collection Report V2 — RAM Clear Parity with V1 (2026-05-21)

**Requirement**: V2 collection reports needed to support the RAM clear scenario (machine meters reset between collections) with the **same financial result** as V1 — including 2-`Meters`-doc creation for no-SMIB locations.

**Implementation**:

- Added `ramClear`, `ramClearMetersIn`, `ramClearMetersOut` to the `ReportedMachine` schema and `CaptureMachinePayload` / `UpdateMachinePayload` types.
- Extended `computeMovement()` to apply the unified formula `(ramClearMetersIn − prevSasIn) + effectiveIn` across all three branches (no-SMIB, `metersMatch === true`, `metersMatch === false`). Same for the out side.
- POST/PATCH `/api/collection-reports-v2/machines` now accepts and validates the new fields; toggling RAM clear off triggers `$unset` of the peak fields (mirrors V1).
- Submit route branches no-SMIB Meters creation: 1 doc for non-RAM-clear, 2 docs (with `isRamClear: true` on the first, `+1000ms readAt` on the second) when RAM clear is on.
- Capture wizard exposes the toggle always (any `metersMatch` / SMIB state); a yellow "RAM Clear" badge surfaces it on the review list.

**Result**: Identical gross to V1 across all four combinations (SMIB ± RAM clear, no-SMIB ± RAM clear); identical `Meters` collection structure for no-SMIB.

### Collection Report — Portal Dropdown for Location Select

**Problem**: The `LocationSingleSelect` component inside the "New Collection Report" modal was clipped by parent `overflow: hidden` containers, truncating the dropdown for large location lists (248+ locations).  
**Solution**: Implemented `React.createPortal` to render the dropdown to `document.body` with `position: fixed` positioning. Added a hidden DOM measurement element to auto-size the dropdown width to the longest location name.

### Collection Report — SAS Start Time Auto-Population

**Problem**: When a collector selected a machine, the `sasStartTime` field was blank, requiring manual lookup of the previous collection's end time.  
**Solution**: On machine selection, the system now calls `GET /api/collection-reports/last-collection-time?machineId=<id>` and pre-populates `sasStartTime` with the previous collection's `collectionTime`. Implemented for both the desktop hook (`useCollectionReportNewCollectionModal.ts`) and the mobile modal (`CollectionReportMobileNewCollectionModal.tsx`).

### Collection Report — Mobile Edit Modal Machine List Display

**Problem**: When opening the edit modal on mobile for an existing collection report, the collected machines list was shown instead of the machines list, preventing managers from seeing machines with "Added to Collection" indicators.  
**Root Cause**: `useMobileEditCollectionModal.ts` initialized `isMachineListVisible: false` and had an effect that suppressed the machine list on modal open.  
**Solution**: Changed initial state to `isMachineListVisible: true` and simplified the reset effect to always show the machines list on modal open.

### Collection Report — Skeleton Loader Behavior

**Enhancement**: Configured the collection report page's skeleton loader to display on every fetch trigger (tab switch, filter change, pagination), not just the initial page load. The `setInitialLoading(true)` call in `useCollectionReportPageData.ts` ensures the skeleton replaces stale data during any re-fetch.

### Reviewer Multiplier — Server-Side Implementation

**Requirement**: Users assigned a `multiplier` value (0–1) must see scaled financial figures system-wide.  
**Implementation**: Applied `value × (1 − multiplier)` in all seven financial metric API routes after currency conversion. The `getUserFromServer()` function was updated to always write the database value of `multiplier` back to the JWT payload object, ensuring changes to the multiplier take effect without requiring the user to re-login.

### Cookie Security — HTTP/HTTPS Auto-Detection

**Problem**: Hardcoded `secure: true` on auth cookies broke authentication on LAN deployments served over plain HTTP.  
**Solution**: Implemented `getAuthCookieOptions(request)` utility in `lib/utils/cookieSecurity.ts` that detects the correct `secure` flag from `x-forwarded-proto` headers, the `COOKIE_SECURE` environment variable, or the request URL protocol. Applied across all auth routes (`login`, `logout`, `refresh`, `refresh-token`, `clear-*`).

### Authentication — TOTP 2FA System

Built full TOTP two-factor authentication: QR code setup, confirmation, per-request verification, and supervised recovery paths for vault manager and cashier roles who cannot self-serve (require manager supervision for account recovery).

### Offline SMIB Machine — SAS Meters Update During CR Creation (2026-06-05)

**Problem**: When a SMIB machine went offline (relay unreachable), the `sasMeters` fields (`drop`, `totalCancelledCredits`) on the Machine document were never updated during collection report creation or editing. This caused the machine's lifetime totals to drift from what collectors were actually entering.

**Root Cause**: The `sasMeters` update was only triggered for `isNoSasLocation === true` (non-SMIB machines). Online SMIB machines skip the update because the relay keeps `sasMeters` current — but offline SMIB machines had the same skip condition, leaving them permanently stale.

**Implementation (4 changes across V1 and V2)**:

1. **V1 `updateMachineCollectionData()`** — Expanded relay check to fetch `lastActivity`, added offline detection (`relayId && (!lastActivity || lastActivity < 3 min)`), changed condition from `isNoSasLocation` to `isNoSasLocation || isOffline`. Updates `Machine.sasMeters` with `metersIn`/`metersOut` params.

2. **V1 `recalculateMachineCollections()`** — Added offline detection from `relayId + lastActivity` on the Machine doc, changed condition from `isNoSasLocation && writeSasMeters` to `(isNoSasLocation || isOffline) && writeSasMeters`. Updates `Machine.sasMeters` with `finalMetersIn`/`finalMetersOut`.

3. **V2 Submit route** — Changed condition from `!machineHasRelay` to `!machineHasRelay || m.isSupplemental === true` to update `Machine.sasMeters` for supplemental (offline) machines.

4. **V2 `cascadeMachineEdit()`** — Expanded `Machine.findOne` to fetch `lastActivity`, added offline detection, changed condition from `isNoSMIBLocation` to `isNoSMIBLocation || isOffline`. Updates `Machine.sasMeters` with `targetMetersIn`/`targetMetersOut`.

**Result**: Offline SMIB machines now have their `sasMeters` kept accurate during both V1 and V2 collection report creation and editing. Online SMIB machines remain untouched (relay handles it).

---

## 11. Documentation Coverage

All documentation lives in the `Documentation/` directory and is kept in sync with the codebase.

```
Documentation/
├── PROJECT_GUIDE.md              ← System overview and quick-reference rules
├── PROGRESS.md                   ← This document
├── timezone-debugging.md         ← Timezone debugging guide
├── collection-report-variation-fix.md
├── api/
│   ├── auth-api.md               ← Authentication endpoints & TOTP
│   ├── calculation-engine.md     ← Financial calculation core
│   ├── collections-api.md        ← Collection CRUD endpoints
│   ├── collections-technical-deep-dive.md
│   ├── dashboard-api.md          ← Analytics & dashboard endpoints
│   ├── locations-api.md          ← Location & reports endpoints
│   ├── machines-api.md           ← Cabinet/machine endpoints
│   ├── members-api.md            ← Member management endpoints
│   ├── mqtt-system.md            ← MQTT real-time system
│   ├── reports-api.md            ← Reporting endpoints
│   ├── sessions-api.md           ← Session tracking endpoints
│   ├── sync-meters-api.md        ← Meter sync endpoints
│   ├── system-config-api.md      ← System configuration endpoints
│   ├── vault-api.md              ← Vault management endpoints
│   └── administration-api.md     ← Administration endpoints
├── pages/
│   ├── administration-page.md
│   ├── cabinets-page.md
│   ├── collection-report-page.md
│   ├── dashboard-page.md
│   ├── frontend-standards.md
│   ├── history-fix-page.md
│   ├── locations-page.md
│   ├── login-page.md
│   ├── members-page.md
│   ├── sessions-page.md
│   ├── system-config-page.md
│   └── vault-page.md
├── backend/
│   ├── database-models.md
│   ├── README.md
│   └── api-flows/                ← Sequence diagrams for core flows
│       ├── analytics-dashboard-flow.md
│       ├── machine-aggregation-flow.md
│       ├── meters-report-flow.md
│       ├── machine-crud-flow.md
│       ├── with-api-auth-flow.md
│       ├── licencee-management-flow.md
│       ├── location-management-flow.md
│       ├── activity-logs-flow.md
│       ├── user-management-flow.md
│       └── page-auth-restrictions.md
└── pillars/
    ├── collections-pillar.md
    ├── engineering-guide.md
    ├── financial-system.md
    ├── floor-operations.md
    └── identity-admin.md
```

---

## 12. Current Bugs

> _(To be filled in by Aaron Hazzard)_

---

## 13. Currently Working On

- Documentation review and update (all Documentation/ files)
- SMIB offline threshold restore to 72h (currently 3min for testing)
- End-to-end testing of offline SMIB supplemental meter creation flow

---

_Evolution One Engineering — Internal Document_  
_Not for external distribution._
