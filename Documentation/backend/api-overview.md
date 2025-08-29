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

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/login` | POST | User authentication | Login page |
| `/logout` | POST | User logout | Header component |
| `/token` | GET | Token validation | Global auth context |
| `/forgot-password` | POST | Password reset | Login page |
| `/clear-token` | POST | Manual token clearing | Admin panel |

**Documentation:** [auth-api.md](auth-api.md)

### 2. User Management & Administration
**Base URLs:** `/api/users`, `/api/admin`, `/api/activity-logs`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/users` | GET | List all users | Administration page |
| `/users` | POST | Create new user | User creation forms |
| `/users` | PUT | Update user | User editing forms |
| `/users` | DELETE | Delete user | User management |
| `/users/[id]` | GET | Get user details | User profile pages |
| `/activity-logs` | GET | System activity logs | Activity monitoring |
| `/admin/create-indexes` | POST | Database optimization | System maintenance |

**Documentation:** [administration-api.md](administration-api.md)

### 3. Member Management
**Base URL:** `/api/members`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/members` | GET | List members with search/filter | Members page |
| `/members` | POST | Create new member | Member creation |
| `/members/[id]` | GET | Get member details | Member details page |
| `/members/[id]/sessions` | GET | Member session history | Member sessions |
| `/members/[id]/sessions/[machineId]/events` | GET | Session events | Session details |

**Documentation:** [members-api.md](members-api.md)

### 4. Session Management
**Base URL:** `/api/sessions`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/sessions` | GET | List all sessions | Sessions page |
| `/sessions/[sessionId]/[machineId]/events` | GET | Session events | Session events page |

**Documentation:** [sessions-api.md](sessions-api.md)

### 5. Location & Machine Management
**Base URLs:** `/api/locations`, `/api/machines`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/locations` | GET | List gaming locations | Locations page |
| `/locations` | POST | Create new location | Location creation |
| `/locations` | PUT | Update location | Location editing |
| `/locations` | DELETE | Delete location | Location management |
| `/machines` | GET | Get machine details | Cabinet details page |
| `/machines` | POST | Create new machine | Machine registration |
| `/machines` | PUT | Update machine | Machine configuration |
| `/machines` | DELETE | Delete machine | Machine management |
| `/machines/[id]/events` | GET | Machine events | Machine monitoring |
| `/machines/aggregation` | GET | Aggregated machine data | Performance dashboards |

**Documentation:** [locations-machines-api.md](locations-machines-api.md)

### 6. Analytics & Reporting
**Base URL:** `/api/analytics`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/analytics/dashboard` | GET | Dashboard metrics | Dashboard page |
| `/analytics/reports` | POST | Generate reports | Reports page |
| `/analytics/charts` | GET | Chart data | Dashboard charts |
| `/analytics/locations` | GET | Location analytics | Location reports |
| `/analytics/machines` | GET | Machine analytics | Machine reports |
| `/analytics/top-machines` | GET | Top performing machines | Performance dashboards |
| `/analytics/hourly-revenue` | GET | Hourly revenue trends | Revenue analysis |
| `/analytics/trends` | GET | Various trend data | Trend analysis |

**Documentation:** [analytics-api.md](analytics-api.md)

### 7. Collection & Reporting
**Base URLs:** `/api/collection-report`, `/api/collectionReport`, `/api/collections`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/collection-report` | GET | Collection reports | Collection reports page |
| `/collection-report/[reportId]` | GET | Specific report details | Report details |
| `/collection-report/sync-meters` | POST | Sync meter data | Meter synchronization |
| `/collectionReport` | GET | Collection report data | Collection management |
| `/collectionReport/locations` | GET | Location collection data | Location reports |
| `/collections` | GET | Collection management | Collection page |

### 8. System Configuration
**Base URLs:** `/api/firmwares`, `/api/licensees`, `/api/countries`, `/api/collectors`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/firmwares` | GET | List firmware versions | Firmware management |
| `/firmwares/[id]` | GET | Firmware details | Firmware details |
| `/firmwares/[id]/download` | GET | Download firmware | Firmware updates |
| `/firmwares/migrate` | POST | Firmware migration | System updates |
| `/licensees` | GET | List licensees | Licensee management |
| `/countries` | GET | List countries | Country selection |
| `/collectors` | GET | List collectors | Collector management |

### 9. Movement & Logistics
**Base URLs:** `/api/movement-requests`, `/api/schedulers`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/movement-requests` | GET | List movement requests | Movement management |
| `/movement-requests/[id]` | GET | Movement request details | Request details |
| `/schedulers` | GET | Scheduled tasks | Task scheduling |

### 10. Metrics & Performance
**Base URL:** `/api/metrics`

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/metrics/hourly-trends` | GET | Hourly performance trends | Performance monitoring |
| `/metrics/meters` | GET | Meter data | Meter monitoring |
| `/metrics/metricsByUser` | GET | User-specific metrics | User analytics |
| `/metrics/top-machines` | GET | Top machine performance | Performance ranking |
| `/metrics/top-performers` | GET | Top performing entities | Performance analysis |

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
- Role-based access control (RBAC)
- Resource-level permissions
- Granular permission system
- Session management

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

- [Authentication API](auth-api.md)
- [Members API](members-api.md)
- [Sessions API](sessions-api.md)
- [Locations & Machines API](locations-machines-api.md)
- [Analytics API](analytics-api.md)
- [Administration API](administration-api.md)
- [Collections API](collections-api.md)
- [System Configuration API](system-config-api.md)
- [Operations API](operations-api.md)

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
- WebSocket connections
- Event-driven updates
- Live data synchronization
- Push notifications

---

**Last Updated:** August 29th, 2025
