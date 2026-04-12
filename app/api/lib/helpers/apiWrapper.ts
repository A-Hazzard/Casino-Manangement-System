import { NextResponse, NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';

/**
 * Common API Response Types
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
};

import { mongo } from 'mongoose';

/**
 * Standard Auth Data returned by the wrapper
 */
export type ApiAuthContext = {
  user: {
    _id: string;
    username?: string;
    emailAddress?: string;
    roles?: string[];
    assignedLicencees?: string[];
    assignedLocations?: string[];
    [key: string]: unknown;
  };
  userRoles: string[];
  isAdminOrDev: boolean;
  db?: mongo.Db;
};




/**
 * Higher-order function to wrap API route handlers with common logic
 * Handles database connection, authentication, and standardized error responses.
 */
export async function withApiAuth(
  req: NextRequest,
  handler: (context: ApiAuthContext) => Promise<NextResponse>,
  options: {
    optionalAuth?: boolean;
    bypassDb?: boolean;
  } = {}
): Promise<NextResponse> {
  try {
    // 1. Connect to Database (unless bypassed)
    let db: mongo.Db | undefined;

    if (!options.bypassDb) {
      db = await connectDB();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database connection failed' },
          { status: 500 }
        );
      }
    }

    // 2. Authenticate User
    const userPayload = await getUserFromServer();
    
    // If not public and no user, return 401
    if (!userPayload && !options.optionalAuth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev = userRoles.includes('admin') || userRoles.includes('developer') || userRoles.includes('owner');

    // 3. Execute Handler
    return await handler({
      user: userPayload as ApiAuthContext['user'],
      userRoles,
      isAdminOrDev,
      db,
    });

  } catch (error: Error | unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API Wrapper Error]:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
