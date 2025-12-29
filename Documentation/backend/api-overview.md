# API Overview

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** December 29, 2025
**Version:** 2.2.0

## Quick Search Guide (Ctrl+F)

- **authentication** - Auth endpoints and JWT handling
- **collections** - Collection report and machine entry APIs
- **locations** - Location management APIs
- **machines** - Machine management APIs
- **reports** - Reporting and analytics APIs
- **members** - Member management APIs
- **sessions** - User session management
- **administration** - Admin functions and system config
- **meters** - Meter data and analytics APIs
- **operations** - Operational APIs (movements, schedules)

## Overview

The Evolution One Casino Management System provides comprehensive REST APIs for managing casino operations, financial tracking, and reporting.

## Authentication

### POST `/api/auth/login`

**Purpose**: User authentication with JWT token generation

**Request:**

```json
{
  "identifier": "user@example.com",
  "password": "password123",
  "rememberMe": false
}
```

**Note**: `identifier` accepts either email address or username. The backend checks both fields if the identifier looks like an email.

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "emailAddress": "user@example.com",
      "username": "username",
      "roles": ["collector"],
      "profile": {
        "firstName": "User",
        "lastName": "Name"
      }
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresAt": "2025-11-24T12:00:00Z",
    "requiresPasswordUpdate": false,
    "requiresProfileUpdate": false
  }
}
```

### POST `/api/auth/logout`

**Purpose**: User logout and token invalidation

### GET `/api/auth/verify`

**Purpose**: Verify JWT token validity

## Collections

### Collection Reports

- `GET /api/collectionReport` - List collection reports
- `POST /api/collectionReport` - Create collection report
- `PUT /api/collectionReport/[id]` - Update collection report
- `DELETE /api/collectionReport/[id]` - Delete collection report
- `GET /api/collectionReport/monthly` - Monthly summaries

### Machine Collections

- `GET /api/collections` - List machine collections
- `POST /api/collections` - Create machine collection
- `PATCH /api/collections/[id]` - Update machine collection
- `DELETE /api/collections/[id]` - Delete machine collection

### Collection Details

- `GET /api/collection-report/[id]` - Detailed collection report

## Locations

### Location Management

- `GET /api/locations` - List all locations
- `GET /api/locations/[id]` - Get location details
- `POST /api/locations` - Create new location
- `PUT /api/locations/[id]` - Update location
- `DELETE /api/locations/[id]` - Delete location

### Location Machines

- `GET /api/locations/[id]/machines` - Get machines at location
- `POST /api/locations/[id]/machines` - Add machine to location
- `DELETE /api/locations/[id]/machines/[machineId]` - Remove machine

## Machines

### Machine Management

- `GET /api/machines` - List all machines
- `GET /api/machines/[id]` - Get machine details
- `POST /api/machines` - Create new machine
- `PUT /api/machines/[id]` - Update machine
- `DELETE /api/machines/[id]` - Delete machine

### Machine Metrics

- `GET /api/machines/[id]/metrics` - Get machine performance metrics
- `GET /api/machines/[id]/collection-history` - Get collection history

## Reports

### Dashboard Metrics

- `GET /api/dashboard/totals` - Dashboard financial metrics (money in/out/gross)
- `GET /api/metrics/hourly-trends` - Hourly performance trends
- `GET /api/metrics/top-machines` - Top performing machines
- `GET /api/metrics/top-performers` - Top performing entities

### Meter Reports

- `GET /api/metrics/meters` - Meter reading reports and analytics

### Financial Reports

- `GET /api/reports/daily-counts` - Daily count reports
- `GET /api/reports/locations` - Location-based reports
- `GET /api/reports/machines` - Machine performance reports
- `GET /api/reports/meters` - Meter reading reports

## Members

### Member Management

- `GET /api/members` - List all members
- `GET /api/members/[id]` - Get member details
- `POST /api/members` - Create new member
- `PUT /api/members/[id]` - Update member
- `DELETE /api/members/[id]` - Delete member

### Member Activities

- `GET /api/members/[id]/sessions` - Member session history

## Sessions

### Session Management

- `GET /api/sessions` - List active sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/[id]` - Update session
- `DELETE /api/sessions/[id]` - End session

