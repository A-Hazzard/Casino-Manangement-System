# Evolution1 CMS Changelog

All notable changes to the project and its documentation are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Location.** This file currently lives in `Documentation/CHANGELOG.md`. Industry convention is to keep `CHANGELOG.md` at the repository root so consumers (and GitHub) surface it automatically. When we move it, update links accordingly.

## [Unreleased]

- Placeholder for upcoming work.

## [1.0.0] - 2025-11-15

### Added

- **Automatic Edit Resume Flow**
  - `/collection-report/report/[reportId]` now redirects to `/collection-report?resume=<reportId>` whenever it detects `isEditing: true`, guaranteeing unfinished reports reopen in the edit modal.
  - The main collection page consumes the `resume` param, shows a recovery toast, removes the param via `router.replace`, and opens the correct modal (desktop or mobile) automatically.

### Changed

- **Fix Report API Access**
  - `/api/collection-reports/fix-report` no longer enforces admin/developer roles; any authenticated session can trigger silent repairs while UI continues to hide buttons for non-dev roles.
- **Documentation Refresh**
  - `.cursor/isediting-system.md`, `Documentation/frontend/collection-report.md`, `Documentation/frontend/collection-report-details.md`, `Documentation/user-safety-safeguards.md`, and `Documentation/backend/collection-report.md` now describe the auto-resume workflow, Fix Report permissions, and recovery behavior.

### Fixed

- Clarified changelog ownership, format, and expectations to prevent divergent ad-hoc notes.

### Feature Summary (Docs @Documentation, frontend/, .cursor/, backups/)

- **Authentication & Login** (`frontend/login.md`, `.cursor/application-context.md`): ProtectedRoute gating, compliance profile checks, and redirect safeguards.
- **Dashboard** (`frontend/dashboard.md`, `currency-conversion-system.md`, `gaming-day-offset-system.md`): Multi-licensee filters, currency switching, gaming-day offsets, and role-aware widgets.
- **Locations & Location Details** (`frontend/locations.md`, `location-details.md`, `licensee-location-filtering.md`): Cascading licensee/location assignments, collection balances, and warning states for invalid combinations.
- **Machines & Machine Details** (`frontend/machines.md`, `machine-details.md`, `meter-data-structure.md`, `ram-clear-validation.md`): SMIB telemetry, collection-meters history, RAM-clear workflows, and cabinet configuration management.
- **Collection Reports** (`frontend/collection-report.md`, `frontend/collection-report-details.md`, `.cursor/isediting-system.md`, `backend/collection-report*.md`): Multi-tab reporting, auto-resume (`isEditing` guard), SAS/movement validation, Fix Report tooling, and financial calculations.
- **Members & Sessions** (`frontend/members.md`, `frontend/sessions.md`, `Role Based Permissions.md`): Member lifecycle flows, role matrices, and session auditing across devices.
- **Administration** (`frontend/administration.md`, `auditing-and-logging.md`, `ENGINEERING_GUIDELINES.md`): Profile validation, DOB compliance, licensee/location assignments, and activity logging.
- **MQTT & Real-time Integrations** (`frontend/mqtt-integration.md`, `mqttFRD.md`): SMIB OTA updates, live metrics streaming, and FRD-driven configuration requirements.
- **Financial/Domain Guides** (`financial-metrics-guide.md`, `currency-conversion-system.md`, `variation-troubleshooting.md`, `timezone.md`): Drop/cancelled definitions, currency conversion, variation troubleshooting, and timezone alignment.
- **Safety & Compliance** (`user-safety-safeguards.md`, `known-issues-and-solutions.md`, `.cursor/security-compliance-guidelines.md`): Guardrails against partial edits, history corruption, and compliance breaches, plus troubleshooting playbooks.
- **Backups & Recovery** (`backups/sas-times-backup-*`): SAS-time snapshot directories referenced by admin repair tooling.

---

## Documentation Maintenance

### Review Schedule

- **Quarterly**: February, May, August, November
- **Scope**: Accuracy verification, example updates, new feature additions

### Update Process

1. Make code changes
2. Update relevant documentation
3. Update version numbers
4. Update last updated dates
5. Add entry to CHANGELOG.md
6. Update DOCUMENTATION_INDEX.md if new files added

### Contributors

- Aaron Hazzard - Engineering Team Lead
- AI Assistant - Documentation Updates

---

**Changelog Maintained Since:** November 9, 2025
