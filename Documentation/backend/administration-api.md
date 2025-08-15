# Administration & Users API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The Administration & Users API provides comprehensive user management, system administration, and access control functionality for the gaming system. It handles user creation, role management, permissions, and administrative operations.

## Base URLs
```
/api/users
/api/admin
/api/activity-logs
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
  "emailAddress": "newuser@example.com",
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
    "emailAddress": "newuser@example.com",
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
  "emailAddress": "updated@example.com",
  "roles": ["admin", "user"],
  "profile": {
    "firstName": "Updated",
    "lastName": "Name",
    "phone": "+1234567890",
    "department": "Management"
  },
  "isEnabled": true,
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
    "emailAddress": "updated@example.com",
    "roles": ["admin", "user"],
    "profile": {
      "firstName": "Updated",
      "lastName": "Name",
      "phone": "+1234567890",
      "department": "Management"
    },
    "isEnabled": true,
    "resourcePermissions": {
      "locations": ["read", "write"],
      "machines": ["read", "write"],
      "reports": ["read", "write", "export"]
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

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
  "success": true
}
```

**Used By:**
- User management interface
- Administrative cleanup

---

### GET /api/users/[id]
Retrieves detailed information for a specific user.

**Path Parameters:**
- `id` (string): User ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "johndoe",
      "emailAddress": "john@example.com",
      "roles": ["admin"],
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890",
        "department": "IT"
      },
      "isEnabled": true,
      "resourcePermissions": {
        "locations": ["read", "write"],
        "machines": ["read", "write"],
        "reports": ["read", "write", "export"]
      },
      "lastLogin": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Used By:**
- User profile pages
- Administrative user details

## Activity Logs API

### GET /api/activity-logs
Retrieves system activity logs with filtering and pagination.

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 50): Number of logs per page
- `userId` (string, optional): Filter by user ID
- `action` (string, optional): Filter by action type
- `resource` (string, optional): Filter by resource type
- `startDate` (string, optional): Start date for filtering
- `endDate` (string, optional): End date for filtering

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "log_id",
        "userId": "user_id",
        "username": "johndoe",
        "action": "login",
        "resource": "auth",
        "details": "User logged in successfully",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "metadata": {
          "location": "Main Office",
          "sessionId": "session_123"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalLogs": 250,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Used By:**
- `/administration` page - Activity monitoring
- Security auditing
- Compliance reporting

## Admin API

### POST /api/admin/create-indexes
Creates database indexes for optimal performance.

**Request Body:** None required

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Database indexes created successfully",
  "indexes": [
    {
      "collection": "users",
      "index": "emailAddress_1",
      "status": "created"
    },
    {
      "collection": "machinesessions",
      "index": "startTime_1",
      "status": "created"
    }
  ]
}
```

**Used By:**
- System initialization
- Performance optimization
- Database maintenance

## Database Models

### User Model
```typescript
interface User {
  _id: string;
  username: string;
  emailAddress: string;
  password: string; // Hashed
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
    avatar?: string;
  };
  isEnabled: boolean;
  profilePicture?: string;
  resourcePermissions: {
    [resource: string]: string[];
  };
  lastLogin?: Date;
  failedLoginAttempts: number;
  accountLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Activity Log Model
```typescript
interface ActivityLog {
  _id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata: Record<string, any>;
}
```

## Features

### User Management
- **Role-Based Access Control**: Multiple roles with different permissions
- **Resource Permissions**: Granular permissions per resource type
- **Profile Management**: User profile information and avatars
- **Account Status**: Enable/disable user accounts
- **Password Security**: Secure password hashing and validation

### Activity Monitoring
- **Comprehensive Logging**: All user actions are logged
- **Security Auditing**: Track login attempts, IP addresses, user agents
- **Compliance Support**: Detailed audit trails for regulatory compliance
- **Real-time Monitoring**: Live activity monitoring capabilities

### Administrative Functions
- **Database Optimization**: Index creation and maintenance
- **System Health**: Performance monitoring and optimization
- **Security Management**: User lockout and security policies
- **Backup and Recovery**: System backup and restoration capabilities

## Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Role-Based Access**: Hierarchical role system
- **Resource Permissions**: Fine-grained permission control
- **Session Management**: Secure session handling

### Audit & Compliance
- **Activity Logging**: Complete audit trail
- **IP Tracking**: Source IP address logging
- **User Agent Logging**: Browser/client information
- **Metadata Storage**: Additional context for each action

### Data Protection
- **Password Hashing**: Secure password storage
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Cross-site scripting prevention

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Invalid input) |
| 401 | Unauthorized (Authentication required) |
| 403 | Forbidden (Insufficient permissions) |
| 404 | Not Found (User not found) |
| 409 | Conflict (Username/email already exists) |
| 500 | Internal Server Error |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT token validation
- **Password Hashing**: bcrypt
- **Validation**: Custom validation utilities
- **Middleware**: Database connection middleware

## Related Frontend Pages

- **Administration** (`/administration`): Main administrative interface
- **User Management**: User creation, editing, and management
- **Activity Monitoring**: System activity and audit logs
- **Security Settings**: Access control and security configuration

## Performance Considerations

### Data Optimization
- **Indexed Queries**: Proper database indexing for fast queries
- **Pagination**: Efficient pagination for large datasets
- **Selective Loading**: Load only required user data
- **Caching Strategy**: Cache frequently accessed user data

### Security Optimization
- **Rate Limiting**: Prevent brute force attacks
- **Session Management**: Efficient session handling
- **Audit Trail**: Optimized logging without performance impact
- **Permission Caching**: Cache user permissions for faster access