### Session Events

- `GET /api/sessions/[sessionId]/[machineId]/events` - Session event details

## Administration

### System Administration

- `GET /api/admin/create-indexes` - Create database indexes

### User Management

- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Delete user

### System Monitoring

- `GET /api/admin/health` - System health check
- `GET /api/admin/logs` - System logs
- `GET /api/admin/stats` - System statistics

## Operations

### Movement Requests

- `GET /api/operations/movements` - List movement requests
- `POST /api/operations/movements` - Create movement request
- `PUT /api/operations/movements/[id]` - Update movement request
- `DELETE /api/operations/movements/[id]` - Cancel movement request

### Scheduling

- `GET /api/operations/schedules` - List schedules
- `POST /api/operations/schedules` - Create schedule
- `PUT /api/operations/schedules/[id]` - Update schedule
- `DELETE /api/operations/schedules/[id]` - Delete schedule

## Meters

### Meter Data

- `GET /api/meters` - List meter readings
- `POST /api/meters` - Create meter reading
- `GET /api/meters/sync` - Sync meter data

### Meter Analytics

- `GET /api/meters/analytics` - Meter analytics
- `GET /api/meters/trends` - Meter trends and patterns

## Data Models

### Common Fields

All API responses include:

- `_id` - Unique identifier
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp
- `deletedAt` - Soft delete timestamp (optional)

### Pagination

List endpoints support pagination:

```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10
  }
}
```

### Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...},
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Authentication & Security

### JWT Authentication

- All endpoints require valid JWT token
- Tokens expire after configured time
- Refresh tokens available for long-term sessions

### Role-Based Access

- `developer` - Full system access across all licensees
- `admin` - Full system access across all licensees
- `manager` - Access to ALL locations within assigned licensees
- `collector` - Access to specifically assigned locations only
- `location admin` - Access to specifically assigned locations only
- `technician` - Access to specifically assigned locations (Cabinets only)

### Rate Limiting

- API calls limited per user/IP
- Configurable rate limits per endpoint
- Automatic blocking for abuse

## Performance

### Response Times

- Standard queries: < 200ms
- Complex aggregations: < 1000ms
- Large datasets: Paginated responses

### Caching

- Frequently accessed data cached
- Cache invalidation on updates
- Redis-based caching layer

### Database Optimization

- Proper indexing on all collections
- Query optimization for complex operations
- Connection pooling for efficiency

# API Overview Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Introduction

This document provides a comprehensive overview of all API routes in the Evolution One CMS system. The APIs are organized by functionality and provide RESTful endpoints for managing gaming operations, user administration, analytics, and system configuration.

## API Architecture

### Base URL Structure

```
/api/{module}/{endpoint}
```

### Authentication

All API endpoints require JWT authentication via HTTP-only cookies, except for the login endpoint.

### Response Format

All APIs follow a consistent response format:

```json
{
  "success": true|false,
  "data": {...},
  "message": "Optional message",
  "error": "Error details if applicable"
}
```

## API Categories

### 1. Authentication & Security

**Base URL:** `/api/auth`

| Endpoint           | Method | Description           | Used By             |
| ------------------ | ------ | --------------------- | ------------------- |
| `/login`           | POST   | User authentication   | Login page          |
| `/logout`          | POST   | User logout           | Header component    |
| `/current-user`    | GET    | Get current user data | Global auth context |
| `/forgot-password` | POST   | Password reset        | Login page          |
| `/clear-token`     | POST   | Manual token clearing | Admin panel         |

**Documentation:** [auth-api.md](auth-api.md)

### 2. User Management & Administration

**Base URLs:** `/api/users`, `/api/admin`, `/api/activity-logs`

