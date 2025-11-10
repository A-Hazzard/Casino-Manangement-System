# Evolution CMS - Documentation Index

**Last Updated:** November 10, 2025  
**Version:** 2.2.0

---

## 📚 Documentation Structure

### 🎯 Core System Documentation

#### Access Control & Security

- **[Licensee & Location Filtering System](./licensee-location-filtering.md)** ⭐ **NEW**
  - Comprehensive guide to multi-licensee access control
  - Role-based filtering logic
  - Implementation patterns for frontend and backend
  - Testing procedures and troubleshooting

- **[Role Based Permissions](./Role%20Based%20Permissions.md)**
  - Original role system documentation
  - Permission definitions
  - Authorization patterns

#### Database & Models

- **[Database Models](./database-models.md)** ⭐ **UPDATED**
  - MongoDB schema definitions
  - User, Location, Machine, Licensee models
  - Meter structure requirements
  - Relationships and constraints

- **[Meter Data Structure](./meter-data-structure.md)** ⭐ **NEW**
  - Required meter fields for aggregation APIs
  - movement and readAt field requirements
  - Correct meter creation patterns
  - Troubleshooting $0 financial metrics

#### Financial Systems

- **[Financial Metrics Guide](./financial-metrics-guide.md)**
  - Money In, Money Out, Gross calculations
  - Metric definitions and formulas
  - Data aggregation patterns

- **[Currency Conversion System](./currency-conversion-system.md)** ⭐ **UPDATED**
  - Role-based currency conversion rules
  - Multi-currency support (USD, TTD, GYD, BBD)
  - Exchange rate management
  - Admin/Developer vs Manager conversion logic

- **[SAS Gross Calculation System](./backend/sas-gross-calculation-system.md)**
  - SAS metrics calculation
  - Gross revenue logic
  - Financial reporting

#### Technical Guides

- **[Timezone Handling](./timezone.md)**
  - Gaming day offset logic
  - UTC vs local time
  - Date range calculations

- **[TypeScript Type Safety Rules](./typescript-type-safety-rules.md)**
  - Type safety guidelines
  - Common patterns
  - Best practices

- **[Engineering Guidelines](./ENGINEERING_GUIDELINES.md)**
  - Code standards
  - Development practices
  - Architecture patterns

---

### 🖥️ Frontend Documentation

#### Core Pages

- **[Pages Overview](./frontend/pages-overview.md)** ⭐ **UPDATED**
  - Complete page structure
  - Role-based access control matrix
  - Licensee filtering by role
  - Navigation structure

- **[Dashboard](./frontend/dashboard.md)** ⭐ **UPDATED**
  - Real-time metrics and analytics
  - Licensee filtering implementation
  - Role-based access control
  - Top performing, charts, map integration

- **[Locations](./frontend/locations.md)** ⭐ **UPDATED**
  - Location management
  - Licensee filtering
  - CRUD operations
  - Performance metrics

- **[Cabinets (Machines)](./frontend/machines.md)** ⭐ **UPDATED**
  - Cabinet management
  - SMIB configuration
  - Licensee and location filtering
  - Movement requests

- **[Collection Reports](./frontend/collection-report.md)** ⭐ **UPDATED**
  - Collection report system
  - Role-based edit restrictions
  - Licensee filtering
  - Financial data entry

- **[Administration](./frontend/administration.md)** ⭐ **UPDATED**
  - User management
  - Licensee assignment workflow
  - Session tracking
  - Permission management

#### Detail Pages

- **[Location Details](./frontend/location-details.md)**
  - Location-specific analytics
  - Cabinet breakdowns
  - Performance metrics

- **[Cabinet Details](./frontend/machine-details.md)**
  - Individual cabinet configuration
  - SMIB management
  - Firmware updates

- **[Collection Report Details](./frontend/collection-report-details.md)**
  - Individual report analysis
  - Machine metrics comparison
  - SAS metrics validation

#### Other Pages

- **[Login](./frontend/login.md)** - Authentication page
- **[Sessions](./frontend/sessions.md)** - Session monitoring
- **[Members](./frontend/members.md)** - Player management
- **[Reports FRD](./frontend/Reports%20FRD.md)** - Reporting module
- **[Redirect Pages](./frontend/redirect-pages.md)** - URL redirects

#### MQTT Integration

- **[MQTT Integration](./frontend/mqtt-integration.md)**
  - Real-time communication
  - SMIB updates
  - Event handling

---

### 🔧 Backend Documentation

#### API Documentation

- **[API Overview](./backend/api-overview.md)** ⭐ **UPDATED**
  - All API endpoints
  - Licensee filtering parameters
  - Authorization rules
  - Common patterns

- **[Auth API](./backend/auth-api.md)** - Authentication endpoints
- **[Administration API](./backend/administration-api.md)** - User/licensee management
- **[Locations API](./backend/locations-api.md)** - Location endpoints
- **[Machines API](./backend/machines-api.md)** - Machine endpoints
- **[Cabinets API](./backend/cabinets-api.md)** - Cabinet endpoints
- **[Collection Report API](./backend/collection-report.md)** - Collection report endpoints
- **[Collections API](./backend/collections-api.md)** ⭐ **NEW** - Individual collection CRUD, security filtering
- **[Sessions API](./backend/sessions-api.md)** - Session endpoints
- **[Members API](./backend/members-api.md)** - Member endpoints
- **[Reports API](./backend/reports-api.md)** - Reporting endpoints
- **[Analytics API](./backend/analytics-api.md)** - Analytics endpoints

