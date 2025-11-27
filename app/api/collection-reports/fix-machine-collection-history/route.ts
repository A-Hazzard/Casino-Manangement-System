/**
 * Fix Machine Collection History API Route
 *
 * This route handles fixing machine collection history issues, including:
 * - Comparing actual collections with collectionMetersHistory
 * - Detecting duplicates, missing entries, and timestamp mismatches
 * - Rebuilding the history to match the actual collection data
 * - Removing orphaned history entries
 * - Validating and correcting machine collection meters
 *
 * Supports:
 * - Fixing a specific machine by machineId
 * - Fixing all machines with collection history (if no machineId provided)
 * - Admin/developer access control
 *
 * @module app/api/collection-reports/fix-machine-collection-history/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { fixMachineCollectionHistory } from '../../lib/helpers/machineCollectionHistoryFix';
import { getUserById, getUserIdFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * Main POST handler for fixing machine collection history
 *
 * Flow:
 * 1. Connect to database and authenticate user (admin/developer required)
 * 2. Parse request body to get optional machineId parameter
 * 3. Execute fix operation for specific machine or all machines
 * 4. Return detailed results for each machine processed
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check permissions (admin/developer required)
    // ============================================================================
    if (process.env.NODE_ENV !== 'development') {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user || Array.isArray(user)) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if user has admin or developer access
      if (
        !user.roles?.includes('admin') &&
        !user.roles?.includes('developer')
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    } else {
      console.warn('⚠️ Running in development mode - skipping authentication');
    }

    // ============================================================================
    // STEP 3: Parse request body to get optional machineId
    // ============================================================================
    const body = await request.json().catch(() => ({}));
    const targetMachineId = body.machineId || null;

    // ============================================================================
    // STEP 4: Execute fix operation
    // ============================================================================
    const results = await fixMachineCollectionHistory(targetMachineId);

    // ============================================================================
    // STEP 5: Return detailed results
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Fix Machine Collection History POST API] Fixed ${results.machinesFixed}/${results.totalMachinesProcessed} machines after ${duration}ms.`
    );

    return NextResponse.json({
      success: true,
      message: 'Enhanced collection history fix completed successfully',
      summary: {
        totalMachinesProcessed: results.totalMachinesProcessed,
        machinesFixed: results.machinesFixed,
        totalDuplicatesRemoved: results.totalDuplicatesRemoved,
        totalHistoryEntriesRebuilt: results.totalHistoryEntriesRebuilt,
      },
      detailedResults: results.detailedResults,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Fix Machine Collection History POST API] Error after ${duration}ms:`,
      errorMessage
    );

    // Handle specific error cases
    if (errorMessage === 'Machine not found') {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix collection history',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}