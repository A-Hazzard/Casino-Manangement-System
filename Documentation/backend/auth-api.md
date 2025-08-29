# Authentication API Documentation

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
}
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

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (Invalid input) |
| 401 | Unauthorized (Invalid credentials) |
| 404 | Not Found (User not found) |
| 500 | Internal Server Error |

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
