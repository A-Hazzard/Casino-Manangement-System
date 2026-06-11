/**
 * Locations API Route
 *
 * Handles CRUD operations for gaming locations.
 * Admin/developer access is required for write operations (POST, PUT, DELETE, PATCH).
 *
 * GET    /api/locations  - List locations filtered by user permissions and licencee
 * POST   /api/locations  - Create a new location
 * PUT    /api/locations  - Update an existing location
 * DELETE /api/locations  - Soft-delete or hard-delete a location (and its machines)
 * PATCH  /api/locations  - Restore a soft-deleted location (and its machines)
 *
 * @module app/api/locations/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  accessDeniedResponse,
  handleGetLocations,
  handleCreateLocation,
  handleUpdateLocation,
  handleDeleteLocation,
  handleRestoreLocation,
} from '@/app/api/lib/helpers/locations/locationQueryHandlers';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/app/api/lib/services/loggerService';

// ============================================================================
// GET /api/locations
// ============================================================================

/**
 * Returns the list of gaming locations accessible to the current user.
 *
 * Query params:
 * @param {string} [licencee] - Filter by licencee ID.
 * @param {string} [ids] - Comma-separated location IDs.
 * @param {'true'|'1'} [forceAll] - Bypass location access filter (admin/dev only).
 * @param {'true'} [archived] - Include soft-deleted locations.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    const context = apiLogger.createContext(request, '/api/locations');
    apiLogger.startLogging();

    try {
      const { searchParams } = new URL(request.url);
      const results = await handleGetLocations(
        {
          licencee: searchParams.get('licencee'),
          ids: searchParams.get('ids'),
          forceAll:
            searchParams.get('forceAll') === 'true' ||
            searchParams.get('forceAll') === '1',
          showArchived:
            searchParams.get('archived') === 'true' ||
            searchParams.get('includeDeleted') === 'true',
        },
        userPayload as Record<string, unknown>,
        userRoles
      );

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/locations',
        results.length,
        user,
        duration
      );
      apiLogger.logSuccess(
        context,
        `Fetched ${results.length} in ${duration}ms`
      );
      return NextResponse.json({ locations: results }, { status: 200 });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch locations';
      logRouteError(functionName, 'GET', '/api/locations', errorMessage, user);
      console.error(`[Locations GET API] Error:`, error);
      return NextResponse.json(
        { success: false, message: 'Failed' },
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// POST /api/locations
// ============================================================================

/**
 * Creates a new gaming location. Restricted to admin/developer roles.
 *
 * @body {string} name - Required. Display name of the location.
 * @body {string} [country] - Country ID (must exist in Countries collection).
 * @body {object} [address] - `{ street, city }` physical address.
 * @body {string[]} [rel.licencee] - Licencee IDs this location belongs to.
 * @body {number} [profitShare] - Percentage profit split (default 50).
 * @body {number} [gameDayOffset] - Gaming day start hour (default 8).
 * @body {boolean} [isLocalServer] - Local SMIB server flag.
 * @body {object} [geoCoords] - `{ latitude, longitude }` for map pin.
 * @body {object} [billValidatorOptions] - Per-denomination enable flags.
 * @body {boolean} [membershipEnabled] - Player membership system toggle.
 * @body {boolean} [aceEnabled] - ACE always-online mode toggle.
 * @body {object} [locationMembershipSettings] - Membership config.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) return accessDeniedResponse(functionName, 'POST', user);

    try {
      const body = await request.json();
      const newLocation = await handleCreateLocation(
        body as Record<string, unknown>,
        currentUser as { _id: string; emailAddress: string } | null,
        request
      );

      const duration = Date.now() - startTime;
      logRouteCreate(functionName, 'POST', '/api/locations', 1, user, duration);

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, location: newLocation },
        { status: 201 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errCode = (error as Record<string, unknown>).statusCode;
      const statusCode = errCode === 400 ? 400 : 500;
      logRouteError(functionName, 'POST', '/api/locations', message, user);
      console.error(`[Locations POST API] Error:`, error);
      return NextResponse.json({ success: false, message }, { status: statusCode });
    }
  });
}

// ============================================================================
// PUT /api/locations
// ============================================================================

/**
 * Updates an existing gaming location. Restricted to admin/developer roles.
 *
 * @body {string} locationName - Required. The _id of the location to update.
 * @body {string} [name] - New display name.
 * @body {string} [country] - New country ID.
 * @body {object} [address] - Updated `{ street, city }` address.
 * @body {string[]} [rel.licencee] - Updated licencee IDs.
 * @body {number} [profitShare] - Updated profit split percentage.
 * @body {number} [gameDayOffset] - Updated gaming day start hour.
 * @body {boolean} [isLocalServer] - Updated local server flag.
 * @body {object} [geoCoords] - Updated coordinates.
 * @body {object} [billValidatorOptions] - Updated bill validator flags.
 * @body {boolean} [membershipEnabled] - Toggle membership system.
 * @body {boolean} [aceEnabled] - Toggle ACE mode.
 * @body {object} [locationMembershipSettings] - Updated membership config.
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) return accessDeniedResponse(functionName, 'PUT', user);

    try {
      const body = await request.json();
      const result = await handleUpdateLocation(
        body as Record<string, unknown>,
        currentUser as { _id: string; emailAddress: string } | null,
        request
      );

      const duration = Date.now() - startTime;
      logRouteUpdate(functionName, 'PUT', '/api/locations', 1, user, duration);

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, message: 'Updated', locationId: result._id },
        { status: 200 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errCode = (error as Record<string, unknown>).statusCode;
      const statusCode = typeof errCode === 'number' ? errCode : 500;
      logRouteError(functionName, 'PUT', '/api/locations', message, user);
      console.error(`[Locations PUT API] Error:`, error);
      return NextResponse.json({ success: false, message }, { status: statusCode });
    }
  });
}

// ============================================================================
// DELETE /api/locations
// ============================================================================

/**
 * Soft-deletes or permanently hard-deletes a location and all its machines.
 *
 * Query params:
 * @param {string} id - Required. The _id of the location to delete.
 * @param {'true'} [hardDelete] - Permanently removes the location and machines.
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(
    request,
    async ({ user: currentUser, userRoles, isAdminOrDev }) => {
      const isLocAdmin = userRoles
        .map(r => r.toLowerCase())
        .some(r => r === 'location admin');
      if (!isAdminOrDev && !isLocAdmin)
        return accessDeniedResponse(functionName, 'DELETE', user);

      try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
          logRouteError(functionName, 'DELETE', '/api/locations', 'ID required', user);
          return NextResponse.json(
            { success: false, message: 'ID required' },
            { status: 400 }
          );
        }

        const hardDelete = searchParams.get('hardDelete') === 'true';
        const isAuthorizedForHardDelete = userRoles
          .map(r => r.toLowerCase())
          .some(r =>
            ['developer', 'owner', 'admin', 'location admin'].includes(r)
          );

        await handleDeleteLocation(
          id,
          hardDelete,
          isAuthorizedForHardDelete,
          currentUser as { _id: string; emailAddress: string } | null,
          request
        );

        const duration = Date.now() - startTime;
        logRouteDelete(functionName, 'DELETE', '/api/locations', 1, user, duration);

        revalidatePath('/locations');
        return NextResponse.json(
          { success: true, message: 'Deleted' },
          { status: 200 }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const errCode = (error as Record<string, unknown>).statusCode;
        const statusCode = typeof errCode === 'number' ? errCode : 500;
        logRouteError(functionName, 'DELETE', '/api/locations', message, user);
        console.error(`[Locations DELETE API] Error:`, error);
        return NextResponse.json({ success: false, message }, { status: statusCode });
      }
    }
  );
}

// ============================================================================
// PATCH /api/locations
// ============================================================================

/**
 * Restores a soft-deleted (archived) location and all its machines.
 *
 * Body fields:
 * @param {string} id - Required. The _id of the location to restore.
 * @param {'restore'} action - Required. Must be exactly 'restore'.
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) return accessDeniedResponse(functionName, 'PATCH', user);

    try {
      const { id, action } = await request.json();

      if (!id || action !== 'restore') {
        logRouteError(functionName, 'PATCH', '/api/locations', 'Invalid request', user);
        return NextResponse.json(
          { success: false, message: 'Invalid' },
          { status: 400 }
        );
      }

      await handleRestoreLocation(
        id,
        currentUser as { _id: string; emailAddress: string } | null,
        request
      );

      const duration = Date.now() - startTime;
      logRouteUpdate(functionName, 'PATCH', '/api/locations', 1, user, duration);

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, message: 'Restored' },
        { status: 200 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errCode = (error as Record<string, unknown>).statusCode;
      const statusCode = typeof errCode === 'number' ? errCode : 500;
      logRouteError(functionName, 'PATCH', '/api/locations', message, user);
      console.error(`[Locations PATCH API] Error:`, error);
      return NextResponse.json({ success: false, message }, { status: statusCode });
    }
  });
}
