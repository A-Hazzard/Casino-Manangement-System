# Administration & Users API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Administration & Users API provides comprehensive user management, system administration, and access control functionality for the gaming system. It handles user creation, role management, permissions, and administrative operations with comprehensive logging for audit trails and security monitoring.

## Base URLs
```
/api/users
/api/admin
/api/activity-logs
```

## API Logging

All endpoints in this API include comprehensive logging using the `APILogger` utility (`app/api/lib/utils/logger.ts`). Each request is logged with:

- **Timestamp**: ISO format timestamp
- **Duration**: Request processing time in milliseconds
- **Method & Endpoint**: HTTP method and endpoint path
- **User Context**: User identification when available
- **IP Address**: Client IP address for security tracking
- **User Agent**: Browser/client information
- **Request Parameters**: Query parameters and relevant request data
- **Response Status**: Success/failure status with details

**Log Format Example:**
```
[2024-01-15T10:30:45.123Z] [INFO] (245ms) GET /api/users: Users fetched successfully User: admin123 IP: 192.168.1.100 Params: {"licensee":"all"} Data: {"count":15}
```

## Users API

### GET /api/users
Retrieves all system users with optional filtering.

**Query Parameters:**
- `licensee` (string, optional): Filter users by licensee (currently returns all users)

**Response (Success - 200):**
```json
{
  "users": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "enabled": true,
      "roles": ["admin", "user"],
      "profilePicture": "https://example.com/avatar.jpg",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890",
        "department": "IT"
      },
      "resourcePermissions": {
        "locations": ["read", "write"],
        "machines": ["read"],
        "reports": ["read", "write", "export"]
      }
    }
  ]
}
```

**Logging:** Comprehensive logging with user count and filtering context

**Used By:**
- `/administration` page - User management interface
- User listing components
- Access control systems

---

