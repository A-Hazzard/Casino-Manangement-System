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
    const userId = searchParams.get('userId');
    const cashierId = searchParams.get('cashierId'); // NEW: Support cashier filtering
    const machineId = searchParams.get('machineId'); // NEW: Support machine filtering
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    if (!locationId && !userId && !cashierId && !machineId) {
      return NextResponse.json(
        { success: false, error: 'Missing filter parameters (locationId, userId, or machineId required)' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Build filters
    // ============================================================================
    const filters: any = { locationId };

    // If user is a cashier, only show their activity
    // If user is a VM, they can see others if they specified userId or cashierId
    const userRoles = (userPayload.roles as string[]) || [];
    const isVM = userRoles.some(r => ['admin', 'vault-manager', 'manager', 'developer'].includes(r.toLowerCase()));

    if (!isVM) {
      // Cashiers can only see their own activity
      filters.performedBy = userPayload._id;
    } else if (cashierId) {
      // VM filtering by cashier ID
      filters.performedBy = cashierId;
    } else if (userId) {
      // VM filtering by user ID
      filters.performedBy = userId;
    }

    if (machineId) {
      // Filter by machine ID in from or to fields
      filters.$or = [
        { 'from.id': machineId },
        { 'to.id': machineId }
      ];
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

    const aggregationPipeline: any[] = [
      { $match: filters },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
        from: 'users',
          localField: 'performedBy',
          foreignField: '_id',
          as: 'performer',
        },
      },
      {
        $addFields: {
          performerName: {
            $cond: {
              if: { $gt: [{ $size: '$performer' }, 0] },
              then: {
                $concat: [
                  { $ifNull: [{ $arrayElemAt: ['$performer.profile.firstName', 0] }, ''] },
                  ' ',
                  { $ifNull: [{ $arrayElemAt: ['$performer.profile.lastName', 0] }, ''] },
                ],
              },
              else: '$performedBy',
            },
          },
        },
      },
      { $project: { performer: 0 } },
    ];

    const [activities, totalCount] = await Promise.all([
      VaultTransactionModel.aggregate(aggregationPipeline),
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
