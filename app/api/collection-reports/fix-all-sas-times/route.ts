/**
 * Fix All SAS Times API Route
 *
 * This route handles fixing SAS times for ALL collection reports, including:
 * - Detecting and fixing inverted SAS times
 * - Correcting prevIn/prevOut mismatches
 * - Recalculating movement (handling RAM Clear scenarios)
 * - Rebuilding collectionMetersHistory for all affected machines
 *
 * Supports:
 * - Bulk processing of all collection reports
 * - Admin/developer access control only
 * - Comprehensive error tracking and reporting
 *
 * @module app/api/collection-reports/fix-all-sas-times/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { fixAllSasTimesData } from '../../lib/helpers/bulkSasTimesFix';
import { getUserById, getUserIdFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * Main POST handler for fixing SAS times across all collection reports
 *
 * Flow:
 * 1. Connect to database and authenticate user (admin/developer required)
 * 2. Execute bulk fix operation for all reports
 * 3. Return detailed summary of all fixes and errors
 */
export async function POST(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check permissions (admin/developer required)
    // ============================================================================
    const userId = await getUserIdFromServer();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRoles = user?.roles || [];

    // Check if user has admin or developer access
    const hasAdminAccess =
      userRoles.includes('admin') || userRoles.includes('developer');
    if (!hasAdminAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        },
        { status: 403 }
      );
    }

    console.warn(`🔧 Starting bulk SAS time fix for all reports...`);
    console.warn(
      `   Initiated by: ${user?.username || 'Unknown'} (${userRoles.join(', ')})`
    );

    // ============================================================================
    // STEP 3: Execute bulk fix operation for all reports
    // ============================================================================
    const results = await fixAllSasTimesData();

    // ============================================================================
    // STEP 4: Return detailed summary of fixes
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Fix All SAS Times POST API] Fixed ${results.totalReportsFixed}/${results.totalReportsProcessed} reports with ${results.totalCollectionsFixed} collections after ${duration}ms.`
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalReportsProcessed: results.totalReportsProcessed,
        totalReportsFixed: results.totalReportsFixed,
        totalCollectionsFixed: results.totalCollectionsFixed,
        totalHistoryRebuilt: results.totalHistoryRebuilt,
        totalErrors: results.totalErrors,
        fixedReports: results.fixedReports,
      },
      message: `Successfully processed ${results.totalReportsProcessed} reports. Fixed ${results.totalReportsFixed} reports with ${results.totalCollectionsFixed} collections. Rebuilt ${results.totalHistoryRebuilt} collectionMetersHistory entries. ${results.totalErrors} errors occurred.`,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Fix All SAS Times POST API] Error after ${duration}ms:`,
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
