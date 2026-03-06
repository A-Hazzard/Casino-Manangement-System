type RequestLike = {
  url: string;
  headers: { get: (key: string) => string | null };
};

/**
 * Determines if cookies should use the `secure` flag.
 *
 * Priority order:
 * 1. COOKIE_SECURE env var ("true"/"false") — explicit override
 * 2. NODE_ENV === 'development' → always false
 * 3. x-forwarded-proto header (set by reverse proxies like nginx/Caddy)
 * 4. Request URL protocol as fallback
 * 5. Default: true in production (assumes HTTPS)
 *
 * Never hardcode `secure: true`. Always use this helper so that
 * LAN/IP HTTP access (e.g. http://192.168.8.2:3000) works correctly.
 */
export function isSecureContext(request?: RequestLike): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  if (process.env.NODE_ENV === 'development') return false;
  if (request) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto) return proto === 'https';
    return request.url.startsWith('https://');
  }
  return true;
}

type CookieOverrides = {
  maxAge?: number;
  httpOnly?: boolean;
  path?: string;
  expires?: Date;
};

/**
 * Returns a full cookie options object for auth cookies.
 * Always use this instead of hardcoding `secure: true`.
 */
export function getAuthCookieOptions(
  request?: RequestLike,
  overrides?: CookieOverrides
) {
  const secure = isSecureContext(request);
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...overrides,
  };
}
