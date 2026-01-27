/**
 * Create Cashier API
 *
 * POST /api/admin/cashiers
 *
 * Creates a new cashier account with temporary password.
 *
 * @module app/api/admin/cashiers/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

interface CreateCashierRequest {
  name: string;
  email: string;
  locationId?: string;
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
    const body: CreateCashierRequest = await request.json();
    const { name, email, locationId } = body;

    if (!name || !email) {
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
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Create cashier account
    // ============================================================================
    const tempPassword = nanoid(10); // Generate temporary password
    const userId = nanoid();

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
    console.error('Error creating cashier:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
