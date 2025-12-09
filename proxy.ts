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

export async function proxy(request: NextRequest) {
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

  const token = request.cookies.get('token')?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);

      if (payload) {
        // Database context validation
        if (!validateDatabaseContext(payload)) {
          console.warn(
            '🔴 [PROXY] Database context mismatch - forcing re-authentication'
          );
          return createLogoutResponse(request, 'database_context_mismatch');
        }

        // Check if user is enabled (from JWT payload)
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

  // Redirect logged-in users away from public pages
  if (isAuthenticated && isPublicPath) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users away from protected pages
  if (!isAuthenticated && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
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
