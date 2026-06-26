/**
 * Collection Report List Operations Helper Functions
 *
 * Provides helper functions for collection report list/creation operations,
 * including chronological validation, location-based filtering, and sub-query handlers.
 *
 * @module app/api/lib/helpers/collectionReport/reportListOperations
 */

import { Collections } from '@/app/api/lib/models/collections';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { fetchLocationsWithMachines } from '@/app/api/lib/helpers/collectionReport/queries';
import { logRouteError } from '@/app/api/lib/utils/routeLogger';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type { CollectionReportRow } from '@/lib/types/components';
import type { CollectionDocument, GamingLocationDocument } from '@shared/types';
import { NextResponse } from 'next/server';

type RouteUser =
  | {
      _id: string;
      emailAddress?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
    }
  | null
  | undefined;

/**
 * Validates machine collections for chronological ordering.
 * Skips machines that have BOTH a previous and next collection (middle-date insert).
 * Returns filtered valid machines and a flag indicating if this is the first report.
 */
export async function filterMachinesByChronologicalOrder(
  machines: CreateCollectionReportPayload['machines'],
  targetTime: Date
): Promise<{
  validMachines: NonNullable<CreateCollectionReportPayload['machines']>;
  isInsertingFirstReport: boolean;
}> {
  if (!machines || !Array.isArray(machines)) {
    return { validMachines: [], isInsertingFirstReport: false };
  }

  const validMachines: NonNullable<CreateCollectionReportPayload['machines']> =
    [];
  let firstReportInsertedCount = 0;

  for (const machine of machines) {
    if (!machine.machineId) continue;

    const nextReport = await Collections.findOne({
      machineId: machine.machineId,
      timestamp: { $gt: targetTime },
      deletedAt: { $exists: false },
    }).lean<CollectionDocument>();

    const prevReport = await Collections.findOne({
      machineId: machine.machineId,
      timestamp: { $lt: targetTime },
      deletedAt: { $exists: false },
    }).lean<CollectionDocument>();

    if (nextReport && prevReport) {
      console.warn(
        `[filterMachinesByChronologicalOrder] Chronological check failed for machine ${machine.machineId}: cannot insert a middle-date collection.`
      );
      continue;
    }

    validMachines.push(machine);

    if (nextReport && !prevReport) {
      firstReportInsertedCount++;
    }
  }

  return {
    validMachines,
    isInsertingFirstReport: firstReportInsertedCount > 0,
  };
}

/**
 * Filters collection reports by allowed location names.
 * Collection reports store location NAME in the location field, not ID.
 */
export async function filterReportsByAllowedLocationNames(
  reports: CollectionReportRow[],
  allowedLocationIds: string[]
): Promise<{ filteredReports: CollectionReportRow[]; error?: string }> {
  if (!Array.isArray(reports)) {
    return { filteredReports: [] };
  }

  const locations = await GamingLocations.find(
    { _id: { $in: allowedLocationIds } },
    { _id: 1, name: 1 }
  )
    .lean<GamingLocationDocument[]>()
    .exec();

  const allowedLocationNames = locations.map(loc => String(loc.name));

  if (!Array.isArray(allowedLocationNames)) {
    console.error(
      '[filterReportsByAllowedLocationNames] Failed to fetch location names'
    );
    return { filteredReports: [], error: 'Failed to fetch location names' };
  }

  const filteredReports = reports.filter(report => {
    const reportLocationName = String(report.location);
    return allowedLocationNames.includes(reportLocationName);
  });

  return { filteredReports };
}

/**
 * Handles the locationsWithMachines sub-query for the GET handler.
 * Returns { response } if this is a locationsWithMachines request, or null to continue normal flow.
 */
export async function handleLocationsWithMachinesRequest(
  searchParams: URLSearchParams,
  user: RouteUser,
  startTime: number,
  functionName: string
): Promise<{ response: NextResponse } | null> {
  if (!searchParams.get('locationsWithMachines')) return null;

  try {
    const rawLicenceeParam = searchParams.get('licencee') || undefined;
    const includeMachines = searchParams.get('includeMachines') === 'true';

    const result = await fetchLocationsWithMachines(
      rawLicenceeParam,
      includeMachines
    );
    if (
      !result ||
      (result.locations &&
        Array.isArray(result.locations) &&
        result.locations.length === 0)
    ) {
      console.warn(
        '[Collection Reports GET] No locations found or fetch failed'
      );
    }
    return { response: NextResponse.json(result) };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports',
        'Unauthorized',
        user ?? undefined
      );
      return {
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
    logRouteError(
      functionName,
      'GET',
      '/api/collection-reports',
      errorMessage,
      user ?? undefined
    );
    console.error(
      `[Collection Reports GET API] Error fetching locations with machines after ${duration}ms:`,
      errorMessage
    );
    return {
      response: NextResponse.json(
        {
          error: 'Failed to fetch locations with machines',
          details: errorMessage,
        },
        { status: 500 }
      ),
    };
  }
}
