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
    return false;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[MIDDLEWARE] Database context validation passed`);
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API requests & public assets
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

  // Debug logging for infinite loop investigation
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MIDDLEWARE] Processing: ${pathname}`);
  }

  const token = request.cookies.get('token')?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);

      if (payload) {
        // Database context validation
        if (!validateDatabaseContext(payload)) {
          console.warn(
            '🔴 [MIDDLEWARE] Database context mismatch - forcing re-authentication'
          );
          console.warn('🔍 Payload dbContext:', payload.dbContext);
          console.warn('🔍 Current DB:', getCurrentDbConnectionString());
          return createLogoutResponse(request, 'database_context_mismatch');
        }

        // Check if user is enabled (from JWT payload)
        // Note: Database checks for deleted users are handled in API routes
        // since Edge Runtime doesn't support Mongoose
        if (payload.isEnabled === false) {
          console.warn('🔴 [MIDDLEWARE] User account is disabled (from JWT)');
          return createLogoutResponse(request, 'account_disabled');
        }

        isAuthenticated = true;
        console.warn(
          '✅ [MIDDLEWARE] Token validated successfully for:',
          payload.emailAddress
        );

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[MIDDLEWARE] User authenticated: ${
              payload.emailAddress || 'NO_EMAIL'
            }`
          );
        }
      }
    } catch (err) {
      console.error('JWT verification failed:', err);
      return createLogoutResponse(request, 'invalid_token');
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MIDDLEWARE] No token found for ${pathname}`);
    }
  }

  const isPublicPath = publicPaths.includes(pathname);

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[MIDDLEWARE] isAuthenticated: ${isAuthenticated}, isPublicPath: ${isPublicPath}, pathname: ${pathname}`
    );
  }

  // Redirect logged-in users away from public pages
  if (isAuthenticated && isPublicPath) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[MIDDLEWARE] Redirecting authenticated user from ${pathname} to /`
      );
    }
    const redirectUrl = new URL('/', request.url);
    console.warn(
      '🔀 [MIDDLEWARE] Authenticated user on public page, redirecting to:',
      redirectUrl.toString()
    );
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users away from protected pages
  if (!isAuthenticated && !isPublicPath) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[MIDDLEWARE] Redirecting unauthenticated user from ${pathname} to /login`
      );
    }
    const redirectUrl = new URL('/login', request.url);
    console.warn(
      '🔀 [MIDDLEWARE] Unauthenticated user on protected page, redirecting to:',
      redirectUrl.toString()
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[MIDDLEWARE] Allowing access to ${pathname}`);
  }

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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  response.cookies.set('refreshToken', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  // Clear any additional cookies that might contain user data
  response.cookies.set('user', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.|api/).*)'],
};
