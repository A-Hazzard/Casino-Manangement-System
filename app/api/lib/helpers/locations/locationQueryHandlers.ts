/**
 * Location Query Handler Functions
 *
 * Business logic for all location API CRUD operations.
 * Extracted from the locations route to keep handler files lean.
 *
 * @module app/api/lib/helpers/locations/locationQueryHandlers
 */

import { getUserAccessibleLicenceesFromToken } from '@/app/api/lib/helpers/licenceeFilter';
import { buildLocationQueryFilter } from '@/app/api/lib/helpers/locations';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import {
  buildLocationUpdateData,
  buildNewLocationDocument,
  enrichLocationsWithJackpotFlag,
  executeHardDelete,
  executeLocationRestore,
  executeSoftDelete,
  findLocationById,
  findMachinesByLocation,
  logDeleteActivity,
  logLocationCreationActivity,
  logLocationUpdateActivity,
  logRestoreActivity,
  validateCountryReference,
} from '@/app/api/lib/helpers/locations/locationOperations';
import type { LocationDocument } from '@/shared/types/models';
import type { LocationRequestBody } from '@/app/api/lib/helpers/locations/locationOperations';
import {
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

type UserForLogging = {
  _id: string;
  emailAddress: string;
};

type GetLocationsParams = {
  licencee: string | null;
  ids: string | null;
  forceAll: boolean;
  showArchived: boolean;
};

type LocationWithJackpot = LocationDocument & {
  licenceeId: string | null;
  includeJackpot: boolean;
};

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Returns a 403 Access Denied JSON response.
 */
export function accessDeniedResponse(
  functionName: string,
  method: string,
  user: ReturnType<typeof extractUserFromRequest>
): NextResponse {
  logRouteError(functionName, method, '/api/locations', 'Access denied', user);
  return NextResponse.json(
    { success: false, error: 'Access denied' },
    { status: 403 }
  );
}

// ============================================================================
// GET Handler
// ============================================================================

/**
 * Fetches and enriches gaming locations based on user permissions and filters.
 */
export async function handleGetLocations(
  params: GetLocationsParams,
  userPayload: Record<string, unknown>,
  userRoles: string[]
): Promise<LocationWithJackpot[]> {
  const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
  const userLocationPermissions =
    (userPayload as { assignedLocations?: string[] })?.assignedLocations || [];

  const queryFilter = await buildLocationQueryFilter({
    licencee: params.licencee,
    forceAll: params.forceAll,
    showArchived: params.showArchived,
    userRoles,
    userAccessibleLicencees,
    userLocationPermissions,
  });

  if (params.ids) {
    const idArray = params.ids
      .split(',')
      .map(id => id.trim())
      .filter(id => id);
    if (idArray.length > 0) {
      queryFilter._id = { $in: idArray };
    }
  }

  const locations = await GamingLocations.find(queryFilter)
    .sort({ name: 1 })
    .lean<LocationDocument[]>();

  return enrichLocationsWithJackpotFlag(locations);
}

// ============================================================================
// POST Handler
// ============================================================================

/**
 * Creates a new gaming location with validation and activity logging.
 */
export async function handleCreateLocation(
  body: Record<string, unknown>,
  currentUser: UserForLogging | null,
  request: NextRequest
): Promise<Record<string, unknown>> {
  if (!body.name) {
    const error = new Error('Name required');
    (error as unknown as Record<string, unknown>).statusCode = 400;
    throw error;
  }

  if (body.country) {
    const countryValid = await validateCountryReference(body.country as string);
    if (!countryValid) {
      const error = new Error('Invalid country');
      (error as unknown as Record<string, unknown>).statusCode = 400;
      throw error;
    }
  }

  const locationFields = await buildNewLocationDocument(
    body as LocationRequestBody
  );
  const newLocation = new GamingLocations(locationFields);

  try {
    await GamingLocations.collection.dropIndex('name_1');
  } catch {}

  await newLocation.save();

  await logLocationCreationActivity(
    currentUser,
    request,
    String(locationFields._id),
    body.name as string,
    newLocation
  );

  return newLocation;
}

// ============================================================================
// PUT Handler
// ============================================================================

/**
 * Updates an existing gaming location with validation and activity logging.
 */
export async function handleUpdateLocation(
  body: Record<string, unknown>,
  currentUser: UserForLogging | null,
  request: NextRequest
): Promise<{ _id: string; name: string }> {
  if (!body.locationName) {
    const error = new Error('ID required');
    (error as unknown as Record<string, unknown>).statusCode = 400;
    throw error;
  }

  const location = await findLocationById(body.locationName as string);
  if (!location) {
    const error = new Error('Not found');
    (error as unknown as Record<string, unknown>).statusCode = 404;
    throw error;
  }

  const updateData = buildLocationUpdateData(body as LocationRequestBody);

  try {
    await GamingLocations.collection.dropIndex('name_1');
  } catch {}

  await GamingLocations.updateOne(
    { _id: location._id },
    { $set: updateData },
    { strict: false }
  );

  console.log(
    `[Locations PUT] Updated location "${location.name}" (${location._id})`
  );

  await logLocationUpdateActivity(currentUser, request, location, updateData);

  return { _id: String(location._id), name: location.name };
}

// ============================================================================
// DELETE Handler
// ============================================================================

/**
 * Deletes (hard or soft) a gaming location and its machines with activity logging.
 */
export async function handleDeleteLocation(
  id: string,
  hardDelete: boolean,
  isAuthorizedForHardDelete: boolean,
  currentUser: UserForLogging | null,
  request: NextRequest
): Promise<void> {
  const locationToDelete = await findLocationById(id, true);
  if (!locationToDelete) {
    const error = new Error('Not found');
    (error as unknown as Record<string, unknown>).statusCode = 404;
    throw error;
  }

  const associatedMachines = await findMachinesByLocation(id);
  const archiveTimestamp = new Date();

  const deleteError =
    hardDelete && isAuthorizedForHardDelete
      ? await executeHardDelete(id)
      : await executeSoftDelete(id, archiveTimestamp);

  if (deleteError) {
    const error = new Error('Failed to delete location');
    (error as unknown as Record<string, unknown>).statusCode = 500;
    throw error;
  }

  await logDeleteActivity(
    currentUser,
    request,
    locationToDelete,
    associatedMachines,
    hardDelete && isAuthorizedForHardDelete,
    archiveTimestamp
  );
}

// ============================================================================
// PATCH Handler
// ============================================================================

/**
 * Restores a soft-deleted gaming location and its machines with activity logging.
 */
export async function handleRestoreLocation(
  id: string,
  currentUser: UserForLogging | null,
  request: NextRequest
): Promise<void> {
  if (!id) {
    const error = new Error('Invalid request');
    (error as unknown as Record<string, unknown>).statusCode = 400;
    throw error;
  }

  const location = await findLocationById(id, true);
  if (!location) {
    const error = new Error('Not found');
    (error as unknown as Record<string, unknown>).statusCode = 404;
    throw error;
  }

  const restoreResult = await executeLocationRestore(id);
  if ('error' in restoreResult) {
    const error = new Error('Failed to restore location');
    (error as unknown as Record<string, unknown>).statusCode = 500;
    throw error;
  }

  await logRestoreActivity(
    currentUser,
    request,
    location,
    restoreResult.machines
  );
}
