# Evolution1 CMS Changelog

All notable changes to the project and its documentation are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Location.** This file currently lives in `Documentation/CHANGELOG.md`. Industry convention is to keep `CHANGELOG.md` at the repository root so consumers (and GitHub) surface it automatically. When we move it, update links accordingly.

## [Unreleased]

### Added

- **Mobile Collection Modal State Management (November 28, 2025)**
  - Dual-state architecture documentation (local state + Zustand store)
  - Context file `.cursor/mobile-collection-modal-context.md` with comprehensive debugging guide
  - Updated `Documentation/frontend/collection-report.md` with mobile state management section

- **Meters Tab Enhancements (Reports Page)**
  - Top Performing Machines interactive pie chart with navigation to location details
  - Machine names display with game information in brackets (e.g., "CustomName (SerialNumber, Game)")
  - Comprehensive skeleton loaders matching actual layout for all sections
  - Search functionality with improved matching (includes serial numbers in parentheses)
  - Meters Export Report with proper table alignment and pagination

- **Administration Page Improvements**
  - Current user automatically excluded from user list
  - Location admin restrictions: cannot edit/delete users with developer/admin/manager roles
  - Licensee name display instead of "All Licensees (1 licensees)" for single licensee users
  - Change detection: only sends changed fields to API (roles, username, email, assignedLicensees, assignedLocations, profile, profilePicture, password, isEnabled)

- **Date Filter Improvements**
  - Select component for date filters on mobile/tablet (below `lg:`)
  - Button group for date filters on desktop (`lg:` and above)
  - Machine status widget alignment with date filters on all pages
  - Date range indicator in separate row above filter controls

- **Location Cards UI Improvements**
  - Removed redundant machines and online container (purple/green buttons)
  - Removed green/red circle online/offline indicator (status shown via X/Y indicator)

### Changed

- **JWT Token Structure**
  - Removed `assignedLocations` and `assignedLicensees` from JWT token payload to prevent cookie size issues
  - Full user data stored in localStorage via `userPayload`
  - Middleware only verifies token validity; location/licensee filtering happens in API routes

- **Documentation Updates**
  - Comprehensive documentation review and update (November 27, 2025)
  - Updated all references from `resourcePermissions` to `assignedLocations`
  - Updated all user-related `rel.licencee` references to `assignedLicensees`
  - Added skeleton loader requirements to engineering guidelines
  - Updated API documentation to reflect current JWT token structure

### Fixed

- **Mobile Collection Modal Issues (November 28, 2025)**
  - Fixed race condition on modal open where collections were cleared after auto-selecting location
  - Fixed buttons not enabling despite collections being loaded (button logic simplified to check `modalState.collectedMachines.length`)
  - Fixed delete operation not calling API (only removed from local state)
  - Fixed "Cannot update component while rendering" error when updating Zustand store inside `setModalState`
  - Added `useRef` to prevent refetch when auto-selecting location
  - Added loading guards in sync effects to prevent race conditions

- **Desktop Collection Delete 400 Error (November 28, 2025)**
  - Fixed 400 error when deleting incomplete collections (no `locationReportId`)
  - Machine collection history update now only called for completed collections

- **Feedback Management System**
  - Complete feedback management interface in Administration page
  - Status workflow: pending → reviewed → resolved
  - Archive/unarchive functionality independent of status
  - Mobile-responsive card view and desktop table view
  - Category and status filtering with archived items support
  - Email-based search functionality
  - Review tracking with automatic reviewer information capture
  - Global floating feedback button on all pages
  - Auto-fill user information for logged-in users
  - PATCH endpoint using MongoDB native driver for reliable field updates
  - Delete and restore confirmation dialogs with proper HTML structure

- **Per-Location Machine Status Badges**
  - Added inline machine status badges next to location names in both desktop table and mobile card views
  - Displays "X/Y Online" format with color-coded indicators:
    - Green: All machines online
    - Yellow: Some machines online (partial)
    - Red: All machines offline
    - Gray: No machines
  - Implemented in `components/ui/locations/LocationTable.tsx` and `components/ui/locations/LocationCard.tsx`
  - Provides quick visual identification of location machine status at a glance

### Fixed

- **Feedback Archive Persistence**
  - Fixed archived field not persisting correctly by implementing PATCH endpoint with MongoDB native driver
  - Resolved hydration errors in AlertDialog components (invalid HTML nesting)
  - Fixed mobile responsiveness issues in feedback management modals

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
