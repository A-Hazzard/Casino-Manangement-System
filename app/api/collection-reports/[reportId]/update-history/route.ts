/**
 * Update Report History API Route
 *
 * This route handles batch updates to machine collectionMetersHistory from a collection report, including:
 * - Validating collections belong to the report
 * - Updating or creating history entries with correct prevIn/prevOut from actual collection data
 * - Updating machine current meters
 * - Marking collections as completed
 *
 * Note: Uses PATCH for updating existing report histories (not POST, which would be for creating new reports)
 *
 * @module app/api/collection-reports/[reportId]/update-history/route
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  type UpdateHistoryPayload,
  updateReportMachineHistories,
} from '@/app/api/lib/helpers/reportHistoryUpdate';
import { connectDB } from '@/app/api/lib/middleware/db';

/**
 * Main PATCH handler for updating machine histories from a collection report
 *
 * Flow:
 * 1. Parse and validate request parameters (reportId, changes array)
 * 2. Connect to database
 * 3. Execute batch history update operation
 * 4. Return results summary
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { reportId } = await params;
    const body = (await request.json()) as UpdateHistoryPayload;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    if (!body.changes || !Array.isArray(body.changes)) {
      return NextResponse.json(
        { success: false, error: 'Changes array is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Execute batch history update operation
    // ============================================================================
    const results = await updateReportMachineHistories(reportId, body.changes);

    // ============================================================================
    // STEP 4: Return results summary
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Update Report History PATCH API] Updated ${results.updated}/${body.changes.length} machine histories after ${duration}ms.`
    );

    return NextResponse.json({
      success: results.failed === 0,
      message:
        results.failed === 0
          ? 'All machine histories updated successfully'
          : `Updated ${results.updated} machines, ${results.failed} failed`,
      results,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Update Report History PATCH API] Error after ${duration}ms:`,
      errorMessage
    );

    // Handle specific error cases
    if (errorMessage === 'Collection report not found') {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 404 }
      );
    }

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
