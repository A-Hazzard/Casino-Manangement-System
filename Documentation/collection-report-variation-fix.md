# Collection Report — Total Variation Mismatch: Root Causes & Fix

## The Problem

The **Total Variation** column on the collection report list page (`/collection-report`) showed different values from the **Total Variation** on each report's detail page (`/collection-report/report/[id]`). Some reports showed large negative numbers on the list (e.g. −605,084, −148,500) while the detail page showed 0.

---

## What "Total Variation" Means

For each collection report, every slot machine has two independent gross figures:

- **Machine Gross** — how much money the machine physically took in, calculated from its meter readings and adjusted for the machine's denomination.
- **SAS Gross** — how much the SAS (Slot Accounting System) software recorded the machine earning over the same period, sourced from a separate Meters database.

**Variation = Machine Gross − SAS Gross**

When variation is 0, both systems agree. When it's non-zero, something diverged — a machine fault, a time window issue, etc. Some licencees also subtract **jackpots** from SAS Gross before comparing (the `includeJackpot` flag), because jackpots are paid out separately and shouldn't count against the SAS figure.

---

## The Three Bugs

### Bug 1 — Wrong `includeJackpot` flag

**What happened:** The `includeJackpot` flag tells the system whether to subtract jackpots from SAS Gross before computing variation. This flag lives on the **Licencee** record. At some point a copy of it was also stored on each CollectionReport document — but older reports were created before this was in place, so their stored value defaulted to `false`.

The list page was reading `includeJackpot` from the CollectionReport document (always `false` for old reports). The detail page correctly fetched it live from the Licencee.

**Result:** The list page never subtracted jackpots for older reports, making variation appear too negative.

**Fix:** The list page now does a database join (`$lookup`) to the Licencee on every query, getting the live `includeJackpot` value — same as the detail page.

---

### Bug 2 — Jackpot coming from the wrong place

**What happened:** Jackpot values can be stored in two places:
1. `Meters.movement.jackpot` — the live meter reading field (often 0 or missing for many machines)
2. `Collections.sasMeters.jackpot` — a snapshot stored at the time the collection was recorded (reliable)

The list page was only looking at `movement.jackpot` (often 0), so it subtracted nothing. The detail page tries `movement.jackpot` first and falls back to the stored snapshot — getting the correct value.

**Fix:** The list page now runs its Meters query grouped **per machine** (instead of all at once), and for each machine applies the same fallback: use `movement.jackpot` if non-zero, otherwise use the stored `sasMeters.jackpot` snapshot. This exactly mirrors the detail page logic.

---

### Bug 3 — Meters queries running for all reports at once (performance)

**What happened:** The list page was fetching all collection reports from the database, then running one Meters database query per report — for every single report in history (potentially hundreds). This ran all those queries simultaneously, causing the API to time out.

**Fix:** Pagination is now applied inside the database query before the Meters queries run. Only the ~10–20 reports on the current page get Meters queries, not the entire history.

---

## Summary Table

| Bug | Root Cause | Effect | Fix |
|-----|-----------|--------|-----|
| Wrong `includeJackpot` | Old reports stored `false` by default | Jackpot not subtracted → variation too negative | Fetch flag live from Licencee via `$lookup` |
| Jackpot from wrong field | `movement.jackpot` is 0 for many machines | Same as above | Per-machine query with fallback to stored snapshot |
| API timeout | Meters queries ran for all reports, not just current page | List page failed to load | Apply `$skip`/`$limit` before Meters queries |

---

## Files Changed

- `app/api/lib/helpers/collectionReport/service.ts` — list page backend (all three fixes)
- `app/api/collectionReport/route.ts` — route handler (pass page/limit into service)
