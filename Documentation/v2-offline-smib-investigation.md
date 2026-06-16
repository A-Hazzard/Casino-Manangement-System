# Prompt: Investigate Collection Report V2 for Offline SMIB Variation Bugs

## Background — What Was Fixed in V1

In V1 of the collection report system, a class of bugs around **offline SMIB machines** and **supplemental meters** was discovered and fixed. Here is the full context so you know exactly what to look for in V2.

---

## The V1 Problem (Fixed June 16, 2026)

### Terminology

- **Offline SMIB machine**: Has a `relayId` but `lastActivity` is stale (>3 minutes). The relay is unreachable.
- **Supplemental meter**: A `Meters` document created by the collection report system (`meterSource: '"'"'COLLECTION_REPORT'"'"'`, `isSupplemental: true`) to store collector-entered readings when the relay is offline.
- **`col.meterId`**: Field on a `Collection` document. When set, it means the machine was offline at collection time and a supplemental meter was created. This is the authoritative offline signal.
- **`col.sasMeters.gross`**: Stored SAS gross on the Collection document. For offline machines should equal `movement.gross` (collector truth). May be stale if the collection was created before fixes.

### Bug Pattern 1 — `computeTotalVariation` ignored `col.meterId`

`computeTotalVariation` (in `calculations.ts`) reads `col.sasMeters.gross` to compute `meterGross - sasGross`. For offline machines, `sasMeters.gross` can be stale. The function was NOT projecting or checking `col.meterId`, so it had no signal that the collection had a supplemental meter.

**Fix applied:**

```typescript
// Project meterId
const collections = await Collections.find(
  { locationReportId },
  { movement: 1, sasMeters: 1, machineId: 1, meterId: 1 }
)...

// In reduce:
const hasSupplementalMeter = !!col.meterId;
const effectiveSasGross =
  hasSupplementalMeter || isLegacyZeroSas
    ? meterGross   // collector values are truth
    : storedSasGross;
```

### Bug Pattern 2 — `check-variations` can never see supplemental meters

`check-variations` filters `meterSource: { $ne: '"'"'COLLECTION_REPORT'"'"' }` permanently. Supplemental meters are excluded from the live query. For any machine with a supplemental meter, `storedSasGross` MUST be passed to bypass the live query.

### Bug Pattern 3 — PATCH handler did not override sasMeters.gross for "was offline, now online"

When a collection is PATCHed (user saves edits), STEP 5.1 overrides `sasMeters.gross` with movement delta. Originally this only fired for currently-offline machines. If the machine came back online, the override did not fire.

**Fix applied:**

```typescript
const isOfflinePatch =
  (hasRelay && lastActivityMs >= OFFLINE_THRESHOLD_MS) ||
  !!originalCollection.meterId;   // also fires when supplemental meter exists
```

---

## Your Task: Investigate V2

Please investigate the **V2 collection report system** (`app/api/collection-reports-v2/`) for the same class of bugs. V2 has not been tested for this scenario yet.

### Key V2 Files to Examine

- `app/api/collection-reports-v2/sessions/[sessionId]/submit/route.ts` and its helper in `app/api/lib/helpers/collectionReportV2/`
- `app/api/collection-reports-v2/machines/route.ts` and its helper
- Any V2 variation check logic (look for calls to `check-variations` or equivalent)
- Any V2 total variation calculation (look for `computeTotalVariation` or equivalent summing of `sasMeters.gross`)
- Any V2 supplemental meter creation (look for `meterSource: '"'"'COLLECTION_REPORT'"'"'`)
- The V2 session submit route creates supplemental meters — look for how the meter ID is stored on the V2 equivalent of the collection document (`ReportedMachine`)

### 6 Questions to Answer

1. **Does V2 have a `computeTotalVariation` equivalent?** If yes, does it project and check `meterId` (or V2 equivalent) before using `sasMeters.gross`?

2. **Does V2 variation check query live Meters?** If yes, does it filter out `meterSource: '"'"'COLLECTION_REPORT'"'"'` meters? If so, does it pass `storedSasGross` as a bypass for offline machines?

3. **When V2 creates supplemental meters at submit time**, does it correctly set `sasMeters.gross = movement.gross` on the session/reported-machine document?

4. **When V2 edits a previously submitted offline collection**, does the PATCH handler correctly override `sasMeters.gross` based on whether the machine had a supplemental meter (even if it is now online)?

5. **Does V2 store a `meterId` field** (or equivalent like `meterDocId`) on its `ReportedMachine` document to indicate "this machine had a supplemental meter"? If yes, is this field used when recalculating variation?

6. **Is there any V2 total variation stored on the session/report document?** If yes, how is it computed and does it have the same blind spot (not checking for supplemental meter marker)?

### What "No Bug" Looks Like

V2 is clean if ALL of the following are true:

- [ ] When a V2 session is submitted for an offline SMIB machine, `sasMeters.gross` (or equivalent) on the persisted document equals `movement.gross`
- [ ] V2 total variation calculation uses `movement.gross` as the SAS gross for machines with supplemental meters (or always treats offline machine variation as $0)
- [ ] V2 variation check (if any) either does not query live Meters for offline machines, OR passes `storedSasGross` to bypass the query
- [ ] After editing a V2 offline collection and re-submitting, the stored total variation is $0

### What to Report

For each issue found:
- The file and line numbers
- What the code currently does
- Why it is a bug (how it produces wrong variation)
- A suggested fix following the V1 pattern (use `meterId`/equivalent as the authoritative offline signal, use `movement.gross` as effectiveSasGross)

If V2 has no issues, confirm this explicitly for each of the 6 questions above with brief evidence (file path + what you found).

---

## Reference: V1 Files Changed (for comparison)

| File | What was wrong | Fix |
|---|---|---|
| `app/api/lib/helpers/collectionReport/calculations.ts` | `computeTotalVariation` did not project or check `meterId` | Project `meterId`; if set, `effectiveSasGross = meterGross` |
| `components/CMS/collectionReport/modals/CollectionReportEditCollectionModal.tsx` | Passed `storedSasGross` based on current machine status only, not `meterId` | Use `hasSupplementalMeter OR currentlyOffline`; compute `freshMovementGross` from current inputs |
| `app/api/collection-reports/collections/route.ts` | PATCH STEP 5.1 only fired for currently-offline machines | Also fire when `originalCollection.meterId` is set |

## Reference: V2 Architecture Note

V2 uses `LocationSession` + `ReportedMachine` documents instead of V1 `CollectionReport` + `Collection`. The submit route creates `Meters` documents. Look at what field (if any) on `ReportedMachine` corresponds to V1 `Collection.meterId` (the supplemental meter pointer).

See also: `Documentation/manual-meters-flow.md` section 7 (CR V2 RAM Clear & Meter Creation) and section 8 (Offline SMIB Invariants).
