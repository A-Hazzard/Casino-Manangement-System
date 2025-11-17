# Administration & Users API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** December 2025

## Quick Search Guide

Use **Ctrl+F** to find these key topics:

- **create user** - What happens when you create a new user
- **update user** - How user updates work and what fields are modified
- **delete user** - How user deletion works
- **user permissions** - How user permissions and roles work
- **activity logs** - How activity logging tracks user actions
- **licensee management** - How licensee creation and updates work
- **database fields** - All model fields and their purposes

## Overview

The Administration & Users API manages system users, licensees, and activity logging. It handles user creation, role management, permissions, and administrative operations with comprehensive logging for audit trails.

## User Management System

### What Happens When You Create a User

1. **Database Operations**:
   - Creates `User` document in `users` collection
   - Stores `username`, `email`, `password` (hashed), `roles`, `profile`
   - Sets `isEnabled`, `resourcePermissions`, `profilePicture`
   - Generates unique `_id` and timestamps

2. **User Model Fields**:

```typescript
User {
  _id: string;                    // Unique user identifier
  username: string;               // Login username
  email: string;                  // User email address
  password: string;               // Hashed password (never stored in plain text)
  roles: string[];                // User roles (admin, user, viewer)
  profile: {
    firstName?: string;           // Required: validated to be alphabetic
    lastName?: string;            // Required: validated to be alphabetic
    middleName?: string;          // Optional alphabetic value
    otherName?: string;           // Optional alphabetic value
    gender?: 'male' | 'female' | 'other'; // Optional, validated when provided
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: Date;         // Required; ISO date stored in UTC
      idType?: string;            // Optional alphabetic value
      idNumber?: string;
      notes?: string;
    };
    phoneNumber?: string;         // Required; normalized phone number
    notes?: string;
  };
  isEnabled: boolean;             // Whether user account is active (can be toggled by admins/managers)
  profilePicture?: string;        // Base64 encoded image or URL
  resourcePermissions: Map<
    string,
    { entity: string; resources: string[] }
  >;                              // Licensee/location scoped permissions
  passwordUpdatedAt?: Date | null;// Tracks when the password last met compliance
  sessionVersion: number;         // Incremented to force re-authentication
  createdAt: Date;                // Account creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

3. **Validation Process**:
   - Validates email format and uniqueness
   - Validates username uniqueness and ensures it is not email/phone formatted
   - Validates name fields (letters/spaces only) and optional gender enumeration
   - Validates phone number formatting and normalizes value
   - Validates date of birth (required, not in the future)
   - Validates password strength requirements
   - Validates role assignments and licensee/location intersections
   - Validates permission structure

### What Happens When You Update a User

1. **Field Updates**:
   - Updates `username`, `email`, `roles`, `profile` fields
   - Modifies `resourcePermissions` for different resource types
   - Updates `profilePicture` if provided
   - Sets `isEnabled` status
   - Increments `sessionVersion` whenever roles, licensee assignments, or location permissions change

2. **Permission Management**:
   - **locations**: Controls access to location management
   - **machines**: Controls access to machine operations
   - **reports**: Controls access to reporting features
   - Each permission can be: "read", "write", "export", "admin"
   - **Manager Restrictions**: Managers cannot change licensee assignments but can modify location permissions
   - **Account Status**: `isEnabled` can be toggled by admins and managers (managers can only toggle for users in their licensee)

3. **Database Updates**:
   - Updates existing `User` document
   - Preserves `_id` and `createdAt`
   - Updates `updatedAt` timestamp
   - Maintains audit trail

### What Happens When You Delete a User

1. **Soft Delete Process**:
   - Sets `deletedAt` timestamp instead of removing record
   - Preserves all historical data for audit purposes
   - Prevents user from logging in
   - Maintains referential integrity

2. **Database Operations**:
   - Updates `User` document with `deletedAt: new Date()`
   - Keeps all other fields intact
   - Maintains activity log references

## Licensee Management System

### What Happens When You Create a Licensee

1. **Database Operations**:
   - Creates `Licensee` document in `licensees` collection
   - Stores `name`, `country`, `contactEmail`, `contactPhone`
   - Sets `startDate`, `expiryDate`, `isPaid` status
   - Generates unique `licenseKey`

2. **Licensee Model Fields**:

```typescript
Licensee {
  _id: string;                    // Unique licensee identifier
  name: string;                   // Licensee company name
  country: string;                // Country where licensee operates
  licenseKey: string;             // Auto-generated license key (e.g., "CR-2024-001")
  isPaid: boolean;                // Whether licensee has paid fees
  expiryDate: Date;               // License expiration date
  startDate: Date;                // License start date
  contactEmail: string;           // Primary contact email
  contactPhone: string;           // Primary contact phone
  createdAt: Date;                // Licensee creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

3. **License Key Generation**:
   - Format: `{CompanyInitials}-{Year}-{SequentialNumber}`
   - Example: "CR-2024-001" for Casino Royale
   - Ensures uniqueness across all licensees

### What Happens When You Update a Licensee

1. **Field Updates**:
   - Updates `name`, `contactEmail`, `contactPhone`
   - Modifies `isPaid` status for payment tracking
   - Updates `expiryDate` for license renewals
   - Preserves `licenseKey` (cannot be changed)

2. **Payment Tracking**:
   - `isPaid: true` - Licensee has paid all fees
   - `isPaid: false` - Licensee has outstanding payments
   - Used for access control and reporting

## Activity Logging System

### What Happens When Activity is Logged

1. **Database Operations**:
   - Creates `ActivityLog` document in `activityLogs` collection
   - Stores `actor`, `actionType`, `entityType`, `entity`
   - Records `changes` with before/after values
   - Captures `timestamp`, `ip`, `userAgent`

2. **Activity Log Model Fields**:

```typescript
ActivityLog {
  _id: string;                    // Unique log entry identifier
  actor: {
    id: string;                   // User who performed action
    name: string;                 // User's display name
    username: string;             // User's login name
  };
  actionType: string;             // Type of action (create, update, delete, login, logout)
  entityType: string;             // Type of entity affected (user, licensee, location, machine)
  entity: {
    id: string;                   // ID of affected entity
    name: string;                 // Name of affected entity
  };
  changes: {
    before: any;                  // Entity state before change
    after: any;                   // Entity state after change
  };
  timestamp: Date;                // When action occurred
  ip: string;                     // IP address of actor
  userAgent: string;              // Browser/client information
  createdAt: Date;                // Log entry creation timestamp
}
```

3. **Change Tracking**:
   - **before**: Snapshot of entity before modification
   - **after**: Snapshot of entity after modification
   - **null**: For create operations (no before state)
   - Enables rollback and audit trail reconstruction

### Activity Log Types

**User Actions**:

- `create` - New user created
- `update` - User profile or permissions modified
- `delete` - User account deactivated
- `login` - User logged into system
- `logout` - User logged out of system

**Entity Actions**:

- `user` - User entity modifications
- `licensee` - Licensee entity modifications
- `location` - Location entity modifications
- `machine` - Machine entity modifications

## API Endpoints

### Users API

**Base URL:** `/api/users`

#### GET /api/users

**What it does**: Retrieves all system users with optional filtering
**Database Query**: Queries `users` collection, filters by `licensee` if provided
**Response Fields**: Returns array of `User` objects with all fields
**Used By**: Administration page for user management

#### POST /api/users

**What it does**: Creates a new system user
**Database Operations**:

- Validates input data
- Hashes password using bcrypt
- Creates new `User` document
- Logs creation activity
  **Request Fields**: All `User` model fields except `_id`, `createdAt`, `updatedAt`
  **Response Fields**: Created `User` object with generated `_id`

#### PUT /api/users

**What it does**: Updates an existing system user
**Database Operations**:

- Finds user by `_id`
- Updates specified fields
- Logs change activity with before/after values
  **Request Fields**: All `User` model fields (including `_id` for identification)
  **Response Fields**: Updated `User` object with new `updatedAt`

#### DELETE /api/users

**What it does**: Soft deletes a system user
**Database Operations**:

- Finds user by `_id`
- Sets `deletedAt` timestamp
- Logs deletion activity
  **Request Fields**: `_id` of user to delete
  **Response Fields**: Success confirmation message

### Licensees API

**Base URL:** `/api/licensees`

#### GET /api/licensees

**What it does**: Retrieves all licensees with optional filtering
**Database Query**: Queries `licensees` collection, filters by `licensee` parameter
**Response Fields**: Returns array of `Licensee` objects
**Used By**: Licensee management pages

#### POST /api/licensees

**What it does**: Creates a new licensee
**Database Operations**:

- Validates input data
- Generates unique `licenseKey`
- Creates new `Licensee` document
- Logs creation activity
  **Request Fields**: All `Licensee` model fields except `_id`, `licenseKey`, `createdAt`, `updatedAt`
  **Response Fields**: Created `Licensee` object with generated fields

#### PUT /api/licensees

**What it does**: Updates an existing licensee
**Database Operations**:

- Finds licensee by `_id`
- Updates specified fields (except `licenseKey`)
- Logs change activity
  **Request Fields**: All `Licensee` model fields (including `_id`)
  **Response Fields**: Updated `Licensee` object

#### DELETE /api/licensees

**What it does**: Soft deletes a licensee
**Database Operations**:

- Finds licensee by `_id`
- Sets `deletedAt` timestamp
- Logs deletion activity
  **Request Fields**: `_id` of licensee to delete
  **Response Fields**: Success confirmation message

### Activity Logs API

**Base URL:** `/api/activity-logs`

#### GET /api/activity-logs

**What it does**: Retrieves system activity logs with filtering and pagination
**Database Query**: Queries `activityLogs` collection with filters
**Query Parameters**:

- `entityType` - Filter by entity type (user, licensee, etc.)
- `actionType` - Filter by action type (create, update, delete)
- `actor` - Filter by actor ID
- `startDate`/`endDate` - Date range filtering
- `page`/`limit` - Pagination controls
  **Response Fields**: Array of `ActivityLog` objects with pagination info
  **Used By**: Activity log pages, audit trail systems

#### POST /api/activity-logs

**What it does**: Creates a new activity log entry
**Database Operations**:

- Validates log entry data
- Creates new `ActivityLog` document
- Captures current timestamp and context
  **Request Fields**: All `ActivityLog` model fields except `_id`, `timestamp`, `ip`, `userAgent`, `createdAt`
  **Response Fields**: Created `ActivityLog` object

## Security Features

### Authentication & Authorization

- **JWT Tokens**: All endpoints require valid JWT authentication
- **Role-Based Access**: Different permissions for admin, user, viewer roles
- **Resource Permissions**: Granular permissions for locations, machines, reports
- **Session Management**: Secure session handling with HTTP-only cookies

### Data Protection

- **Password Hashing**: bcrypt used for password security
- **Input Validation**: Comprehensive validation for all inputs
- **SQL Injection Prevention**: Parameterized queries used throughout
- **XSS Protection**: Output sanitization and escaping

### Audit Trail

- **Complete Logging**: All user actions logged with context
- **Change Tracking**: Before/after values recorded for modifications
- **IP Tracking**: IP addresses captured for security monitoring
- **User Agent Logging**: Browser/client information recorded

## Error Handling

### Error Response Format

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

- `/administration` page - User management page
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
  "message": "Username already exists"
}
```

OR

```json
{
  "success": false,
  "message": "Email already exists"
}
```

OR

```json
{
  "success": false,
  "message": "Username and email already exist"
}
```

**Note:** Error messages are now specific - the system identifies whether username, email, or both already exist.

**Logging:** Success/failure logging with user creation details and validation errors

**Used By:**

- User creation forms
- Administrative pages

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
- Administrative pages

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

- Licensee management pages
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
- Administrative pages

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
- Payment management pages

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
- Administrative pages

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

- Activity log pages
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
type User = {
  _id: string;
  username: string;
  email: string;
  password: string; // Hashed
  roles: string[];
  profile: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: 'male' | 'female' | 'other';
    phoneNumber?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: Date;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
    notes?: string;
  };
  isEnabled: boolean;
  profilePicture?: string; // Base64 or URL
  resourcePermissions: Map<
    string,
    { entity: string; resources: string[] }
  >;
  passwordUpdatedAt?: Date | null;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
};
```

