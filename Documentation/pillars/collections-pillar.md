# Collection Reporting Pillar (Collections)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 25, 2026  
**Version:** 4.5.0

---

## 1. System Overview

The Collection Reporting system is the primary workflow for reconciling physical machine cash with electronic SAS meters. It ensures that the casino's reported profit matches the actual bank deposits.

### Key Capabilities

- **Multi-Step Collection Wizard**: Guided flow for Drop, Soft Count, and Variance Audit.
- **SAS Calibration**: Real-time tools to identify SMIB/Meter drift.
- **Master History Fix**: Automated resolution of "Ghost Meter" entries or overlapping reporting periods.
- **Profit Calculation**: Complex sharing logic (Partner Profit, Tax, Licensee Net) computed on-the-fly.

---

## 2. Technical Architecture

- **`CollectionReport`**: The top-level document for one location collection event. Holds the report-level `isEditing` flag (`false` = finalized/auditable, `true` = checked out).
- **`Collection`**: individual machine-level records holding the collector's `metersIn`/`metersOut`, the computed `prevIn`/`prevOut`, the `sasMeters` snapshot, and the `movement` delta. Linked to its parent by `locationReportId` + `isCompleted: true`.
- **`Meters`**: derived per-reading documents carrying the `movement` deltas (drop, cancelled, jackpot). Always recalculated _from_ Collections — never the source of truth in the other direction.
- **Machine meter state**: a machine's running totals live on the `Machine` doc itself — `machine.collectionMeters` plus the `machine.collectionMetersHistory[]` array (keyed by `locationReportId`). There is **no** separate `History` collection.

### Performance Strategies

- **Batch Processing**: Finalization links all staged collections and advances every machine's meter state in one `createCollectionReport` pass.
- **Editable, not immutable**: a finalized report is **not** permanently locked — `developer`/`admin`/`owner` can edit it (which re-runs `recalculateMachineCollections` and one-hop `propagateMetersToNextReport`) or soft-delete it. The `isEditing` flag, not immutability, is what gates whether a report is safe for financial reporting.

---

## 3. Frontend Implementation (`app/collection-report`)

Full UI breakdown lives in [`Documentation/frontend/pages/collection-report-page.md`](../frontend/pages/collection-report-page.md). In brief:

- **Reports History tab** (`collection`): paginated, searchable list of finalized reports; clicking a row opens the **detail page** (`/collection-report/report/[reportId]`) with Machine Metrics / Location Metrics / SAS Metrics Compare tabs.
- **Creation wizard**: select location → stage each machine (`POST …/collections`) → enter meters → variation check → finalize (`POST /api/collection-reports`).
- **Edit modal**: `developer`/`admin`/`owner` can edit a finalized report's entries and fields; edits recalculate movement and propagate forward.
- **Monthly Report tab** (`monthly`, Manager+) and the developer-only **Collection Reports - V2** session capture tab.
- **History Fix**: a separate technician tool documented in [`Documentation/frontend/pages/history-fix-page.md`](../frontend/pages/history-fix-page.md).

---

## 4. Business Logic (Critical)

- **Movement Delta is ground truth**: `movement.gross` (computed from `(metersIn − prevIn) − (metersOut − prevOut)`) is the authoritative per-machine revenue figure. Recalculation is only permitted during the "Add Entry" phase; once saved, `movement.gross` is fixed. SAS meters are compared against it to surface **variation**, but do not overwrite it.
- **Variation, not a hard gate**: machines whose meter gross diverges from SAS gross beyond the licencee threshold are flagged by the variation check (`check-variations`) and surfaced in `VariationCheckPopover` / `VariationsConfirmationDialog`. The collector **acknowledges** flagged machines — there is no fixed "\$50 cannot close" rule in code; the threshold is licencee-configured.
- **Chronological integrity**: reports must be inserted in time order per machine. A middle-date insertion is blocked at submit (`filterMachinesByChronologicalOrder`); inserting before the oldest report triggers forward meter propagation.
- **Offline SMIB**: when a machine's relay is unreachable, the collector-entered values are treated as the source of truth and written into `sasMeters` so variation is not phantom.

---

## 5. Technical Documentation

For deep-dive documentation on API endpoints, data flow, and the calculation pipeline, refer to:

- [`Documentation/backend/api/collections-technical-deep-dive.md`](../backend/api/collections-technical-deep-dive.md) — full technical reference.
- [`Documentation/backend/api/collections-api.md`](../backend/api/collections-api.md) — the `/api/collection-reports` route + related endpoints.
- [`app/collection-report/CLAUDE.md`](../../app/collection-report/CLAUDE.md) — the "push-forward meters" three-document architecture and the creation-vs-edit invariant.

V2 collection reports now support the same RAM clear scenario as V1 with identical financial results — see [`Documentation/backend/api/collection-reports-v2-movement.md`](../backend/api/collection-reports-v2-movement.md) for the unified movement formula and the no-SMIB 2-`Meters`-doc creation pattern.

For offline SMIB machines, `Machine.sasMeters.drop` and `Machine.sasMeters.totalCancelledCredits` are also updated during collection report creation and editing (both V1 and V2), since the live relay is unreachable — see [`Documentation/backend/api/collection-reports-v2-movement.md`](../backend/api/collection-reports-v2-movement.md) for details.

---

**Maintained By**: Evolution One Development Team
