# Mongoose Models

This directory holds every Mongoose schema in the system. Models are the **single source of truth** for database access — all backend code imports from here and never touches `db.collection()` directly.

> Conventions, query patterns, and RBAC live in [`Documentation/backend/README.md`](../../../../Documentation/backend/README.md) and the root [`CLAUDE.md`](../../../../CLAUDE.md). This file is the catalog.

---

## Hard Rules (apply to every model)

- **String IDs only** — `_id` is a string, never `ObjectId`. Query with `findOne({ _id: id })`, **never** `findById`.
- **Updates** — `findOneAndUpdate({ _id: id }, ...)`, **never** `findByIdAndUpdate`.
- **Soft delete** — exclude archived records with `$or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2026-01-01') } }]` where the model supports it.
- **Typing** — type queries through the lean generic: `.lean<GamingMachine>()`. Generics come from `@shared/types`, never inline. See [`.instructions/rules/mongoose-query-typing.md`](../../../../.instructions/rules/mongoose-query-typing.md).
- **Licencee filtering** — location/machine-scoped queries must apply `getUserLocationFilter` from `app/api/lib/helpers/licenceeFilter.ts`.
- **File length** — keep model files ≤ 400 lines.

---

## Catalog

### Core gaming & financial

| Model | File | Purpose |
| --- | --- | --- |
| `GamingLocations` | `gaminglocations.ts` | Locations; holds `gameDayOffset`, `rel.licencee` |
| `Machine` | `machines.ts` | Cabinets/slot machines; `gamingLocation`, `relayId`, `collectionMeters` |
| `Meters` | `meters.ts` | Meter readings — financial source of truth (has `location` field for direct aggregation) |
| `MachineSession` | `machineSessions.ts` | Player gaming sessions |
| `MachineEvents` | `machineEvents.ts` | SAS/audit events emitted by machines |
| `Licencee` | `licencee.ts` | Tenant; financial `multiplier` for reviewer scale |
| `Countries` | `countries.ts` | Country reference data |
| `Member` | `members.ts` | Player/member profiles |

### Collections & reporting

| Model | File | Purpose |
| --- | --- | --- |
| `CollectionReport` | `collectionReport.ts` | Location collection reports; `isEditing` transactional flag |
| `Collections` | `collections.ts` | Per-machine collection entries (meters, movement, notes) |
| `ReportedMachines` | `reportedMachines.ts` | Collection Report V2 session capture (incl. `imageData`) |
| `MovementRequest` | `movementrequests.ts` | Cabinet movement/transfer requests |

### Vault / cash desk

| Model | File | Purpose |
| --- | --- | --- |
| `VaultShift` | `vaultShift.ts` | Vault shift lifecycle |
| `CashierShift` | `cashierShift.ts` | Cashier shift lifecycle |
| `Shifts` | `shifts.ts` | Shared shift records |
| `VaultTransaction` | `vaultTransaction.ts` | Atomic ledger of bill movements |
| `VaultCollectionSession` | `vault-collection-session.ts` | Vault-side collection sessions |
| `VaultNotification` | `vaultNotification.ts` | Float-request / discrepancy alerts |
| `FloatRequest` / `FloatRequests` | `floatRequest.ts` / `floatRequests.ts` | Float request records |
| `Payout` / `CashDeskPayouts` | `payout.ts` / `cashDeskPayouts.ts` | Payout records |
| `Denominations` | `denominations.ts` | Denomination breakdowns |
| `SoftCount` | `softCount.ts` | Soft-count records |
| `InterLocationTransfer` | `interLocationTransfer.ts` | Transfers between locations |
| `AcceptedBills` | `acceptedBills.ts` | Bill-validator accepted-bill records |

### Platform / system

| Model | File | Purpose |
| --- | --- | --- |
| `User` | `user.ts` | Users; `assignedLicencees`, `assignedLocations`, `sessionVersion` |
| `ActivityLog` | `activityLog.ts` | Audit log of significant operations |
| `Firmware` | `firmware.ts` | SMIB firmware binaries (GridFS) |
| `Scheduler` | `scheduler.ts` | Scheduled jobs |
| `Feedback` | `feedback.ts` | In-app user feedback |

---

## Adding a model

1. Create `app/api/lib/models/[name].ts` following the existing schema style.
2. Reuse the connection pattern — never open ad-hoc connections (`app/api/lib/middleware/db.ts`).
3. Define the DTO/entity type in `shared/types/` and use it as the lean generic.
4. Apply soft-delete (`deletedAt`) and licencee/location fields if the entity is tenant-scoped.
5. Add the model to the table above.
