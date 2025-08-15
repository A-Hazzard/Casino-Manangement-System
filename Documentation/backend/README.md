# Backend API Documentation

## Overview
This directory contains comprehensive documentation for all backend API routes in the Evolution One CMS system. The documentation is organized by functionality and provides detailed information about endpoints, request/response formats, and usage patterns.

## Documentation Structure

### Core API Documentation
- **[API Overview](api-overview.md)** - Comprehensive overview of all API routes
- **[Authentication API](auth-api.md)** - User authentication and security endpoints
- **[Members API](members-api.md)** - Member management and session tracking
- **[Sessions API](sessions-api.md)** - Gaming session management and analytics
- **[Locations & Machines API](locations-machines-api.md)** - Location and machine management
- **[Analytics API](analytics-api.md)** - Data analytics and reporting endpoints
- **[Administration API](administration-api.md)** - User management and system administration
- **[Collections API](collections-api.md)** - Collection reports and meter data management
- **[System Configuration API](system-config-api.md)** - System configuration and settings
- **[Operations API](operations-api.md)** - Operations management and metrics tracking

### API Categories

#### 1. Authentication & Security
- User login/logout
- Token management
- Password reset
- Security features

#### 2. User Management & Administration
- User CRUD operations
- Role-based access control
- Activity logging
- System administration

#### 3. Member Management
- Member profiles
- Session history
- Gaming statistics
- Member analytics

#### 4. Session Management
- Gaming sessions
- Session events
- Performance tracking
- Real-time monitoring

#### 5. Location & Machine Management
- Gaming locations
- Machine configuration
- Performance metrics
- Geographic data

#### 6. Analytics & Reporting
- Dashboard metrics
- Trend analysis
- Performance reports
- Data visualization

#### 7. Collections & Financial
- Collection reports
- Meter data synchronization
- Financial reporting
- Collector management

#### 8. System Configuration
- Country and regional settings
- Firmware management
- Licensee information
- Gaming location configuration

#### 9. Operations & Metrics
- Real-time metrics tracking
- Performance monitoring
- Scheduled operations
- Machine movement management

## Quick Start

### Authentication
All API endpoints require JWT authentication via HTTP-only cookies:

```javascript
// Login example
const response = await axios.post('/api/auth/login', {
  emailAddress: 'user@example.com',
  password: 'password123'
}, {
  withCredentials: true
});
```

### Common Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Handling
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/token` - Token validation

### Members
- `GET /api/members` - List members
- `POST /api/members` - Create member
- `GET /api/members/[id]` - Get member details
- `GET /api/members/[id]/sessions` - Member sessions

### Sessions
- `GET /api/sessions` - List sessions
- `GET /api/sessions/[sessionId]/[machineId]/events` - Session events

### Locations & Machines
- `GET /api/locations` - List locations
- `POST /api/locations` - Create location
- `GET /api/machines` - Get machine details
- `POST /api/machines` - Create machine

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `POST /api/analytics/reports` - Generate reports
- `GET /api/analytics/charts` - Chart data

### Administration
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/activity-logs` - Activity logs

## Common Query Parameters

### Pagination
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10-50)

### Filtering
- `search` (string) - Text search
- `sortBy` (string) - Sort field
- `sortOrder` (string) - Sort direction (asc/desc)
- `licensee` (string) - Filter by licensee

### Date Filtering
- `startDate` (string) - Start date (ISO format)
- `endDate` (string) - End date (ISO format)
- `timePeriod` (string) - Predefined periods

## Security Features

### Authentication
- JWT tokens in HTTP-only cookies
- 48-hour token expiration
- Secure flag in production
- Automatic token refresh

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Granular permission system

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## Performance Considerations

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

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

## Development Guidelines

### API Design Principles
- RESTful design patterns
- Consistent naming conventions
- Proper HTTP method usage
- Standardized response formats

### Documentation Standards
- Comprehensive endpoint documentation
- Request/response examples
- Error code documentation
- Usage patterns and examples

## Related Documentation

- [Frontend Documentation](../frontend/) - Frontend page documentation
- [Database Models](../frontend/database-relationships.md) - Database schema documentation
- [Type Safety Rules](../frontend/typescript-type-safety-rules.md) - TypeScript guidelines

## Support

For questions about the API documentation or implementation details, please refer to:
- Individual API documentation files for specific endpoints
- [API Overview](api-overview.md) for general architecture
- Frontend documentation for integration examples
