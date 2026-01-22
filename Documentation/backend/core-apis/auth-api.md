# Authentication API

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [POST /api/auth/login](#post-apiauthlogin)
  - [POST /api/auth/logout](#post-apiauthlogout)
  - [GET /api/auth/current-user](#get-apiauthcurrent-user)
  - [PUT /api/auth/update-password](#put-apiauthupdate-password)
  - [PUT /api/auth/profile](#put-apiauthprofile)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Migration Notes](#migration-notes)

## Overview

The Authentication API provides secure user authentication and session management for the Evolution One CMS system. It handles user login, logout, token validation, password management, and profile updates using JWT tokens stored in HTTP-only cookies.

**Key Features:**

- JWT token-based authentication
- HTTP-only cookie storage for security
- Role-based access control
- Password strength validation
- Profile validation gates
- Session management and invalidation

## Base URL

```
https://api.example.com/v1/auth
```

All endpoints are prefixed with `/api/auth`.

## Authentication

### Public Endpoints

- `POST /api/auth/login` - No authentication required

### Protected Endpoints

- `POST /api/auth/logout` - Requires valid JWT token
- `GET /api/auth/current-user` - Requires valid JWT token
- `PUT /api/auth/update-password` - Requires valid JWT token
- `PUT /api/auth/profile` - Requires valid JWT token

### Token Requirements

- JWT tokens must be provided in HTTP-only cookies
- Tokens are validated on each protected request
- Invalid or expired tokens return 401 Unauthorized

## Rate Limiting

### Login Attempts

- **Limit:** 5 failed attempts per 15 minutes per IP
- **Lockout:** Account locked after 5 consecutive failures
- **Reset:** Automatic unlock after 15 minutes or successful login

### General API Calls

- **Authenticated Requests:** 1000 requests per hour per user
- **Anonymous Requests:** 100 requests per hour per IP

### Headers

Rate limit status is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Endpoints

### POST /api/auth/login

**Purpose:** Authenticate user and issue JWT token

**Request Body:**

```json
{
  "identifier": "email@example.com",
  "password": "password123",
  "rememberMe": false
}
```

**Parameters:**

- `identifier` (string, required) - Email address or username
- `password` (string, required) - User password
- `rememberMe` (boolean, optional) - Extend token expiration to 30 days

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "emailAddress": "email@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["admin"],
      "isEnabled": true,
      "lastLoginAt": "2024-12-28T10:30:00Z"
    },
    "token": "jwt_token_string",
    "refreshToken": "refresh_token_string",
    "expiresAt": "2024-12-29T10:30:00Z",
    "requiresPasswordUpdate": false,
    "requiresProfileUpdate": false,
    "invalidProfileFields": [],
    "profileValidationReasons": []
  }
}
```

**Response (Password Update Required - 200):**

```json
{
  "success": true,
  "data": {
    "user": {
      /* user object */
    },
    "requiresPasswordUpdate": true
  }
}
```

**Response (Profile Update Required - 200):**

```json
{
  "success": true,
  "data": {
    "user": {
      /* user object */
    },
    "requiresProfileUpdate": true,
    "invalidProfileFields": {
      "firstName": true,
      "emailAddress": false,
      "phone": true
    },
    "invalidProfileReasons": {
      "firstName": "First name is missing.",
      "phone": "Phone number is invalid."
    }
  }
}
```

**Used By:** Login forms, authentication flows
**Notes:** Updates `lastLoginAt` timestamp, supports both email and username login

---

### POST /api/auth/logout

**Purpose:** End user session and invalidate JWT token

**Request Body:** None required

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Used By:** Logout buttons, session termination
**Notes:** Clears HTTP-only cookie, logs logout activity

---

### GET /api/auth/current-user

**Purpose:** Get current authenticated user information

**Query Parameters:** None

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "emailAddress": "email@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["admin"],
    "permissions": ["read", "write"],
    "isEnabled": true,
    "lastLoginAt": "2024-12-28T10:30:00Z"
  }
}
```

**Used By:** User profile displays, permission checks
**Notes:** Validates token and returns current user data

---

### PUT /api/auth/update-password

**Purpose:** Update user password

**Request Body:**

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Parameters:**

- `currentPassword` (string, required) - Current password for verification
- `newPassword` (string, required) - New password (must meet strength requirements)

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Used By:** Password change forms, forced password updates
**Notes:** Validates password strength, updates user record

---

### PUT /api/auth/profile

**Purpose:** Update user profile information

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "johndoe@example.com",
  "phone": "+1234567890",
  "gender": "male",
  "dateOfBirth": "1990-01-01",
  "street": "123 Main St",
  "town": "Anytown",
  "region": "State",
  "country": "US",
  "assignedLicensees": ["licensee_id_1", "licensee_id_2"],
  "assignedLocations": ["location_id_1", "location_id_2"]
}
```

**Parameters:**

- Profile fields vary based on user role and requirements.
- `username` (string, optional) - New username.
- `email` (string, optional) - New email address.
- `assignedLicensees` (string[], optional) - Array of licensee IDs the user is assigned to.
- `assignedLocations` (string[], optional) - Array of location IDs the user is assigned to.
- All other profile fields (firstName, lastName, etc.) are optional but some may be required for validation.

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "emailAddress": "email@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "assignedLicensees": ["licensee_id_1", "licensee_id_2"],
    "assignedLocations": ["location_id_1", "location_id_2"]
  },
  "message": "Profile updated successfully"
}
```

**Used By:** Profile edit forms, validation completion
**Notes:** Validates required fields, updates user record. **Important:** Successfully updating a profile (especially roles or assignments) increments the user's `sessionVersion`. This invalidates all active JWT tokens for that user, requiring them to re-login immediately for security and to ensure the session reflects the new permissions.

## Data Models

### User Model

```typescript
interface User {
  _id: string; // Unique user identifier
  isEnabled: boolean; // Account enabled status
  roles: string[]; // User roles array
  username: string; // Required username (unique, indexed)
  emailAddress: string; // User's email address (login credential, unique, indexed)
  assignedLocations?: string[]; // Array of location IDs user has access to
  assignedLicensees?: string[]; // Array of licensee IDs user has access to
  invalidProfileFields?: { [key: string]: boolean }; // Object indicating invalid profile fields
  invalidProfileReasons?: { [key: string]: string }; // Object providing reasons for invalid profile fields
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: 'male' | 'female' | 'other';
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: string; // ISO date string
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
    phoneNumber?: string; // Top-level phone number
    notes?: string;
  };
  profilePicture?: string; // URL to profile picture
  passwordUpdatedAt?: Date;
  sessionVersion?: number; // Session invalidation version (default: 1)
  loginCount?: number; // Number of successful logins
  lastLoginAt?: Date; // Last successful login
  deletedAt?: Date; // Soft delete timestamp
  createdAt: Date; // Account creation timestamp
  updatedAt: Date; // Last modification timestamp
}
```

### JWT Token Payload

```typescript
interface JWTPayload {
  _id: string; // User's unique identifier
  emailAddress: string; // User's email address
  username?: string; // User's username
  isEnabled: boolean; // Account enabled status
  roles?: string[]; // User's roles array (optional in payload for size optimization)
  assignedLocations?: string[]; // User's assigned locations
  assignedLicensees?: string[]; // User's assigned licensees
  invalidProfileFields?: { [key: string]: boolean }; // Object indicating invalid profile fields
  invalidProfileReasons?: { [key: string]: string }; // Object providing reasons for invalid profile fields
  sessionId: string; // Session identifier (user ID)
  sessionVersion?: number; // Session version for invalidation (default: 1)
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}
```

### Login Request

```typescript
interface LoginRequest {
  identifier: string; // Email or username
  password: string; // Plain text password
  rememberMe?: boolean; // Optional: extend token life
}
```

### Profile Update Request

```typescript
interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  otherName?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  dateOfBirth?: string; // ISO date string
  street?: string;
  town?: string;
  region?: string;
  country?: string;
  username?: string; // Optional: for updating username
  email?: string; // Optional: for updating email
  currentPassword?: string; // Optional: required if newPassword is provided
  newPassword?: string; // Optional: for updating password
  assignedLicensees?: string[]; // Optional: for updating assigned licensees
  assignedLocations?: string[]; // Optional: for updating assigned locations
  profilePicture?: string; // Optional: URL to profile picture
  isEnabled?: boolean; // Optional: for enabling/disabling user
}
```

## Error Handling

### Common Error Codes

| Status Code | Error Code           | Description                                  |
| ----------- | -------------------- | -------------------------------------------- |
| 400         | INVALID_CREDENTIALS  | Invalid email/username or password           |
| 400         | ACCOUNT_DISABLED     | User account is disabled                     |
| 400         | ACCOUNT_LOCKED       | Account locked due to failed login attempts  |
| 400         | USER_NOT_FOUND       | User does not exist                          |
| 400         | USER_DELETED         | User account has been deleted                |
| 400         | WEAK_PASSWORD        | Password does not meet strength requirements |
| 400         | INVALID_PROFILE_DATA | Profile data validation failed               |
| 401         | UNAUTHORIZED         | Missing or invalid JWT token                 |
| 401         | TOKEN_EXPIRED        | JWT token has expired                        |
| 403         | FORBIDDEN            | Insufficient permissions                     |
| 422         | VALIDATION_ERROR     | Request validation failed                    |
| 429         | RATE_LIMIT_EXCEEDED  | Too many requests                            |
| 500         | INTERNAL_ERROR       | Server error                                 |

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details",
  "code": "ERROR_CODE"
}
```

### Validation Errors

```json
{
  "success": false,
  "message": "Profile validation failed",
  "error": {
    "firstName": "First name is required",
    "phone": "Phone number format is invalid"
  },
  "code": "VALIDATION_ERROR"
}
```

## Examples

### Basic Login

```javascript
const loginUser = async (identifier, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      identifier: 'user@example.com',
      password: 'password123',
      rememberMe: false,
    }),
  });

  const data = await response.json();

  if (data.success) {
    // Login successful
    console.log('User:', data.data.user);
    // Redirect to dashboard
  } else {
    // Handle error
    console.error('Login failed:', data.message);
  }
};
```

### Password Update

```javascript
const updatePassword = async (currentPassword, newPassword) => {
  const response = await fetch('/api/auth/update-password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const data = await response.json();
  return data.success;
};
```

### Profile Update

```javascript
const updateProfile = async profileData => {
  const response = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(profileData),
  });

  const data = await response.json();
  return data;
};
```

### Logout

```javascript
const logoutUser = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  const data = await response.json();

  if (data.success) {
    // Clear local state and redirect to login
    window.location.href = '/login?logout=success';
  }
};
```

## Implementation Details

### Database Query Optimization

The authentication system uses optimized MongoDB queries with `.lean()` method to return plain JavaScript objects instead of Mongoose documents. This provides:

- **Performance Benefits:** Faster queries, reduced memory usage
- **Type Safety:** Proper TypeScript typing with `LeanUserDocument` interface
- **Error Prevention:** Eliminates runtime errors from calling document methods on plain objects

### Lean Object Handling

```typescript
// Database query returns lean object
const user = (await UserModel.findOne({
  emailAddress: email,
}).lean()) as LeanUserDocument | null;

// Direct property access (no .toObject() or .toJSON() needed)
const userObject = {
  _id: user._id,
  emailAddress: user.emailAddress,
  roles: user.roles,
  // ... other properties
};
```

## Migration Notes

### Version Changes

- **v1.0:** Initial authentication system
- **v1.1:** Added profile validation gates
- **v1.2:** Enhanced password strength requirements
- **v1.3:** Added session version invalidation
- **v1.4:** Improved rate limiting and security
- **v1.5:** Optimized database queries with lean objects and improved type safety

### Breaking Changes

- **JWT Structure:** Updated payload structure in v1.3, added optional fields in v1.5
- **Password Requirements:** Strength requirements enhanced in v1.2
- **Profile Validation:** New required fields added in v1.1
- **Type System:** Improved type safety with lean object handling in v1.5

### Compatibility

- All current API consumers remain compatible
- Legacy tokens are invalidated on security updates
- Profile validation is enforced for new accounts only
- Type system changes are backward compatible

### Future Enhancements

- Multi-factor authentication (planned v2.0)
- OAuth integration (planned v2.1)
- Biometric authentication (planned v2.2)
- Advanced session management (planned v2.3)
