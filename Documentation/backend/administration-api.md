# Administration & Users API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025

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
    firstName: string;            // User's first name
    lastName: string;             // User's last name
    phone?: string;               // Optional phone number
    department?: string;          // Optional department
    licensee?: string;            // Optional licensee assignment
  };
  isEnabled: boolean;             // Whether user account is active
  profilePicture?: string;        // Base64 encoded image or URL
  resourcePermissions: {
    locations: string[];          // Permissions for locations (read, write, admin)
    machines: string[];           // Permissions for machines (read, write, admin)
    reports: string[];            // Permissions for reports (read, write, export)
  };
  createdAt: Date;                // Account creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

3. **Validation Process**:
   - Validates email format and uniqueness
   - Validates username uniqueness
   - Validates password strength requirements
   - Validates role assignments
   - Validates permission structure

### What Happens When You Update a User

1. **Field Updates**:
   - Updates `username`, `email`, `roles`, `profile` fields
   - Modifies `resourcePermissions` for different resource types
   - Updates `profilePicture` if provided
   - Sets `isEnabled` status

2. **Permission Management**:
   - **locations**: Controls access to location management
   - **machines**: Controls access to machine operations
   - **reports**: Controls access to reporting features
   - Each permission can be: "read", "write", "export", "admin"

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
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (development only)"
}
```

### Common Error Scenarios
- **Validation Errors**: Invalid input data format
- **Duplicate Data**: Username or email already exists
- **Permission Denied**: Insufficient user permissions
- **Not Found**: User or licensee doesn't exist
- **Authentication Required**: Invalid or missing JWT token

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
