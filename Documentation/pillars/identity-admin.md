# Identity & Administration Pillar (Identity)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Authentication System (`app/api/auth`)

The Authentication system manages user access, session security, and multi-factor verification.

### Key Capabilities
- **JWT Orchestration**: Secure HTTP-only cookies using `jose`.
- **2FA (TOTP)**: High-security gating via Google Authenticator (`otplib`).
- **Session Versioning**: Atomic logout across all devices via DB version increment.
- **Login Gates**: Frontend validation including ID check, Location assignment, and TOTP verification.

### Security Constraints
- **Self-Password Fix**: Users can change their own password without TOTP.
- **Admin Password Reset**: Requires TOTP from the Admin to protect against social engineering.

---

## 2. Administration System (`app/api/admin`)

The Administration module handles corporate hierarchy, user enrollment, and jurisdictional compliance.

### Licencee & Location Management
- **Hierarchy**: Licencees (Owners) own multiple Gaming Locations. 
- **Assignments**: Users are assigned to specific Licencees or Locations, which filters their entire data view.
- **Quotas**: Tracks machine and location counts against Licencee limits.

### User Management
- **RBAC**: Role-Based Access Control (Developer, Admin, Manager, etc.).
- **Inheritance**: Cashiers created by a Manager automatically inherit that Manager's property assignments.

### Activity Logging
- **Audit Trail**: Every critical change (User Edit, Licencee Update) is logged to the `activitylogs` collection.
- **Visibility**: Only Admins/Developers can view the full activity stream.

---

## 3. Implementation Reference

| Feature | Logic Location | Context |
| :--- | :--- | :--- |
| **Login Flow** | `app/api/auth/login/route.ts` | Multi-step verification. |
| **User CRUD** | `app/api/administration/users/route.ts` | Filtered by requester roles. |
| **Activity Log** | `lib/helpers/activityLog.ts` | Standardized internal logger. |

---
**Maintained By**: Evolution One Development Team
