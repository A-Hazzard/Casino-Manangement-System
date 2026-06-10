# Cabinets API Documentation

**Author:** Aaron Hazzard | Senior Full-Stack Software Engineer  
**Base Path:** `/api/cabinets`  
**Version:** 4.4.0  
**Last Updated:** June 5, 2026

This API provides centralized management for all gaming cabinets across property locations. It consolidates legacy machine-related logic and location-scoped routes into a unified, high-performance architecture.

---

## 1. List & Aggregation

### `GET /api/cabinets/aggregation`

The core reporting engine for cabinets. It aggregates machine metrics, online status, and location data in a single optimized pass.

**Query Parameters:**

- `timePeriod`: (Required) `Today`, `Yesterday`, `7d`, `30d`, `Custom`.
- `locationId`: (Optional) Comma-separated list of location IDs.
- `onlineStatus`: (Optional) `online`, `offline`, `archived`, `all`.
- `smibStatus`: (Optional) `smib`, `no-smib`.
- `gameType`: (Optional) Comma-separated filter for installed games.

**Response Schema:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "699ef6e695fc27943db16c14",
      "assetNumber": "CMS-101",
      "locationName": "Main Floor",
      "online": true,
      "moneyIn": 1500.5,
      "moneyOut": 1200.0,
      "gross": 300.5,
      "jackpot": 50.0
    }
  ],
  "pagination": { "page": 1, "total": 1250 }
}
```

---

## 2. Cabinet CRUD Operations

### `POST /api/cabinets`

Creates a new gaming cabinet asset. Automatically manages configuration records and activity logs.

### `GET /api/cabinets/[cabinetId]`

Returns a single cabinet document augmented with current metrics for the specified `timePeriod`.

### `PUT /api/cabinets/[cabinetId]`

Full update of cabinet hardware configuration, SMIB settings, and status metadata.

### `PATCH /api/cabinets/[cabinetId]`

Partial updates for incremental changes, including:

- Actions: `restore` (un-archives a cabinet).
- Config updates: `smibConfig`, `custom.name`.

### `DELETE /api/cabinets/[cabinetId]`

- **Soft Delete**: (Default) Archives the cabinet, setting `deletedAt`.
- **Hard Delete**: (Admin only) Permanently removes document and related metrics via `?hardDelete=true`.

---

## 3. Sub-resources

### `GET /api/cabinets/[cabinetId]/chart`

Returns time-series data for operational metrics (Drop, Cancelled Credits, Gross) aggregated by hour or day.

### `PATCH /api/cabinets/[cabinetId]/collection-history`

Manages the `collectionMetersHistory` array on a cabinet document. Supports add, update, and delete operations on individual history entries.

**Body fields:**

- `operation`: (Required) `add`, `update`, or `delete`.
- `entry`: (Required for `add`/`update`) The history entry data with fields: `metersIn`, `metersOut`, `prevMetersIn`, `prevMetersOut`, `timestamp`, `locationReportId`.
- `entryId`: (Required for `update`/`delete`) The `_id` of the history entry to modify or remove.

---

## 4. Additional Routes

### `GET /api/cabinets/status`

Returns machine online/offline status counts. Aggregates across all machines filtered by the user's accessible licencees and locations.

**Query Parameters:**

- `licencee`: (Optional) Filter by licencee name.
- `locationId`: (Optional) Comma-separated location IDs.
- `machineTypeFilter`: (Optional) `LocalServersOnly`, `SMIBLocationsOnly`, `NoSMIBLocation`, `MembershipOnly`, `MissingCoordinates`, `HasCoordinates`.
- `onlineStatus`: (Optional) `online`, `offline`, `never-online`, or `all`.
- `gameType`: (Optional) Comma-separated game types.
- `search`: (Optional) Search query for machine fields or location name.

### `GET /api/cabinets/locations`

Returns locations available for the current user, with country name lookup. Used to populate location dropdowns in cabinet views.

**Query Parameters:**

- `licencee`: (Optional) Filter by licencee name.
- `membershipOnly`: (Optional) `true` to return only membership-enabled locations.

### `GET /api/cabinets/online-status`

Batch lookup for machine online status. Accepts a comma-separated list of machine IDs and returns a map of `machineId → boolean`.

**Query Parameters:**

- `ids`: (Required) Comma-separated machine IDs to check.

### `POST /api/cabinets/[cabinetId]/smib-config`

Updates SMIB configuration on the machine document and pushes the config to the physical SMIB via MQTT. Also supports sending machine control commands.

### `GET /api/cabinets/[cabinetId]/smib-config`

Returns the current SMIB configuration, version metadata, and relay ID for a cabinet.

### `POST /api/cabinets/[cabinetId]/sync-meters`

Triggers a meter sync for a cabinet. Resolves the cabinet's parent location and redirects to `/api/locations/${locationId}/cabinets/${cabinetId}/sync-meters`. See [Sync Meters API](./sync-meters-api.md) for details.

### `GET /api/cabinets/[cabinetId]/refresh`

Triggers a live data refresh for a cabinet. Resolves the cabinet's parent location and redirects to `/api/locations/${locationId}/cabinets/${cabinetId}/refresh`.

### `GET /api/cabinets/[cabinetId]/metrics`

Fetches performance metrics for a cabinet. Resolves the cabinet's parent location and redirects to `/api/locations/${locationId}/cabinets/${cabinetId}/metrics`.

**Query Parameters:**

- `timePeriod`: (Optional) Time period filter (e.g. `today`, `week`).
- `startDate`: (Optional) ISO start date.
- `endDate`: (Optional) ISO end date.

---

## 5. Technical Constants

- **Online Calculation**: `lastActivity >= now - 180 seconds` OR `location.aceEnabled === true`.
- **Currency Strategy**: Centralized conversion via `convertToUSD` / `convertFromUSD` helpers based on the location's `country` or `licencee` setting.

---

**Technical Reference Document** — API Evolution Phase 5
