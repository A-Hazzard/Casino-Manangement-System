# SMIB Sync API (`/api/admin/smib-sync`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** May 7, 2026  
**Version:** 1.0.0

---

## 1. Domain Overview

The SMIB Sync API automatically classifies gaming locations based on their machines' SMIB (Slot Machine Interface Board) connectivity status. Each location is classified as:

| Classification     | Meaning                        | Rule                              |
| :----------------- | :----------------------------- | :-------------------------------- |
| **fullSMIBs**      | All machines have SMIB boards  | `relayId` exists on ALL machines  |
| **semiSMIBs**      | Some machines have SMIB boards | `relayId` exists on SOME machines |
| **noSMIBLocation** | No machines have SMIB boards   | `relayId` exists on NO machines   |

The sync process solves the pagination filtering problem - when filtering by SMIB status, only previously synced cached values are used.

---

## 2. Core Endpoints

### 📊 `GET /api/admin/smib-sync`

Returns the current SMIB sync status. Used by the frontend to determine if a sync is needed.

**Query Params:** None

**Response:**

```json
{
  "lastSync": "2026-05-07T15:36:53.844Z",
  "isStale": false,
  "staleAfterHours": 1
}
```

| Field             | Meaning                              |
| :---------------- | :----------------------------------- |
| `lastSync`        | Timestamp of last successful sync    |
| `isStale`         | `true` = needs sync, `false` = fresh |
| `staleAfterHours` | Threshold (1 hour)                   |

**Steps:**

1. Connect to database
2. Find most recently updated location with `fullSMIBs` field
3. Check if last update > 1 hour ago
4. Return status

---

### 🔄 `POST /api/admin/smib-sync`

Triggers a full SMIB classification sync for all accessible locations.

**Query Params:**
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `licencee` | string | No | Filter sync to specific licencee |

**Body:**

```json
{
  "licencee": " licencee-id (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "synced": 5,
  "unchanged": 2100,
  "total": 2105,
  "durationMs": 4500
}
```

**Steps:**

1. **Authenticate** — Validates user via JWT (admin/dev only)
2. **Build location filter** — Uses `buildLocationQueryFilter` for RBAC scoping
3. **Fetch ALL locations** — Gets all accessible locations (not paginated)
4. **Fetch ALL machines** — Gets all machines for those locations
5. **Classify each location** — Checks every machine for `relayId` presence
6. **Bulk write to DB** — Updates `fullSMIBs`, `semiSMIBs`, `noSMIBLocation` on each location
7. **Return results** — Shows how many were synced vs unchanged

---

## 3. How Classification Works

### Logic

```typescript
for each location:
  machines = allMachines.filter(m => m.gamingLocation === location._id)
  withRelay = machines.filter(m => m.relayId && m.relayId.trim()).length

  // Full SMIB - all machines have relayId
  computedFull = machines.length > 0 && withRelay === machines.length

  // Semi SMIB - some machines have relayId
  computedSemi = machines.length > 0 && withRelay > 0 && withRelay < machines.length

  // No SMIB - no machines have relayId
  computedNone = !computedFull && !computedSemi
```

### Database Updates

Each location document gets updated with:

```json
{
  "fullSMIBs": true/false,
  "semiSMIBs": true/false,
  "noSMIBLocation": true/false
}
```

---

## 4. Integration with Other Endpoints

### Reports Locations (`/api/reports/locations`)

Add `syncAll=true` to trigger sync before returning results:

```
GET /api/reports/locations?syncAll=true&timePeriod=Today&page=1&limit=50
```

### Search All Locations (`/api/locations/search-all`)

Add `syncAll=true` to trigger sync:

```
GET /api/locations/search-all?syncAll=true&search=...
```

---

## 5. Database Model

The `GamingLocations` collection has three SMIB fields:

```typescript
{
  noSMIBLocation: Boolean,  // true = no machines have relayId
  fullSMIBs: Boolean,      // true = all machines have relayId
  semiSMIBs: Boolean      // true = some machines have relayId
}
```

Indexes:

- `{ 'rel.licencee': 1, deletedAt: 1 }`
- `{ deletedAt: 1 }`

---

## 6. Frontend Usage

The `/locations` page uses `useLocationsPageData` hook:

1. **On mount** — Calls `GET /api/admin/smib-sync`
2. **If stale** — Calls `POST /api/admin/smib-sync` in background
3. **Fetches data** — Uses cached SMIB values for filtering

Logs seen in console:

```
[GET /api/admin/smib-sync] Status: lastSync=..., isStale=true, staleAfterHours=1
[SMIB Classification] Syncing X locations...
[POST /api/admin/smib-sync] Syncing X locations
```

---

## 7. Manual Sync

To force a sync:

```bash
# Via cURL
curl -X POST http://localhost:3000/api/admin/smib-sync

# Via specific licencee
curl -X POST "http://localhost:3000/api/admin/smib-sync?licencee=123abc"

# Via reports endpoint
curl "http://localhost:3000/api/reports/locations?syncAll=true&limit=1"
```

---

**Internal Document** - Engineering Team
