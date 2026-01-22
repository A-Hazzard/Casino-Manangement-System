/**
 * Check SAS Times API Route
 *
 * This route handles checking for SAS time issues in a collection report.
 * It supports:
 * - GET: Validates SAS times, previous meters, movement calculations, and collection history
 *        for all collections in a report and returns detailed issue information.
 *
 * @module app/api/collection-report/[reportId]/check-sas-times/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';
import { CollectionReport } from '../../../lib/models/collectionReport';
import { checkCollectionReportIssues } from '@/app/api/lib/helpers/collectionReport/issueChecker';

/**
 * Main GET handler for checking SAS times
 *
 * Flow:
 * 1. Connect to database
 * 2. Extract and validate reportId from URL params
 * 3. Validate collection report exists
 * 4. Check collection issues using helper
 * 5. Return issue details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Extract and validate reportId from URL params
    // ============================================================================
    const { reportId } = await params;

    if (!reportId) {
      const duration = Date.now() - startTime;
      console.error(
        `[Check SAS Times GET API] Missing report ID after ${duration}ms.`
      );
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Validate collection report exists
    // ============================================================================
    const collectionReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!collectionReport) {
      const duration = Date.now() - startTime;
      console.error(
        `[Check SAS Times GET API] Collection report not found: ${reportId} after ${duration}ms.`
      );
      return NextResponse.json(
        { success: false, error: 'Collection report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Check collection issues using helper
    // ============================================================================
    const result = await checkCollectionReportIssues(reportId);

    // ============================================================================
    // STEP 5: Return issue details
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Check SAS Times GET API] Found ${result.summary.totalIssues} issues for report ${reportId} after ${duration}ms.`
    );
    return NextResponse.json(result);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Check SAS Times GET API] Error after ${duration}ms:`,
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
