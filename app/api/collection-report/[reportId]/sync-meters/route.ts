/**
 * Sync Meters API Route
 *
 * This route handles recalculating SAS metrics for collections based on meter data within SAS time periods.
 * It supports:
 * - POST: Recalculates SAS metrics for all collections in a report by syncing with meter data
 *
 * @module app/api/collection-report/[reportId]/sync-meters/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';
import { Collections } from '../../../lib/models/collections';
import { CollectionReport } from '../../../lib/models/collectionReport';
import { syncReportMeters } from '@/app/api/lib/helpers/meterSync';

/**
 * Main POST handler for syncing meters
 *
 * Flow:
 * 1. Connect to database
 * 2. Extract and validate reportId from URL params
 * 3. Validate collection report exists
 * 4. Validate collections exist for report
 * 5. Sync meters for all collections using helper
 * 6. Return success with statistics
 */
export async function POST(
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
        `[Sync Meters POST API] Missing report ID after ${duration}ms.`
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
        `[Sync Meters POST API] Collection report not found: ${reportId} after ${duration}ms.`
      );
      return NextResponse.json(
        { success: false, error: 'Collection report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Validate collections exist for report
    // ============================================================================
    const collections = await Collections.find({
      locationReportId: reportId,
    });

    if (collections.length === 0) {
      const duration = Date.now() - startTime;
      console.error(
        `[Sync Meters POST API] No collections found for report ${reportId} after ${duration}ms.`
      );
      return NextResponse.json(
        { success: false, error: 'No collections found for this report' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Sync meters for all collections using helper
    // ============================================================================
    const syncResult = await syncReportMeters(reportId);

    // ============================================================================
    // STEP 6: Return success with statistics
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Sync Meters POST API] Successfully synced ${syncResult.updatedCollections} collections for report ${reportId} after ${duration}ms.`
    );
    return NextResponse.json({
      success: true,
      data: {
        reportId,
        totalCollections: collections.length,
        updatedCollections: syncResult.updatedCollections,
        reportTotals: syncResult.totals,
        results: syncResult.results,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Sync Meters POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
