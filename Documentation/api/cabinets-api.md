# Cabinets API Documentation

**Author:** Evolution One Engineering  
**Base Path:** `/api/cabinets`

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
      "moneyIn": 1500.50,
      "moneyOut": 1200.00,
      "gross": 300.50,
      "jackpot": 50.00
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

### `GET /api/cabinets/[cabinetId]/collection-history`
Lists all lifetime collection events for the cabinet, including physical drop values and meter variations.

---

## 4. Technical Constants
- **Online Calculation**: `lastActivity >= now - 180 seconds` OR `location.aceEnabled === true`.
- **Currency Strategy**: Centralized conversion via `convertToUSD` / `convertFromUSD` helpers based on the location's `country` or `licencee` setting.

---

**Technical Reference Document** — API Evolution Phase 5
