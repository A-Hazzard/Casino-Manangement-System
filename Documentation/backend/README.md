# Backend API Documentation

## Table of Contents

- [Overview](#overview)
- [Documentation Structure](#documentation-structure)
- [API Categories](#api-categories)
- [Quick Start](#quick-start)
- [Security & Authentication](#security--authentication)
- [Common Patterns](#common-patterns)
- [Development Guidelines](#development-guidelines)

## Overview

This directory contains comprehensive documentation for all backend API routes in the Evolution One CMS system. The documentation has been restructured into logical categories for improved navigation and maintainability.

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** January 2025
**Version:** 2.6.0 - Documentation Structure Update

## Documentation Structure

### 📁 Directory Organization

```
Documentation/backend/
├── README.md                          # This overview file
├── GUIDELINES.md                      # Backend development guidelines
├── api-overview.md                    # API ecosystem overview
├──
├── core-apis/                         # Core business logic APIs
│   ├── auth-api.md                    # Authentication & authorization
│   ├── administration-api.md          # User & system administration
│   └── system-config-api.md           # System configuration
│
├── business-apis/                     # Business domain APIs
│   ├── locations-api.md               # Location management
│   ├── cabinets-api.md                # Machine/cabinet management
│   ├── machines-api.md                # Machine operations
│   ├── members-api.md                 # Member management
│   ├── collections-api.md             # Collection operations
│   ├── collection-report.md           # Collection reporting
│   ├── collection-report-details.md   # Report details implementation
│   └── sessions-api.md                # Gaming sessions
│
├── analytics-apis/                    # Analytics & reporting
│   ├── analytics-api.md               # General analytics
│   ├── reports-api.md                 # Report generation
│   ├── meters-report-api.md           # Meter-based reporting
│   └── operations-api.md              # Operational analytics
│
├── specialized-apis/                  # Specialized functionality
│   ├── sync-meters-api.md             # Meter synchronization
│   └── locations-machines-api.md      # Location-machine relationships
│
├── calculation-systems/               # Business logic systems
│   ├── bill-validator-system.md       # Bill validator calculations
│   └── sas-gross-system.md            # SAS gross calculations
│
├── real-time-systems/                 # Real-time communication
│   ├── mqtt-architecture.md           # MQTT system architecture
│   ├── mqtt-implementation.md         # MQTT implementation details
│   └── mqtt-protocols.md              # MQTT protocols & messaging
│
└── _archive/                          # Archived tracker files
    ├── API_LOGGING_REFACTOR_TRACKER.md
    └── DB_COLLECTION_REFACTOR_TRACKER.md
```

## API Categories

### 🔐 Core APIs - Foundation Services

Essential APIs that provide the foundation for the entire system:

- **[Authentication API](core-apis/auth-api.md)** - User login, token management, security
- **[Administration API](core-apis/administration-api.md)** - User management, roles, activity logs
- **[System Config API](core-apis/system-config-api.md)** - System settings, licensee configuration

### 🏢 Business APIs - Domain Operations

APIs that handle the core business logic and data management:

- **[Locations API](business-apis/locations-api.md)** - Gaming location management
- **[Machines API](business-apis/machines-api.md)** - Machine/cabinet operations
- **[Cabinets API](business-apis/cabinets-api.md)** - Cabinet details and SMIB configuration
- **[Members API](business-apis/members-api.md)** - Member profiles and analytics
- **[Collections API](business-apis/collections-api.md)** - Collection operations and management
- **[Collection Report](business-apis/collection-report.md)** - Collection reporting system
- **[Collection Details](business-apis/collection-report-details.md)** - Report implementation details
- **[Sessions API](business-apis/sessions-api.md)** - Gaming session management

### 📊 Analytics APIs - Reporting & Insights

APIs that provide data analysis, reporting, and business intelligence:

- **[Analytics API](analytics-apis/analytics-api.md)** - Dashboard metrics and KPIs
- **[Reports API](analytics-apis/reports-api.md)** - Custom report generation
- **[Meters Report API](analytics-apis/meters-report-api.md)** - Machine-level meter data
- **[Operations API](analytics-apis/operations-api.md)** - Operational analytics and metrics

### ⚙️ Specialized APIs - Advanced Features

APIs that handle specialized functionality and integrations:

- **[Sync Meters API](specialized-apis/sync-meters-api.md)** - Meter data synchronization
- **[Locations Machines API](specialized-apis/locations-machines-api.md)** - Location-machine relationships

### 🧮 Calculation Systems - Business Logic

Specialized systems that handle complex business calculations:

- **[Bill Validator System](calculation-systems/bill-validator-system.md)** - Bill processing calculations
- **[SAS Gross System](calculation-systems/sas-gross-system.md)** - SAS metrics calculations

### 📡 Real-Time Systems - Live Communication

Systems that handle real-time communication and live updates:

- **[MQTT Architecture](real-time-systems/mqtt-architecture.md)** - System architecture and design
- **[MQTT Implementation](real-time-systems/mqtt-implementation.md)** - Implementation details and API endpoints
- **[MQTT Protocols](real-time-systems/mqtt-protocols.md)** - Message protocols and specifications

## Quick Start

### Authentication

All API endpoints require JWT authentication via HTTP-only cookies:

```javascript
// Login example
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    identifier: 'email@example.com', // or username
    password: 'password123',
  }),
});
```

### Common Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Optional success message"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details",
  "code": "ERROR_CODE"
}
```

### Pagination

Most list endpoints support pagination:

```javascript
const response = await fetch('/api/locations?page=1&limit=20');
```

## Security & Authentication

### JWT Token Management

- **Storage:** HTTP-only cookies (prevents XSS attacks)
- **Expiration:** 48-hour token lifetime
- **Refresh:** Automatic token refresh for active sessions
- **Security:** Secure flag in production environments

### Role-Based Access Control

The system implements comprehensive RBAC:

- **Developer:** Full system access
- **Admin:** User and system administration
- **Manager:** Licensee-level access and reporting
- **Collector:** Collection operations and location access
- **Location Admin:** Specific location management
- **Technician:** Machine maintenance and configuration

### Data Protection

- **Input Validation:** Comprehensive request validation
- **SQL Injection Prevention:** Parameterized queries
- **XSS Protection:** Input sanitization and encoding
- **CSRF Protection:** Token-based request validation

## Common Patterns

### Query Parameters

#### Pagination

- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10-50)

#### Filtering

- `search` (string) - Text search across relevant fields
- `licensee` (string) - Filter by licensee ID
- `sortBy` (string) - Sort field name
- `sortOrder` (string) - Sort direction: 'asc' | 'desc'

#### Date Filtering

- `startDate` (string) - ISO 8601 date string
- `endDate` (string) - ISO 8601 date string
- `timePeriod` (string) - Predefined periods: 'today', 'yesterday', '7d', '30d', 'custom'

### Error Codes

| Status Code | Description           |
| ----------- | --------------------- |
| 200         | Success               |
| 201         | Created               |
| 400         | Bad Request           |
| 401         | Unauthorized          |
| 403         | Forbidden             |
| 404         | Not Found             |
| 409         | Conflict              |
| 422         | Unprocessable Entity  |
| 500         | Internal Server Error |

### Rate Limiting

- **Authenticated Requests:** 1000 requests per hour per user
- **Anonymous Requests:** 100 requests per hour per IP
- **Headers:** Rate limit status included in response headers

## Development Guidelines

### API Design Principles

1. **RESTful Design:** Follow REST conventions with proper HTTP methods
2. **Consistent Naming:** Use kebab-case for endpoints, camelCase for fields
3. **Versioning:** API versioning through URL paths when needed
4. **Idempotency:** POST operations should be idempotent where possible

### Documentation Standards

1. **Complete Coverage:** Every endpoint must be documented
2. **Request/Response Examples:** Include realistic examples
3. **Error Scenarios:** Document common error conditions
4. **TypeScript Interfaces:** Define data models with TypeScript
5. **Cross-References:** Link related APIs and frontend usage

### Performance Guidelines

1. **Database Optimization:**
   - Use proper indexes on frequently queried fields
   - Implement aggregation pipelines for complex queries
   - Avoid N+1 query patterns

2. **Caching Strategy:**
   - Redis caching for expensive operations
   - API response caching for static data
   - Browser caching for public resources

3. **Query Optimization:**
   - Use cursor-based pagination for large datasets
   - Implement proper field projection
   - Avoid deep population in list endpoints

### Testing Requirements

1. **Unit Tests:** All business logic functions
2. **Integration Tests:** API endpoint testing
3. **Load Tests:** Performance validation
4. **Security Tests:** Authentication and authorization

## API Endpoint Quick Reference

### Core Operations

- `POST /api/auth/login` - User authentication
- `GET /api/users` - List users (admin)
- `GET /api/locations` - List locations
- `GET /api/machines` - List machines

### Business Operations

- `GET /api/members` - Member management
- `GET /api/sessions` - Session tracking
- `GET /api/collections` - Collection operations
- `GET /api/collection-report` - Collection reports

### Analytics & Reporting

- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/reports/meters` - Meter reports
- `GET /api/analytics/charts` - Chart data

### Real-Time Features

- `GET /api/mqtt/config/subscribe` - SSE subscription
- `POST /api/mqtt/config/publish` - Message publishing
- `GET /api/cabinets/[id]/smib-config` - SMIB configuration

## Related Documentation

### Frontend Integration

- **[Frontend Documentation](../frontend/)** - Complete frontend page documentation
- **[Frontend MQTT](../frontend/mqtt-integration.md)** - Frontend real-time integration

### System Documentation

- **[Project Guide](../../PROJECT_GUIDE.md)** - Overall project documentation
- **[Database Models](../../database-models.md)** - Database schema reference
- **[Performance Guide](../../PERFORMANCE_OPTIMIZATION_GUIDE.md)** - Performance optimization

### Development Resources

- **[TypeScript Types](../typescript-type-safety-rules.md)** - TypeScript guidelines
- **[Engineering Rules](../.cursor/rules/nextjs-rules.mdc)** - Development standards (see `.cursor/rules/nextjs-rules.mdc`)

## Support & Maintenance

### Documentation Updates

- **API Changes:** Update documentation when endpoints change
- **New Features:** Add documentation for new functionality
- **Bug Fixes:** Update examples and error handling as needed
- **Reviews:** Regular documentation reviews for accuracy

### Getting Help

1. **Check Individual API Docs:** Detailed endpoint information
2. **Review API Overview:** High-level architecture understanding
3. **Check Frontend Integration:** How frontend consumes APIs
4. **Review Code Examples:** Working implementation examples

---

**Note:** This documentation is undergoing a comprehensive restructuring to improve organization and maintainability. Individual API documentation files will be updated to follow standardized formats with complete endpoint documentation, TypeScript interfaces, and usage examples.
