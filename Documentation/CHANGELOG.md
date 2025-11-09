# Evolution CMS - Documentation Changelog

All notable changes to the documentation will be documented in this file.

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

