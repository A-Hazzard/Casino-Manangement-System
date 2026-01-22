# Business APIs

This directory contains documentation for the core business domain APIs that handle the primary operations of the casino management system.

## APIs in This Directory

### 🏢 Location Management
**[locations-api.md](./locations-api.md)** - Gaming location CRUD operations and management

**Key Endpoints:**
- `GET /api/locations` - List locations with filtering
- `POST /api/locations` - Create new locations
- `GET /api/locations/[id]` - Get location details
- `PUT /api/locations/[id]` - Update location information
- `DELETE /api/locations/[id]` - Soft delete locations

### 🎰 Machine/Cabinet Operations
**[machines-api.md](./machines-api.md)** - Machine and cabinet management operations

**Key Endpoints:**
- `GET /api/machines` - List machines with filtering
- `POST /api/machines` - Create new machines
- `GET /api/machines/[id]` - Get machine details
- `PUT /api/machines/[id]` - Update machine configuration
- `GET /api/machines/aggregation` - Aggregated machine data

**[cabinets-api.md](./cabinets-api.md)** - Detailed cabinet management and SMIB configuration

**Key Endpoints:**
- `GET /api/cabinets/[id]` - Get detailed cabinet information
- `PUT /api/cabinets/[id]` - Update cabinet settings
- `GET /api/cabinets/[id]/smib-config` - SMIB configuration
- `PUT /api/cabinets/[id]/smib-config` - Update SMIB settings

### 👥 Member Management
**[members-api.md](./members-api.md)** - Member profiles, sessions, and analytics

**Key Endpoints:**
- `GET /api/members` - List members with win/loss calculations
- `POST /api/members` - Create new members
- `GET /api/members/[id]` - Get member details
- `PUT /api/members/[id]` - Update member information
- `GET /api/members/summary` - Member analytics summary

### 🎮 Session Management
**[sessions-api.md](./sessions-api.md)** - Gaming session tracking and management

**Key Endpoints:**
- `GET /api/sessions` - List gaming sessions
- `GET /api/sessions/[id]/[machineId]/events` - Session events
- `POST /api/sessions` - Create session records
- `GET /api/session-analytics` - Session analytics

### 💰 Collection Operations
**[collections-api.md](./collections-api.md)** - Collection management and financial operations

**Key Endpoints:**
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection records
- `GET /api/collections/[id]` - Get collection details
- `PUT /api/collections/[id]` - Update collection data

**[collection-report.md](./collection-report.md)** - Collection reporting system

**Key Endpoints:**
- `GET /api/collection-report` - Collection reports overview
- `POST /api/collection-report` - Generate reports
- `GET /api/collection-report/[id]` - Specific report details

**[collection-report-details.md](./collection-report-details.md)** - Detailed collection report implementation

**Key Endpoints:**
- `GET /api/collection-report/[id]/details` - Report implementation details
- `PUT /api/collection-report/[id]/repair` - Report repair operations

### 💵 Vault Management
**[vault-api.md](./vault-api.md)** - Vault operations and cash management

**Key Endpoints:**
- `GET /api/vault/cash-monitoring` - Total cash on premises
- `GET /api/vault/cash-monitoring/denominations` - Denomination breakdown
- `GET /api/vault/end-of-day` - End of day report generation
- `POST /api/vault/end-of-day` - Export end of day report
- `GET /api/vault/float-requests/[id]` - Float request details
- `PUT /api/vault/float-requests/[id]` - Update float request
- `GET /api/vault/payouts/[id]` - Payout details
- `PUT /api/vault/payouts/[id]` - Update payout
- `GET /api/vault/shifts/[id]` - Shift details

## Business Logic Features

### Location-Based Operations
- Geographic location management
- Licensee association and filtering
- Address and contact information
- Operational status tracking

### Machine Management
- Cabinet configuration and settings
- SMIB (Slot Machine Interface Board) integration
- Real-time status monitoring
- Performance metrics tracking

### Member Services
- Player profile management
- Gaming history and statistics
- Win/loss calculations
- Member analytics and reporting

### Financial Operations
- Collection tracking and validation
- Financial reporting and reconciliation
- Revenue analysis and metrics
- Compliance and audit trails

### Vault Management
- Cash monitoring and denomination tracking
- Float request management (increase/decrease)
- Payout processing and tracking
- Shift management for cashiers
- End of day reporting and reconciliation

## Common Patterns

### Filtering and Search
Most list endpoints support:
- Text search across relevant fields
- Date range filtering
- Licensee-based filtering
- Pagination with configurable limits

### Data Relationships
- Locations contain machines/cabinets
- Machines generate sessions and collections
- Members participate in sessions
- Collections are associated with locations and machines
- Vault operations are associated with locations and cashiers
- Float requests and payouts are linked to shifts

### Real-Time Updates
- Machine status changes
- Session activity monitoring
- Collection progress tracking
- Financial metric updates
- Vault cash balance updates
- Float request status changes

## Related Documentation

- **[Core APIs](../core-apis/)** - Authentication and administration
- **[Analytics APIs](../analytics-apis/)** - Reporting and metrics
- **[Frontend Business Pages](../../frontend/)** - Frontend integration examples
- **[Database Models](../../../database-models.md)** - Data schema reference