### Licensee Model

```typescript
type Licensee = {
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
};
```

### Activity Log Model

```typescript
type ActivityLog = {
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
};
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

### Common Error Scenarios

- **Validation Errors**: Invalid input data format
- **Duplicate Data**: Specific error messages for username/email conflicts:
  - "Username already exists" (409)
  - "Email already exists" (409)
  - "Username and email already exist" (409)
- **Permission Denied**: Insufficient user permissions
- **Manager Restrictions**: Managers cannot change licensee assignments (403)
- **Not Found**: User or licensee doesn't exist
- **Authentication Required**: Invalid or missing JWT token
- **Empty Email**: "Email address cannot be empty" (when email is required but not provided)

## Performance Considerations

### Database Optimization

- **Indexing**: Proper indexes on frequently queried fields (`username`, `email`, `licensee`)
- **Query Optimization**: Efficient database queries with proper filtering
- **Connection Pooling**: Optimized database connection management
- **Caching**: Response caching for frequently accessed data

### API Performance

- **Pagination**: Efficient pagination for large datasets
- **Response Compression**: Compressed responses for large data
- **Rate Limiting**: Protection against API abuse
- **Logging Performance**: Non-blocking logging operations

## Compliance & Audit

### Regulatory Compliance

- **Gaming Regulations**: Meets gaming industry audit requirements
- **Data Retention**: Configurable log retention policies
- **Audit Trail**: Complete audit trail for all operations
- **Security Monitoring**: Real-time security event tracking

### Data Privacy

- **GDPR Compliance**: Personal data handling according to privacy laws
- **Data Encryption**: Sensitive data encrypted at rest
- **Access Logging**: All data access logged for privacy compliance
- **Consent Tracking**: User consent recorded and managed

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
