# Sessions API (`/api/sessions`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Domain Overview

Manages player journey records — linking a loyalty card swipe to a machine for a specific time window. Used for forensic auditing, floor monitoring, and loyalty analytics.

---

## 2. Core Endpoints

### 📋 `GET /api/sessions`
Returns a paginated, searchable list of machine sessions with joined machine and location context.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse query params** — Reads `page`, `limit`, `search`, `sortBy`, `sortOrder`, `licencee`, `dateFilter` (`today`/`yesterday`/`7d`/`30d`/`all`), and explicit `startDate`/`endDate`.
3. **Build base query with date filters** — Constructs a MongoDB `$match` for `startTime`. If explicit `startDate`/`endDate` are provided, uses them directly. Otherwise resolves a date range from the `dateFilter` shorthand (e.g. `today` = current day's midnight to 23:59:59).
4. **Build aggregation pipeline — count** — Runs a lightweight count pipeline to determine the total number of matching records for pagination without fetching all data.
5. **Build aggregation pipeline — data with lookups** — Constructs a full pipeline:
   - `$match` — applies the base query and licencee filter.
   - `$lookup` → `machines` — joins on `machineId` to get `serialNumber` and `custom.name`.
   - `$lookup` → `gaminglocations` — joins via the machine's `gamingLocation` to get the location name.
   - `$lookup` → `licencees` — joins via the location's `rel.licencee` to filter by licencee.
   - `$addFields` — appends `relevanceScore` computed from search term prefix-match against `_id`, `machineId`, and `memberId` (higher score = better match).
   - `$sort` — sorts by `relevanceScore desc` when searching, otherwise by the requested `sortBy` field.
   - `$skip` / `$limit` — applies pagination.
6. **Execute both pipelines** — Runs them with `Promise.all` for parallel execution.
7. **Return paginated sessions** — Responds with `{ sessions, pagination: { page, limit, total, totalPages } }`.

---

### 🔍 `GET /api/sessions/[sessionId]`
Returns the full detail for a single session including member and machine context.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Validate `sessionId`** — Checks it is a non-empty string. Returns `400` if invalid.
3. **Build aggregation pipeline** — Constructs a pipeline with:
   - `$match` — finds the session by `_id === sessionId`.
   - `$lookup` → `members` — joins on `memberId` to get the player's `profile`.
   - `$lookup` → `machines` — joins on `machineId` to get `serialNumber`, `game`, `manufacturer`.
   - `$lookup` → `gaminglocations` — joins via the machine's `gamingLocation`.
   - `$project` — selects only the fields needed by the frontend (avoids leaking raw SAS streams).
4. **Check for `null` result** — Returns `404` if no session matches the ID.
5. **Return session detail** — Responds with the single enriched session document.

---

## 3. Business Logic

### 📊 Relevance Scoring
When a `search` query is provided, the pipeline adds a `relevanceScore` calculated as:
- `+20` for an exact prefix match on `profile.firstName` or `profile.lastName`
- `+10` for a prefix match on `_id` or `machineId`
- `+1` for a substring match

Results are sorted by score descending before pagination so the most relevant results appear first.

### 🔒 Licencee Filtering
Licencee filtering is not done at the `MachineSessions` document level — sessions don't directly store licencee IDs. The filter is enforced via the aggregation join chain: `Sessions → Machines → GamingLocations → Licencees`. Only sessions where the resolved licencee ID matches the requested `licencee` query param are returned.

---
**Technical Reference** - Operations & Session Team
