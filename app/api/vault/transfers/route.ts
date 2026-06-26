/**
 * Inter-Location Transfers API
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { InterLocationTransferModel } from '@/app/api/lib/models/interLocationTransfer';
import { generateMongoId } from '@/lib/utils/id';
import type { CreateInterLocationTransferRequest } from '@/shared/types/vault';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteCreate,
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';
import type { InterLocationTransferDocument } from '@shared/types';

/**
 * POST /api/vault/transfers
 *
 * @body {string} fromLocationId - Source location ID (REQUIRED)
 * @body {string} toLocationId - Destination location ID (REQUIRED)
 * @body {number} amount - Transfer amount (REQUIRED)
 * @body {Array} denominations - Denomination breakdown (REQUIRED)
 * @body {string} notes - Transfer notes
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/transfers';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Validate permissions
      // ============================================================================
      const vaultManagerId = userPayload._id as string;
      const normalizedRoles = userRoles.map(role => String(role).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager'].includes(role)
      );

      if (!hasVMAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/transfers',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse and validate body
      // ============================================================================
      const body: CreateInterLocationTransferRequest = await request.json();
      const { fromLocationId, toLocationId, amount, denominations, notes } =
        body;

      if (!fromLocationId || !toLocationId || !amount || !denominations) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/transfers',
          'Missing required fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (fromLocationId === toLocationId) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/transfers',
          'Source and destination locations must be different',
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Source and destination locations must be different',
          },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Validate location access
      // ============================================================================
      const allowedLocationIds = await getUserLocationFilter(
        (userPayload?.assignedLicencees as string[]) || [],
        undefined,
        (userPayload?.assignedLocations as string[]) || [],
        userRoles
      );

      if (allowedLocationIds !== 'all') {
        if (
          !allowedLocationIds.includes(fromLocationId) ||
          !allowedLocationIds.includes(toLocationId)
        ) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/transfers',
            'Access denied for one or both locations',
            user
          );
          return NextResponse.json(
            {
              success: false,
              error: 'Access denied for one or both locations',
            },
            { status: 403 }
          );
        }
      }

      // ============================================================================
      // STEP 4: Create transfer and save
      // ============================================================================
      const transferId = await generateMongoId();
      const transfer = new InterLocationTransferModel({
        _id: transferId,
        fromLocationId,
        toLocationId,
        fromLocationName: `Location ${fromLocationId}`,
        toLocationName: `Location ${toLocationId}`,
        amount,
        denominations,
        status: 'pending',
        requestedBy: vaultManagerId,
        notes,
      });

      await transfer.save();

      const duration = Date.now() - startTime;
      logRouteCreate(
        functionName,
        'POST',
        '/api/vault/transfers',
        1,
        user,
        duration
      );

      // ============================================================================
      // STEP 5: Return response
      // ============================================================================
      return NextResponse.json({ success: true, transfer });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create transfer';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/transfers',
        errorMessage,
        user
      );
      console.error('Error creating inter-location transfer:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/vault/transfers
 */

/**
 * Main GET handler for inter-location transfers
 *
 * @param {string} locationId - ID of the location to fetch transfers for (REQUIRED)
 * @param {number} page - Page number for pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/transfers';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Validate parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/transfers',
          'Location ID is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Location ID is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Validate location access
      // ============================================================================
      const allowedLocationIds = await getUserLocationFilter(
        (userPayload?.assignedLicencees as string[]) || [],
        undefined,
        (userPayload?.assignedLocations as string[]) || [],
        userRoles
      );

      if (
        allowedLocationIds !== 'all' &&
        !allowedLocationIds.includes(locationId)
      ) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/transfers',
          'Access denied for this location',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Access denied for this location' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 3: Fetch transfers
      // ============================================================================
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;

      const query = {
        $or: [{ fromLocationId: locationId }, { toLocationId: locationId }],
      };
      const [transfers, total] = await Promise.all([
        InterLocationTransferModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<InterLocationTransferDocument[]>(),
        InterLocationTransferModel.countDocuments(query),
      ]);

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/transfers',
        transfers.length,
        user,
        duration
      );

      // ============================================================================
      // STEP 4: Return response
      // ============================================================================
      return NextResponse.json({
        success: true,
        transfers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch transfers';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/transfers',
        errorMessage,
        user
      );
      console.error('Error fetching transfers:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
