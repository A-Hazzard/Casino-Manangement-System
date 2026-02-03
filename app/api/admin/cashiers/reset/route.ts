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
    const normalizedRoles = userRoles.map(role => String(role).toLowerCase().trim());
    
    const hasAdminAccess = normalizedRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager', 'vault manager', 'location admin'].includes(role)
    );

    if (!hasAdminAccess) {
      console.warn(`[Reset Cashier API] Access denied for user ${userPayload._id}. Roles:`, userRoles);
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
    const cashier = await UserModel.findOne({ _id: cashierId });
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
    // STEP 4.5: Licensee Validation (Rule 9)
    // ============================================================================
    const isAdmin = normalizedRoles.includes('admin') || normalizedRoles.includes('developer');
    if (!isAdmin) {
      const { getUserAccessibleLicenseesFromToken } = await import('../../../lib/helpers/licenseeFilter');
      const accessibleLicensees = await getUserAccessibleLicenseesFromToken(userPayload as any);
      
      if (accessibleLicensees !== 'all') {
        const cashierLicensees = (cashier.assignedLicensees as string[]) || [];
        const hasOverlap = cashierLicensees.some(id => accessibleLicensees.includes(String(id)));
        
        if (!hasOverlap) {
          console.warn(`[Reset Cashier API] Access denied. User ${userPayload._id} tried to reset cashier ${cashierId} but has no shared licensees.`);
          return NextResponse.json(
            { success: false, error: 'Insufficient permissions - You do not have access to this cashier\'s licensee' },
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
      (cashier as any).requiresPasswordChange = true;
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
  } catch (error) {
    console.error('Error resetting cashier password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
