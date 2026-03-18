# Locations Page Implementation (`/locations`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.1.0

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
- **Implementation**: `fetchDashboardTotals` helper within the `useLocationsPageData` hook.

### 📋 Locations Inventory Table
The primary grid for managing and auditing individual gaming properties.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Name** | `name` | `GET /api/locationAggregation` |
| **Machine Count** | `machineCount` | `GET /api/locationAggregation` |
| **Status** | `onlineStatus` | `GET /api/locationAggregation` |

- **Interactive**: Support for multi-sorting (e.g. Sort by Gross, then by Machine Count).
- **Implementation**: `LocationsTable` component with server-side filtering via the `locationAggregation` endpoint.

### 📡 Machine Connectivity Widget
Real-time operational health of the property fleet.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Online Locations** | `onlineCount` | `GET /api/locationAggregation` |
| **Offline Locations** | `offlineCount` | `GET /api/locationAggregation` |
| **Total Members** | `membershipCount` | `GET /api/locations/membership-count` |

- **Filtering**: Clicking the "Offline" pill automatically filters the table to show only properties with reported hardware issues.
- **Implementation**: `MachineStatusWidget` component.

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
- **Machine Type Filter**: Allows users to filter properties that contain specific cabinet types (e.g. "Only show locations with VGTs").
- **Persistence**: The selected `licencee` and `timePeriod` are persisted in the session to maintain context when navigating between the Dashboard and Locations page.

---

## 4. Role-Based Access Control (RBAC)

- **Admin / Developer**: Can see and manage all properties globally.
- **Manager**: Limited to properties within their corporate licencee group.
- **Location Admin**: Only sees the specific properties assigned to their user profile. The UI automatically hides the "Compare Locations" features if only one property is assigned.

---

## 5. Visual Indicators & Icons

- 🏢 **Property Icon**: Standard building icon used for gaming locations.
- 🔴 **Offline Alert**: A pulse animation appears on map markers and table rows if a property has zero active machine heartbeats.
- 💰 **High Performance**: A gold border or "Top Star" icon appears for properties in the top 10% of gross revenue for the selected period.

---

## 6. Technical UI Standards

- **Skeleton UX**: `LocationsTableSkeleton` and `StatsSkeleton` are used during initial data hydration.
- **Debounced Search**: Search input has a 300ms debounce to prevent API thrashing.
- **Responsive Design**: The map is hidden on mobile devices, replaced by a "List View" optimized for one-handed operation.

---
**Internal Document** - Engineering Team