| Endpoint                | Method | Description           | Used By             |
| ----------------------- | ------ | --------------------- | ------------------- |
| `/users`                | GET    | List all users        | Administration page |
| `/users`                | POST   | Create new user       | User creation forms |
| `/users`                | PUT    | Update user           | User editing forms  |
| `/users`                | DELETE | Delete user           | User management     |
| `/users/[id]`           | GET    | Get user details      | User profile pages  |
| `/activity-logs`        | GET    | System activity logs  | Activity monitoring |
| `/admin/create-indexes` | POST   | Database optimization | System maintenance  |

**Documentation:** [administration-api.md](administration-api.md)

### 3. Member Management

**Base URL:** `/api/members`

| Endpoint                                    | Method | Description                     | Used By             |
| ------------------------------------------- | ------ | ------------------------------- | ------------------- |
| `/members`                                  | GET    | List members with search/filter | Members page        |
| `/members`                                  | POST   | Create new member               | Member creation     |
| `/members/[id]`                             | GET    | Get member details              | Member details page |
| `/members/[id]/sessions`                    | GET    | Member session history          | Member sessions     |
| `/members/[id]/sessions/[machineId]/events` | GET    | Session events                  | Session details     |

**Documentation:** [members-api.md](members-api.md)

### 4. Session Management

**Base URL:** `/api/sessions`

| Endpoint                                   | Method | Description       | Used By             |
| ------------------------------------------ | ------ | ----------------- | ------------------- |
| `/sessions`                                | GET    | List all sessions | Sessions page       |
| `/sessions/[sessionId]/[machineId]/events` | GET    | Session events    | Session events page |

**Documentation:** [sessions-api.md](sessions-api.md)

### 5. Location & Machine Management

**Base URLs:** `/api/locations`, `/api/machines`

| Endpoint                | Method | Description             | Used By                |
| ----------------------- | ------ | ----------------------- | ---------------------- |
| `/locations`            | GET    | List gaming locations   | Locations page         |
| `/locations`            | POST   | Create new location     | Location creation      |
| `/locations`            | PUT    | Update location         | Location editing       |
| `/locations`            | DELETE | Delete location         | Location management    |
| `/machines`             | GET    | Get machine details     | Cabinet details page   |
| `/machines`             | POST   | Create new machine      | Machine registration   |
| `/machines`             | PUT    | Update machine          | Machine configuration  |
| `/machines`             | DELETE | Delete machine          | Machine management     |
| `/machines/[id]/events` | GET    | Machine events          | Machine monitoring     |
| `/machines/aggregation` | GET    | Aggregated machine data | Performance dashboards |

**Documentation:** [locations-machines-api.md](locations-machines-api.md)

### 6. Analytics & Reporting

**Base URL:** `/api/analytics`

| Endpoint                    | Method | Description             | Used By                |
| --------------------------- | ------ | ----------------------- | ---------------------- |
| `/analytics/dashboard`      | GET    | Dashboard metrics       | Dashboard page         |
| `/analytics/reports`        | POST   | Generate reports        | Reports page           |
| `/analytics/charts`         | GET    | Chart data              | Dashboard charts       |
| `/analytics/locations`      | GET    | Location analytics      | Location reports       |
| `/analytics/machines`       | GET    | Machine analytics       | Machine reports        |
| `/analytics/top-machines`   | GET    | Top performing machines | Performance dashboards |
| `/analytics/hourly-revenue` | GET    | Hourly revenue trends   | Revenue analysis       |
| `/analytics/trends`         | GET    | Various trend data      | Trend analysis         |

**Documentation:** [analytics-api.md](analytics-api.md)

### 7. Collection & Reporting

**Base URLs:** `/api/collection-report`, `/api/collectionReport`, `/api/collections`

| Endpoint                         | Method | Description              | Used By                 |
| -------------------------------- | ------ | ------------------------ | ----------------------- |
| `/collection-report`             | GET    | Collection reports       | Collection reports page |
| `/collection-report/[reportId]`  | GET    | Specific report details  | Report details          |
| `/collection-report/sync-meters` | POST   | Sync meter data          | Meter synchronization   |
| `/collectionReport`              | GET    | Collection report data   | Collection management   |
| `/collectionReport/locations`    | GET    | Location collection data | Location reports        |
| `/collections`                   | GET    | Collection management    | Collection page         |

