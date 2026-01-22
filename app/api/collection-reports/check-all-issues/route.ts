/**
 * Check All Issues API Route
 *
 * This route handles checking collection reports or machines for data integrity issues.
 * It supports:
 * - GET: Checks specific collection reports or machines for issues including prevIn/prevOut,
 *        movement calculations, SAS times, and machine history
 *
 * @module app/api/collection-reports/check-all-issues/route
 */

import { checkAllIssues } from '@/app/api/lib/helpers/collectionReport/fixes/checkAllIssues';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';

/**
 * Main GET handler for checking all issues
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (reportId or machineId required)
 * 3. Check all issues using helper
 * 4. Return issue results
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request parameters (reportId or machineId required)
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const machineId = searchParams.get('machineId');

    // ============================================================================
    // STEP 3: Check all issues using helper
    // ============================================================================
    const result = await checkAllIssues(reportId, machineId);

    if (!result.success) {
      const duration = Date.now() - startTime;
      console.error(
        `[Check All Issues GET API] Validation failed after ${duration}ms: ${result.error}`
      );
      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            'Either reportId or machineId parameter is required',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Return issue results
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Check All Issues GET API] Successfully checked issues: ${result.totalIssues} total issues found after ${duration}ms.`
    );
    return NextResponse.json({
      success: true,
      totalIssues: result.totalIssues,
      reportIssues: result.reportIssues,
      machines: result.machineIssues,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Check All Issues GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to check report issues', details: errorMessage },
      { status: 500 }
    );
  }
}

