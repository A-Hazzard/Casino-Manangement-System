# Administration Page Implementation (`/administration`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.1.0

---

## 1. Page Overview

Management hub for users, corporate entities (Licencees), and system-wide audit logging.

---

## 2. Data & API Architecture (By Section)

### 👥 Personnel Management Table
The master directory for controlling user access and profile data.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **User Name** | `username` | `GET /api/users` |
| **Email Address** | `emailAddress` | `GET /api/users` |
| **Assigned Role** | `roles` | `GET /api/users` |
| **Account Status** | `isEnabled` | `GET /api/users` |

- **Filters**: Responsive to `Licencee`, `Role`, `Search` (Username/Email), and `Status`.
- **Implementation**: `AdministrationUsersSection` using the `useAdministrationUsers` hook.

### 🏢 Corporate Entity Registry
High-level management of Licencees and their associated property quotas.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Licencee Name** | `name` | `GET /api/licencees` |
| **Location Count** | `locations.length` | `GET /api/licencees` |
| **Contact Email** | `contactInfo.email` | `GET /api/licencees` |

- **Security**: Only visible to users with the `Developer` role.
- **Implementation**: `AdministrationLicenceesSection` using the `useAdministrationLicencees` hook.

### 📜 Platform Audit Stream
A comprehensive forensic log of all critical system mutations.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Performed By** | `username` | `GET /api/activitylogs` |
| **Action Taken** | `action` | `GET /api/activitylogs` |
| **Target Resource** | `metadata.resourceName`| `GET /api/activitylogs` |

- **Interactive**: Clicking a row reveals a JSON `diff` of the before-and-after state of the modified resource.
- **Implementation**: `AdministrationActivityLogsTable` with server-side pagination.

### 🌍 Geographic Zone Manager
Management of supported countries and their respective jurisdictional defaults.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Country Name** | `name` | `GET /api/countries` |
| **Currency Code** | `currencyCode` | `GET /api/countries` |
| **Tax Default** | `defaultTaxRate` | `GET /api/countries` |

- **Implementation**: `AdministrationCountriesSection` component.

---

## 3. Personnel Lifecycle (CRUD)

- **Onboarding**: Triggers `POST /api/users` via the "Add Staff" modal. Requires mandatory `gender` selection and follows role-hierarchy validation.
- **Suspension**: Triggers `PUT /api/users/[id]` with `isEnabled: false`. This immediately invalidates the user's current session version.
- **Entity Setup**: Triggers `POST /api/licencees` to initialize a new corporate client.

---

## 4. Role-Based Access Control (RBAC)

- **Developer**: Global access to all tabs, including the Corporate Registry and Audit Stream.
- **Admin**: Access to Personnel Management and Audit Stream for their specific Licencee.
- **Manager**: Limited to the Personnel Management tab; can only manage roles equal to or lower than "Manager".
- **Gating**: The UI uses a `roleCheck` higher-order component to conditionally render tabs based on the user's JWT payload.

---

## 5. Visual Indicators & Cues

- 🛡️ **Admin Badge**: A distinctive icon next to usernames with `Admin` or `Developer` roles.
- 🟡 **Pending Activation**: Highlights users who have not yet logged in with their temporary credentials.
- 🔴 **Disabled Row**: Users marked as `isEnabled: false` are grayed out with a red status pill.

---

## 6. Technical UI Standards

- **Skeleton UX**: `DirectorySkeleton` and `LogsSkeleton` are used for initial hydration.
- **Performance**: The Audit Stream uses an intersection observer for lazy-loading historical logs beyond the first page.
- **Search Latency**: Filter changes trigger a `350ms` debounced re-fetch to optimize database query load.

---

## 3. CRUD Feature Triggers

- **Create User**: Triggers `POST /api/users` via the "New User" modal.
- **Edit User**: Triggers `PUT /api/users/[id]` upon form submission.
- **Disable Licencee**: Triggers `PATCH /api/licencees/[id]/status`.

---

## 4. Role Detection

- **Developer**: Access to `GET /api/licencees`.
- **Admin**: Access to `GET /api/users` (Scoped to their Licencee).
- **Manager**: No access to the "Licencee" tab; UI hides the tab element via `roleCheck` helper.

---

## 5. Visual Indicators

- 🔑 **Temp Password**: Highlighted in yellow if the user hasn't completed the "First Login" wizard.
- 🚫 **Banned**: Row opacity reduced to 50% with a "Disabled" badge.

---
**Internal Document** - Engineering Team
