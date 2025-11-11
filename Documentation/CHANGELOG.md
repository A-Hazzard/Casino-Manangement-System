# Evolution CMS - Documentation Changelog

All notable changes to the documentation will be documented in this file.

---

## [2.3.0] - November 11, 2025

### Added
- **Smart Advanced SAS Option** - Only shows for machines with zero existing collections
  - New API endpoint: `GET /api/collections/check-first-collection`
  - Prevents accidental custom SAS time settings on established machines
  - Documented in `frontend/collection-report.md`

- **Fix Report Summary JSON Files** - Automatic error report generation
  - Location: `scripts/fix-reports/fix-report-{reportId}-{timestamp}.json`
  - Includes all errors with machine details (machineId, machineCustomName, phase)
  - README guide in `scripts/fix-reports/README.md`

- **Performance Optimization Documentation**
  - Fix Report API: 200x faster for single reports
  - Dashboard API: 5x faster
  - Meters API: Fixed 7d and 30d timeouts
  - Documented in `backend/collection-report-details.md`

### Changed
- **Fix Report API Behavior** - Now only processes collections in requested report
  - **Before:** Processed all 41,217 collections (~11.5 hours)
  - **After:** Processes only report's collections (~2-5 seconds)
  - Uses parallel batch processing (50 collections per batch)
  - Queries database for previous collections instead of loading all into memory
  - Updated in `backend/collection-report-details.md`

- **Fix Report Logging** - Clean progress indicators only
  - **Removed:** 40+ verbose console statements
  - **Kept:** Progress percentage, issues fixed, errors count
  - **Added:** JSON summary report file generation
  - Clean output format documented

- **Collection Report Details UI** (November 11th, 2025)
  - **Removed:** "Sync Meters" button (desktop and mobile)
  - **Removed:** Floating refresh button on scroll
  - **Removed:** Sync Meters confirmation modal
  - Updated in `frontend/collection-report-details.md`

### Updated
- `Documentation/backend/collection-report-details.md`
  - Added performance optimization section
  - Added logging output examples
  - Added JSON summary report structure
  - Version updated to reflect November 11th changes

- `Documentation/frontend/collection-report.md`
  - Version: 2.4.0 → 2.5.0
  - Added Advanced SAS Option section
  - Documented smart visibility logic

- `Documentation/frontend/collection-report-details.md`
  - Version: 2.2.0 → 2.3.0
  - Documented Sync Meters button removal

### Performance Improvements
- Fix Report API: ~200x faster for single reports (50x overall)
- Dashboard API: 5x faster (parallel batch processing)
- Meters API: Fixed timeouts (optimized aggregation pipeline)

### Technical Improvements
- Parallel batch processing across multiple APIs
- Database query optimization (indexed queries vs in-memory filtering)
- Memory usage reduction (99% for fix-report API)
- Enhanced error tracking with machine identification

---

## [2.1.0] - November 9, 2025

### Added
- **[Licensee & Location Filtering System](./licensee-location-filtering.md)** - Comprehensive guide to multi-licensee access control
- **[Documentation Index](./DOCUMENTATION_INDEX.md)** - Central index for all documentation
- **[Licensee Filtering Documentation Update Summary](./LICENSEE_FILTERING_DOCUMENTATION_UPDATE.md)** - Summary of all updates
- Access control matrices in `pages-overview.md`
- Session management documentation across all relevant docs
- Licensee dropdown visibility rules
- Permission intersection logic documentation

### Changed
- **Frontend Documentation** (6 files updated):
  - `dashboard.md` - Added licensee filtering section, updated access control
  - `locations.md` - Added role-based filtering, updated security section
  - `machines.md` - Added licensee filtering for cabinets, updated security
  - `collection-report.md` - Updated user roles with licensee filtering
  - `administration.md` - Added licensee assignment workflow
  - `pages-overview.md` - Added comprehensive access control matrix

- **Backend Documentation** (1 file updated):
  - `api-overview.md` - Added licensee filtering parameters, updated roles, expanded authorization section

### Updated
- All frontend page docs now include:
  - Access level specifications (which roles can access)
  - Licensee filtering support status
  - Role-dependent filtering behavior
  - Session invalidation details

- All version numbers updated to reflect changes
- Last updated dates updated to November 9, 2025

### Fixed
- TypeScript linting errors in `app/api/machines/aggregation/route.ts`
- Parameter type definitions (licensee null handling)
- Documentation consistency across frontend/backend

---

## [2.0.0] - October 29, 2025

### Added
- Comprehensive frontend documentation for all pages
- Backend API documentation
- MQTT integration documentation
- Collection report system documentation

### Changed
- Major documentation restructure
- Standardized format across all docs
- Added version control

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

