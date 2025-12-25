/**
 * Next.js Middleware - Authentication & Route Protection
 *
 * This middleware handles authentication, route protection, and database context
 * validation for all requests. It intercepts requests before they reach the
 * application and enforces security policies.
 *
 * Features:
 * - JWT token verification and validation
 * - Database context validation (prevents cross-database access)
 * - Route protection (redirects unauthenticated users)
 * - Public path handling (login, forgot-password, etc.)
 * - User account status checking (disabled accounts)
 * - Automatic cookie clearing on authentication failures
 * - Asset and API route bypassing
 *
 * @module proxy
 */

import { getCurrentDbConnectionString, getJwtSecret } from '@/lib/utils/auth';
import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/forgot-password', '/reset-password'];

/**
 * Validates database context from JWT token
 */
function validateDatabaseContext(
  tokenPayload: Record<string, unknown>
): boolean {
  if (!tokenPayload.dbContext) {
    console.warn(
      'JWT token missing database context - forcing re-authentication'
    );
    return false;
  }

  const currentDbContext = {
    connectionString: getCurrentDbConnectionString(),
  };

  const tokenDbContext = tokenPayload.dbContext as {
    connectionString?: string;
  };

  // Check if database context has changed
  if (tokenDbContext.connectionString !== currentDbContext.connectionString) {
    console.warn('Database context mismatch - forcing re-authentication', {
      tokenContext: tokenDbContext,
      currentContext: currentDbContext,
    });

    // In development, provide helpful message
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '🔧 Development mode: Database context mismatch detected. This usually happens when MONGODB_URI changes. Clear your browser cookies and login again.'
      );
    }

    return false;
  }

  return true;
}

/**
 * Verifies JWT access token
 */
async function verifyAccessToken(token: string) {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Main middleware function for authentication and route protection
 *
 * Flow:
 * 1. Extract pathname from request URL
 * 2. Skip processing for API routes and static assets
 * 3. Extract JWT token from cookies
 * 4. Verify JWT token if present
 * 5. Validate database context from token
 * 6. Check user account status (enabled/disabled)
 * 7. Handle authenticated users on public pages (redirect to dashboard)
 * 8. Handle unauthenticated users on protected pages (redirect to login)
 * 9. Allow request to proceed if authentication is valid
 *
 * @param request - Next.js request object
 * @returns NextResponse with redirect or next() to continue
 */
export async function proxy(request: NextRequest) {
  // ============================================================================
  // STEP 1: Extract pathname from request URL
  // ============================================================================
  const { pathname } = request.nextUrl;

  // ============================================================================
  // STEP 2: Skip processing for API routes and static assets
  // ============================================================================
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(
      /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff|pdf|txt|css|js|woff|woff2|ttf|eot)$/i
    )
  ) {
    return NextResponse.next();
  }

  // ============================================================================
  // STEP 3: Extract JWT token from cookies
  // ============================================================================
  const token = request.cookies.get('token')?.value;
  let isAuthenticated = false;

  // ============================================================================
  // STEP 4: Verify JWT token if present
  // ============================================================================
  if (token) {
    try {
      const payload = await verifyAccessToken(token);

      if (payload) {
        // ============================================================================
        // STEP 5: Validate database context from token
        // ============================================================================
        if (!validateDatabaseContext(payload)) {
          console.warn(
            '🔴 [PROXY] Database context mismatch - forcing re-authentication'
          );
          return createLogoutResponse(request, 'database_context_mismatch');
        }

        // ============================================================================
        // STEP 6: Check user account status (enabled/disabled)
        // ============================================================================
        // Note: Database checks for deleted users are handled in API routes
        // since Edge Runtime doesn't support Mongoose
        if (payload.isEnabled === false) {
          console.warn('🔴 [PROXY] User account is disabled (from JWT)');
          return createLogoutResponse(request, 'account_disabled');
        }

        isAuthenticated = true;
      }
    } catch (err) {
      console.error('JWT verification failed:', err);
      return createLogoutResponse(request, 'invalid_token');
    }
  }

  const isPublicPath = publicPaths.includes(pathname);

  // ============================================================================
  // STEP 7: Handle authenticated users on public pages (redirect to dashboard)
  // ============================================================================
  if (isAuthenticated && isPublicPath) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // ============================================================================
  // STEP 8: Handle unauthenticated users on protected pages (redirect to login)
  // ============================================================================
  if (!isAuthenticated && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // ============================================================================
  // STEP 9: Allow request to proceed if authentication is valid
  // ============================================================================
  return NextResponse.next();
}

/**
 * Creates a logout response with cleared cookies
 */
function createLogoutResponse(
  request: NextRequest,
  error: string
): NextResponse {
  // For database context mismatch, redirect to clean /login without error parameter
  // This prevents the mismatch URL from persisting and causing issues
  const redirectUrl =
    error === 'database_context_mismatch'
      ? new URL('/login', request.url)
      : new URL(`/login?error=${error}`, request.url);

  const response = NextResponse.redirect(redirectUrl);

  // Clear all authentication cookies
  response.cookies.set('token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  response.cookies.set('refreshToken', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  // Clear any additional cookies that might contain user data
  response.cookies.set('user', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.|api/).*)'],
};
