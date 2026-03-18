# Dashboard Page Implementation (`/`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.1.0

---

## 1. Page Overview

The Dashboard is the "Pulse" of the operation. It provides real-time financial orchestration, spatial monitoring, and performance rankings.

---

## 2. Data & API Architecture (By Section)

### 💳 Financial Stats Bar
The top-of-page summary showing aggregate performance.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Money In** | `totalDrop` | `GET /api/analytics/dashboard` |
| **Money Out** | `totalCancelledCredits` | `GET /api/analytics/dashboard` |
| **Gross** | `totalGross` | `GET /api/analytics/dashboard` |
| **Machines Online** | `onlineCount` | `GET /api/analytics/dashboard` |

- **Filters**: Responsive to `timePeriod`, `licencee`, and `currency`.
- **Implementation**: Uses `FinancialMetrics` component with `DashboardTotalsSkeleton`.

### 📈 Performance Chart
Visualizes revenue trends over time.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Revenue Trend** | `Money In`, `Money Out`, `Gross` | `GET /api/metrics/meters` |
| **Granularity** | `Hourly`, `Daily`, `Weekly`, `Monthly` | `GET /api/metrics/meters` |

- **Interactive**: Hovering over the line highlights specific data points with a custom Recharts Tooltip.
- **Implementation**: `DashboardChart` component using `useMeterTrends` hook.

### 🗺️ Location Map
Geospatial view of all properties in the selected scope.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Property Marker** | `latitude`, `longitude`, `name` | `GET /api/locationAggregation` |
| **Marker Context** | `gross`, `onlineCount` | `GET /api/locationAggregation` |

- **Visuals**: Markers are color-coded (Green for 100% online, Amber for partial, Gray for offline).
- **Implementation**: `MapPreview` using `react-leaflet` and `useLocationAggregation` hook.

### 🏆 Property Leaderboard
Rankings of the highest-performing assets.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Top Locations** | `name`, `gross` | `GET /api/locationAggregation` |
| **Top Machines** | `serialNumber`, `gross` | `GET /api/analytics/top-machines` |

- **Tabs**: Users can toggle between "Locations" and "Machines".
- **Implementation**: `LeaderboardGrid` with `TopPerformingItem` sub-components.

---

## 3. Filtering & Scope Persistence

- **Global Filter Bar**: The shared filter component at the top of the dashboard dictates the `licencee` and `timePeriod` for ALL sub-sections.
- **Currency Conversion**: When a specific Licencee is selected, the dashboard automatically converts USD values into the property's local currency (e.g., TTD, GYD) based on real-time exchange rates.

---

## 4. Role-Based Access Control (RBAC)

- **Developer / Admin**: Full global visibility across all Licencees.
- **Manager**: Restricted to viewing properties within their specific corporate group.
- **Location Admin**: Only sees data for properties explicitly assigned to their profile. The sidebar and map markers are automatically pruned to reflect this scope.

---

## 5. Performance & UX

- **Skeleton Loading**: Every section has a custom skeleton (`StatsSkeleton`, `ChartSkeleton`, `MapSkeleton`) to prevent layout shift during data fetching.
- **Debounced Updates**: Rapidly switching filters (e.g. clicking "Today" then "7d" quickly) is debounced to avoid resource-heavy API overlaps.
- **Polling**: Data is automatically refreshed every 180 seconds to ensure the dashboard remains "live" without manual intervention.

---
**Internal Document** - Engineering Team
