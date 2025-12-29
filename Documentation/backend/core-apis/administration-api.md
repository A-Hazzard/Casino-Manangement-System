# Administration API

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [GET /api/users](#get-apiusers)
  - [POST /api/users](#post-apiusers)
  - [GET /api/users/[id]](#get-apiusersid)
  - [PUT /api/users/[id]](#put-apiusersid)
  - [DELETE /api/users/[id]](#delete-apiusersid)
  - [GET /api/activity-logs](#get-apiactivity-logs)
  - [GET /api/licensees](#get-apilicensees)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Migration Notes](#migration-notes)

## Overview

The Administration API provides comprehensive user management, licensee administration, and activity logging capabilities for the Evolution One CMS system. It handles user CRUD operations, role assignments, permission management, and maintains audit trails for all administrative actions.

**Key Features:**
- User account management (create, read, update, delete)
- Role-based access control and permissions
- Licensee management and assignments
- Activity logging and audit trails
- Profile validation and data integrity
- Session management and invalidation

## Base URL

```
https://api.example.com/v1/admin
```

All endpoints are prefixed with `/api` and require administrative privileges.

## Authentication

### Required Permissions
- **Admin Role:** Full access to all administration endpoints
- **Manager Role:** Limited access to user management within assigned licensees
- **Developer Role:** Full access for system development and testing

### Token Requirements
- Valid JWT token required for all endpoints
- Token must include admin-level permissions
- Session validation on each request

## Rate Limiting

### Administrative Operations
- **User Management:** 100 operations per hour per admin
- **Bulk Operations:** 10 bulk operations per hour per admin
- **Activity Logs:** 500 requests per hour per admin

### Headers
Rate limit information provided in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Endpoints

### GET /api/users

**Purpose:** Retrieve paginated list of users with filtering and search capabilities

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 10, max: 100)
- `search` (string, optional) - Search term for name, email, or username
- `role` (string, optional) - Filter by user role
- `licensee` (string, optional) - Filter by licensee
- `isEnabled` (boolean, optional) - Filter by account status
- `sortBy` (string, optional) - Sort field (default: 'createdAt')
- `sortOrder` (string, optional) - Sort order: 'asc' | 'desc' (default: 'desc')

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user_id",
      "username": "johndoe",
      "emailAddress": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["admin"],
      "isEnabled": true,
      "lastLoginAt": "2024-12-28T10:30:00Z",
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

**Used By:** User management interfaces, admin dashboards
**Notes:** Supports advanced filtering and search across user fields

---

### POST /api/users

**Purpose:** Create a new user account with profile information and role assignments

**Request Body:**
```json
{
  "username": "johndoe",
  "emailAddress": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "lastName": "Doe",
  "roles": ["collector"],
  "assignedLicensees": ["licensee_id"],
  "assignedLocations": ["location_id"],
  "isEnabled": true
}
```

**Required Fields:**
- `username` - Unique username
- `emailAddress` - Valid email address
- `password` - Strong password meeting requirements
- `firstName` - User's first name
- `lastName` - User's last name
- `roles` - Array of role strings

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "_id": "new_user_id",
    "username": "johndoe",
    "emailAddress": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["collector"],
    "isEnabled": true,
    "createdAt": "2024-12-28T11:00:00Z"
  },
  "message": "User created successfully"
}
```

**Used By:** User creation forms, bulk user import
**Notes:** Triggers activity log entry, validates uniqueness constraints

---

### GET /api/users/[id]

**Purpose:** Retrieve detailed information for a specific user

**Path Parameters:**
- `id` (string, required) - User ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "username": "johndoe",
    "emailAddress": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["collector"],
    "permissions": ["read_collections", "write_collections"],
    "assignedLicensees": ["licensee_id"],
    "assignedLocations": ["location_id"],
    "isEnabled": true,
    "lastLoginAt": "2024-12-28T10:30:00Z",
    "createdAt": "2024-01-15T08:00:00Z",
    "updatedAt": "2024-12-28T10:30:00Z"
  }
}
```

**Used By:** User detail views, profile editing
**Notes:** Includes full user profile and assignment information

---

### PUT /api/users/[id]

**Purpose:** Update user information, roles, and assignments

**Path Parameters:**
- `id` (string, required) - User ID

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "roles": ["manager"],
  "assignedLicensees": ["new_licensee_id"],
  "assignedLocations": ["new_location_id"],
  "isEnabled": true
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "username": "johndoe",
    "emailAddress": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "roles": ["manager"],
    "assignedLicensees": ["new_licensee_id"],
    "assignedLocations": ["new_location_id"],
    "isEnabled": true,
    "updatedAt": "2024-12-28T11:15:00Z"
  },
  "message": "User updated successfully"
}
```

**Used By:** User editing forms, role management interfaces
**Notes:** Increments `sessionVersion` when roles or assignments change

---

### DELETE /api/users/[id]

**Purpose:** Soft delete a user account (marks as deleted, doesn't remove data)

**Path Parameters:**
- `id` (string, required) - User ID

**Query Parameters:**
- `hardDelete` (boolean, optional) - Perform hard delete instead of soft delete

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Used By:** User management interfaces, account cleanup
**Notes:** Soft delete sets `deletedAt` timestamp, hard delete removes record entirely

---

### GET /api/activity-logs

**Purpose:** Retrieve system activity logs for audit and monitoring

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 50)
- `userId` (string, optional) - Filter by specific user
- `action` (string, optional) - Filter by action type
- `startDate` (string, optional) - Start date (ISO format)
- `endDate` (string, optional) - End date (ISO format)
- `sortBy` (string, optional) - Sort field (default: 'createdAt')
- `sortOrder` (string, optional) - Sort order (default: 'desc')

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "log_id",
      "userId": "user_id",
      "username": "johndoe",
      "action": "USER_CREATED",
      "resource": "users",
      "resourceId": "new_user_id",
      "details": {
        "targetUser": "newuser",
        "roles": ["collector"]
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-12-28T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "pages": 25
  }
}
```

**Used By:** Audit interfaces, security monitoring, admin dashboards
**Notes:** Comprehensive logging of all administrative actions

---

### GET /api/licensees

**Purpose:** Retrieve list of licensees for administrative management

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20)
- `search` (string, optional) - Search by licensee name
- `isActive` (boolean, optional) - Filter by active status
- `sortBy` (string, optional) - Sort field (default: 'name')
- `sortOrder` (string, optional) - Sort order (default: 'asc')

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "licensee_id",
      "name": "Casino Corp",
      "code": "CC001",
      "contactEmail": "admin@casinocorp.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

**Used By:** Licensee management interfaces, user assignment forms
**Notes:** Used for populating licensee selection dropdowns

## Data Models

### User Model
```typescript
interface User {
  _id: string;                    // Unique user identifier
  username: string;               // Unique username for login
  emailAddress: string;           // User's email address
  password: string;               // Hashed password (bcrypt)
  firstName: string;              // Required: User's first name
  lastName: string;               // Required: User's last name
  otherName?: string;             // Optional: Middle/other names
  gender?: 'male' | 'female' | 'other';
  phone?: string;                 // Phone number
  dateOfBirth?: Date;             // Date of birth
  address?: {
    street?: string;
    town?: string;
    region?: string;
    country?: string;
  };
  roles: string[];                // User roles array
  permissions: string[];          // Computed permissions
  assignedLicensees: string[];    // Licensee IDs user can access
  assignedLocations: string[];    // Location IDs user can access
  isEnabled: boolean;             // Account enabled status
  lastLoginAt?: Date;             // Last successful login
  accountLocked: boolean;         // Account lock status
  failedLoginAttempts: number;    // Failed login counter
  sessionVersion: number;         // Session invalidation version
  deletedAt?: Date;               // Soft delete timestamp
  createdAt: Date;                // Account creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

### Licensee Model
```typescript
interface Licensee {
  _id: string;                    // Unique licensee identifier
  name: string;                   // Licensee display name
  code: string;                   // Unique licensee code
  contactEmail: string;           // Primary contact email
  contactPhone?: string;          // Contact phone number
  address?: {
    street?: string;
    town?: string;
    region?: string;
    country?: string;
  };
  isActive: boolean;              // Licensee active status
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

### Activity Log Model
```typescript
interface ActivityLog {
  _id: string;                    // Unique log entry identifier
  userId: string;                 // User who performed action
  username: string;               // Username for display
  action: string;                 // Action performed (USER_CREATED, etc.)
  resource: string;               // Resource type affected
  resourceId: string;             // Specific resource ID
  details: Record<string, any>;   // Action-specific details
  ipAddress: string;              // Client IP address
  userAgent: string;              // Client user agent
  createdAt: Date;                // Log entry timestamp
}
```

### User Creation Request
```typescript
interface CreateUserRequest {
  username: string;               // Required: Unique username
  emailAddress: string;           // Required: Valid email
  password: string;               // Required: Strong password
  firstName: string;              // Required: Alphabetic only
  lastName: string;               // Required: Alphabetic only
  otherName?: string;             // Optional: Alphabetic only
  roles: string[];                // Required: Valid role strings
  assignedLicensees?: string[];   // Optional: Licensee IDs
  assignedLocations?: string[];   // Optional: Location IDs
  isEnabled?: boolean;            // Optional: Default true
}
```

### User Update Request
```typescript
interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  otherName?: string;
  roles?: string[];
  assignedLicensees?: string[];
  assignedLocations?: string[];
  isEnabled?: boolean;
}
```

## Error Handling

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 400 | USERNAME_EXISTS | Username already taken |
| 400 | EMAIL_EXISTS | Email address already registered |
| 400 | WEAK_PASSWORD | Password doesn't meet requirements |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | USER_NOT_FOUND | User does not exist |
| 409 | CONFLICT | Resource conflict (e.g., unique constraint) |
| 422 | INVALID_ROLE | Invalid role specified |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "username": "Username is required",
    "emailAddress": "Invalid email format",
    "roles": "At least one role is required"
  },
  "code": "VALIDATION_ERROR"
}
```

## Examples

### Create New User
```javascript
const createUser = async (userData) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username: 'newuser',
      emailAddress: 'user@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['collector'],
      assignedLicensees: ['licensee_id'],
      isEnabled: true
    })
  });

  const data = await response.json();
  return data;
};
```

### Update User Roles
```javascript
const updateUserRoles = async (userId, roles) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      roles: roles
    })
  });

  const data = await response.json();
  return data;
};
```

### Get Activity Logs
```javascript
const getActivityLogs = async (filters = {}) => {
  const queryParams = new URLSearchParams({
    page: '1',
    limit: '50',
    ...filters
  });

  const response = await fetch(`/api/activity-logs?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data;
};
```

### Bulk User Operations
```javascript
const bulkUpdateUsers = async (userUpdates) => {
  // Note: This would typically be a separate bulk endpoint
  const results = [];

  for (const update of userUpdates) {
    try {
      const result = await fetch(`/api/users/${update.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(update.data)
      });
      results.push(await result.json());
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }

  return results;
};
```

## Migration Notes

### Version History
- **v1.0:** Basic user CRUD operations
- **v1.1:** Added role-based permissions
- **v1.2:** Implemented activity logging
- **v1.3:** Added licensee assignment system
- **v1.4:** Enhanced session management

### Breaking Changes
- **Role Structure:** Updated role definitions in v1.1
- **Permission System:** New permission-based access in v1.2
- **Licensee Assignment:** Required licensee assignments in v1.3

### Compatibility
- All existing API consumers remain compatible
- Legacy role assignments are migrated automatically
- Activity logging is retroactively applied

### Future Enhancements
- Bulk user operations (planned v2.0)
- Advanced permission inheritance (planned v2.1)
- User group management (planned v2.2)
- Automated user provisioning (planned v2.3)