/**
 * Collection Reports API Route (Centralized)
 *
 * This route handles fetching and creating collection reports.
 * It supports:
 * - GET: Retrieves collection reports with filtering by time period, licencee, and location
 *        Also supports fetching locations with machines and monthly report summaries
 * - POST: Creates a new collection report and updates related collections and machines
 *
 * @module app/api/collection-reports/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  calculateDateRangeForTimePeriod,
  determineAllowedLocationIds,
  fetchLocationsWithMachines,
  getLocationNamesFromIds,
  getMonthlyCollectionReportByLocation,
  getMonthlyCollectionReportSummary,
} from '@/app/api/lib/helpers/collectionReport/queries';
import {
  createCollectionReport,
  sanitizeCollectionReportPayload,
  validateCollectionReportPayload,
} from '@/app/api/lib/helpers/collectionReport/reportCreation';
import { getAllCollectionReportsWithMachineCounts } from '@/app/api/lib/helpers/collectionReport/service';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/app/api/lib/types';
import { getReviewerScale } from '@/app/api/lib/utils/reviewerScale';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import { getClientIP } from '@/lib/utils/ipAddress';
import { resolveLicenceeId } from '@/lib/utils/licencee';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../lib/helpers/users';

/**
 * Main GET handler for collection reports
 *
 * Retrieves collection reports with filtering by time period, licencee, and location;
 * also handles sub-queries for locations-with-machines and monthly report summaries.
 *
 * @param {boolean} locationsWithMachines - If true, returns locations with attached machines instead of reports
 * @param {string} timePeriod - Time range preset ('Today', 'Yesterday', '7d', '30d', 'Custom', 'This Month', 'Last Month')
 * @param {string} startDate - ISO date string for custom range start
 * @param {string} endDate - ISO date string for custom range end
 * @param {string} locationName - Filter by specific location name
 * @param {string} locationId - Filter by specific location ID
 * @param {string} locationIds - Comma-separated list of location IDs to filter by
 * @param {string} licencee - Filter by licencee ID or "all"
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 *
 * Flow:
 * 1. Connect to the database
 * 2. Parse request parameters
 * 3. Handle locationsWithMachines sub-query if requested
 * 4. Handle monthly report summary sub-query if date range provided without timePeriod
 * 5. Calculate date range for time period
 * 6. Determine user access and allowed locations
 * 7. Parse pagination parameters
 * 8. Fetch and filter collection reports
 * 9. Return paginated results
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
        const rawLicenceeParam = searchParams.get('licencee') || undefined;
        const includeMachines = searchParams.get('includeMachines') === 'true';

        const result = await fetchLocationsWithMachines(
          rawLicenceeParam,
          includeMachines
        );
        return NextResponse.json(result);
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'Unauthorized') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error(
          `[Collection Reports GET API] Error fetching locations with machines after ${duration}ms:`,
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
    const locationId = searchParams.get('locationId') || undefined;
    const locationIds =
      searchParams.get('locationIds')?.split(',') || undefined;
    const rawLicenceeParam = searchParams.get('licencee') || undefined;
    const licencee =
      rawLicenceeParam && rawLicenceeParam !== 'all'
        ? resolveLicenceeId(rawLicenceeParam) || rawLicenceeParam
        : rawLicenceeParam;

    if (startDateStr && endDateStr && !timePeriod) {
      const summary = await getMonthlyCollectionReportSummary(
        new Date(startDateStr),
        new Date(endDateStr),
        locationName || locationIds || (locationId ? [locationId] : undefined),
        licencee
      );
      const details = await getMonthlyCollectionReportByLocation(
        new Date(startDateStr),
        new Date(endDateStr),
        locationName || locationIds || (locationId ? [locationId] : undefined),
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
        `[Collection Reports GET API] Unauthorized access after ${duration}ms.`
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reviewer scale — non-reviewers always get 1 (no transformation).
    const reviewerScale = getReviewerScale(userPayload as { multiplier?: number | null; roles?: string[] });

    const userRoles = (userPayload?.roles as string[]) || [];
    // Use only new field
    let userLicencees: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLicencees?: string[] })?.assignedLicencees
      )
    ) {
      userLicencees = (userPayload as { assignedLicencees: string[] })
        .assignedLicencees;
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
      userLicencees,
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
    const { reports, total } = await getAllCollectionReportsWithMachineCounts(
      licencee,
      startDate,
      endDate,
      page,
      limit,
      reviewerScale,
      locationIds || (locationId ? [locationId] : undefined)
    );

    // Filter reports by allowed locations if needed
    // Note: Collection reports store location NAME in the location field, not ID
    let paginatedReports = reports;
    if (allowedLocationIds !== 'all') {
      const allowedLocationNames =
        await getLocationNamesFromIds(allowedLocationIds);
      paginatedReports = reports.filter(report => {
        const reportLocationName = String(report.location);
        return allowedLocationNames.includes(reportLocationName);
      });
    }

    const totalPages = Math.ceil(total / limit);

    // ============================================================================
    // STEP 9: Return paginated results
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
      `[Collection Reports GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch collection reports', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Main POST handler for creating a collection report
 *
 * Creates a new collection report, syncs machine meter histories, and logs the activity.
 *
 * @body {string} locationReportId - Unique auto-generated ID for the location report
 * @body {string} locationName - Name of the gaming location
 * @body {string} collector - Name or user ID of the collector
 * @body {number} amountCollected - Total physical cash collected
 * @body {number} amountToCollect - Expected amount based on meters
 * @body {number} variance - Difference between collected and expected
 * @body {number} partnerProfit - Calculated profit split for partner
 * @body {number} taxes - Calculated taxes
 * @body {Array} machines - Array of machine collection details
 *
 * Flow:
 * 1. Connect to the database
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
        `[Collection Reports POST API] Validation failed after ${duration}ms: ${validation.error}`
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
        `[Collection Reports POST API] Failed to create report after ${duration}ms: ${result.error}`
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

        // Add granular machine data to changes for better traceability
        if (body.machines && Array.isArray(body.machines)) {
          body.machines.forEach((m: Record<string, unknown>, index: number) => {
            const machineName = m.machineCustomName || m.machineName || m.serialNumber || `Machine ${index + 1}`;
            createChanges.push({
              field: `machine_${index}_details`,
              oldValue: null,
              newValue: `${machineName}: In: ${m.metersIn}, Out: ${m.metersOut}${m.prevIn !== undefined ? ` (Prev: ${m.prevIn} In, ${m.prevOut} Out)` : ''}${m.ramClear ? ', RAM Cleared' : ''}${m.notes ? `, Notes: ${m.notes}` : ''}`,
            });
          });
        }

        const userId = (currentUser._id ||
          currentUser.id ||
          currentUser.sub) as string | undefined;
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
            userId: (currentUser._id ||
              currentUser.id ||
              currentUser.sub) as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'collection-report',
            resourceId: result.report
              ? String((result.report as { _id: unknown })._id)
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
      `[Collection Reports POST API] Error after ${duration}ms:`,
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
