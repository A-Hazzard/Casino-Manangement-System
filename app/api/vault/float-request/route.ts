/**
 * Vault Float Request List API
 *
 * GET /api/vault/float-request
 *
 * Allows a Vault Manager to retrieve a list of pending float requests.
 *
 * @module app/api/vault/float-request/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    const userRoles = (userPayload?.roles as string[]) || [];

    const hasVaultAccess = userRoles.some((role: string) =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );

    if (!hasVaultAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    // ============================================================================
    // STEP 3: Fetch pending float requests
    // ============================================================================
    await connectDB();

    const status = searchParams.get('status');

    await connectDB();

    const query: any = {};
    if (locationId) {
      query.locationId = locationId;
    }
    if (status && status !== 'all') {
      // Support comma separated status? No, single status for now or 'all'
      query.status = status;
    } else if (!status) {
        // Default to pending if not specified? Or all?
        // Original code defaulted to pending. Let's keep that default for safety/compat?
        // Or change default to all?
        // Let's default to 'pending' to match previous behavior if no status passed.
        // But if client wants history, they pass status=all or status=approved.
        query.status = 'pending'; 
    }
    // If status === 'all', we don't set query.status, so it returns all.

    const pendingRequests = await FloatRequestModel.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await FloatRequestModel.countDocuments(query);

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: pendingRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching pending float requests:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
