# Locations Page Implementation (`/locations`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 5, 2026  
**Version:** 4.4.0

---

## 1. Page Overview

Overview of the gaming property portfolio with real-time performance tracking.

---

## 2. Data & API Architecture (By Section)

### 📊 Property Statistics Bar

Summary of the total financial and operational footprint across the selected scope.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Money In** | `moneyIn` | `GET /api/locationAggregation` |
| **Money Out** | `moneyOut` | `GET /api/locationAggregation` |
| **Gross** | `gross` | `GET /api/locationAggregation` |

- **Filters**: Responsive to `timePeriod`, `licencee`, and `search` (Location Name).
- **Implementation**: `useLocationsPageData` hook.

### 📋 Locations Inventory Table

The primary grid for managing and auditing individual gaming properties.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Name** | `name` | `GET /api/locationAggregation` |
| **Cabinet Count** | `machineCount` | `GET /api/locationAggregation` |
| **Status** | `onlineStatus` | `GET /api/locationAggregation` |

- **Interactive**: Support for multi-sorting (e.g. Sort by Gross, then by Cabinet Count).
- **Implementation**: `LocationsTable` component with server-side filtering via the `locationAggregation` endpoint.

### 📡 Cabinet Connectivity Widget

Real-time operational health of the property fleet.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Online Locations** | `onlineCount` | `GET /api/locationAggregation` |
| **Offline Locations** | `offlineCount` | `GET /api/locationAggregation` |
| **Total Members** | `membershipCount` | `GET /api/locations/membership-count` |

- **Filtering**: Clicking the "Offline" pill automatically filters the table to show only properties with reported hardware issues.
- **Implementation**: Rendered inline within the Locations page content component.

### 🗺️ Interactive Property Map

Geospatial visualization of the property portfolio.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Marker Position** | `latitude`, `longitude` | `GET /api/locationAggregation` |
| **Marker Gross** | `gross` | `GET /api/locationAggregation` |

- **Sync**: Clicking a map marker automatically scrolls the Inventory Table to the corresponding property row.
- **Implementation**: `MapPreview` component using `react-leaflet`.

---

## 3. Filtering & Persistence

- **Location Search**: The search bar performing a case-insensitive `$regex` match on the property name.
- **Cabinet Type Filter**: Allows users to filter properties that contain specific cabinet types (e.g. "Only show locations with VGTs").
- **Persistence**: The selected `licencee` and `timePeriod` are persisted in the session to maintain context when navigating between the Dashboard and Locations page.

---

## 4. Role-Based Access Control (RBAC)

- **Admin / Developer**: Can see and manage all properties globally.
- **Manager**: Limited to properties within their corporate licencee group.
- **Location Admin**: Only sees the specific properties assigned to their user profile. The UI automatically hides the "Compare Locations" features if only one property is assigned.

---

## 5. Visual Indicators & Icons

- 🏢 **Property Icon**: Standard building icon used for gaming locations.
- 🔴 **Offline Alert**: A pulse animation appears on map markers and table rows if a property has zero active cabinet heartbeats.
- 💰 **High Performance**: A gold border or "Top Star" icon appears for properties in the top 10% of gross revenue for the selected period.

---

## 6. Technical UI Standards

- **Skeleton UX**: Skeletons from `components/shared/ui/skeletons/LocationsSkeletons.tsx` are used during initial data hydration (e.g. `LocationsSASEvaluationSkeleton`, `LocationsRevenueAnalysisSkeleton`).
- **Debounced Search**: Search input has a 300ms debounce to prevent API thrashing.
- **Responsive Design**: The map is hidden on mobile devices, replaced by a "List View" optimized for one-handed operation.

---

## 7. SMIB Classification System

### What is SMIB Classification?

Each location is automatically classified based on its machines' SMIB (Slot Machine Interface Board) connectivity:

| Classification          | Meaning                        | Rule                              |
| :---------------------- | :----------------------------- | :-------------------------------- |
| **Full SMIB**           | All machines have SMIB boards  | `relayId` exists on ALL machines  |
| **Partial (Semi) SMIB** | Some machines have SMIB boards | `relayId` exists on SOME machines |
| **No SMIB**             | No machines have SMIB boards   | `relayId` exists on NO machines   |

### The Filtering Problem (Solved)

**Before**: When filtering by SMIB status, only paginated results were checked. Locations on later pages weren't evaluated, causing incorrect filtering.

**After**: SMIB status is synced to the database, then filtering uses cached database values.

### How the Sync Works

1. **Page Load / Refresh**: Frontend calls `GET /api/admin/smib-sync`
2. **Check Staleness**: If last sync > 1 hour ago, triggers background sync
3. **Fetch All Data**: Gets ALL accessible locations + their machines
4. **Classify Each Location**: Checks each machine for `relayId` presence
5. **Save to DB**: Updates `fullSMIBs`, `semiSMIBs`, `noSMIBLocation` fields

### Sync Flow Diagram

```
User loads /locations
       ↓
Frontend: GET /api/admin/smib-sync
       ↓
Response: { lastSync, isStale }
       ↓
if isStale = true:
       ↓
Frontend: POST /api/admin/smib-sync
       ↓
Backend: Fetch ALL locations
       ↓
Backend: Fetch ALL machines
       ↓
Backend: Classify each location
       ↓
Backend: Bulk write to DB
       ↓
Filter uses cached values
```

### API Endpoints

| Endpoint                                     | Purpose                         |
| :------------------------------------------- | :------------------------------ |
| `GET /api/admin/smib-sync`                   | Check sync status               |
| `POST /api/admin/smib-sync`                  | Trigger full sync               |
| `GET /api/reports/locations?syncAll=true`    | Sync + return paginated results |
| `GET /api/locations/search-all?syncAll=true` | Sync + return full results      |

### Sync Status Response

```json
{
  "lastSync": "2026-05-07T15:36:53.844Z",
  "isStale": false,
  "staleAfterHours": 1
}
```

| Field             | Meaning                              |
| :---------------- | :----------------------------------- |
| `lastSync`        | Timestamp of last sync               |
| `isStale`         | `true` = needs sync, `false` = fresh |
| `staleAfterHours` | Threshold (1 hour)                   |

### Manual Sync

To force a sync:

```bash
# Via API
curl -X POST http://localhost:3000/api/admin/smib-sync

# Via URL parameter
GET /api/reports/locations?syncAll=true&limit=1
GET /api/locations/search-all?syncAll=true
```

---

**Internal Document** - Engineering Team
