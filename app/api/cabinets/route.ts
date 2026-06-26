/**
 * Cabinets API Route
 *
 * This route handles CRUD operations for gaming cabinets (machines).
 * It supports:
 * - Fetching cabinets by ID or location
 * - Creating new cabinets with deduplication checks
 * - Updating existing cabinets (legacy PUT)
 * - Soft deleting cabinets (legacy DELETE)
 * - Availability checks (serial, SMIB, custom name)
 * - Location-based access control
 *
 * @module app/api/cabinets/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import type { MachinePayload } from '@/shared/types/machines';
import type { MachineDocument } from '@/lib/types/common';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  checkCabinetAvailability,
  getCabinetById,
  getCabinetsByLocation,
  createCabinet,
} from '@/app/api/lib/helpers/cabinets/cabinetListOperations';

const functionName = '/api/cabinets';

/**
 * Resolves a cabinet's location and verifies the current user may access it.
 *
 * Legacy id-scoped PUT/DELETE handlers only receive a machine id, so the
 * machine must be loaded to derive its location before access can be checked.
 *
 * @param id - Machine (cabinet) id to authorize
 * @returns `{ ok: true }` when access is granted, otherwise an error status + message
 */
async function authorizeCabinetById(
  id: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  const machine = await Machine.findOne({ _id: id }).lean<MachineDocument>();
  if (!machine) {
    return { ok: false, status: 404, error: 'Cabinet not found' };
  }

  const locationId = String(machine.gamingLocation || '');
  if (!locationId) {
    return {
      ok: false,
      status: 400,
      error: 'Cabinet has no associated location',
    };
  }

  const hasAccess = await checkUserLocationAccess(locationId);
  if (!hasAccess) {
    return { ok: false, status: 403, error: 'Unauthorized: Access denied' };
  }

  return { ok: true, status: 200 };
}

