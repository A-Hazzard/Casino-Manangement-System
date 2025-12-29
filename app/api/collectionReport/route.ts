/**
 * Collection Report API Route
 *
 * This route handles fetching and creating collection reports.
 * It supports:
 * - GET: Retrieves collection reports with filtering by time period, licensee, and location
 *        Also supports fetching locations with machines and monthly report summaries
 * - POST: Creates a new collection report and updates related collections and machines
 *
 * @module app/api/collectionReport/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  createCollectionReport,
  sanitizeCollectionReportPayload,
  validateCollectionReportPayload,
} from '@/app/api/lib/helpers/collectionReportCreation';
import {
  calculateDateRangeForTimePeriod,
  determineAllowedLocationIds,
  fetchLocationsWithMachines,
  getLocationNamesFromIds,
  getMonthlyCollectionReportByLocation,
  getMonthlyCollectionReportSummary,
} from '@/app/api/lib/helpers/collectionReportQueries';
import { getAllCollectionReportsWithMachineCounts } from '@/app/api/lib/helpers/collectionReportService';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/app/api/lib/types';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import { getClientIP } from '@/lib/utils/ipAddress';
import { getLicenseeObjectId } from '@/lib/utils/licenseeMapping';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../lib/helpers/users';

/**
 * Main GET handler for collection reports
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse request parameters
 * 3. Handle locationsWithMachines query
 * 4. Handle monthly report summary query
 * 5. Calculate date range for time period
 * 6. Determine user access and allowed locations
 * 7. Fetch and filter collection reports
 * 8. Return results
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);

    // ============================================================================
    // STEP 3: Handle locationsWithMachines query
    // ============================================================================
    if (searchParams.get('locationsWithMachines')) {
      try {
        const rawLicenseeParam =
          searchParams.get('licensee') ||
          searchParams.get('licencee') ||
          undefined;

        const result = await fetchLocationsWithMachines(rawLicenseeParam);
        return NextResponse.json(result);
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'Unauthorized') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error(
          `[Collection Report GET API] Error fetching locations with machines after ${duration}ms:`,
          errorMessage
        );
        return NextResponse.json(
          {
            error: 'Failed to fetch locations with machines',
            details: errorMessage,
          },
          { status: 500 }
        );
      }
    }

    // ============================================================================
    // STEP 4: Handle monthly report summary query
    // ============================================================================
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const locationName = searchParams.get('locationName') || undefined;
    const rawLicenceeParam =
      searchParams.get('licensee') || searchParams.get('licencee') || undefined;
    const licencee =
      rawLicenceeParam && rawLicenceeParam !== 'all'
        ? getLicenseeObjectId(rawLicenceeParam) || rawLicenceeParam
        : rawLicenceeParam;

    if (startDateStr && endDateStr && !timePeriod) {
      const summary = await getMonthlyCollectionReportSummary(
        new Date(startDateStr),
        new Date(endDateStr),
        locationName,
        licencee
      );
      const details = await getMonthlyCollectionReportByLocation(
        new Date(startDateStr),
        new Date(endDateStr),
        locationName,
        licencee
      );
      return NextResponse.json({ summary, details });
    }

    // ============================================================================
    // STEP 5: Calculate date range for time period
    // ============================================================================
    const { startDate, endDate } = calculateDateRangeForTimePeriod(
      timePeriod,
      startDateStr,
      endDateStr
    );

    // ============================================================================
    // STEP 6: Determine user access and allowed locations
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report GET API] Unauthorized access after ${duration}ms.`
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    // Use only new field
    let userLicensees: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLicensees?: string[] })?.assignedLicensees
      )
    ) {
      userLicensees = (userPayload as { assignedLicensees: string[] })
        .assignedLicensees;
    }
    // Use only new field
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    const allowedLocationIds = await determineAllowedLocationIds(
      userRoles,
      userLicensees,
      userLocationPermissions
    );

    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      return NextResponse.json([]);
    }

    // ============================================================================
    // STEP 7: Parse pagination parameters
    // ============================================================================
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance

    // ============================================================================
    // STEP 8: Fetch and filter collection reports
    // ============================================================================
    const reports = await getAllCollectionReportsWithMachineCounts(
      licencee,
      startDate,
      endDate
    );

    // Filter reports by allowed locations if needed
    // Note: Collection reports store location NAME in the location field, not ID
    let filteredReports = reports;
    if (allowedLocationIds !== 'all') {
      const allowedLocationNames =
        await getLocationNamesFromIds(allowedLocationIds);
      filteredReports = reports.filter(report => {
        const reportLocationName = String(report.location);
        return allowedLocationNames.includes(reportLocationName);
      });
    }

    // ============================================================================
    // STEP 9: Apply pagination
    // ============================================================================
    const total = filteredReports.length;
    const skip = (page - 1) * limit;
    const paginatedReports = filteredReports.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    // ============================================================================
    // STEP 10: Return paginated results
    // ============================================================================
    return NextResponse.json({
      data: paginatedReports,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Collection Report GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch collection reports', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Main POST handler for creating collection reports
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Sanitize string fields
 * 4. Create collection report using helper
 * 5. Log activity
 * 6. Return success response
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body = (await req.json()) as CreateCollectionReportPayload;
    const validation = validateCollectionReportPayload(body);
    if (!validation.isValid) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report POST API] Validation failed after ${duration}ms: ${validation.error}`
      );
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Sanitize string fields
    // ============================================================================
    const sanitizedBody = sanitizeCollectionReportPayload(body);

    // ============================================================================
    // STEP 4: Create collection report using helper
    // ============================================================================
    const result = await createCollectionReport(sanitizedBody);

    if (!result.success) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report POST API] Failed to create report after ${duration}ms: ${result.error}`
      );
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create collection report',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 5: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          {
            field: 'locationName',
            oldValue: null,
            newValue: body.locationName,
          },
          {
            field: 'collector',
            oldValue: null,
            newValue: body.collector,
          },
          {
            field: 'amountCollected',
            oldValue: null,
            newValue: body.amountCollected,
          },
          {
            field: 'amountToCollect',
            oldValue: null,
            newValue: body.amountToCollect,
          },
          { field: 'variance', oldValue: null, newValue: body.variance },
          {
            field: 'partnerProfit',
            oldValue: null,
            newValue: body.partnerProfit,
          },
          { field: 'taxes', oldValue: null, newValue: body.taxes },
          {
            field: 'machines',
            oldValue: null,
            newValue: body.machines?.length || 0,
          },
        ];

        const userId = currentUser._id as string | undefined;
        const username =
          (currentUser.emailAddress as string | undefined) ||
          (currentUser.username as string | undefined);

        await logActivity({
          action: 'CREATE',
          details: `Created collection report for ${body.locationName} by ${
            body.collector || 'Unknown'
          } (${body.machines?.length || 0} machines, $${
            body.amountCollected
          } collected)`,
          ipAddress: getClientIP(req) || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          userId,
          username,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'collection',
            resourceId: result.report
              ? String(result.report._id)
              : sanitizedBody.locationReportId,
            resourceName: `${body.locationName} - ${body.collector || 'Unknown'}`,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 6: Return success response
    // ============================================================================
    return NextResponse.json({ success: true, report: result.report });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Collection Report POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create collection report',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
