/**
 * Test Assignments API Route (DEV ONLY)
 *
 * This route allows direct testing of user assignment updates without authentication.
 * ONLY WORKS IN DEVELOPMENT MODE.
 *
 * @module app/api/users/[id]/test-assignments/route
 */

import UserModel from '@/app/api/lib/models/user';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH handler for testing user assignments (DEV ONLY)
 *
 * Flow:
 * 1. Check if in development mode
 * 2. Connect to database
 * 3. Parse request body (assignedLocations, assignedLicensees)
 * 4. Update user directly in database
 * 5. Return updated user data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, message: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const body = await request.json();
    const { assignedLocations, assignedLicensees } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Build update object
    // ============================================================================
    const updateSet: Record<string, unknown> = {};
    const updateInc: Record<string, number> = {};

    // Update new fields only - no longer writing to old fields
    if (assignedLocations !== undefined) {
      updateSet.assignedLocations = Array.isArray(assignedLocations)
        ? assignedLocations.map(id => String(id))
        : [];
    }

    if (assignedLicensees !== undefined) {
      updateSet.assignedLicensees = Array.isArray(assignedLicensees)
        ? assignedLicensees.map(id => String(id))
        : [];
    }

    // Increment sessionVersion when assignments change
    updateInc.sessionVersion = 1;

    // ============================================================================
    // STEP 4: Update user in database
    // ============================================================================
    const updateOperation: Record<string, unknown> = {
      $set: updateSet,
    };

    if (Object.keys(updateInc).length > 0) {
      updateOperation.$inc = updateInc;
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId },
      updateOperation,
      { new: true }
    ).lean();

    if (!updatedUser || Array.isArray(updatedUser)) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Type guard: ensure updatedUser is a single document, not an array
    const userDoc = updatedUser as {
      _id: string;
      username?: string;
      emailAddress?: string;
      assignedLocations?: string[];
      assignedLicensees?: string[];
      sessionVersion?: number;
    };

    // ============================================================================
    // STEP 5: Return updated user data
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: 'User assignments updated successfully',
      user: {
        _id: userDoc._id,
        username: userDoc.username,
        emailAddress: userDoc.emailAddress,
        assignedLocations: userDoc.assignedLocations || [],
        assignedLicensees: userDoc.assignedLicensees || [],
        sessionVersion: userDoc.sessionVersion,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Test Assignments API] Error:', error);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

