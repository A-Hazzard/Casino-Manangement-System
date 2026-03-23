/**
 * Fix SAS Times API Route
 *
 * This route handles fixing SAS time issues in collection reports.
 * It supports:
 * - POST: Scans and fixes the entire collection timeline chronologically,
 *         fixing SAS times, prevIn/prevOut, movement calculations, and machine history
 *
 * @module app/api/collection-report/[reportId]/fix-sas-times/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { fixSasTimesForReport } from '@/app/api/lib/helpers/collectionReport/fixes/sasTimes';

/**
 * Main POST handler for fixing SAS times
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Connect to database and authenticate user
 * 3. Extract and validate reportId from URL path
 * 4. Fix SAS times for report and future reports using helper
 * 5. Return detailed summary of fixes applied
 */
export async function POST(
  request: NextRequest
) {
  const { pathname } = request.nextUrl;
  const parts = pathname.split('/');
  const reportId = parts[parts.length - 2];

  return withApiAuth(request, async () => {
    const startTime = Date.now();

    try {
      // ============================================================================
      // STEP 3: Validate reportId
      // ============================================================================

    if (!reportId) {
      const duration = Date.now() - startTime;
      console.error(
        `[Fix SAS Times POST API] Missing report ID after ${duration}ms.`
      );
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Fix SAS times for report and future reports using helper
    // ============================================================================
    const result = await fixSasTimesForReport(reportId);

    if (!result.success) {
      const duration = Date.now() - startTime;
      console.error(
        `[Fix SAS Times POST API] Failed to fix SAS times for report ${reportId} after ${duration}ms: ${result.error}`
      );
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fix SAS times' },
        { status: result.error === 'Collection report not found' ? 404 : 500 }
      );
    }

    // ============================================================================
    // STEP 4: Return detailed summary of fixes applied
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Fix SAS Times POST API] Successfully fixed SAS times for report ${reportId}: ${result.totalFixedCount} collections fixed, ${result.totalHistoryFixedCount} history entries fixed across ${result.processedReports.length} reports after ${duration}ms.`
    );
    return NextResponse.json({
      success: true,
      totalCollections: result.totalFixedCount + result.totalSkippedCount,
      fixedCount: result.totalFixedCount,
      skippedCount: result.totalSkippedCount,
      historyFixedCount: result.totalHistoryFixedCount,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10), // Limit errors in response
      reportsScanned: result.processedReports.length,
      futureReportsAffected: result.futureReportsAffected,
      message: `Fixed ${result.totalFixedCount} collections, ${result.totalHistoryFixedCount} history entries across ${result.processedReports.length} reports`,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Fix SAS Times POST API] Error after ${duration}ms:`,
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
  });
}
