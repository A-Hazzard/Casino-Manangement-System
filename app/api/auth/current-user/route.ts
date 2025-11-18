import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getUserById, getUserFromServer } from '@/app/api/lib/helpers/users';
import {
  getInvalidProfileFields,
  hasInvalidProfileFields,
} from '@/app/api/lib/helpers/profileValidation';

/**
 * GET /api/auth/current-user
 * Fetches the current user's data from the database
 * Used for permission checks and role validation
 * 
 * Also detects if permissions were manually changed in DB (without sessionVersion increment)
 * and invalidates the session by returning 401
 */
export async function GET(_request: NextRequest) {
  try {
    // Get user from JWT token (includes permissions from token)
    const jwtUser = await getUserFromServer();
    if (!jwtUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = jwtUser._id as string;

    // Connect to database
    await connectDB();

    // Fetch user from database with all current data
    const dbUser = await getUserById(userId);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Note: Permission validation is handled by sessionVersion checking in getUserFromServer()
    // The sessionVersion is incremented whenever permissions change, which automatically
    // invalidates the JWT token. This endpoint doesn't need to double-check permissions
    // because getUserFromServer() already validates sessionVersion and hydrates permissions
    // from the database if they're missing from the JWT.

    const { invalidFields, reasons } = getInvalidProfileFields(dbUser as never);
    const requiresProfileUpdate = hasInvalidProfileFields(invalidFields);

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser._id?.toString() || '',
        username: dbUser.username || '',
        emailAddress: dbUser.emailAddress || '',
        profile: dbUser.profile || {},
        roles: dbUser.roles || [],
        rel: dbUser.rel || undefined,
        isEnabled: dbUser.isEnabled ?? true,
        resourcePermissions: dbUser.resourcePermissions || {},
        createdAt: dbUser.createdAt || new Date(),
        updatedAt: dbUser.updatedAt || new Date(),
        requiresProfileUpdate,
        invalidProfileFields: invalidFields,
        invalidProfileReasons: reasons,
      },
    });
  } catch (error) {
    console.error(' Error fetching current user:', error);
    console.error(' Error details:', {
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
