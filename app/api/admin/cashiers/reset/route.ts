/**
 * Reset Cashier Password API
 *
 * POST /api/admin/cashiers/reset
 *
 * Forces a password reset for a cashier account.
 *
 * @module app/api/admin/cashiers/reset/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

interface ResetPasswordRequest {
  cashierId: string;
}

/**
 * POST /api/admin/cashiers/reset
 *
 * Generates a new temporary password for an existing cashier account and forces
 * a password change on next login. The plaintext temporary password is returned
 * in the response for the vault manager to relay. Accessible to developer, admin,
 * owner, manager, vault-manager, and location admin roles; non-admin callers are
 * further restricted to cashiers within their shared licencees.
 *
 * Body fields:
 * @param {string} cashierId - Required. The ID of the cashier user whose password will be reset.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/admin/cashiers/reset';
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
        '/api/admin/cashiers/reset',
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
      [
        'developer',
        'admin',
        'owner',
        'manager',
        'vault-manager',
        'vault manager',
        'location admin',
      ].includes(role)
    );

    if (!hasAdminAccess) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers/reset',
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
    const body: ResetPasswordRequest = await request.json();
    const { cashierId } = body;

    if (!cashierId) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers/reset',
        'Cashier ID is required',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Cashier ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Find and validate cashier
    // ============================================================================
    const cashier = await UserModel.findOne({ _id: cashierId });
    if (!cashier) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers/reset',
        `Cashier not found: ${cashierId}`,
        user
      );
      return NextResponse.json(
        { success: false, error: 'Cashier not found' },
        { status: 404 }
      );
    }

    // Check if user has cashier role
    if (!cashier.roles?.includes('cashier')) {
      logRouteError(
        functionName,
        'POST',
        '/api/admin/cashiers/reset',
        'User is not a cashier',
        user
      );
      return NextResponse.json(
        { success: false, error: 'User is not a cashier' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4.5: Licencee Validation (Rule 9)
    // ============================================================================
    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('developer') ||
      userRoles.includes('owner');
    if (!isAdmin) {
      const { getUserAccessibleLicenceesFromToken } =
        await import('../../../lib/helpers/licenceeFilter');
      const accessibleLicencees = await getUserAccessibleLicenceesFromToken(
        userPayload as Parameters<typeof getUserAccessibleLicenceesFromToken>[0]
      );

      if (accessibleLicencees !== 'all') {
        const cashierLicencees = (cashier.assignedLicencees as string[]) || [];
        const hasOverlap = cashierLicencees.some(id =>
          accessibleLicencees.includes(String(id))
        );

        if (!hasOverlap) {
          logRouteError(
            functionName,
            'POST',
            '/api/admin/cashiers/reset',
            `Insufficient permissions - no shared licencees for cashier: ${cashierId}`,
            user
          );
          return NextResponse.json(
            {
              success: false,
              error:
                "Insufficient permissions - You do not have access to this cashier's licencee",
            },
            { status: 403 }
          );
        }
      }
    }

    // ============================================================================
    // STEP 5: Reset password and force change
    // ============================================================================
    // Standardize temporary password generation (using nanoid like handleResetCashierPassword expects)
    const tempPassword = nanoid(12);

    // Hash the password for the database
    const { hashPassword } = await import('../../../lib/utils/validation');
    cashier.password = await hashPassword(tempPassword);

    // Update temp password fields for the new "View Password" system
    cashier.tempPassword = tempPassword;
    cashier.tempPasswordChanged = false;

    // Legacy fields if still used
    if ('requiresPasswordChange' in cashier) {
      (cashier as unknown as Record<string, unknown>).requiresPasswordChange =
        true;
    }

    cashier.updatedAt = new Date();

    await cashier.save();

    // ============================================================================
    // STEP 6: Return success response
    // ============================================================================
    const cashierData = cashier.toObject();
    const displayName = cashierData.profile
      ? `${cashierData.profile.firstName} ${cashierData.profile.lastName}`.trim()
      : cashierData.username;

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/admin/cashiers/reset',
      1,
      user,
      duration
    );
    return NextResponse.json({
      success: true,
      message: `Password reset for ${displayName}. New temporary password has been set.`,
      tempPassword, // Return temporary password for VM to share with cashier
      cashier: {
        id: cashierData._id,
        name: displayName,
        email: cashierData.emailAddress,
      },
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    logRouteError(
      functionName,
      'POST',
      '/api/admin/cashiers/reset',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
