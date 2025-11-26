/**
 * Collections by Report API Route
 *
 * This route handles fetching all collections for a specific collection report.
 * It supports:
 * - Finding collections by locationReportId
 * - Fallback to finding collections by location name if locationReportId doesn't match
 * - Handling locationReportId mismatches
 *
 * @module app/api/collections/by-report/[reportId]/route
 */

import { Collections } from '@/app/api/lib/models/collections';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { CollectionDocument } from '@/lib/types/collections';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching collections by report ID
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Validate report ID
 * 3. Connect to database
 * 4. Find collection report
 * 5. Try to find collections by locationReportId
 * 6. Fallback to finding collections by location name if needed
 * 7. Return collections
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters
    // ============================================================================
    const { reportId } = await params;

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
