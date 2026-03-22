# withApiAuth Utility Flow

The `withApiAuth` wrapper is the central gateway for all API routes in the Evolution One CMS. It ensures consistent authentication, database availability, and standardized error handling across the backend.

## Architectural Goal
- **DRY (Don't Repeat Yourself)**: Avoid manual `connectDB` and `getUserFromServer` calls in every route.
- **Security First**: Automatically verify JWT tokens and inject user context.
- **Flexibility**: Support public or DB-less routes via option flags (`optionalAuth`, `bypassDb`).
- **Standardized Errors**: Return 401 (Unauthorized), 403 (Forbidden), and 500 (Server Error) in consistent JSON formats.

---

## Core Flow (Sequence of Operations)

1.  **Incoming Request**: The wrapper receives the `NextRequest` and an internal `handler` function.
2.  **Database Connection**:
    *   If `bypassDb` is true, skips this step.
    *   Otherwise, calls `connectDB()` to ensure the MongoDB connection is alive.
3.  **Authentication**:
    *   Calls `getUserFromServer()` to extract and verify the JWT from cookies/headers.
    *   If `optionalAuth` is true, allows the request to continue even if the user is null.
    *   Otherwise, if no user is found, returns a **401 Unauthorized** response.
4.  **Context Preparation**:
    *   Extracts `userRoles` from the JWT payload.
    *   Computes `isAdminOrDev` based on the presence of the 'admin' or 'developer' roles.
    *   Prepares an `ApiAuthContext` object with the hydrated `user`, `userRoles`, and `isAdminOrDev`.
5.  **Handler Execution**: Executes the wrapped route handler, passing the prepared context.
6.  **Response Handling**:
    *   If the handler succeeds, returns its `NextResponse`.
    *   If the handler throws an error, logs it as a **500 Internal Server Error** with a consistent JSON body.

---

## Example Usage

```typescript
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user, userRoles, isAdminOrDev }) => {
    // Auth and DB are already handled here!
    const data = await MyModel.find().lean();
    return NextResponse.json({ success: true, data });
  });
}
```

## Options Configuration
The `withApiAuth` function accepts an optional `options` object:
- `optionalAuth` (default `false`): If true, doesn't error on missing user.
- `bypassDb` (default `false`): If true, doesn't call `connectDB`. Useful for static or external utility routes.