### POST /api/users
Creates a new system user.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword123",
  "roles": ["user"],
  "profile": {
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1234567890",
    "department": "Operations"
  },
  "isEnabled": true,
  "profilePicture": null,
  "resourcePermissions": {
    "locations": ["read"],
    "machines": ["read"],
    "reports": ["read"]
  }
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "user": {
    "_id": "new_user_id",
    "username": "newuser",
    "email": "newuser@example.com",
    "roles": ["user"],
    "profile": {
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "+1234567890",
      "department": "Operations"
    },
    "isEnabled": true,
    "resourcePermissions": {
      "locations": ["read"],
      "machines": ["read"],
      "reports": ["read"]
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Username is required"
}
```

**Response (Error - 409):**
```json
{
  "success": false,
  "message": "Username or email already exists"
}
```

**Logging:** Success/failure logging with user creation details and validation errors

**Used By:**
- User creation forms
- Administrative interfaces

---

### PUT /api/users
Updates an existing system user.

**Request Body:**
```json
{
  "_id": "user_id",
  "username": "updateduser",
  "email": "updated@example.com",
  "roles": ["admin", "user"],
  "profile": {
    "firstName": "Updated",
    "lastName": "Name",
    "phone": "+1234567890",
    "department": "Management"
  },
  "isEnabled": true,
  "profilePicture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "resourcePermissions": {
    "locations": ["read", "write"],
    "machines": ["read", "write"],
    "reports": ["read", "write", "export"]
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "username": "updateduser",
    "email": "updated@example.com",
    "roles": ["admin", "user"],
    "profile": {
      "firstName": "Updated",
      "lastName": "Name",
      "phone": "+1234567890",
      "department": "Management"
    },
    "isEnabled": true,
    "profilePicture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "resourcePermissions": {
      "locations": ["read", "write"],
      "machines": ["read", "write"],
      "reports": ["read", "write", "export"]
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Logging:** Change tracking with before/after values and update context

**Used By:**
- User editing forms
- Profile management

---

### DELETE /api/users
Deletes a system user.

**Request Body:**
```json
{
  "_id": "user_id"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

**Logging:** Deletion confirmation with user context and security tracking

**Used By:**
- User deletion forms
- Administrative interfaces

---

## Licensees API

### GET /api/licensees
Retrieves all licensees with optional filtering.

**Query Parameters:**
- `licensee` (string, optional): Filter by specific licensee ID or name

**Response (Success - 200):**
```json
{
  "licensees": [
    {
      "_id": "licensee_id",
      "name": "Casino Royale",
      "country": "United States",
      "licenseKey": "CR-2024-001",
      "isPaid": true,
      "expiryDate": "2024-12-31T23:59:59.000Z",
      "startDate": "2024-01-01T00:00:00.000Z",
      "contactEmail": "contact@casinoroyale.com",
      "contactPhone": "+1234567890"
    }
  ]
}
```

**Logging:** Access logging with filtering context and licensee count

**Used By:**
- Licensee management interfaces
- Payment tracking systems

---

### POST /api/licensees
Creates a new licensee.

**Request Body:**
```json
{
  "name": "New Casino",
  "country": "Canada",
  "contactEmail": "info@newcasino.com",
  "contactPhone": "+1234567890",
  "startDate": "2024-01-01T00:00:00.000Z",
  "expiryDate": "2024-12-31T23:59:59.000Z"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "licensee": {
    "_id": "new_licensee_id",
    "name": "New Casino",
    "country": "Canada",
    "licenseKey": "NC-2024-001",
    "isPaid": false,
    "expiryDate": "2024-12-31T23:59:59.000Z",
    "startDate": "2024-01-01T00:00:00.000Z",
    "contactEmail": "info@newcasino.com",
    "contactPhone": "+1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Logging:** Creation logging with licensee details and license key generation

**Used By:**
- Licensee creation forms
- Administrative interfaces

---

### PUT /api/licensees
Updates an existing licensee.

**Request Body:**
```json
{
  "_id": "licensee_id",
  "name": "Updated Casino",
  "isPaid": true,
  "expiryDate": "2025-12-31T23:59:59.000Z"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "licensee": {
    "_id": "licensee_id",
    "name": "Updated Casino",
    "isPaid": true,
    "expiryDate": "2025-12-31T23:59:59.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Logging:** Update logging with change tracking and payment status updates

**Used By:**
- Licensee editing forms
- Payment management interfaces

---

### DELETE /api/licensees
Deletes a licensee.

**Request Body:**
```json
{
  "_id": "licensee_id"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Licensee deleted successfully"
}
```

**Logging:** Deletion logging with licensee context and security tracking

**Used By:**
- Licensee deletion forms
- Administrative interfaces

---

## Activity Logs API

### GET /api/activity-logs
Retrieves system activity logs with filtering and pagination.

**Query Parameters:**
- `entityType` (string, optional): Filter by entity type (user, licensee, etc.)
- `actionType` (string, optional): Filter by action type (create, update, delete)
- `actor` (string, optional): Filter by actor ID
- `startDate` (string, optional): Start date for filtering (ISO format)
- `endDate` (string, optional): End date for filtering (ISO format)
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Number of records per page

**Response (Success - 200):**
```json
{
  "activityLogs": [
    {
      "_id": "log_id",
      "actor": {
        "id": "user_id",
        "name": "John Doe",
        "username": "johndoe"
      },
      "actionType": "update",
      "entityType": "user",
      "entity": {
        "id": "target_user_id",
        "name": "Jane Smith"
      },
      "changes": {
        "before": {
          "roles": ["user"],
          "isEnabled": true
        },
        "after": {
          "roles": ["admin", "user"],
          "isEnabled": true
        }
      },
      "timestamp": "2024-01-01T10:30:45.123Z",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Logging:** Access logging for audit trail queries with filtering context

**Used By:**
- Activity log interfaces
- Audit trail systems
- Security monitoring

---

### POST /api/activity-logs
Creates a new activity log entry.

**Request Body:**
```json
{
  "actor": {
    "id": "user_id",
    "name": "John Doe",
    "username": "johndoe"
  },
  "actionType": "create",
  "entityType": "user",
  "entity": {
    "id": "new_user_id",
    "name": "Jane Smith"
  },
  "changes": {
    "before": null,
    "after": {
      "username": "janesmith",
      "email": "jane@example.com",
      "roles": ["user"]
    }
  },
  "timestamp": "2024-01-01T10:30:45.123Z"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "activityLog": {
    "_id": "new_log_id",
    "actor": {
      "id": "user_id",
      "name": "John Doe",
      "username": "johndoe"
    },
    "actionType": "create",
    "entityType": "user",
    "entity": {
      "id": "new_user_id",
      "name": "Jane Smith"
    },
    "changes": {
      "before": null,
      "after": {
        "username": "janesmith",
        "email": "jane@example.com",
        "roles": ["user"]
      }
    },
    "timestamp": "2024-01-01T10:30:45.123Z",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-01T10:30:45.123Z"
  }
}
```

**Logging:** Creation logging for audit trail entries with security context

**Used By:**
- System-wide activity tracking
- Audit trail generation
- Security monitoring systems

---

## Data Models

### User Model
```typescript
interface User {
  _id: string;
  username: string;
  email: string;
  password: string; // Hashed
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
    licensee?: string;
  };
  isEnabled: boolean;
  profilePicture?: string; // Base64 or URL
  resourcePermissions: {
    locations: string[];
    machines: string[];
    reports: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Licensee Model
```typescript
interface Licensee {
  _id: string;
  name: string;
  country: string;
  licenseKey: string;
  isPaid: boolean;
  expiryDate: Date;
  startDate: Date;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Activity Log Model
```typescript
interface ActivityLog {
  _id: string;
  actor: {
    id: string;
    name: string;
    username: string;
  };
  actionType: 'create' | 'update' | 'delete' | 'login' | 'logout';
  entityType: 'user' | 'licensee' | 'location' | 'machine';
  entity: {
    id: string;
    name: string;
  };
  changes: {
    before: any;
    after: any;
  };
  timestamp: Date;
  ip: string;
  userAgent: string;
  createdAt: Date;
}
```

## Security Features

- **Authentication**: JWT-based authentication for all endpoints
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive validation for all request data
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Activity Logging**: Complete audit trail for all operations
- **API Logging**: Structured logging for security monitoring and performance tracking

## Error Handling

All endpoints return consistent error responses:

**Standard Error Format:**
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (development only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

## Performance Considerations

- **Database Indexing**: Optimized indexes for common queries
- **Pagination**: Efficient pagination for large datasets
- **Caching**: Response caching for frequently accessed data
- **Logging Performance**: Non-blocking logging operations
- **Image Processing**: Optimized profile picture handling

## Compliance and Audit

- **Regulatory Compliance**: Meets gaming industry audit requirements
- **Data Retention**: Configurable log retention policies
- **Audit Trail**: Complete audit trail for all operations
- **Security Monitoring**: Real-time security event tracking
- **Performance Monitoring**: System performance and usage analytics
