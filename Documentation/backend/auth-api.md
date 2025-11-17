# Authentication API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** December 2025

## Quick Search Guide

Use **Ctrl+F** to find these key topics:

- **user login** - What happens when a user logs in
- **token validation** - How JWT tokens are validated and managed
- **password reset** - How password reset process works
- **session management** - How user sessions are managed
- **logout process** - What happens when a user logs out
- **security features** - All security measures and protections
- **database fields** - All model fields and their purposes

## Overview

The Authentication API provides secure user authentication and session management. It handles user login, logout, token validation, and password reset functionality using JWT tokens stored in HTTP-only cookies.

## Authentication System

### What Happens When a User Logs In

1. **Database Operations**:
   - Queries `users` collection by email address (primary) or username (fallback if identifier looks like email)
   - Validates password using bcrypt comparison
   - Generates JWT token with user claims
   - Sets HTTP-only cookie with token
   - Updates user's `lastLoginAt` timestamp
   - Checks for hard-deleted users (`deletedAt` set) and disabled accounts (`isEnabled === false`)

2. **User Model Fields**:

```typescript
User {
  _id: string;                    // Unique user identifier
  emailAddress: string;           // User's email address (login credential)
  password: string;               // Hashed password (never stored in plain text)
  firstName: string;              // User's first name
  lastName: string;               // User's last name
  role: string;                   // User role (admin, user, viewer)
  permissions: string[];          // Array of permission strings
  lastLoginAt?: Date;             // Last successful login timestamp
  accountLocked: boolean;         // Whether account is locked
  failedLoginAttempts: number;    // Number of consecutive failed login attempts
  createdAt: Date;                // Account creation timestamp
  updatedAt: Date;                // Last modification timestamp
}
```

3. **Login Process Flow**:
   - Validates identifier format (accepts email or username) and password strength
   - Queries database for user by email (primary) or username (if identifier looks like email)
   - Compares provided password with stored hash
   - Checks user status (not hard-deleted, not soft-deleted, account enabled)
   - Generates JWT token with user information
   - Sets secure HTTP-only cookie
   - Updates `lastLoginAt` timestamp
   - Returns user data and success message

4. **JWT Token Structure**:

```typescript
JWT_PAYLOAD {
  userId: string;                 // User's unique identifier
  email: string;                  // User's email address
  role: string;                   // User's role
  permissions: string[];          // User's permissions
  iat: number;                    // Issued at timestamp
  exp: number;                    // Expiration timestamp (48 hours)
}
```

### What Happens When a User Logs Out

1. **Logout Process**:
   - Clears HTTP-only cookie from browser
   - Invalidates JWT token on server side
   - Logs logout activity for audit trail
   - Returns success confirmation
   - Redirects to `/login?logout=success` for proper success message display

2. **Session Cleanup**:
   - Removes token from client browser
   - Updates user session status
   - Maintains audit trail
   - Prevents further authenticated requests

### What Happens When Token Is Validated

1. **Token Validation Process**:
   - Extracts JWT token from HTTP-only cookie
   - Verifies token signature and expiration
   - Extracts user information from token payload
   - Returns user ID for authenticated requests

2. **Token Validation Response**:

```typescript
TokenValidationResponse {
  userId: string;                 // Authenticated user's ID
  valid: boolean;                 // Whether token is valid
  expiresAt: Date;                // Token expiration timestamp
}
```

### What Happens When Password Reset Is Requested

1. **Password Reset Process**:
   - Validates email address format
   - Checks if user exists in database
   - Generates password reset token
   - Sends reset email with secure link
   - Logs password reset request

2. **Password Reset Security**:
   - Reset tokens have limited expiration (1 hour)
   - Tokens are single-use only
   - Failed attempts are rate-limited
   - All reset attempts are logged

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview

The Authentication API provides secure user authentication and session management for the Evolution One CMS system. It handles user login, logout, token validation, and password reset functionality.

## Base URL

```
/api/auth
```

## Endpoints

### POST /api/auth/login

Authenticates a user and issues an HTTP-only token cookie.

**Request Body:**

```json
{
  "emailAddress": "user@example.com",
  "password": "securepassword"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "emailAddress": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "permissions": ["read", "write", "admin"]
  },
  "token": "jwt_token_string"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Invalid email address or password format."
}
```

**Response (Error - 401):**

```json
{
  "success": false,
  "message": "Invalid credentials."
}
```

**Cookies Set:**

- `token`: HTTP-only cookie with JWT token (48-hour expiration)

**Used By:**

- `/login` page - User authentication form
- Global authentication context - Session management

---

### POST /api/auth/logout

Logs out the current user by clearing the authentication token.

**Request Body:** None required

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**

- `token`: HTTP-only cookie is expired

**Used By:**

- Header component - Logout button
- Global authentication context - Session cleanup

---

### GET /api/auth/token

Validates the current user's token and returns user information.

**Request Body:** None required

**Response (Success - 200):**

```json
{
  "userId": "user_id"
}
```

