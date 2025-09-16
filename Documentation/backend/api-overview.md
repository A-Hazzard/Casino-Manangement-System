# API Overview

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025

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
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "collector"
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
- `GET /api/metrics/dashboard` - Dashboard financial metrics
- `GET /api/metrics/locations` - Location performance metrics
- `GET /api/metrics/machines` - Machine performance metrics

### Meter Reports
- `GET /api/meters/report` - Meter reading reports
- `GET /api/meters/analytics` - Meter analytics and trends

### Financial Reports
- `GET /api/reports/financial` - Financial performance reports
- `GET /api/reports/collection` - Collection reports
- `GET /api/reports/operational` - Operational reports

## Members

### Member Management
- `GET /api/members` - List all members
- `GET /api/members/[id]` - Get member details
- `POST /api/members` - Create new member
- `PUT /api/members/[id]` - Update member
- `DELETE /api/members/[id]` - Delete member

### Member Activities
- `GET /api/members/[id]/activities` - Member activity history
- `GET /api/members/[id]/sessions` - Member session history

## Sessions

### Session Management
- `GET /api/sessions` - List active sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/[id]` - Update session
- `DELETE /api/sessions/[id]` - End session

### Session Analytics
- `GET /api/sessions/analytics` - Session analytics
- `GET /api/sessions/active` - Currently active sessions

## Administration

### System Configuration
- `GET /api/admin/config` - Get system configuration
- `PUT /api/admin/config` - Update system configuration

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
- `admin` - Full system access
- `manager` - Location and collection management
- `collector` - Collection operations only
- `viewer` - Read-only access

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