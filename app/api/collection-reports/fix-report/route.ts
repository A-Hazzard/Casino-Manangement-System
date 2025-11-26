/**
 * Fix Report API Route
 *
 * This route handles fixing all issues with collection reports, including:
 * - SAS times issues (inverted, missing, incorrect)
 * - Movement calculation issues
 * - PrevIn/PrevOut issues
 * - Collection history issues
 * - Machine history synchronization
 *
 * It supports fixing:
 * - A specific report by reportId
 * - A specific machine by machineId
 * - The most recent report (if neither reportId nor machineId is provided)
 *
 * @module app/api/collection-reports/fix-report/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { fixReportIssues } from '../../lib/helpers/fixReportOperations';
import { getUserById, getUserIdFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * Main POST handler for fixing collection report issues
 *
 * Flow:
 * 1. Connect to database and authenticate user
 * 2. Parse request body to get reportId and/or machineId
 * 3. Execute fix operations (3 phases: collection data, machine meters, history cleanup)
 * 4. Return fix results
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database and authenticate user
    // ============================================================================
    await connectDB();

    // Check authentication
    if (process.env.NODE_ENV !== 'development') {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // ============================================================================
    // STEP 2: Parse request body to get reportId and/or machineId
    // ============================================================================
    const body = await request.json().catch(() => ({}));
    const { reportId, machineId } = body;

    // ============================================================================
    // STEP 3: Execute fix operations (3 phases: collection data, machine meters, history cleanup)
    // ============================================================================
    const { fixResults, totalTime } = await fixReportIssues(
      reportId,
      machineId
    );

    // ============================================================================
    // STEP 4: Return fix results
    // ============================================================================
    const duration = Date.now() - startTime;
    const totalIssuesFixed = Object.values(fixResults.issuesFixed).reduce(
      (sum, val) => sum + val,
      0
    );

    console.log(
      `[Fix Report POST API] Successfully fixed ${totalIssuesFixed} issues in ${fixResults.collectionsProcessed} collections after ${duration}ms.`
    );

    return NextResponse.json({
      success: true,
      message: `Fixed ${totalIssuesFixed} issues in ${fixResults.collectionsProcessed} collections`,
      results: fixResults,
      summary: {
        collectionsProcessed: fixResults.collectionsProcessed,
        totalIssuesFixed,
        errorCount: fixResults.errors.length,
        timeTakenSeconds: parseFloat((totalTime / 1000).toFixed(2)),
        issueBreakdown: fixResults.issuesFixed,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Fix Report POST API] Error after ${duration}ms:`,
      errorMessage
    );

    // Handle specific error cases
    if (
      errorMessage === 'Report not found' ||
      errorMessage === 'No reports found'
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Fix report failed',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
