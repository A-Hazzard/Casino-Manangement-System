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
} from '@/app/api/lib/helpers/profileValidation';
import { getUserById, getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for current user
 *
 * Flow:
 * 1. Authenticate user from JWT token
 * 2. Connect to database
 * 3. Fetch user data from database
 * 4. Validate profile fields
 * 5. Return user data with validation status
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Authenticate user from JWT token
    // ============================================================================
    const jwtUser = await getUserFromServer();
    if (!jwtUser) {
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
    const { invalidFields, reasons } = getInvalidProfileFields(dbUser as never);
    const requiresProfileUpdate = hasInvalidProfileFields(invalidFields);

    // ============================================================================
    // STEP 5: Return user data with validation status
    // ============================================================================
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser._id?.toString() || '',
        username: dbUser.username || '',
        emailAddress: dbUser.emailAddress || '',
        profile: dbUser.profile || {},
        roles: dbUser.roles || [],
        isEnabled: dbUser.isEnabled ?? true,
        assignedLocations: dbUser.assignedLocations || undefined,
        assignedLicensees: dbUser.assignedLicensees || undefined,
        createdAt: dbUser.createdAt || new Date(),
        updatedAt: dbUser.updatedAt || new Date(),
        requiresProfileUpdate,
        invalidProfileFields: invalidFields,
        invalidProfileReasons: reasons,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Current User API] Error after ${duration}ms:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
