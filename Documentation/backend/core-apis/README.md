# Core APIs

This directory contains documentation for the core API endpoints that provide the foundation for the Evolution One CMS system.

## APIs in This Directory

### 🔐 Authentication API
**[auth-api.md](./auth-api.md)** - User authentication, token management, and security endpoints

**Key Endpoints:**
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/current-user` - Get current user data
- `PUT /api/auth/update-password` - Password updates
- `PUT /api/auth/profile` - Profile updates

### 👥 Administration API
**[administration-api.md](./administration-api.md)** - User management, roles, and system administration

**Key Endpoints:**
- `GET /api/users` - List users with filtering
- `POST /api/users` - Create new users
- `PUT /api/users/[id]` - Update user information
- `DELETE /api/users/[id]` - Delete users
- `GET /api/activity-logs` - System activity logs

### ⚙️ System Configuration API
**[system-config-api.md](./system-config-api.md)** - System settings and configuration management

**Key Endpoints:**
- `GET /api/licensees` - Licensee management
- `GET /api/countries` - Country and regional data
- `GET /api/system/config` - System configuration
- `PUT /api/system/config` - Update system settings

## Common Patterns

### Authentication Requirements
All endpoints in core APIs require proper authentication and authorization based on user roles and permissions.

### Response Formats
All APIs follow the standard response format:
```json
{
  "success": true,
  "data": { /* response data */ },
  "pagination": { /* pagination info for lists */ }
}
```

### Error Handling
Standard error responses with appropriate HTTP status codes and descriptive messages.

## Related Documentation

- **[API Overview](../api-overview.md)** - Complete API ecosystem
- **[Security Guidelines](../GUIDELINES.md)** - Security and authentication standards
- **[Frontend Auth](../../frontend/login.md)** - Frontend authentication integration