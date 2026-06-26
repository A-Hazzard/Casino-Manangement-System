/**
 * SMIB Classification Sync
 *
 * Administrative endpoint to synchronize SMIB classification status for all locations.
 * Classifies each location based on its machines' relayId presence:
 * - fullSMIBs: all machines have relayId
 * - semiSMIBs: some machines have relayId
 * - noSMIBLocation: no machines have relayId
 *
 * GET - Returns sync status (lastSync timestamp, stale flag)
 * POST - Triggers full sync for all accessible locations
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { getUserAccessibleLicenceesFromToken } from '@/app/api/lib/helpers/licenceeFilter';
import { buildLocationQueryFilter } from '@/app/api/lib/helpers/locations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import type { LocationDocument } from '@/shared/types/models';
import {
  fetchLocationsWithMachinesForSmib,
  getSmibSyncStatus,
  syncAllLocationSmibStatuses,
} from '@/app/api/lib/helpers/smibClassification';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * GET /api/admin/smib-sync
 *
 * Returns the current SMIB classification sync status.
 * Used by frontend to check if data needs refreshing.
 *
 * @returns {lastSync: Date | null, isStale: boolean, staleAfterHours: number}
 */
export async function GET(request: NextRequest) {
  const functionName = 'GET /api/admin/smib-sync';
  const user = extractUserFromRequest(request);

  try {
    await connectDB();
    const status = await getSmibSyncStatus();

    logRouteFetch(functionName, 'GET', '/api/admin/smib-sync', 1, user);
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get sync status';
    logRouteError(
      functionName,
      'GET',
      '/api/admin/smib-sync',
      errorMessage,
      user
    );
    console.error(`[${functionName}] Error:`, errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/smib-sync
 *
 * Triggers a full SMIB classification sync for all accessible locations.
 * Can optionally filter by licencee.
 * Restricted to admin/developer roles.
 *
 * Body fields:
 * @param {string} [licencee] - Optional. Sync only locations for this licencee ID.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/admin/smib-sync';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const licenceeFilter = searchParams.get('licencee');

      const body = await request.json().catch(() => ({}));
      const licenceeParam = body.licencee || licenceeFilter;

      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      const userLocationPermissions =
        (userPayload as { assignedLocations?: string[] })?.assignedLocations ||
        [];

      const queryFilter = await buildLocationQueryFilter({
        licencee: licenceeParam || null,
        forceAll: false,
        showArchived: false,
        userRoles,
        userAccessibleLicencees,
        userLocationPermissions,
      });

      const locations =
        await GamingLocations.find(queryFilter).lean<LocationDocument[]>();
      const locationIds = locations.map(l => String(l._id));

      const locationsWithMachines =
        await fetchLocationsWithMachinesForSmib(locationIds);
      const result = await syncAllLocationSmibStatuses(locationsWithMachines);

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'POST',
        '/api/admin/smib-sync',
        locationIds.length,
        user,
        duration
      );

      return NextResponse.json(
        {
          success: true,
          synced: result.synced,
          unchanged: result.unchanged,
          total: locationIds.length,
          durationMs: duration,
        },
        { status: 200 }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sync SMIB status';
      logRouteError(
        functionName,
        'POST',
        '/api/admin/smib-sync',
        errorMessage,
        user
      );
      console.error(`[${functionName}] Error:`, errorMessage);
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      );
    }
  });
}
