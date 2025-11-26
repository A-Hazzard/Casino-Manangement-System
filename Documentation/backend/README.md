# Backend API Documentation

## Table of Contents

- [Overview](#overview)
- [Documentation Structure](#documentation-structure)
- [Core API Documentation](#core-api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Performance Guidelines](#performance-guidelines)
- [Security Standards](#security-standards)
- [Testing Requirements](#testing-requirements)
- [Deployment Guidelines](#deployment-guidelines)

## Overview

This directory contains comprehensive documentation for all backend API routes in the Evolution One CMS system. The documentation is organized by functionality and provides detailed information about endpoints, request/response formats, and usage patterns.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 13th, 2025  
**Version:** 2.2.1

## Documentation Structure

### Core API Documentation

- **[API Overview](api-overview.md)** - Comprehensive overview of all API routes
- **[Reports API](reports-api.md)** - Backend reporting and aggregation endpoints
- **[Meters Report API](meters-report-api.md)** - Machine-level meter readings and performance data
- **[Analytics API](analytics-api.md)** - Dashboard analytics and metrics endpoints
- **[Collections API](collection-report.md)** - Collection reports and financial data management
- **[Collection Report Details](collection-report-details.md)** - Detailed collection report implementation
- **[Members API](members-api.md)** - Member management and session tracking
- **[Sessions API](sessions-api.md)** - Gaming session management and analytics
- **[Locations API](locations-api.md)** - Gaming location management
- **[Machines API](machines-api.md)** - Machine/cabinet management
- **[Cabinets API](cabinets-api.md)** - Cabinet details and SMIB configuration
- **[Authentication API](auth-api.md)** - User authentication and security endpoints
- **[Administration API](administration-api.md)** - User management and system administration
- **[Operations API](operations-api.md)** - Operations management and metrics tracking

### MQTT & Real-Time Communication

- **[MQTT Architecture](mqtt-architecture.md)** - MQTT system architecture and design patterns
- **[MQTT Implementation](mqtt-implementation.md)** - Detailed MQTT implementation with API endpoints
- **[MQTT Protocols](mqtt-protocols.md)** - Protocol specifications and message formats

### System Documentation

- **[Gaming Day Offset System](gaming-day-offset-system.md)** - Gaming day calculation and filtering
- **[SAS GROSS Calculation](sas-gross-calculation-system.md)** - SAS metrics calculation
- **[Bill Validator System](bill-validator-calculation-system.md)** - Bill validator data processing

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

- Dashboard metrics and KPIs
- Location aggregation and performance analysis
- Machine-level meter readings and calculations
- Trend analysis and data visualization
- Comprehensive financial calculations with mathematical formulas

#### 7. Collections & Financial

- Collection reports with SAS vs meters comparison
- Meter data synchronization and validation
- Financial reporting with variance analysis
- Revenue sharing calculations
- Collector management and tracking

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
const response = await axios.post(
  '/api/auth/login',
  {
    emailAddress: 'user@example.com',
    password: 'password123',
  },
  {
    withCredentials: true,
  }
);
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

### Reports & Analytics

- `GET /api/locationAggregation` - Location aggregation with financial metrics
- `GET /api/reports/meters` - Machine-level meter readings
- `GET /api/reports/machines` - Machine evaluation and performance reports
- `GET /api/analytics/dashboard` - Dashboard metrics and KPIs
- `POST /api/analytics/reports` - Generate custom reports
- `GET /api/analytics/charts` - Chart data for visualizations

### Members & Sessions

- `GET /api/members` - List members with win/loss calculations
- `GET /api/members/summary` - Member summary with financial data
- `POST /api/members` - Create member
- `GET /api/members/[id]` - Get member details
- `GET /api/members/[id]/sessions` - Member session history
- `GET /api/sessions` - List gaming sessions
- `GET /api/sessions/[sessionId]/[machineId]/events` - Session events

### Locations & Machines

- `GET /api/locations` - List gaming locations
- `POST /api/locations` - Create location
- `GET /api/machines` - Get machine details with meter data
- `POST /api/machines` - Create machine
- `GET /api/machines/aggregation` - Aggregated machine data

### Collections & Financial

- `GET /api/collection-report` - Collection reports
- `GET /api/collection-report/[reportId]` - Specific report details
- `POST /api/admin/repair-sas-times` - Maintenance utility that recalculates SAS windows directly against the database; configured as a forced-dynamic Node.js route (no static caching).
- `GET /api/collectionReport` - Collection report data
- `GET /api/collections` - Collection management

### Administration & System

- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/activity-logs` - Activity logs
- `GET /api/licensees` - List licensees
- `GET /api/collectors` - List collectors

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

| Status Code | Description           |
| ----------- | --------------------- |
| 200         | Success               |
| 201         | Created               |
| 400         | Bad Request           |
| 401         | Unauthorized          |
| 403         | Forbidden             |
| 404         | Not Found             |
| 409         | Conflict              |
| 500         | Internal Server Error |

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

## MQTT Integration Overview

The system includes comprehensive MQTT integration for real-time SMIB device communication:

- **Publish-Subscribe Model**: Uses MQTT pub/sub for device communication
- **Server-Sent Events**: SSE for frontend live updates
- **Callback Routing**: Message routing by relayId for targeted delivery
- **Multi-Client Support**: Multiple clients can subscribe to same device
- **Configuration Management**: Live SMIB configuration updates
- **Machine Control**: Remote machine control commands (RESTART, LOCK, UNLOCK)

**Key Files:**
- `app/api/lib/services/mqttService.ts` - Singleton MQTT service
- `app/api/mqtt/config/subscribe/route.ts` - SSE endpoint
- `app/api/mqtt/config/request/route.ts` - Config request endpoint
- `app/api/mqtt/config/publish/route.ts` - Config publish endpoint
- `app/api/cabinets/[cabinetId]/smib-config/route.ts` - SMIB config update

## Related Documentation

- [Frontend Documentation](../frontend/) - Frontend page documentation
- [Frontend MQTT Integration](../frontend/mqtt-integration.md) - Frontend SSE and MQTT usage
- [Type Safety Rules](../typescript-type-safety-rules.md) - TypeScript guidelines
- [Engineering Guidelines](../ENGINEERING_GUIDELINES.md) - Development standards

## Support

For questions about the API documentation or implementation details, please refer to:

- Individual API documentation files for specific endpoints
- [API Overview](api-overview.md) for general architecture
- Frontend documentation for integration examples
- [MQTT Architecture](mqtt-architecture.md) for real-time communication