#### System Architecture

- **[MQTT Architecture](./backend/mqtt-architecture.md)**
  - Message broker architecture
  - Communication patterns

- **[MQTT Implementation](./backend/mqtt-implementation.md)**
  - Implementation details
  - Event handling

- **[MQTT Protocols](./backend/mqtt-protocols.md)**
  - Protocol specifications
  - Message formats

---

### 🔍 Troubleshooting & Guides

- **[Variation Troubleshooting](./variation-troubleshooting.md)** - Issue resolution
- **[RAM Clear Validation](./ram-clear-validation.md)** - RAM clear process
- **[Responsive Design Issues](./responsive-design-issues.md)** - UI fixes
- **[Color Coding](./color-coding.md)** - UI color standards
- **[Auditing and Logging](./auditing-and-logging.md)** - Activity logging

---

## 🆕 Recent Updates (November 9, 2025)

### Licensee Filtering System Implementation

**New Features:**

- Multi-licensee support for users
- Granular location permissions
- Role-based data filtering
- Session invalidation on permission changes
- Auto-logout on permission updates
- Complete data isolation between licensees

**Documentation Created:**

1. `licensee-location-filtering.md` - Comprehensive system guide
2. `LICENSEE_FILTERING_DOCUMENTATION_UPDATE.md` - Update summary

**Documentation Updated:**

1. Frontend: dashboard.md, locations.md, machines.md, collection-report.md, administration.md, pages-overview.md
2. Backend: api-overview.md

**Key Additions:**

- Access control matrices showing page access by role
- Licensee filtering behavior tables
- Session management documentation
- Permission intersection logic
- API parameter documentation
- Testing procedures and test users

---

## 📖 How to Use This Documentation

### For New Developers

1. Start with **[Pages Overview](./frontend/pages-overview.md)** for system structure
2. Read **[Licensee Filtering System](./licensee-location-filtering.md)** for access control
3. Review **[Role Based Permissions](./Role%20Based%20Permissions.md)** for authorization
4. Explore individual page docs for specific features

### For Frontend Developers

1. Check **Frontend Documentation** section for page-specific guides
2. Reference **[Pages Overview](./frontend/pages-overview.md)** for navigation
3. Use **[Licensee Filtering](./licensee-location-filtering.md)** for implementing access control
4. Follow **[Engineering Guidelines](./ENGINEERING_GUIDELINES.md)** for code standards

### For Backend Developers

1. Start with **[API Overview](./backend/api-overview.md)** for endpoint reference
2. Read **[Licensee Filtering System](./licensee-location-filtering.md)** for filtering logic
3. Check specific API docs for endpoint details
4. Reference **[Database Models](./database-models.md)** for schema

### For QA/Testing

1. Use test users from **[Licensee Filtering System](./licensee-location-filtering.md)**
2. Follow testing checklist in same document
3. Verify access control using **[Pages Overview](./frontend/pages-overview.md)** matrix
4. Check troubleshooting guides for known issues

### For System Administrators

1. Read **[Licensee Filtering System](./licensee-location-filtering.md)** for user management
2. Use **[Administration](./frontend/administration.md)** for UI operations
3. Reference **[Role Based Permissions](./Role%20Based%20Permissions.md)** for role assignment
4. Check **[Auditing and Logging](./auditing-and-logging.md)** for compliance

---

## 🔍 Quick Reference

### Access Control

- **Full System Access**: Developer, Admin (no restrictions)
- **Licensee-Level Access**: Manager (all locations for assigned licensees)
- **Location-Level Access**: Collector, Location Admin, Technician (specific locations only)

### Licensee Dropdown

- **Always Shown**: Developer, Admin
- **Conditionally Shown**: Manager (2+ licensees), Collector (2+ licensees)
- **Never Shown**: Location Admin, Technician (single location scope)

### Session Management

- **Field**: `user.sessionVersion` (incremented on permission changes)
- **JWT Validation**: Checks sessionVersion on every API call
- **Auto-Logout**: 401 Unauthorized → Axios interceptor → Redirect to /login

### Common Queries

```bash
# Find licensee filtering implementation
grep -r "getUserLocationFilter" app/api

# Find all API endpoints with licensee parameter
grep -r "searchParams.get('licensee')" app/api

# Find frontend licensee dropdown usage
grep -r "LicenceeSelect" app components
```

---

## 📋 Documentation Standards

### File Naming

- Frontend: `kebab-case.md` (e.g., `collection-report.md`)
- Backend: `kebab-case-api.md` (e.g., `locations-api.md`)
- Guides: `Title Case.md` (e.g., `Role Based Permissions.md`)

### Version Control

- Update version number on significant changes
- Update last updated date on any modification
- Document version in header

### Content Structure

- Table of contents for files >100 lines
- Code examples with syntax highlighting
- Clear section headers with hierarchy
- Related documentation links at bottom

---

**Index Maintained By:** Engineering Team  
**Last Updated:** November 9, 2025  
**Next Review:** February 2026
