/**
 * Vault Float Request List API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const isVM = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );

      const { searchParams } = new URL(request.url);
      const cashierIdFromParams = searchParams.get('cashierId');
      const finalCashierId = isVM ? cashierIdFromParams : userPayload._id;
      const locationId = searchParams.get('locationId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;
      const status = searchParams.get('status') || 'pending';
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      const query: Record<string, unknown> = {};
      if (locationId) query.locationId = locationId;
      if (finalCashierId) query.cashierId = finalCashierId;
      if (status !== 'all') query.status = status;

      if (startDate || endDate) {
        query.requestedAt = {
          $gte: startDate ? new Date(startDate) : undefined,
          $lte: endDate ? new Date(endDate) : undefined,
        };
      }

      const [pendingRequests, total] = await Promise.all([
        FloatRequestModel.aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $addFields: {
              cashierIdStr: {
                $ifNull: [{ $toString: '$cashierId' }, '$cashierId'],
              },
              processedByStr: {
                $ifNull: [{ $toString: '$processedBy' }, '$processedBy'],
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'cashierIdStr',
              foreignField: '_id',
              as: 'cashierDetails',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'processedByStr',
              foreignField: '_id',
              as: 'processedByDetails',
            },
          },
          {
            $addFields: {
              cashierName: {
                $let: {
                  vars: { user: { $arrayElemAt: ['$cashierDetails', 0] } },
                  in: {
                    $cond: {
                      if: { $ne: ['$$user', null] },
                      then: {
                        $let: {
                          vars: {
                            fullName: {
                              $trim: {
                                input: {
                                  $concat: [
                                    {
                                      $ifNull: ['$$user.profile.firstName', ''],
                                    },
                                    ' ',
                                    {
                                      $ifNull: ['$$user.profile.lastName', ''],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          in: {
                            $cond: {
                              if: {
                                $and: [
                                  { $ne: ['$$fullName', null] },
                                  { $ne: ['$$fullName', ''] },
                                  { $ne: ['$$fullName', ' '] },
                                ],
                              },
                              then: {
                                $concat: [
                                  { $ifNull: ['$$user.username', 'Cashier'] },
                                  ' (',
                                  '$$fullName',
                                  ')',
                                ],
                              },
                              else: {
                                $ifNull: ['$$user.username', '$cashierId'],
                              },
                            },
                          },
                        },
                      },
                      else: '$cashierId',
                    },
                  },
                },
              },
              processedByName: {
                $let: {
                  vars: { user: { $arrayElemAt: ['$processedByDetails', 0] } },
                  in: {
                    $cond: {
                      if: { $ne: ['$$user', null] },
                      then: {
                        $let: {
                          vars: {
                            fullName: {
                              $trim: {
                                input: {
                                  $concat: [
                                    {
                                      $ifNull: ['$$user.profile.firstName', ''],
                                    },
                                    ' ',
                                    {
                                      $ifNull: ['$$user.profile.lastName', ''],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          in: {
                            $cond: {
                              if: {
                                $and: [
                                  { $ne: ['$$fullName', null] },
                                  { $ne: ['$$fullName', ''] },
                                ],
                              },
                              then: '$$fullName',
                              else: {
                                $ifNull: ['$$user.username', '$processedBy'],
                              },
                            },
                          },
                        },
                      },
                      else: '$processedBy',
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              cashierDetails: 0,
              processedByDetails: 0,
              cashierIdStr: 0,
              processedByStr: 0,
            },
          },
        ]),
        FloatRequestModel.countDocuments(query),
      ]);

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
    } catch (error: unknown) {
      console.error('[Float List API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      const body = await request.json();
      const {
        type,
        amount,
        denominations,
        reason,
        locationId,
        cashierShiftId,
      } = body;
      if (!type || !amount || !locationId || !cashierShiftId)
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );

      const vaultShift = await (
        await import('@/app/api/lib/models/vaultShift')
      ).default.findOne({ locationId, status: 'active' });
      if (!vaultShift)
        return NextResponse.json(
          { success: false, error: 'No active vault shift' },
          { status: 400 }
        );

      const { generateMongoId } = await import('@/lib/utils/id');
      const requestId = await generateMongoId();
      const now = new Date();

      const floatRequest = await FloatRequestModel.create({
        _id: requestId,
        locationId,
        cashierId: userPayload._id,
        cashierShiftId,
        vaultShiftId: vaultShift._id,
        type,
        requestedAmount: amount,
        requestedDenominations: denominations,
        requestNotes: reason,
        requestedAt: now,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        auditLog: [
          {
            action: 'created',
            performedBy: userPayload._id,
            timestamp: now,
            notes: reason,
          },
        ],
      });

      try {
        const { createFloatRequestNotification } =
          await import('@/lib/helpers/vault/notifications');
        if (vaultShift.vaultManagerId)
          await createFloatRequestNotification(
            floatRequest.toObject(),
            userPayload.username as string,
            vaultShift.vaultManagerId
          );
      } catch (e) {
        console.error('Notification failed:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'Float request submitted',
        floatRequest: floatRequest.toObject(),
      });
    } catch (error: unknown) {
      console.error('[Float Create API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const { requestId } = await request.json();
      if (!requestId)
        return NextResponse.json(
          { success: false, error: 'Request ID required' },
          { status: 400 }
        );

      const requestDoc = await FloatRequestModel.findById(requestId);
      if (!requestDoc)
        return NextResponse.json(
          { success: false, error: 'Request not found' },
          { status: 404 }
        );

      const isVM = userRoles.some(r =>
        ['admin', 'manager', 'vault-manager'].includes(String(r).toLowerCase())
      );
      if (requestDoc.cashierId.toString() !== userPayload._id && !isVM)
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );

      const allowedStatuses = ['pending', 'approved_vm'];
      if (!allowedStatuses.includes(requestDoc.status))
        return NextResponse.json(
          {
            success: false,
            error: `Cannot cancel ${requestDoc.status} requests`,
          },
          { status: 400 }
        );

      requestDoc.status = 'cancelled';
      requestDoc.auditLog.push({
        action: 'cancelled',
        performedBy: userPayload._id,
        timestamp: new Date(),
        notes: '',
      });
      await requestDoc.save();

      try {
        const VaultNotificationModel = (
          await import('@/app/api/lib/models/vaultNotification')
        ).default;
        await VaultNotificationModel.deleteMany({
          relatedEntityId: requestId,
          relatedEntityType: 'float_request',
        });
      } catch (e) {
        console.error('Notification cleanup failed:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'Request cancelled successfully',
      });
    } catch (error: unknown) {
      console.error('[Float Cancel API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
