/**
 * Create Cashier API
 *
 * POST /api/admin/cashiers
 *
 * Creates a new cashier account with temporary password.
 *
 * @module app/api/admin/cashiers/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { generateMongoId } from '@/lib/utils/id';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

interface CreateCashierRequest {
  name: string;
  email: string;
  locationId?: string;
}

/**
 * POST /api/admin/cashiers
 *
 * Creates a new cashier user account with a system-generated temporary password.
 * The caller receives the plaintext temporary password in the response so it can
 * be shared with the new cashier. Restricted to developer, admin, and manager roles.
 *
 * Body fields:
 * @body {string} name       - REQUIRED. Full display name for the new cashier account.
 * @body {string} email      - REQUIRED. Email address used as the login credential; must be unique.
 * @body {string} locationId - OPTIONAL. ID of the gaming location to associate with the cashier.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/admin/cashiers';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers',
        'Unauthorized',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasAdminAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager'].includes(role.toLowerCase())
    );
    if (!hasAdminAccess) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers',
        'Insufficient permissions',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body: CreateCashierRequest = await request.json();
    const { name, email, locationId } = body;

    if (!name || !email) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers',
        'Name and email are required',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Check if user already exists
    // ============================================================================
    const existingUser = await UserModel.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers',
        'User with this email already exists',
        user
      );
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Create cashier account
    // ============================================================================
    const tempPassword = nanoid(10); // Generate temporary password
    const userId = await generateMongoId();

    const newCashier = new UserModel({
      _id: userId,
      name,
      email: email.toLowerCase(),
      password: tempPassword, // In production, this should be hashed
      roles: ['cashier'],
      locationId,
      requiresPasswordChange: true, // Force password change on first login
      isActive: true,
    });

    await newCashier.save();

    // ============================================================================
    // STEP 6: Return success response (don't send password in response)
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/admin/cashiers',
      1,
      user,
      duration
    );
    return NextResponse.json({
      success: true,
      cashier: {
        id: newCashier._id,
        name: newCashier.name,
        email: newCashier.email,
        roles: newCashier.roles,
        requiresPasswordChange: newCashier.requiresPasswordChange,
      },
      tempPassword, // Return temporary password for VM to share with cashier
      message:
        'Cashier account created successfully. Temporary password has been set.',
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logRouteError(
      functionName,
      'POST',
      '/api/admin/cashiers',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
