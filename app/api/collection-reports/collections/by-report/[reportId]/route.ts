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
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
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
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName =
    'GET /api/collection-reports/collections/by-report/[reportId]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const reportId = pathname.split('/').pop();

  try {
    // ============================================================================
    // STEP 1: Validate report ID
    // ============================================================================
    if (!reportId) {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports/collections/by-report/[reportId]',
        'Report ID is required',
        user
      );
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find collection report
    // ============================================================================
    const collectionReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!collectionReport) {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports/collections/by-report/[reportId]',
        'Collection report not found',
        user
      );
      return NextResponse.json(
        { error: 'Collection report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Try to find collections by locationReportId
    // ============================================================================
    let collections = await Collections.find({
      locationReportId: reportId,
    }).lean<CollectionDocument[]>();

    if (collections.length === 0 && collectionReport.locationName) {
      collections = await Collections.find({
        location: collectionReport.locationName,
      }).lean<CollectionDocument[]>();
    }

    // ============================================================================
    // STEP 5: Return collections
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/collection-reports/collections/by-report/[reportId]',
      collections.length,
      user,
      duration
    );
    return NextResponse.json(collections);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch collections by report ID';
    logRouteError(
      functionName,
      'GET',
      '/api/collection-reports/collections/by-report/[reportId]',
      errorMessage,
      user
    );
    console.error(
      `[Collections by Report API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
