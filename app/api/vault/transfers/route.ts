/**
 * Inter-Location Transfers API
 *
 * POST /api/vault/transfers
 *
 * Creates a transfer request between locations.
 *
 * @module app/api/vault/transfers/route */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { InterLocationTransferModel } from '@/app/api/lib/models/interLocationTransfer';
import type { CreateInterLocationTransferRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

/**
 * POST /api/vault/transfers
 *
 * Handler flow:
 * 1. Performance tracking and authentication
 * 2. Parse and validate request body
 * 3. Licensee/location filtering for both source and destination
 * 4. Database connection
 * 5. Create transfer record
 * 6. Save transfer and return response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const vaultManagerId = userPayload.userId;
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager'].includes(role.toLowerCase())
    );
    if (!hasVMAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body: CreateInterLocationTransferRequest = await request.json();
    const { fromLocationId, toLocationId, amount, denominations, notes } = body;

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

    // ============================================================================
    // STEP 3: Licensee/location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (allowedLocationIds !== 'all') {
      if (
        !allowedLocationIds.includes(fromLocationId) ||
        !allowedLocationIds.includes(toLocationId)
      ) {
        return NextResponse.json(
          { success: false, error: 'Access denied for one or both locations' },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 4: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Create transfer record
    // ============================================================================
    const transferId = nanoid();

    // TODO: Get location names from database
    const fromLocationName = `Location ${fromLocationId}`;
    const toLocationName = `Location ${toLocationId}`;

    const transfer = new InterLocationTransferModel({
      _id: transferId,
      fromLocationId,
      toLocationId,
      fromLocationName,
      toLocationName,
      amount,
      denominations,
      status: 'pending',
      requestedBy: vaultManagerId,
      notes,
    });

    // ============================================================================
    // STEP 5: Save transfer
    // ============================================================================
    await transfer.save();

    // ============================================================================
    // STEP 6: Performance tracking and return response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Inter-location transfer API took ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      transfer,
    });
  } catch (error) {
    console.error('Error creating inter-location transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vault/transfers
 *
 * Handler flow:
 * 1. Performance tracking and authentication
 * 2. Parse and validate request parameters
 * 3. Licensee/location filtering
 * 4. Database connection and query
 * 5. Return transfers list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // ============================================================================
    // Licensee/location filtering
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
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
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ fromLocationId: locationId }, { toLocationId: locationId }],
    };

    const transfers = await InterLocationTransferModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await InterLocationTransferModel.countDocuments(query);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Get transfers API took ${duration}ms`);
    }

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
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
