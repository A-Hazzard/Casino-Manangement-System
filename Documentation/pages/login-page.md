# Login Page Implementation (`/login`)

**User Flow:**
1. **Credentials**: Validates Username/Password via `POST /api/auth/login`.
2. **Location Selection**: If user is assigned to multiple properties, they must select a primary location for the session.
3. **TOTP Gate**: If 2FA is enabled, user must enter their 6-digit code.

**State Management:**
- `useAuth` hook manages the multi-step login state.
- Post-login, user is redirected based on role (`/vault` for cashiers, `/` for managers).