### 8. System Configuration

**Base URLs:** `/api/firmwares`, `/api/licensees`, `/api/countries`, `/api/collectors`

| Endpoint                   | Method | Description            | Used By              |
| -------------------------- | ------ | ---------------------- | -------------------- |
| `/firmwares`               | GET    | List firmware versions | Firmware management  |
| `/firmwares/[id]`          | GET    | Firmware details       | Firmware details     |
| `/firmwares/[id]/download` | GET    | Download firmware      | Firmware updates     |
| `/firmwares/migrate`       | POST   | Firmware migration     | System updates       |
| `/licensees`               | GET    | List licensees         | Licensee management  |
| `/countries`               | GET    | List countries         | Country selection    |
| `/collectors`              | GET    | List collectors        | Collector management |

### 9. Movement & Logistics

**Base URLs:** `/api/movement-requests`, `/api/schedulers`

| Endpoint                  | Method | Description              | Used By             |
| ------------------------- | ------ | ------------------------ | ------------------- |
| `/movement-requests`      | GET    | List movement requests   | Movement management |
| `/movement-requests/[id]` | GET    | Movement request details | Request details     |
| `/schedulers`             | GET    | Scheduled tasks          | Task scheduling     |

### 10. Metrics & Performance

**Base URL:** `/api/metrics`

| Endpoint                  | Method | Description               | Used By                |
| ------------------------- | ------ | ------------------------- | ---------------------- |
| `/metrics/hourly-trends`  | GET    | Hourly performance trends | Performance monitoring |
| `/metrics/meters`         | GET    | Meter data                | Meter monitoring       |
| `/metrics/metricsByUser`  | GET    | User-specific metrics     | User analytics         |
| `/metrics/top-machines`   | GET    | Top machine performance   | Performance ranking    |
| `/metrics/top-performers` | GET    | Top performing entities   | Performance analysis   |

### 11. MQTT & Real-Time Communication

**Base URL:** `/api/mqtt`

| Endpoint                       | Method | Description                  | Used By                |
| ------------------------------ | ------ | ---------------------------- | ---------------------- |
| `/mqtt/config/subscribe`       | GET    | SSE stream for live updates  | Cabinet details page   |
| `/mqtt/config/request`         | POST   | Request SMIB configuration   | SMIB configuration UI  |
| `/mqtt/config/publish`         | POST   | Publish config to SMIB       | SMIB configuration UI  |
| `/mqtt/config`                 | GET    | Get formatted MQTT config    | Configuration display  |
| `/mqtt/test`                   | POST   | Test MQTT connectivity       | Development/debugging  |
| `/cabinets/[id]/smib-config`   | POST   | Update SMIB config & MQTT    | SMIB configuration UI  |
| `/cabinets/[id]/smib-config`   | GET    | Get current SMIB config      | Configuration display  |

**Documentation:** [mqtt-architecture.md](mqtt-architecture.md), [mqtt-implementation.md](mqtt-implementation.md), [mqtt-protocols.md](mqtt-protocols.md)

## Data Flow Patterns

### 1. Authentication Flow

```
Login → Token Generation → Cookie Storage → Protected Route Access
```

### 2. Data Retrieval Flow

```
Request → Authentication Check → Database Query → Data Processing → Response
```

### 3. Real-time Updates

```
WebSocket Connection → Event Monitoring → Real-time Data Push → UI Update
```

## Common Query Parameters

### Licensee Filtering

- `licensee` (string): Licensee ID to filter data (preferred spelling)
- `licencee` (string): Alternate spelling (backwards compatibility)
- **Behavior**:
  - Developer/Admin: Optional filter, defaults to all licensees
  - Manager: Must be one of user's assigned licensees
  - Collector/Location Admin/Technician: Ignored (auto-filtered to assigned locations)

### Pagination

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10-50)

### Filtering

