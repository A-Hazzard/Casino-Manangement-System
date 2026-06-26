# Backend API Documentation

**Author:** Aaron Hazzard  
**Last Updated:** June 25, 2026

Catalog of API endpoint docs under `Documentation/backend/api/`. Each file documents a domain's routes, request/response shapes, and business logic.

| File | Description | Key Topics |
|------|-------------|------------|
| `administration-api.md` | User & licencee admin RBAC endpoints | Role hierarchy, `sessionVersion` invalidation, assignedLicencees/assignedLocations |
| `auth-api.md` | JWT auth, TOTP, session versioning | Login/logout/refresh, 2FA enrollment, cookie security, device tracking |
| `cabinets-api.md` | Machine fleet status, commands, aggregation | Real-time status, remote commands, filtering/aggregation, cabinet detail |
| `calculation-engine.md` | Movement delta, gaming day offset, reviewer scale formulas | Movement calculation types, RAM clear math, SAS gross, reviewer scaling, currency conversion |
| `collection-reports-v2-movement.md` | RAM clear, no-SMIB, offline SMIB movement patterns | Manual meter handshake, offline SMIB `sasMeters` update, movement delta edge cases |
| `collections-technical-deep-dive.md` | Full technical reference for collection report lifecycle | `isEditing` state machine, prevIn/prevOut sources, history sync, batch update patterns |
| `dashboard-api.md` | Financial pulse, chart data, top performers | Dashboard totals aggregation, chart time series, top/bottom locations, gaming day offset |
| `locations-api.md` | Property config, reviewer multiplier, coordinate conversion | Location CRUD, `gameDayOffset`, reviewer `multiplier` assignment, lat/lng coordinate handling |
| `members-api.md` | Win/loss summation, loyalty ratios, KYC | Member search/filtering, win/loss aggregation, loyalty calculation, KYC fields |
| `mqtt-system.md` | MQTT topic hierarchy, QoS, heartbeats, raw SAS | Topic structure (`sas/relay/#`, `sas/gy/server`), QoS levels, offline detection, heartbeat intervals |
| `reports-api.md` | Month-end audit, PDF/XLSX generation | Revenue report aggregation, location report generation, export formats, reconciliation data |
| `sessions-api.md` | Event mapping, session IDs, auto-logout | Machine session lifecycle, event mapping, session search, auto-logout detection |
| `smib-sync-api.md` | SMIB meter sync via MQTT | SMIB registration, meter read commands, response processing, sync validation |
| `sync-meters-api.md` | MQTT meter handshake, sync accuracy | Handshake protocol, sync fidelity checks, retry logic, meter data reconciliation |
| `system-config-api.md` | Firmware GridFS, localization, migrations | Firmware upload/OTA, locale management, schema migration tracking, system settings |
| `vault-api.md` | Double-entry ledger, blind close, 2FA gate | Float requests, expenses, blind close procedure, shift accounting, cashier reconciliation |

See also `Documentation/backend/api-flows/` for sequence diagrams and flow documents.
