/**
 * E2E Test Auth Endpoint
 *
 * Generates a real JWT for a mock user and sets it as an auth cookie.
 * Only available in development/test environments — returns 404 in production.
 *
 * Used by Playwright's auth fixture so tests receive a properly signed
 * token that the Next.js middleware (proxy.ts) will accept.
 *
 * @module app/api/e2e/auth/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from '@/lib/utils/auth';
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/e2e/auth
 *
 * @body {Object} user - REQUIRED. MockUserPayload containing _id, username, roles, etc.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/e2e/auth';
  const logUser = extractUserFromRequest(request);

  // ============================================================================
  // STEP 1: Verify environment
  // ============================================================================
  // Only available outside production unless specifically enabled
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ENABLE_E2E_AUTH !== 'true'
  ) {
    logRouteError(functionName, 'POST', '/api/e2e/auth', 'Not found', logUser);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ============================================================================
  // STEP 2: Parse request body
  // ============================================================================
  const body = await request.json();
  const user = body.user as {
    _id: string;
    username: string;
    emailAddress: string;
    isEnabled: boolean;
    roles?: string[];
    assignedLocations?: string[];
    assignedLicencees?: string[];
  };

  if (!user?._id) {
    logRouteError(
      functionName,
      'POST',
      '/api/e2e/auth',
      'user._id is required',
      logUser
    );
    return NextResponse.json(
      { error: 'user._id is required' },
      { status: 400 }
    );
  }

  // ============================================================================
  // STEP 3: Generate access token
  // ============================================================================
  // generateAccessToken automatically fills sessionId and dbContext from env
  const token = await generateAccessToken({
    _id: user._id,
    username: user.username,
    emailAddress: user.emailAddress,
    isEnabled: user.isEnabled,
    roles: user.roles,
    assignedLocations: user.assignedLocations,
    assignedLicencees: user.assignedLicencees,
    sessionId: `e2e-session-${user._id}`,
    dbContext: { connectionString: '', timestamp: 0 }, // overwritten by generateAccessToken
  });

  // ============================================================================
  // STEP 4: Set auth cookie and return response
  // ============================================================================
  const response = NextResponse.json({
    success: true,
    data: { user },
    timestamp: new Date().toISOString(),
  });

  const cookieOptions = getAuthCookieOptions(request, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  response.cookies.set('token', token, cookieOptions);

  const duration = Date.now() - startTime;
  logRouteCreate(functionName, 'POST', '/api/e2e/auth', 1, logUser, duration);

  return response;
}
