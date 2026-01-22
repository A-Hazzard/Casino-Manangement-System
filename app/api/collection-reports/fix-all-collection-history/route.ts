/**
 * Fix All Collection History API Route
 *
 * This route handles fixing collectionMetersHistory issues across all machines, including:
 * - Detecting entries with 0/undefined prevIn/prevOut values
 * - Rebuilding history from actual collections with correct prevIn/prevOut
 * - Updating machine collection times and meters
 *
 * Supports:
 * - Bulk processing of all machines across all reports
 * - Admin/developer access control only
 * - Comprehensive error tracking and reporting
 *
 * @module app/api/collection-reports/fix-all-collection-history/route
 */

import { NextResponse } from 'next/server';
import { fixAllCollectionHistoryData } from '../../lib/helpers/collectionReport/bulkHistoryFix';
import { getUserById, getUserIdFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * Main POST handler for fixing collectionMetersHistory across all machines
 *
 * Flow:
 * 1. Connect to database and authenticate user (admin/developer required)
 * 2. Execute bulk fix operation for all machines
 * 3. Return detailed summary of all fixes and errors
 */
export async function POST() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();
    console.warn('🔧 Starting fix-all-collection-history process...');

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
    // STEP 3: Execute bulk fix operation for all machines
    // ============================================================================
    const results = await fixAllCollectionHistoryData();

    // ============================================================================
    // STEP 4: Return detailed summary of fixes
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Fix All Collection History POST API] Fixed ${results.machinesFixedCount}/${results.totalMachines} machines with ${results.totalHistoryRebuilt} history entries after ${duration}ms.`
    );

    return NextResponse.json({
      success: true,
      summary: {
        reportsProcessed: results.reportsProcessed,
        totalMachines: results.totalMachines,
        machinesFixed: results.machinesFixedCount,
        totalHistoryRebuilt: results.totalHistoryRebuilt,
        errorCount: results.errors.length,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Processed ${results.reportsProcessed} reports and ${results.totalMachines} machines. Fixed ${results.machinesFixedCount} machines with ${results.totalHistoryRebuilt} total history entries rebuilt.`,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Fix All Collection History POST API] Error after ${duration}ms:`,
      errorMessage
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