/**
 * GET handler for fetching cabinets
 *
 * Flow:
 * 1. Parse query params (id, locationId, checkSerial/Smib/CustomName, archived)
 * 2. If availability check → check duplicates
 * 3. If single ID → fetch one cabinet
 * 4. If locationId → filter by location, sort, return
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse Query Params
      // ============================================================================
      const { searchParams } = request.nextUrl;
      const id = searchParams.get('id');
      const locationId = searchParams.get('locationId');
      const serialNumberToCheck = searchParams.get('checkSerial');
      const smibToCheck = searchParams.get('checkSmib');
      const customNameToCheck = searchParams.get('checkCustomName');
      const excludeId = searchParams.get('excludeId');
      const showArchived = searchParams.get('archived') === 'true';

      // ============================================================================
      // STEP 2: Availability Check
      // ============================================================================
      if (serialNumberToCheck || smibToCheck || customNameToCheck) {
        const available = await checkCabinetAvailability(
          serialNumberToCheck,
          smibToCheck,
          customNameToCheck,
          excludeId
        );
        logRouteFetch(
          functionName,
          'GET',
          '/api/cabinets',
          1,
          user,
          Date.now() - startTime
        );
        return NextResponse.json({ success: true, available });
      }

      if (!id && !locationId) {
        logRouteError(
          functionName,
          'GET',
          '/api/cabinets',
          'ID or locationId required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'ID or locationId required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Single Cabinet by ID
      // ============================================================================
      if (id) {
        const cabinet = await getCabinetById(id);
        if (!cabinet) {
          logRouteError(
            functionName,
            'GET',
            '/api/cabinets',
            `Not found: ${id}`,
            user
          );
          return NextResponse.json(
            { success: false, error: 'Not found' },
            { status: 404 }
          );
        }
        logRouteFetch(
          functionName,
          'GET',
          '/api/cabinets',
          1,
          user,
          Date.now() - startTime
        );
        return NextResponse.json({ success: true, data: cabinet });
      }

      // ============================================================================
      // STEP 4: Cabinets by Location
      // ============================================================================
      const hasAccess = await checkUserLocationAccess(locationId as string);
      if (!hasAccess) {
        logRouteError(functionName, 'GET', '/api/cabinets', 'Forbidden', user);
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const cabinets = await getCabinetsByLocation(
        locationId as string,
        showArchived
      );
      logRouteFetch(
        functionName,
        'GET',
        '/api/cabinets',
        cabinets.length,
        user,
        Date.now() - startTime
      );
      return NextResponse.json({ success: true, data: cabinets });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch cabinets';
      logRouteError(functionName, 'GET', '/api/cabinets', errorMessage, user);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * POST handler - Create new cabinet
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Create cabinet (dedup check, build doc, save, log activity)
 * 3. Return created cabinet
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse Body and Validate
      // ============================================================================
      const data = (await request.json()) as MachinePayload;
      if (!data.gamingLocation && data.locationId)
        data.gamingLocation = data.locationId;

      if (!data.gamingLocation) {
        logRouteError(
          functionName,
          'POST',
          '/api/cabinets',
          'Location required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Location required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Create Cabinet
      // ============================================================================
      const result = await createCabinet(data);

      if (!result.success) {
        logRouteError(
          functionName,
          'POST',
          '/api/cabinets',
          result.error,
          user
        );
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      revalidatePath('/cabinets');
      const duration = Date.now() - startTime;
      logRouteCreate(functionName, 'POST', '/api/cabinets', 1, user, duration);
      return NextResponse.json(
        { success: true, data: result.cabinet },
        { status: 201 }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create cabinet';
      logRouteError(functionName, 'POST', '/api/cabinets', errorMessage, user);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT handler for updating cabinets
 * (Legacy support - typically use /api/cabinets/[cabinetId])
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const user = extractUserFromRequest(request);

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    logRouteError(functionName, 'PUT', '/api/cabinets', 'ID required', user);
    return NextResponse.json(
      { success: false, error: 'ID required' },
      { status: 400 }
    );
  }

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Authorize access to the target cabinet's location
      // ============================================================================
      const access = await authorizeCabinetById(id);
      if (!access.ok) {
        logRouteError(
          functionName,
          'PUT',
          '/api/cabinets',
          access.error ?? 'Access denied',
          user
        );
        return NextResponse.json(
          { success: false, error: access.error },
          { status: access.status }
        );
      }

      // ============================================================================
      // STEP 2: Update Cabinet
      // ============================================================================
      const data = await request.json();
      const updated = await Machine.findOneAndUpdate(
        { _id: id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true }
      );
      revalidatePath('/cabinets');
      const duration = Date.now() - startTime;
      logRouteUpdate(functionName, 'PUT', '/api/cabinets', 1, user, duration);
      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update cabinet';
      logRouteError(functionName, 'PUT', '/api/cabinets', errorMessage, user);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE handler
 * (Legacy support - typically use /api/cabinets/[cabinetId])
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const user = extractUserFromRequest(request);

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    logRouteError(functionName, 'DELETE', '/api/cabinets', 'ID required', user);
    return NextResponse.json(
      { success: false, error: 'ID required' },
      { status: 400 }
    );
  }

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Authorize access to the target cabinet's location
      // ============================================================================
      const access = await authorizeCabinetById(id);
      if (!access.ok) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/cabinets',
          access.error ?? 'Access denied',
          user
        );
        return NextResponse.json(
          { success: false, error: access.error },
          { status: access.status }
        );
      }

      // ============================================================================
      // STEP 2: Delete Cabinet
      // ============================================================================
      await Machine.findOneAndUpdate(
        { _id: id },
        { $set: { deletedAt: new Date(), updatedAt: new Date() } }
      );
      revalidatePath('/cabinets');
      const duration = Date.now() - startTime;
      logRouteDelete(
        functionName,
        'DELETE',
        '/api/cabinets',
        1,
        user,
        duration
      );
      return NextResponse.json({ success: true, message: 'Deleted' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete cabinet';
      logRouteError(
        functionName,
        'DELETE',
        '/api/cabinets',
        errorMessage,
        user
      );
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
