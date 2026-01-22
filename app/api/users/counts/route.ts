/**
 * User Counts API Route
 *
 * This route provides user counts grouped by role.
 * It supports:
 * - Licensee-based filtering
 * - Excludes users with deletedAt >= 2025-01-01
 * - Includes disabled users
 *
 * @module app/api/users/counts/route
 */

import {
  getAllUsers,
  getUserFromServer,
} from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest } from 'next/server';

/**
 * Main GET handler for fetching user counts by role
 *
 * Flow:
 * 1. Connect to database
 * 2. Get current user and permissions
 * 3. Parse licensee query parameter
 * 4. Fetch all users (excludes deletedAt >= 2025)
 * 5. Filter by licensee if provided
 * 6. Count users by role
 * 7. Return counts
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Get current user and permissions
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const currentUserRoles = (currentUser.roles as string[]) || [];
    const isAdmin =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');
    const isManager = currentUserRoles.includes('manager') && !isAdmin;
    const isLocationAdmin =
      currentUserRoles.includes('location admin') && !isAdmin && !isManager;

    let currentUserLicensees: string[] = [];
    if (
      Array.isArray(
        (currentUser as { assignedLicensees?: string[] })?.assignedLicensees
      )
    ) {
      currentUserLicensees = (currentUser as { assignedLicensees: string[] })
        .assignedLicensees;
    }

    // ============================================================================
    // STEP 3: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');

    // ============================================================================
    // STEP 4: Fetch all users (excludes deletedAt >= 2025-01-01)
    // ============================================================================
    const allUsers = await getAllUsers();

    // ============================================================================
    // STEP 5: Apply role-based filtering (Manager, Location Admin)
    // ============================================================================
    let filteredUsers = allUsers;

    if (isManager && !isAdmin) {
      // Managers can only see users with same licensees
      filteredUsers = filteredUsers.filter(user => {
        const userLicensees = Array.isArray(user.assignedLicensees)
          ? user.assignedLicensees
          : [];
        return userLicensees.some((userLic: string) =>
          currentUserLicensees.includes(userLic)
        );
      });
    } else if (isLocationAdmin) {
      // Location admins can only see users with matching locations
      const currentUserLocationPermissions = Array.isArray(
        (currentUser as { assignedLocations?: string[] })?.assignedLocations
      )
        ? (
            currentUser as { assignedLocations: string[] }
          ).assignedLocations.map((id: string) => String(id).trim())
        : [];

      if (currentUserLocationPermissions.length === 0) {
        filteredUsers = [];
      } else {
        const currentUserId = currentUser._id ? String(currentUser._id) : null;
        filteredUsers = filteredUsers.filter(user => {
          const userId = user._id?.toString
            ? user._id.toString()
            : String(user._id);
          const isCurrentUser = currentUserId && userId === currentUserId;

          if (isCurrentUser) {
            return true;
          }

          const userLocationPermissions = Array.isArray(user.assignedLocations)
            ? user.assignedLocations.map((id: string) => String(id).trim())
            : [];

          if (userLocationPermissions.length === 0) {
            return false;
          }

          return userLocationPermissions.some((userLoc: string) =>
            currentUserLocationPermissions.includes(userLoc)
          );
        });
      }
    }

    // ============================================================================
    // STEP 6: Apply licensee filter if provided
    // ============================================================================
    if (licensee && licensee !== 'all') {
      filteredUsers = filteredUsers.filter(user => {
        const userLicensees = Array.isArray(user.assignedLicensees)
          ? user.assignedLicensees
          : [];
        return userLicensees.includes(licensee);
      });
    }

    // ============================================================================
    // STEP 7: Count users by role
    // ============================================================================
    // Note: Users can have multiple roles, so we count them in each role they have
    const counts = {
      total: filteredUsers.length,
      collectors: 0,
      admins: 0,
      locationAdmins: 0,
      managers: 0,
    };

    filteredUsers.forEach(user => {
      const userRoles = (user.roles as string[]) || [];
      if (userRoles.includes('collector')) {
        counts.collectors++;
      }
      if (userRoles.includes('admin') || userRoles.includes('developer')) {
        counts.admins++;
      }
      if (userRoles.includes('location admin')) {
        counts.locationAdmins++;
      }
      if (userRoles.includes('manager')) {
        counts.managers++;
      }
    });

    // ============================================================================
    // STEP 8: Return counts
    // ============================================================================
    return new Response(
      JSON.stringify({
        success: true,
        counts,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[USERS COUNTS API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch user counts',
      }),
      { status: 500 }
    );
  }
}
