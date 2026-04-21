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
 * GET /api/users/[id]
 *
 * Fetches a single user document by ID for the Users management page.
 *
 * URL params:
 * @param id {string} Required (path). The string `_id` of the user to retrieve.
 */
export async function GET(
  request: NextRequest
): Promise<Response> {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const userId = pathname.split('/').pop();
  const context = apiLogger.createContext(
    request,
    `/api/users/${userId}`
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
 * PUT /api/users/[id]
 *
 * Performs a full replacement update of a user record; used by the Users management
 * page to save changes to profile, roles, and access assignments. `_id` is stripped
 * from the body before the update is applied so the path param is always authoritative.
 *
 * URL params:
 * @param id {string} Required (path). The string `_id` of the user to update.
 *
 * Body fields:
 * @param _id              {string}   Ignored. Stripped before update; the path `id` is used instead.
 * @param roles            {string[]} Optional. New role list for the user (e.g. `["manager", "collector"]`).
 *                                    Triggers `sessionVersion` increment to force re-login.
 * @param assignedLocations  {string[]} Optional. Location IDs the user is permitted to access.
 *                                    Restricted to admin/owner/developer; silently stripped for others.
 * @param assignedLicencees  {string[]} Optional. Licencee IDs that scope the user's data visibility.
 *                                    Restricted to admin/owner/developer; silently stripped for others.
 * @param isEnabled        {boolean}  Optional. Activates or deactivates the user account.
 * @param multiplier       {number}   Optional. Reviewer-scale multiplier (reviewer role only).
 *                                    Restricted to admin/owner/developer; silently stripped for others.
 * @param profile          {object}   Optional. Nested profile fields: `firstName`, `lastName`,
 *                                    `gender`, `phoneNumber`, `identification` (idType/idNumber).
 * @param username         {string}   Optional. Login username; must be unique across all users.
 * @param emailAddress     {string}   Optional. Login email; must be unique across all users.
 * @param password         {string}   Optional. New plain-text password; hashed before storage.
 */
export async function PUT(
  request: NextRequest
): Promise<Response> {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const userId = pathname.split('/').pop();
  const context = apiLogger.createContext(
    request,
    `/api/users/${userId}`
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
 * PATCH /api/users/[id]
 *
 * Applies a partial update to a user record; used for targeted field changes (e.g.
 * toggling `isEnabled`, updating a single profile field) without sending the full
 * document. Identical permission enforcement to PUT — `_id` is stripped from the body
 * and the path param is used as the authoritative identifier.
 *
 * URL params:
 * @param id {string} Required (path). The string `_id` of the user to update.
 *
 * Body fields (all optional; only provided fields are applied):
 * @param _id              {string}   Ignored. Stripped before update; the path `id` is used instead.
 * @param roles            {string[]} New role list. Triggers `sessionVersion` increment to force re-login.
 * @param assignedLocations  {string[]} Location IDs the user is permitted to access.
 *                                    Restricted to admin/owner/developer; silently stripped for others.
 * @param assignedLicencees  {string[]} Licencee IDs that scope the user's data visibility.
 *                                    Restricted to admin/owner/developer; silently stripped for others.
 * @param isEnabled        {boolean}  Activates or deactivates the user account.
 * @param multiplier       {number}   Reviewer-scale multiplier (reviewer role only).
 *                                    Restricted to admin/owner/developer; silently stripped for others.
 * @param profile          {object}   Nested profile fields: `firstName`, `lastName`,
 *                                    `gender`, `phoneNumber`, `identification` (idType/idNumber).
 * @param username         {string}   Login username; must be unique across all users.
 * @param emailAddress     {string}   Login email; must be unique across all users.
 * @param password         {string}   New plain-text password; hashed before storage.
 */
export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const userId = pathname.split('/').pop();
  const context = apiLogger.createContext(
    request,
    `/api/users/${userId}`
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
