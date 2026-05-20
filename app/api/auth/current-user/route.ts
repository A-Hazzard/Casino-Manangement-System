/**
 * Current User API Route
 *
 * This route handles fetching the current authenticated user's data from the database.
 * It supports:
 * - JWT token validation and user authentication
 * - Session version checking for permission changes
 * - Profile validation and update requirements
 * - User data hydration with permissions
 *
 * @module app/api/auth/current-user/route
 */

import {
  getInvalidProfileFields,
  hasInvalidProfileFields,
  ProfileLike,
} from '@/app/api/lib/helpers/profileValidation';
import {
  getUserById,
  getUserFromServer,
} from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/auth/current-user
 *
 * Returns the full profile for the currently authenticated user. Takes no query
 * params; reads the `token` JWT cookie, validates the sessionVersion against the
 * database to detect permission changes, and hydrates profile-completeness flags.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/auth/current-user';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Authenticate user from JWT token
    // ============================================================================
    const jwtUser = await getUserFromServer();

    if (!jwtUser) {
      logRouteError(
        functionName,
        'GET',
        '/api/auth/current-user',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = jwtUser._id as string;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Fetch user data from database
    // ============================================================================
    const dbUser = await getUserById(userId);

    if (!dbUser || Array.isArray(dbUser)) {
      logRouteError(
        functionName,
        'GET',
        '/api/auth/current-user',
        `Not found: ${userId}`,
        user
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Note: Permission validation is handled by sessionVersion checking in getUserFromServer()
    // The sessionVersion is incremented whenever permissions change, which automatically
    // invalidates the JWT token. This endpoint doesn't need to double-check permissions
    // because getUserFromServer() already validates sessionVersion and hydrates permissions
    // from the database if they're missing from the JWT.

    // ============================================================================
    // STEP 4: Validate profile fields
    // ============================================================================
    const { invalidFields, reasons } = getInvalidProfileFields(
      dbUser as ProfileLike
    );
    const requiresProfileUpdate = hasInvalidProfileFields(invalidFields);

    // ============================================================================
    // STEP 5: Return user data with validation status
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/auth/current-user',
      1,
      user,
      duration
    );
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser._id?.toString() || '',
        _id: dbUser._id?.toString() || '',
        username: dbUser.username || '',
        emailAddress: dbUser.emailAddress || '',
        profile: dbUser.profile || {},
        roles: dbUser.roles || [],
        isEnabled: dbUser.isEnabled ?? true,
        assignedLocations: dbUser.assignedLocations || undefined,
        assignedLicencees: dbUser.assignedLicencees || undefined,
        createdAt: dbUser.createdAt || new Date(),
        updatedAt: dbUser.updatedAt || new Date(),
        tempPasswordChanged: dbUser.tempPasswordChanged ?? true,
        tempPassword: dbUser.tempPassword ?? null,
        moneyInMultiplier: dbUser.moneyInMultiplier ?? null,
        moneyOutAndJackpotMultiplier:
          dbUser.moneyOutAndJackpotMultiplier ?? null,
        reviewerMultiplierStartTime: dbUser.reviewerMultiplierStartTime ?? null,
        requiresProfileUpdate,
        requiresPasswordUpdate: !!invalidFields.password,
        invalidProfileFields: invalidFields,
        invalidProfileReasons: reasons,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/auth/current-user',
      errorMessage,
      user
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