**Response (Error - 401):**

```json
{
  "error": "Unauthorized"
}
```

**Used By:**

- Global authentication context - Token validation
- Protected routes - Access control

---

### POST /api/auth/forgot-password

Initiates password reset process for a user.

**Request Body:**

```json
{
  "emailAddress": "user@example.com"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**Response (Error - 404):**

```json
{
  "success": false,
  "message": "User not found"
}
```

**Used By:**

- `/login` page - Forgot password form

---

### POST /api/auth/clear-token

Manually clears the authentication token (admin function).

**Request Body:** None required

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Token cleared"
}
```

**Used By:**

- Administration panel - User management
- Debug/testing purposes

## Security Features

### Token Management

- **HTTP-Only Cookies**: Tokens stored in secure HTTP-only cookies
- **Automatic Expiration**: 48-hour token lifetime
- **Secure Flag**: Cookies use secure flag in production
- **Path Restriction**: Cookies restricted to root path
- **SameSite Protection**: CSRF protection through SameSite attribute

### Password Security

- **bcrypt Hashing**: Passwords hashed with bcrypt algorithm
- **Salt Rounds**: 12 salt rounds for password hashing
- **Minimum Requirements**: Enforced password strength requirements
- **Account Lockout**: Account locked after failed login attempts

### Input Validation

- **Email Validation**: RFC-compliant email format validation
- **Password Validation**: Minimum strength requirements enforced
- **SQL Injection Prevention**: Parameterized queries used throughout
- **XSS Protection**: Input sanitization and output escaping

### Rate Limiting

- **Login Attempts**: Rate limiting on login endpoints
- **Password Reset**: Rate limiting on password reset requests
- **API Endpoints**: Rate limiting on all authentication endpoints
- **IP-based Limiting**: Rate limiting by IP address

## API Endpoints

### Authentication Endpoints

**Base URL:** `/api/auth`

#### POST /api/auth/login

**What it does**: Authenticates a user and issues an HTTP-only token cookie
**Database Operations**:

- Queries `users` collection by email address
- Validates password using bcrypt comparison
- Updates `lastLogin` timestamp
- Resets `failedLoginAttempts` on successful login
  **Request Fields**: `emailAddress`, `password`
  **Response Fields**: User object with token and success message
  **Used By**: Login page, authentication forms

#### POST /api/auth/logout

**What it does**: Logs out the current user by clearing the authentication token
**Database Operations**:

- Clears HTTP-only cookie from client
- Logs logout activity
- Updates session status
  **Request Fields**: None required (uses cookie)
  **Response Fields**: Success confirmation message
  **Used By**: Header component, logout functionality

#### GET /api/auth/token

**What it does**: Validates the current user's token and returns user information
**Database Operations**:

- Extracts JWT token from HTTP-only cookie
- Validates token signature and expiration
- Returns user ID if valid
  **Request Fields**: None required (uses cookie)
  **Response Fields**: User ID and validation status
  **Used By**: Global authentication context, protected routes

#### POST /api/auth/forgot-password

**What it does**: Initiates password reset process for a user
**Database Operations**:

- Validates email address format
- Checks if user exists in database
- Generates password reset token
- Logs password reset request
  **Request Fields**: `emailAddress`
  **Response Fields**: Success message (regardless of user existence)
  **Used By**: Login page, password reset forms

#### POST /api/auth/clear-token

**What it does**: Manually clears the authentication token (admin function)
**Database Operations**:

- Clears HTTP-only cookie from client
- Logs manual token clearing
- Updates session status
  **Request Fields**: None required (uses cookie)
  **Response Fields**: Success confirmation message
  **Used By**: Administration panel, debug functions

## Error Handling

### Login Error Scenarios

- **Invalid Credentials**: Wrong email or password
- **Account Locked**: Too many failed login attempts
- **Account Not Found**: Email address doesn't exist
- **Invalid Format**: Malformed email or password

### Token Error Scenarios

- **Token Expired**: JWT token has exceeded 48-hour limit
- **Invalid Token**: Malformed or tampered token
- **Missing Token**: No authentication token provided
- **Token Validation Failed**: Signature verification failed
- **User Not Found**: User account hard-deleted from database (forces logout)
- **User Deleted**: User account soft-deleted (`deletedAt` set, forces logout)
- **Account Disabled**: User account disabled (`isEnabled === false`, forces logout)

### Password Reset Error Scenarios

- **Invalid Email**: Malformed email address format
- **User Not Found**: Email address doesn't exist in system
- **Rate Limited**: Too many reset requests from same IP
- **Reset Token Expired**: Password reset token has expired

### User Status Validation

The authentication system now validates user status on every request:

