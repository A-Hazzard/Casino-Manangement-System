/**
 * PATCH /api/users/[id]/test-assignments
 *
 * DEV ONLY — directly overwrites a user's location and licencee assignments
 * without any authentication. Blocked with HTTP 403 in any environment where
 * NODE_ENV !== 'development'. Never call this from production code or expose
 * it behind a real auth flow. Increments sessionVersion on every update to
 * simulate the session-invalidation behaviour that real assignment changes trigger.
 *
 * Route parameters:
 * @param {string} id - Required. The user document ID extracted from the URL path
 *   (/api/users/[id]/test-assignments).
 *
 * Body fields:
 * @param {string[]} [assignedLocations] - Optional. Full replacement list of location IDs to assign.
 *   Pass an empty array to clear all locations.
 * @param {string[]} [assignedLicencees] - Optional. Full replacement list of licencee IDs to assign.
 *   Pass an empty array to clear all licencees.
 *
 * @module app/api/users/[id]/test-assignments/route
 */

import UserModel from '@/app/api/lib/models/user';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import type { LeanUserDocument } from 'shared/types/auth';

export async function PATCH(
  request: NextRequest
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
    const { pathname } = request.nextUrl;
    const parts = pathname.split('/');
    const userId = parts[parts.length - 2]; // Extract [id] from /api/users/[id]/test-assignments
    const body = await request.json();
    const { assignedLocations, assignedLicencees } = body;

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

    if (assignedLicencees !== undefined) {
      updateSet.assignedLicencees = Array.isArray(assignedLicencees)
        ? assignedLicencees.map(id => String(id))
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

    const userDoc = await UserModel.findOneAndUpdate(
      { _id: userId },
      updateOperation,
      { new: true }
    ).lean<LeanUserDocument>();

    if (!userDoc) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

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
        assignedLicencees: userDoc.assignedLicencees || [],
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

