/**
 * Fix Collection History API Route
 *
 * This route handles fixing collection history issues for a specific collection report.
 * It supports:
 * - POST: Fixes prevIn/prevOut issues in collectionMetersHistory for all machines in a report
 *
 * @module app/api/collection-report/[reportId]/fix-collection-history/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { fixCollectionHistoryForReport } from '@/app/api/lib/helpers/collectionReport/fixes/sasTimes';

/**
 * Main POST handler for fixing collection history
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Connect to database and authenticate user
 * 3. Extract and validate reportId from URL path
 * 4. Fix collection history for report using helper
 * 5. Return summary of fixes applied
 */
export async function POST(
  request: NextRequest
) {
  const { pathname } = request.nextUrl;
  const parts = pathname.split('/');
  const reportId = parts[parts.length - 2];

  return withApiAuth(request, async ({ user }) => {
    const startTime = Date.now();

    try {
      // ============================================================================
      // STEP 3: Validate reportId
      // ============================================================================

    if (!reportId) {
      const duration = Date.now() - startTime;
      console.error(
        `[Fix Collection History POST API] Missing report ID after ${duration}ms.`
      );
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Fix collection history for report using helper
    // ============================================================================
    const result = await fixCollectionHistoryForReport(reportId);

    if (!result.success) {
      const duration = Date.now() - startTime;
      console.error(
        `[Fix Collection History POST API] Failed to fix collection history for report ${reportId} after ${duration}ms: ${result.error}`
      );
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fix collection history',
        },
        { status: result.error === 'Report not found' ? 404 : 500 }
      );
    }

    // ============================================================================
    // STEP 5: Return summary of fixes applied
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Fix Collection History POST API] Successfully fixed collection history for report ${reportId}: ${result.machinesFixedCount} machines fixed, ${result.totalHistoryRebuilt} history entries rebuilt after ${duration}ms.`
    );

    // Determine if user is developer for detailed message visibility
    const isDeveloper = user?.roles?.includes('developer');

    return NextResponse.json({
      success: true,
      message: isDeveloper
        ? `Collection history fix completed successfully. Machines fixed: ${result.machinesFixedCount}, History entries rebuilt: ${result.totalHistoryRebuilt}`
        : 'Collection history has been fixed',
      isDeveloperMessage: isDeveloper,
      summary: {
        totalMachinesInReport: result.totalMachinesInReport,
        machinesWithIssues: result.machinesWithIssues,
        machinesFixed: result.machinesFixedCount,
        totalHistoryRebuilt: result.totalHistoryRebuilt,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Fix Collection History POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix collection history',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
  });
}
