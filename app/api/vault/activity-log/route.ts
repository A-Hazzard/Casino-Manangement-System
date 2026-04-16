/**
 * Vault Activity Log API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locId = searchParams.get('locationId'),
        uid = searchParams.get('userId'),
        cid = searchParams.get('cashierId'),
        mid = searchParams.get('machineId'),
        sid = searchParams.get('cashierShiftId'),
        type = searchParams.get('type'),
        start = searchParams.get('startDate'),
        end = searchParams.get('endDate');
      const limit = parseInt(searchParams.get('limit') || '50'),
        skip = parseInt(searchParams.get('skip') || '0');

      if (!locId && !uid && !cid && !mid && !sid)
        return NextResponse.json(
          { success: false, error: 'Filter required' },
          { status: 400 }
        );

      const filters: Record<string, unknown> = { locationId: locId };
      const isVM = userRoles
        .map(r => String(r).toLowerCase())
        .some(r =>
          ['admin', 'vault-manager', 'manager', 'developer'].includes(r)
        );

      if (!isVM) filters.performedBy = userPayload._id;
      else if (cid) filters.performedBy = cid;
      else if (uid) filters.performedBy = uid;

      if (sid) filters.cashierShiftId = sid;
      if (mid) filters.$or = [{ 'from.id': mid }, { 'to.id': mid }];
      if (type) filters.type = type;
      if (start || end) {
        filters.timestamp = {
          $gte: start ? new Date(start) : undefined,
          $lte: end ? new Date(end) : undefined,
        };
      }

      const pipeline = [
        { $match: filters },
        { $sort: { timestamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'performedBy',
            foreignField: '_id',
            as: 'p',
          },
        },
        {
          $addFields: {
            performerName: {
              $cond: {
                if: { $gt: [{ $size: '$p' }, 0] },
                then: {
                  $concat: [
                    {
                      $ifNull: [
                        { $arrayElemAt: ['$p.profile.firstName', 0] },
                        '',
                      ],
                    },
                    ' ',
                    {
                      $ifNull: [
                        { $arrayElemAt: ['$p.profile.lastName', 0] },
                        '',
                      ],
                    },
                  ],
                },
                else: '$performedBy',
              },
            },
          },
        },
        { $project: { p: 0 } },
      ];

      const [activities, total] = await Promise.all([
        VaultTransactionModel.aggregate(
          pipeline as Parameters<typeof VaultTransactionModel.aggregate>[0]
        ),
        VaultTransactionModel.countDocuments(filters),
      ]);

      return NextResponse.json({
        success: true,
        activities,
        totalCount: total,
        pagination: {
          total,
          limit,
          skip,
          hasMore: total > skip + activities.length,
        },
      });
    } catch (e: unknown) {
      console.error('[Activity Log] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
