# Backend Documentation Overview

Welcome to the Evolution One CMS backend documentation. This section details the architecture, common patterns, and high-level flows of the system's API.

## 1. Directory Structure

The backend logic is primarily located in the `app/api` directory:

-   `app/api/`: Contains Next.js Route Handlers (the API endpoints).
-   `app/api/lib/`: Internal backend libraries and helpers.
    -   `helpers/`: Reusable validation, authentication, and logic helpers.
    -   `middleware/`: Standard database and security middleware.
    -   `models/`: Mongoose schemas for MongoDB.

## 2. API Design Patterns

### `withApiAuth` Wrapper
All standard API routes should be wrapped using the `withApiAuth` higher-order component. This centralizes:
-   **Authentication**: Verifying JWT tokens from cookies.
-   **Database Connectivity**: Ensuring a connection is established.
-   **User Context Injection**: Providing `user`, `userRoles`, and `isAdminOrDev` flags to the handler.
-   **Global Error Handling**: Catching uncaught exceptions and returning standard JSON errors.

Example Usage:
```typescript
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user, userRoles }) => {
    // Logic here...
  });
}
```

## 3. Security and RBAC

The system employs a multi-tier Role-Based Access Control (RBAC) model:
-   **Access Restricted via Middleware**: Initial checks are performed by the `withApiAuth` wrapper.
-   **Fine-Grained Permissions**: Individual routes perform additional checks (e.g., location assignments via `getUserLocationFilter`).
-   **Licencee Isolation**: Data is filtered by `licencee` or `locationId` to ensure data privacy between different operators.

## 4. Documentation Links

Explore the detailed API flows and restrictions:
-   [Page and Tab Access Restrictions](./api-flows/page-auth-restrictions.md)
-   [Vault Management Flows](./api-flows/vault-management.md)
-   [Shift Management Architecture](./api-flows/shift-management.md)
-   [Payout and Transaction Handling](./api-flows/payout-flow.md)

---
*Maintained by the Dynamic1 Engineering Team*
