/**
 * Vault Activity Log API
 *
 * GET /api/vault/activity-log
 *
 * Retrieves a filtered activity log for vault operations.
 *
 * @module app/api/vault/activity-log/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
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

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const userId = searchParams.get('userId') || userPayload._id;
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Missing locationId' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Build filters
    // ============================================================================
    const filters: any = { locationId };

    // If user is a cashier, only show their activity
    // If user is a VM, they can see others if they specified userId
    const userRoles = (userPayload.roles as string[]) || [];
    const isVM = userRoles.some(r => ['admin', 'vault-manager', 'manager'].includes(r.toLowerCase()));

    if (!isVM) {
      filters.performedBy = userPayload._id;
    } else if (userId) {
      filters.performedBy = userId;
    }

    if (type) {
      filters.type = type;
    }

    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    // ============================================================================
    // STEP 3: Fetch activities
    // ============================================================================
    await connectDB();

    const [activities, totalCount] = await Promise.all([
      VaultTransactionModel.find(filters)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VaultTransactionModel.countDocuments(filters),
    ]);

    // ============================================================================
    // STEP 4: Calculate summary
    // ============================================================================
    // Optional: add summary logic if needed for the dashboard

    return NextResponse.json({
      success: true,
      activities,
      totalCount,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: totalCount > skip + activities.length,
      },
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
