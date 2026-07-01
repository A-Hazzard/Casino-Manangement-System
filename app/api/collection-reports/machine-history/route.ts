/**
 * Machine Report History API Route
 *
 * Returns a unified timeline of V1 collection reports and V2 submitted sessions
 * that contain a specific machine, sorted by collection date descending.
 *
 * @module app/api/collection-reports/machine-history/route
 */

import { getMachineReportHistory } from '@/app/api/lib/helpers/collectionReport/machineHistoryOperations';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  extractUserFromRequest,
  logRouteError,
  logRouteFetch,
  logRouteRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE_PATH = '/api/collection-reports/machine-history';

/**
 * GET /api/collection-reports/machine-history
 *
 * Query params:
 * @param machineId - Required. MongoDB machine ID.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Resolve licencee-scoped location filter
 * 3. Fetch merged V1 + V2 history for the machine
 * 4. Return sorted entries
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports/machine-history';
  const logUser = extractUserFromRequest(req);
  logRouteRequest(functionName, 'GET', ROUTE_PATH, logUser);

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      logRouteError(
        functionName,
        'GET',
        ROUTE_PATH,
        'machineId is required',
        logUser
      );
      return NextResponse.json(
        { success: false, error: 'machineId is required' },
        { status: 400 }
      );
    }

    const user = await getUserFromServer();
    if (!user) {
      logRouteError(functionName, 'GET', ROUTE_PATH, 'Unauthorized', logUser);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = (user.roles as string[]) || [];
    const userAccessibleLicencees =
      (user as { assignedLicencees?: string[] }).assignedLicencees || [];
    const userLocationPermissions =
      (user as { assignedLocations?: string[] }).assignedLocations || [];
    const isAdmin =
      userRoles.includes('admin') ||
      userRoles.includes('developer') ||
      userRoles.includes('owner');
    const licencee = searchParams.get('licencee');

    const allowedLocationIds = await getUserLocationFilter(
      isAdmin ? 'all' : userAccessibleLicencees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    const data = await getMachineReportHistory(machineId, allowedLocationIds);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[${functionName}] slow: ${duration}ms`);
    }

    logRouteFetch(
      functionName,
      'GET',
      ROUTE_PATH,
      data.length,
      logUser,
      duration
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch machine history';
    logRouteError(functionName, 'GET', ROUTE_PATH, errorMessage, logUser);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