- **Hard Delete Detection**: If user is not found in database, session is invalidated
- **Soft Delete Detection**: If `deletedAt` is set, session is invalidated
- **Account Disabled**: If `isEnabled === false`, session is invalidated
- **Automatic Logout**: Users are automatically logged out with appropriate error messages:
  - `user_not_found`: User account hard-deleted
  - `user_deleted`: User account soft-deleted
  - `account_disabled`: User account disabled

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (development only)"
}
```

## Session Management

### Session Lifecycle

1. **Login**: User authenticates and receives JWT token
2. **Active Session**: Token valid for 48 hours
3. **Token Refresh**: Automatic token validation on requests
4. **Logout**: Token cleared and session ended
5. **Expiration**: Token automatically expires after 48 hours

### Session Security

- **HTTP-Only Cookies**: Prevents XSS attacks on tokens
- **Secure Cookies**: HTTPS-only in production
- **SameSite Protection**: CSRF protection
- **Automatic Expiration**: 48-hour token lifetime
- **Server-Side Validation**: All tokens validated server-side

## Database Operations

### User Authentication Queries

```javascript
// Find user by email
db.users.findOne({ emailAddress: email });

// Update last login
db.users.updateOne(
  { _id: userId },
  { $set: { lastLoginAt: new Date(), failedLoginAttempts: 0 } }
);

// Increment failed login attempts
db.users.updateOne({ _id: userId }, { $inc: { failedLoginAttempts: 1 } });

// Lock account after failed attempts
db.users.updateOne({ _id: userId }, { $set: { accountLocked: true } });
```

### Password Hashing

```javascript
// Hash password with bcrypt
const hashedPassword = await bcrypt.hash(password, 12);

// Compare password with hash
const isValidPassword = await bcrypt.compare(password, hashedPassword);
```

## Security Best Practices

### Authentication Security

- **Strong Passwords**: Minimum 8 characters with complexity requirements
- **Account Lockout**: Lock account after 5 failed login attempts
- **Session Timeout**: 48-hour automatic session expiration
- **Secure Cookies**: HTTP-only, secure, SameSite cookies

### Data Protection

- **Password Hashing**: bcrypt with 12 salt rounds
- **Input Validation**: Comprehensive validation of all inputs
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: Output sanitization and escaping

### Audit and Monitoring

- **Login Logging**: All login attempts logged with IP and timestamp
- **Failed Attempt Tracking**: Failed login attempts tracked per user
- **Password Reset Logging**: All password reset requests logged
- **Session Monitoring**: Active sessions monitored and tracked

## Performance Considerations

### Database Optimization

- **Indexing**: Proper indexes on `emailAddress` field
- **Query Optimization**: Efficient user lookup queries
- **Connection Pooling**: Optimized database connections
- **Caching**: User data caching for frequent lookups

### API Performance

- **Token Validation**: Fast JWT signature verification
- **Rate Limiting**: Efficient rate limiting implementation
- **Response Compression**: Compressed responses for large data
- **Background Processing**: Heavy operations processed in background

## Compliance and Audit

### Regulatory Compliance

- **Data Protection**: GDPR-compliant user data handling
- **Audit Trails**: Complete audit trail for all authentication events
- **Data Retention**: Configurable data retention policies
- **Security Standards**: Industry-standard security practices

### Monitoring and Alerting

- **Failed Login Alerts**: Alerts for suspicious login patterns
- **Account Lockout Notifications**: Notifications for account lockouts
- **Password Reset Monitoring**: Monitoring of password reset requests
- **Session Anomaly Detection**: Detection of unusual session patterns

- **HTTP-Only Cookies**: Tokens are stored in secure HTTP-only cookies
- **Automatic Expiration**: 48-hour token lifetime
- **Secure Flag**: Cookies use secure flag in production
- **Path Restriction**: Cookies restricted to root path

### Input Validation

- **Email Validation**: RFC-compliant email format validation
- **Password Validation**: Minimum strength requirements
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

### Error Handling

- **Generic Error Messages**: No sensitive information leaked
- **Rate Limiting**: Protection against brute force attacks
- **Logging**: Secure error logging without sensitive data

## Database Models

### User Model

```typescript
type User = {
  _id: string;
  emailAddress: string;
  password: string; // Hashed
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  lastLogin?: Date;
  accountLocked: boolean;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
};
```

## Authentication Flow

1. **Login Request**: User submits credentials
2. **Validation**: Email and password format validation
3. **Database Lookup**: Find user by email
4. **Password Verification**: Compare hashed passwords
5. **Token Generation**: Create JWT with user claims
6. **Cookie Setting**: Set HTTP-only cookie with token
7. **Response**: Return user data and success message

## Error Codes

| Status Code | Description                        |
| ----------- | ---------------------------------- |
| 200         | Success                            |
| 400         | Bad Request (Invalid input)        |
| 401         | Unauthorized (Invalid credentials) |
| 404         | Not Found (User not found)         |
| 500         | Internal Server Error              |

## Dependencies

- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Validation**: Custom validation utilities
- **Middleware**: Database connection middleware

## Related Frontend Pages

- **Login Page** (`/login`): Main authentication page
- **Protected Routes**: All pages requiring authentication
- **Header Component**: Logout functionality
- **Global Auth Context**: Session state management
