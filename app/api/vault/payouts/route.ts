/**
 * Payouts API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import PayoutModel from '@/app/api/lib/models/payout';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVaultAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager', 'cashier'].includes(
          role
        )
      );
      if (!hasVaultAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId)
        return NextResponse.json(
          { success: false, error: 'Location ID is required' },
          { status: 400 }
        );

      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;
      const search = searchParams.get('search');
      const type = searchParams.get('type');

      const query: Record<string, unknown> = { locationId };
      if (type && type !== 'all') query.type = type;
      if (search) {
        const sr = { $regex: search, $options: 'i' };
        const orArray: Array<Record<string, unknown>> = [
          { ticketNumber: sr },
          { notes: sr },
          { cashierId: sr },
        ];
        const ns = parseFloat(search);
        if (!isNaN(ns)) orArray.push({ amount: ns });
        query.$or = orArray;
      }

      const [payouts, total] = await Promise.all([
        PayoutModel.aggregate([
          { $match: query },
          { $sort: { timestamp: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'cashierId',
              foreignField: '_id',
              as: 'cashierDetails',
            },
          },
          {
            $addFields: {
              cashierName: {
                $let: {
                  vars: { user: { $arrayElemAt: ['$cashierDetails', 0] } },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $gt: ['$$user.profile.firstName', null] },
                          { $gt: ['$$user.profile.lastName', null] },
                        ],
                      },
                      then: {
                        $concat: [
                          '$$user.profile.firstName',
                          ' ',
                          '$$user.profile.lastName',
                        ],
                      },
                      else: '$cashierId',
                    },
                  },
                },
              },
            },
          },
          { $project: { cashierDetails: 0 } },
        ]),
        PayoutModel.countDocuments(query),
      ]);

      return NextResponse.json({
        success: true,
        payouts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: unknown) {
      console.error('[Payouts API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