- `search` (string): Text search across relevant fields
- `sortBy` (string): Field to sort by
- `sortOrder` (string): Sort direction (asc/desc)
- `dateRange` (string): Date range filter
- `licensee` (string): Filter by licensee

### Date Filtering

- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `timePeriod` (string): Predefined periods (today, week, month, year)

## Error Handling

### Standard Error Responses

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (Invalid input)
- `401`: Unauthorized (Authentication required)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `409`: Conflict (Resource already exists)
- `500`: Internal Server Error

## Security Considerations

### Authentication

- JWT tokens stored in HTTP-only cookies
- 48-hour token expiration
- Secure flag in production
- Automatic token refresh

### Authorization

- **Role-based access control (RBAC)**: 6 distinct roles with different permission levels
- **Licensee-based filtering**: Users assigned to specific licensees, data isolated by licensee
- **Location-level permissions**: Granular resource permissions for location-specific access
- **Session version management**: `sessionVersion` incremented on permission changes
- **Automatic session invalidation**: JWT validation checks session version on every request
- **Permission intersection logic**:
  - Managers: See all locations for assigned licensees
  - Non-managers: See intersection of (licensee locations ∩ assigned locations)

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## Performance Optimization

### Database Optimization

- Proper indexing on frequently queried fields
- Aggregation pipelines for complex queries
- Connection pooling
- Query optimization

### Caching Strategy

- Redis caching for frequently accessed data
- Browser caching for static resources
- API response caching
- Session caching

### Pagination & Limiting

- Efficient pagination for large datasets
- Rate limiting to prevent abuse
- Request size limits
- Response compression

## Monitoring & Logging

### Activity Logging

- All API requests are logged
- User actions tracked
- Performance metrics recorded
- Error logging with context

### Health Monitoring

- API endpoint health checks
- Database connection monitoring
- Response time tracking
- Error rate monitoring

## Development Guidelines

### API Design Principles

- RESTful design patterns
- Consistent naming conventions
- Proper HTTP method usage
- Standardized response formats

### Documentation Standards

- OpenAPI/Swagger specifications
- Comprehensive endpoint documentation
- Request/response examples
- Error code documentation

### Testing Requirements

- Unit tests for all endpoints
- Integration tests for data flows
- Performance testing
- Security testing

## Related Documentation

### Backend Documentation

- [Authentication API](auth-api.md)
- [Members API](members-api.md)
- [Sessions API](sessions-api.md)
- [Locations API](locations-api.md)
- [Machines API](machines-api.md)
- [Cabinets API](cabinets-api.md)
- [Analytics API](analytics-api.md)
- [Administration API](administration-api.md)
- [Collection Report](collection-report.md)
- [Collection Report Details](collection-report-details.md)
- [Operations API](operations-api.md)

### MQTT & Real-Time

- [MQTT Architecture](mqtt-architecture.md)
- [MQTT Implementation](mqtt-implementation.md)
- [MQTT Protocols](mqtt-protocols.md)

### System Documentation

- [Gaming Day Offset System](gaming-day-offset-system.md)
- [SAS GROSS Calculation](sas-gross-calculation-system.md)
- [Bill Validator System](bill-validator-calculation-system.md)

### Frontend Documentation

- [Frontend MQTT Integration](../frontend/mqtt-integration.md)
- [Frontend Documentation](../frontend/)

## Frontend Integration

### API Client Usage

- Centralized API client configuration
- Automatic error handling
- Request/response interceptors
- Loading state management

### State Management

- Zustand for global state
- React Query for server state
- Optimistic updates
- Cache invalidation

### Real-time Features

- **MQTT Integration**: Pub/sub messaging for SMIB devices
- **Server-Sent Events**: SSE for frontend live updates
- **Event-driven Updates**: Callback-based message routing
- **Live Data Synchronization**: Real-time configuration and status updates
- **Heartbeat Monitoring**: Connection health monitoring

**See:** [MQTT Architecture](mqtt-architecture.md) for implementation details

---

**Last Updated:** October 26th, 2025
