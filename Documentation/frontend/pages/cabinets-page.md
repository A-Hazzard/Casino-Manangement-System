# Cabinets Page Implementation (`/cabinets`)

**Author:** Aaron Hazzard | Senior Full-Stack Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.4.0

---

## 1. Page Overview

Real-time telemetry and hardware management hub for all gaming **cabinets** across the property fleet. This page provides a centralized view of both automated (SMIB) and manual machine assets, integrated with the unified cabinets API.

---

## 2. Data & API Architecture (By Section)

### 📟 Fleet Inventory Table

The primary management grid for all gaming hardware across the floor.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Asset #** | `assetNumber` | `GET /api/cabinets/aggregation` |
| **Serial Number** | `serialNumber` | `GET /api/cabinets/aggregation` |
| **Game Title** | `installedGame` | `GET /api/cabinets/aggregation` |
| **Live Status** | `online` (Boolean) | `GET /api/cabinets/aggregation` |
| **Location** | `locationName` | `GET /api/cabinets/aggregation` |
| **Manufacturer** | `manufacturer` | `GET /api/cabinets/aggregation` |

- **Filters**: Responsive to `LocationId`, `GameType`, `OnlineStatus`, and `SmibStatus`.
- **Implementation**: Utilizes the `useCabinetPageData` hook which communicates with the centralized aggregation engine.

### 🕹️ Cabinet Details Drawer

A comprehensive fly-out panel providing a 360-degree view of a single asset.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Money In** | `moneyIn` | `GET /api/cabinets/[cabinetId]` |
| **Money Out** | `moneyOut` | `GET /api/cabinets/[cabinetId]` |
| **Gross** | `gross` | `GET /api/cabinets/[cabinetId]` |
| **Jackpot** | `jackpot` | `GET /api/cabinets/[cabinetId]` |
| **Live Meters** | `sasMeters.*` | `GET /api/cabinets/[cabinetId]` |
| **Analytics** | Time-series data | `GET /api/cabinets/aggregation` |
| **History** | Collection records | `GET /api/collection-reports` |

#### Audit Logs Tab

| UI Term        | Data Element | Source API                                     |
| :------------- | :----------- | :--------------------------------------------- |
| **Event Type** | `eventType`  | `GET /api/activity-logs?cabinetId=[cabinetId]` |

---

## 3. Remote Operations & Commands

The interface provides a **"Command Center"** for direct hardware interaction:

- **Sync Meters**: Triggers `POST /api/cabinets/[cabinetId]/sync-meters` (PATCH).
- **Refresh Status**: Triggers `POST /api/cabinets/[cabinetId]/refresh` (PATCH).
- **SMIB Config**: Managed via `PATCH /api/cabinets/[cabinetId]` (SMIB Configuration settings).

---

## 4. Real-Time Status Logic (Connectivity)

- **Connectivity Pulse**: The 🟢 icon on the fleet table is updated based on `lastActivity` or `aceEnabled` status. A cabinet is considered online if it has communicated within the last 3 minutes or is in an ACE-enabled location.
- **Data Source**: Reconciled via `GET /api/cabinets/aggregation` with specialized match stages for online/offline status.

---

## 5. Role-Based Access Control (RBAC)

- **Technicians**: Full access to "SMIB Management" and remote configuration. Restricted to "Last Hour" metrics view unless elevated.
- **Managers**: Access to "Total Accounting Metrics" and "Collection History".
- **Location Admins**: Restricted to cabinets assigned to their authorized locations (enforced via `getUserLocationFilter` on the API).

---

## 6. Technical Standards

- **Skeleton UX**: `CabinetDetailsLoadingState` and related skeletons from `components/shared/ui/skeletons/CabinetDetailSkeletons.tsx` are used during data hydration.
- **Centralized Service**: All API interactions are handled by the `fetchCabinets` and `fetchCabinetById` helpers in `lib/helpers/cabinets/helpers.ts`.
- **Architecture**: Redirects all hardware-related traffic to the centralized `/api/cabinets` namespace.

---

**Technical Reference Document** — Evolution One CMS API Centralization Phase
