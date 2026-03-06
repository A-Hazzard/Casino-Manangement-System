# HTTP/HTTPS Cookie & Security Rules

## The Core Problem

Browsers **silently drop** cookies with `secure: true` when the connection is HTTP (not HTTPS).
This breaks authentication entirely when accessing via:
- Local IP addresses: `http://192.168.8.2:3000`
- HTTP-only staging servers
- Any non-HTTPS development environment

---

## The Golden Rule

> **`secure` must always be conditional — never hardcoded to `true`.**

---

## Environment Detection Utility

Create and import this helper everywhere cookies are set:

```typescript
// lib/utils/cookieSecurity.ts

/**
 * Determines if cookies should use the `secure` flag.
 *
 * Rules:
 * - Production + HTTPS → secure: true
 * - Production + HTTP (IP access, no proxy) → secure: false
 * - Development → secure: false
 *
 * Never hardcode `secure: true`. Always use this helper.
 */
export function isSecureContext(request?: Request | { url: string; headers: { get: (key: string) => string | null } }): boolean {
  // Explicit override via environment variable (see .env rules below)
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;

  // Development is never secure
  if (process.env.NODE_ENV === 'development') return false;

  // In production, detect from request
  if (request) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto) return proto === 'https';
    return request.url.startsWith('https://');
  }

  // Default: production assumes HTTPS unless overridden
  return process.env.NODE_ENV === 'production';
}

/**
 * Returns the correct sameSite value.
 * 'none' requires secure: true — use 'lax' when not secure.
 */
export function getSameSite(secure: boolean): 'lax' | 'strict' | 'none' {
  // 'none' only works with secure cookies (cross-site scenarios)
  return 'lax';
}

/**
 * Returns a full cookie options object for auth cookies.
 */
export function getAuthCookieOptions(
  request?: Parameters<typeof isSecureContext>[0],
  overrides?: Partial<{ maxAge: number; httpOnly: boolean; path: string }>
) {
  const secure = isSecureContext(request);
  return {
    httpOnly: true,
    secure,
    sameSite: getSameSite(secure),
    path: '/',
    ...overrides,
  };
}
```

---

## Environment Variables

Add to your `.env.local` (development) and production `.env`:

```bash
# .env.local (development / IP access)
COOKIE_SECURE=false

# .env.production (deployed with HTTPS via reverse proxy / domain)
# Leave unset — auto-detected from x-forwarded-proto header

# .env.production (deployed with direct HTTP only, e.g. bare IP in production)
COOKIE_SECURE=false
```

> **Do you need an env var?**
> You don't *have* to — the `isSecureContext()` helper auto-detects from the request.
> But `COOKIE_SECURE=false` is a useful escape hatch for unusual deployments (e.g. production
> on a LAN with no reverse proxy). Set it explicitly when auto-detection isn't reliable.

---

## Cookie Setting Rules

### ✅ CORRECT — Conditional secure flag

```typescript
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';

// In API route handler (has access to request)
const cookieOptions = getAuthCookieOptions(request, { maxAge: 60 * 60 * 24 * 7 });
response.cookies.set('token', jwtToken, cookieOptions);
response.cookies.set('refreshToken', refreshToken, {
  ...cookieOptions,
  maxAge: 60 * 60 * 24 * 30,
});
```

### ❌ WRONG — Hardcoded secure

```typescript
// NEVER DO THIS
response.cookies.set('token', jwtToken, {
  httpOnly: true,
  secure: true,        // ← breaks HTTP/IP access
  sameSite: 'lax',
  path: '/',
});
```

### ✅ CORRECT — Clearing cookies (logout / middleware)

```typescript
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';

const clearOptions = getAuthCookieOptions(request, { maxAge: 0 });
// maxAge: 0 or expires: new Date(0) both work
response.cookies.set('token', '', { ...clearOptions, expires: new Date(0) });
response.cookies.set('refreshToken', '', { ...clearOptions, expires: new Date(0) });
```

---

## Middleware (proxy.ts) Rules

```typescript
// proxy.ts — createLogoutResponse
function createLogoutResponse(request: NextRequest, error: string): NextResponse {
  const redirectUrl = new URL(
    error === 'database_context_mismatch' ? '/login' : `/login?error=${error}`,
    request.url
  );
  const response = NextResponse.redirect(redirectUrl);

  // Detect secure context from the incoming request
  const proto = request.headers.get('x-forwarded-proto');
  const secure = proto ? proto === 'https' : request.url.startsWith('https://');

  const clearOptions = {
    expires: new Date(0),
    httpOnly: true,
    secure,                // ← conditional, not hardcoded
    sameSite: 'lax' as const,
    path: '/',
  };

  response.cookies.set('token', '', clearOptions);
  response.cookies.set('refreshToken', '', clearOptions);
  response.cookies.set('user', '', clearOptions);

  return response;
}
```

---

## Quick Reference Checklist

| Scenario | `secure` value | Why |
|---|---|---|
| `https://yourdomain.com` (production) | `true` | HTTPS confirmed |
| `http://192.168.8.2:3000` (LAN IP) | `false` | No TLS |
| `http://localhost:3000` (dev) | `false` | No TLS |
| Behind nginx/Caddy with HTTPS | `true` | `x-forwarded-proto: https` |
| Behind reverse proxy, HTTP internally | Use `x-forwarded-proto` | Proxy adds header |

---

## Files That Must Follow These Rules

Every file that calls `response.cookies.set()` or `cookies().set()`:

- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/refresh/route.ts`
- `app/api/auth/reset-password/route.ts` (if sets cookies)
- `proxy.ts` (middleware)
- Any other API route that touches cookies

---

## sameSite Notes

- **`lax`** — Safe default. Works for HTTP and HTTPS. Cookies sent on top-level navigation.
- **`strict`** — More secure but breaks OAuth/external redirects back to your app.
- **`none`** — Requires `secure: true`. Only needed for cross-site embedding (iframes, third-party). **Do not use** unless you specifically need cross-site cookies.

For this application, always use `sameSite: 'lax'`.
