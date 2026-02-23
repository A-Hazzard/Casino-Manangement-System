/**
 * First-Time Setup API Route
 *
 * Seeds the database with an initial admin user.
 * Prevents re-initialization if an admin already exists.
 *
 * Flow:
 * 1. Connect to database
 * 2. Check if admin user already exists (by username OR email)
 * 3. Hash the default password
 * 4. Create the admin user
 * 5. Return 201 Created
 *
 * @module app/api/install/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { hashPassword } from '@/app/api/lib/utils/validation';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Check if an admin user already exists
    // ============================================================================
    const existingUser = await UserModel.findOne({
      $or: [
        { username: 'admin' },
        { emailAddress: 'admin@gmail.com' },
      ],
    }).lean();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'System is already initialized. An admin user already exists.',
        },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 3: Hash the default password
    // ============================================================================
    const defaultPassword = 'Sunny2026!';
    const hashedPassword = await hashPassword(defaultPassword);

    // ============================================================================
    // STEP 4: Create the admin user
    // ============================================================================
    await UserModel.create({
      _id: new mongoose.Types.ObjectId().toHexString(),
      username: 'admin',
      emailAddress: 'admin@gmail.com',
      password: hashedPassword,
      passwordUpdatedAt: new Date(),
      roles: ['developer', 'admin'],
      isEnabled: true,
      profile: {
        firstName: 'Evolution',
        lastName: 'Admin',
      },
      assignedLocations: ['8ab1af760c5b9137f8555560'],
      assignedLicensees: [
        '9a5db2cb29ffd2d962fd1d91',
        'c03b094083226f216b3fc39c',
        '732b094083226f216b3fc11a',
      ],
      tempPassword: null,
      tempPasswordChanged: true,
      sessionVersion: 1,
      loginCount: 0,
      lastLoginAt: null,
      profilePicture: null,
      deletedAt: null,
    });

    // ============================================================================
    // STEP 5: Return success
    // ============================================================================
    return NextResponse.json(
      {
        success: true,
        message: 'System initialized successfully. Admin user created.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[Install API] Error:', errorMessage);

    return NextResponse.json(
      { success: false, error: 'Failed to initialize the system.' },
      { status: 500 }
    );
  }
}
