/**
 * Inter-Location Transfers API
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { InterLocationTransferModel } from '@/app/api/lib/models/interLocationTransfer';
import { generateMongoId } from '@/lib/utils/id';
import type { CreateInterLocationTransferRequest } from '@/shared/types/vault';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/transfers
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const vaultManagerId = userPayload._id as string;
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager'].includes(role)
      );

      if (!hasVMAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const body: CreateInterLocationTransferRequest = await request.json();
      const { fromLocationId, toLocationId, amount, denominations, notes } =
        body;

      if (!fromLocationId || !toLocationId || !amount || !denominations) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (fromLocationId === toLocationId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Source and destination locations must be different',
          },
          { status: 400 }
        );
      }

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
          return NextResponse.json(
            {
              success: false,
              error: 'Access denied for one or both locations',
            },
            { status: 403 }
          );
        }
      }

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
      return NextResponse.json({ success: true, transfer });
    } catch (error: unknown) {
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
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId)
        return NextResponse.json(
          { success: false, error: 'Location ID is required' },
          { status: 400 }
        );

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
        return NextResponse.json(
          { success: false, error: 'Access denied for this location' },
          { status: 403 }
        );
      }

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
          .lean(),
        InterLocationTransferModel.countDocuments(query),
      ]);

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
    } catch (error: unknown) {
      console.error('Error fetching transfers:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
