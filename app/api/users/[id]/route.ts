/**
 * User by ID API Route
 *
 * This route handles fetching, updating, and deleting individual users by ID.
 * It supports:
 * - Fetching user data by ID
 * - Updating user information
 * - API logging for all operations
 *
 * @module app/api/users/[id]/route
 */

import {
    getUserById,
    updateUser as updateUserHelper,
} from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '../../lib/services/loggerService';

/**
 * Main GET handler for fetching user by ID
 *
 * Flow:
 * 1. Resolve route parameters
 * 2. Initialize API logging
 * 3. Connect to database
 * 4. Validate user ID
 * 5. Fetch user from database
 * 6. Return user data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const startTime = Date.now();
  const resolvedParams = await params;
  const context = apiLogger.createContext(
    request,
    `/api/users/${resolvedParams.id}`
  );
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Validate user ID
    // ============================================================================
    const userId = resolvedParams.id;

    if (!userId) {
      apiLogger.logError(context, 'User fetch failed', 'User ID is required');
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch user from database
    // ============================================================================
    const user = await getUserById(userId);
    if (!user) {
      apiLogger.logError(context, 'User fetch failed', 'User not found');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Format user data
    // ============================================================================
    if (Array.isArray(user)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const formattedUser = {
      ...user,
    };

    // ============================================================================
    // STEP 5: Return user data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Users API] GET completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully fetched user ${userId}`);
    return NextResponse.json({ success: true, user: formattedUser });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Users API] GET error after ${duration}ms:`, errorMsg);
    apiLogger.logError(context, 'User fetch failed', errorMsg);
    return NextResponse.json(
      {
        success: false,
        message:
          errorMsg === 'User not found' ? errorMsg : 'Failed to fetch user',
        error: errorMsg,
      },
      { status: errorMsg === 'User not found' ? 404 : 500 }
    );
  }
}

/**
 * Main PUT handler for updating user by ID
 *
 * Flow:
 * 1. Resolve route parameters
 * 2. Initialize API logging
 * 3. Connect to database
 * 4. Parse request body
 * 5. Validate user ID
 * 6. Update user in database
 * 7. Return updated user data
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const startTime = Date.now();
  const resolvedParams = await params;
  const context = apiLogger.createContext(
    request,
    `/api/users/${resolvedParams.id}`
  );
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const { _id, ...updateFields } = body;

    // ============================================================================
    // STEP 3: Validate user ID
    // ============================================================================
    // Use the ID from the URL parameter
    const userId = resolvedParams.id;

    if (!userId) {
      apiLogger.logError(context, 'User update failed', 'User ID is required');
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Update user in database
    // ============================================================================
    const updatedUser = await updateUserHelper(userId, updateFields, request);

    // ============================================================================
    // STEP 5: Convert Mongoose document to plain object
    // ============================================================================
    const userObject = updatedUser.toObject
      ? updatedUser.toObject({ virtuals: false, getters: true })
      : updatedUser;

    const formattedUser = {
      ...userObject,
    };

    // ============================================================================
    // STEP 6: Return updated user data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Users API] PUT completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully updated user ${userId}`);
    return NextResponse.json({ success: true, user: formattedUser });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Users API] PUT error after ${duration}ms:`, errorMsg);
    apiLogger.logError(context, 'User update failed', errorMsg);
    return NextResponse.json(
      {
        success: false,
        message: errorMsg === 'User not found' ? errorMsg : 'Update failed',
        error: errorMsg,
      },
      { status: errorMsg === 'User not found' ? 404 : 500 }
    );
  }
}

/**
 * Main PATCH handler for updating user by ID
 *
 * Flow:
 * 1. Resolve route parameters
 * 2. Initialize API logging
 * 3. Connect to database
 * 4. Parse request body
 * 5. Validate user ID
 * 6. Update user in database
 * 7. Return updated user data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const startTime = Date.now();
  const resolvedParams = await params;
  const context = apiLogger.createContext(
    request,
    `/api/users/${resolvedParams.id}`
  );
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const { _id, ...updateFields } = body;

    // ============================================================================
    // STEP 3: Validate user ID
    // ============================================================================
    // Use the ID from the URL parameter
    const userId = resolvedParams.id;

    if (!userId) {
      apiLogger.logError(context, 'User update failed', 'User ID is required');
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Update user in database
    // ============================================================================
    const updatedUser = await updateUserHelper(userId, updateFields, request);

    // ============================================================================
    // STEP 5: Convert Mongoose document to plain object
    // ============================================================================
    const userObject = updatedUser.toObject
      ? updatedUser.toObject({ virtuals: false, getters: true })
      : updatedUser;

    const formattedUser = {
      ...userObject,
    };

    // ============================================================================
    // STEP 6: Return updated user data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Users API] PATCH completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully updated user ${userId}`);
    return NextResponse.json({ success: true, user: formattedUser });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Users API] PATCH error after ${duration}ms:`, errorMsg);
    apiLogger.logError(context, 'User update failed', errorMsg);
    return NextResponse.json(
      {
        success: false,
        message: errorMsg === 'User not found' ? errorMsg : 'Update failed',
        error: errorMsg,
      },
      { status: errorMsg === 'User not found' ? 404 : 500 }
    );
  }
}
