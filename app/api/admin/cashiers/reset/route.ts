/**
 * Reset Cashier Password API
 *
 * POST /api/admin/cashiers/reset
 *
 * Forces a password reset for a cashier account.
 *
 * @module app/api/admin/cashiers/reset/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

interface ResetPasswordRequest {
  cashierId: string;
}

export async function POST(request: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
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
    const cashier = await UserModel.findById(cashierId);
    if (!cashier) {
      return NextResponse.json(
        { success: false, error: 'Cashier not found' },
        { status: 404 }
      );
    }

    // Check if user has cashier role
    if (!cashier.roles?.includes('cashier')) {
      return NextResponse.json(
        { success: false, error: 'User is not a cashier' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Reset password and force change
    // ============================================================================
    const tempPassword = nanoid(10); // Generate new temporary password
    cashier.password = tempPassword; // In production, this should be hashed
    cashier.requiresPasswordChange = true;
    cashier.updatedAt = new Date();

    await cashier.save();

    // ============================================================================
    // STEP 6: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: `Password reset for ${cashier.name}. New temporary password has been set.`,
      tempPassword, // Return temporary password for VM to share with cashier
      cashier: {
        id: cashier._id,
        name: cashier.name,
        email: cashier.email,
      },
    });
  } catch (error) {
    console.error('Error resetting cashier password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
