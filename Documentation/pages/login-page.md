# Login Page Implementation (`/login`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** June 5, 2026  
**Version:** 4.4.0

---

**User Flow:**

1. **Credentials**: Validates Username/Password via `POST /api/auth/login`.
2. **Location Selection**: If user is assigned to multiple properties, they must select a primary location for the session.
3. **TOTP Gate**: If 2FA is enabled, user must enter their 6-digit code.

**State Management:**

- `useAuth` hook manages the multi-step login state.
- Post-login, user is redirected based on role (`/vault/cashier/payouts` for cashiers, `/vault/management` for vault-managers, `/` for managers).
