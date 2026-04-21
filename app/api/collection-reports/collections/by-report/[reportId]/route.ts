/**
 * Collections by Report API Route
 *
 * This route handles fetching all collections for a specific collection report.
 * It supports:
 * - Finding collections by locationReportId
 * - Fallback to finding collections by location name if locationReportId doesn't match
 * - Handling locationReportId mismatches
 *
 * @module app/api/collection-reports/collections/by-report/[reportId]/route
 */

import { Collections } from '@/app/api/lib/models/collections';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { CollectionDocument } from '@/lib/types/collection';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/collections/by-report/[reportId]
 *
 * Fetches all collection documents belonging to a collection report, first querying by `locationReportId`
 * and falling back to the report's `locationName` when no results are found. Developer/admin only diagnostic route.
 *
 * Path parameters:
 * @param reportId  {string} Required. The `locationReportId` of the collection report whose collections to fetch.
 */
export async function GET(
  request: NextRequest
) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const reportId = pathname.split('/').pop();

  try {

    // ============================================================================
    // STEP 2: Validate report ID
    // ============================================================================
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Find collection report
    // ============================================================================
    const collectionReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!collectionReport) {
      return NextResponse.json(
        { error: 'Collection report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Try to find collections by locationReportId
    // ============================================================================
    let collections = (await Collections.find({
      locationReportId: reportId,
    }).lean()) as CollectionDocument[];

    // ============================================================================
    // STEP 6: Fallback to finding collections by location name if needed
    // ============================================================================
    // If no collections found by locationReportId, try by location name
    if (collections.length === 0 && collectionReport.locationName) {
      collections = (await Collections.find({
        location: collectionReport.locationName,
      }).lean()) as CollectionDocument[];
    }

    // ============================================================================
    // STEP 7: Return collections
    // ============================================================================
    return NextResponse.json(collections);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch collections by report ID';
    console.error(
      `[Collections by Report API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
