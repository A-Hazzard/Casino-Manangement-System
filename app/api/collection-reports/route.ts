/**
 * Collection Reports API Route
 *
 * This route handles fetching collection reports with role-based access control.
 * It supports:
 * - Filtering by locationReportId and isEditing status
 * - Role-based location filtering (admin, manager, collector/technician)
 * - Sorting and pagination
 *
 * @module app/api/collection-reports/route
 */

import {
  buildCollectionReportsLocationFilter,
  buildCollectionReportsQuery,
  extractUserPermissions,
  type CollectionReportsQueryParams,
} from '@/app/api/lib/helpers/collectionReports';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching collection reports
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Authenticate user and extract permissions
 * 4. Build location filter based on user role
 * 5. Build MongoDB query
 * 6. Execute query with sorting and pagination
 * 7. Return collection reports
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const params: CollectionReportsQueryParams = {
      locationReportId: searchParams.get('locationReportId'),
      isEditing: searchParams.get('isEditing'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy') || 'updatedAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Authenticate user and extract permissions
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = extractUserPermissions(userPayload as {
      roles?: unknown;
      rel?: { licencee?: unknown };
      assignedLocations?: string[];
      assignedLicensees?: string[];
    });

    // ============================================================================
    // STEP 4: Build location filter based on user role
    // ============================================================================
    const locationFilter = await buildCollectionReportsLocationFilter(
      userPermissions
    );

    // If location filter is empty array, user has no access
    if (Array.isArray(locationFilter) && locationFilter.length === 0) {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Collection Reports GET API] No access after ${duration}ms`);
      }
      return NextResponse.json([]);
    }

    // ============================================================================
    // STEP 5: Build MongoDB query
    // ============================================================================
    const query = buildCollectionReportsQuery(params, locationFilter);

    // ============================================================================
    // STEP 6: Execute query with sorting and pagination
    // ============================================================================
    let queryBuilder = CollectionReport.find(query);

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[params.sortBy || 'updatedAt'] =
      params.sortOrder === 'asc' ? 1 : -1;
    queryBuilder = queryBuilder.sort(sortOptions);

    if (params.limit) {
      queryBuilder = queryBuilder.limit(parseInt(params.limit, 10));
    }

    const collectionReports = await queryBuilder.exec();

    // ============================================================================
    // STEP 7: Return collection reports
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Collection Reports GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json(collectionReports);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Collection Reports GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
