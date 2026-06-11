/**
 * Unified Cabinet Detail API Route
 *
 * This route provides a centralized endpoint for all cabinet-specific operations,
 * merging functionality from legacy machine and location-scoped routes.
 *
 * It supports:
 * - GET: Fetch cabinet details with financial metrics and currency conversion
 * - PUT: Full update of cabinet configuration and related collections
 * - PATCH: Partial updates (restore, collection settings, SMIB config)
 * - DELETE: Soft/Hard deletion of cabinets
 *
 * @module app/api/cabinets/[cabinetId]/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import {
  logRouteFetch,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  aggregateCabinetMetrics,
  buildCabinetResponse,
  convertCabinetCurrency,
  fetchLocationSettings,
  performCabinetDelete,
  performCabinetPatch,
  performCabinetRestore,
  performCabinetUpdate,
} from '@/app/api/lib/helpers/cabinets/cabinetDetailOperations';
import type { MachineDocument } from '@/lib/types/common';
import type { CurrencyCode } from '@/shared/types/currency';
import type { TimePeriod } from '@/shared/types/common';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cabinets/[cabinetId]
 *
 * Flow:
 * 1. Fetch and validate machine
 * 2. Fetch location and licencee settings
 * 3. Aggregate financial metrics
 * 4. Apply currency conversion
 * 5. Transform and return
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/cabinets/[cabinetId]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      await connectDB();
      const { searchParams } = new URL(request.url);
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');
      const timePeriod = searchParams.get('timePeriod') as TimePeriod;
      const displayCurrency =
        (searchParams.get('currency') as CurrencyCode) || 'USD';

      // ============================================================================
      // STEP 1: Fetch and Validate Machine
      // ============================================================================
      const machine = await Machine.findOne({
        _id: cabinetId,
      }).lean<MachineDocument>();
      if (!machine) {
        logRouteError(
          functionName,
          'GET',
          '/api/cabinets/[cabinetId]',
          `Not found: ${cabinetId}`,
          user
        );
        return NextResponse.json(
          { success: false, error: 'Cabinet not found' },
          { status: 404 }
        );
      }

      const locationId = String(machine.gamingLocation);
      if (!locationId) {
        logRouteError(
          functionName,
          'GET',
          '/api/cabinets/[cabinetId]',
          'Cabinet has no associated location',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Cabinet has no associated location' },
          { status: 400 }
        );
      }

      const hasAccess = await checkUserLocationAccess(locationId);
      if (!hasAccess) {
        logRouteError(
          functionName,
          'GET',
          '/api/cabinets/[cabinetId]',
          'Unauthorized: Access denied',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Access denied' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch Location & Licencee Settings
      // ============================================================================
      const {
        location,
        gameDayOffset,
        aceEnabled,
        licenceeId,
        includeJackpot,
      } = await fetchLocationSettings(locationId);

      // ============================================================================
      // STEP 3: Aggregate Financial Metrics
      // ============================================================================
      const metrics = await aggregateCabinetMetrics(
        cabinetId,
        timePeriod,
        startDateParam,
        endDateParam,
        gameDayOffset,
        includeJackpot,
        userPayload as {
          moneyInMultiplier?: number | null;
          moneyOutAndJackpotMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        }
      );

      // ============================================================================
      // STEP 4: Apply Currency Conversion
      // ============================================================================
      const convertedMetrics = await convertCabinetCurrency(
        metrics,
        displayCurrency,
        userRoles,
        licenceeId,
        location
      );

      // ============================================================================
      // STEP 5: Transform and Return
      // ============================================================================
      const transformed = buildCabinetResponse(
        machine,
        convertedMetrics,
        location?.name || 'Unknown Location',
        aceEnabled,
        includeJackpot
      );

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/cabinets/[cabinetId]',
        1,
        user,
        duration
      );
      return NextResponse.json({ success: true, data: transformed });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      logRouteError(
        functionName,
        'GET',
        '/api/cabinets/[cabinetId]',
        errorMessage,
        user
      );
      console.error('[GET /cabinets/[cabinetId]] Error:', errorMessage);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/cabinets/[cabinetId]
 *
 * Flow:
 * 1. Perform full cabinet update with cascade to Collections
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/cabinets/[cabinetId]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';

  return withApiAuth(request, async () => {
    try {
      await connectDB();
      const data = await request.json();

      // ============================================================================
      // STEP 1: Perform Full Cabinet Update
      // ============================================================================
      const result = await performCabinetUpdate(cabinetId, data, request);
      if (!result.success) {
        logRouteError(
          functionName,
          'PUT',
          '/api/cabinets/[cabinetId]',
          result.error || 'Update failed',
          user
        );
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status || 500 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'PUT',
        '/api/cabinets/[cabinetId]',
        1,
        user,
        duration
      );
      return NextResponse.json({ success: true, data: result.data });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      logRouteError(
        functionName,
        'PUT',
        '/api/cabinets/[cabinetId]',
        errorMessage,
        user
      );
      console.error('[PUT /cabinets/[cabinetId]] Error:', errorMessage);
      return NextResponse.json(
        { success: false, error: 'Failed to update' },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/cabinets/[cabinetId]
 *
 * Flow:
 * 1. Route to restore or standard patch based on action
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/cabinets/[cabinetId]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';

  return withApiAuth(request, async ({ user: currentUser }) => {
    try {
      await connectDB();
      const data = await request.json();

      // ============================================================================
      // STEP 1: Route Action
      // ============================================================================
      if (data.action === 'restore') {
        const restoreUser = {
          _id: currentUser._id,
          emailAddress: currentUser.emailAddress,
        };
        const result = await performCabinetRestore(
          cabinetId,
          restoreUser,
          request
        );
        if (!result.success) {
          logRouteError(
            functionName,
            'PATCH',
            '/api/cabinets/[cabinetId]',
            result.error || 'Restore failed',
            user
          );
          return NextResponse.json(
            { success: false, error: result.error },
            { status: result.status || 500 }
          );
        }

        const duration = Date.now() - startTime;
        logRouteUpdate(
          functionName,
          'PATCH',
          '/api/cabinets/[cabinetId]',
          1,
          user,
          duration
        );
        return NextResponse.json({ success: true, data: result.data });
      }

      const patchUser = {
        _id: currentUser._id,
        emailAddress: currentUser.emailAddress,
      };
      const result = await performCabinetPatch(
        cabinetId,
        data,
        patchUser,
        request
      );
      if (!result.success) {
        logRouteError(
          functionName,
          'PATCH',
          '/api/cabinets/[cabinetId]',
          result.error || 'Patch failed',
          user
        );
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status || 500 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'PATCH',
        '/api/cabinets/[cabinetId]',
        1,
        user,
        duration
      );
      return NextResponse.json({ success: true, data: result.data });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      logRouteError(
        functionName,
        'PATCH',
        '/api/cabinets/[cabinetId]',
        errorMessage,
        user
      );
      console.error('[PATCH /cabinets/[cabinetId]] Error:', errorMessage);
      return NextResponse.json(
        { success: false, error: 'Patch failed' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/cabinets/[cabinetId]
 *
 * Flow:
 * 1. Check hard delete permission
 * 2. Process delete (hard or soft)
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/cabinets/[cabinetId]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';
  const searchParams = request.nextUrl.searchParams;
  const hardDelete = searchParams.get('hardDelete') === 'true';

  return withApiAuth(request, async ({ user: currentUser, userRoles }) => {
    try {
      await connectDB();

      // ============================================================================
      // STEP 1: Check Hard Delete Permission
      // ============================================================================
      const canHardDelete = userRoles.some(r =>
        ['developer', 'owner', 'admin', 'location admin'].includes(
          r.toLowerCase()
        )
      );

      // ============================================================================
      // STEP 2: Process DELETE
      // ============================================================================
      const deleteUser = currentUser
        ? {
            _id: currentUser._id,
            emailAddress: currentUser.emailAddress,
          }
        : null;
      const result = await performCabinetDelete(
        cabinetId,
        hardDelete,
        canHardDelete,
        deleteUser,
        request
      );
      if (!result.success) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/cabinets/[cabinetId]',
          result.error || 'Delete failed',
          user
        );
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status || 404 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteDelete(
        functionName,
        'DELETE',
        '/api/cabinets/[cabinetId]',
        1,
        user,
        duration
      );
      return NextResponse.json({
        success: true,
        message: result.message || 'Deleted',
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      logRouteError(
        functionName,
        'DELETE',
        '/api/cabinets/[cabinetId]',
        errorMessage,
        user
      );
      console.error('[DELETE /cabinets/[cabinetId]] Error:', errorMessage);
      return NextResponse.json(
        { success: false, error: 'Delete failed' },
        { status: 500 }
      );
    }
  });
}
