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
    const userId = userPayload?._id as string;
    const userRoles = (userPayload?.roles as string[]) || [];
    const isVM = userRoles.some((role: string) =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    
    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);

    // SECURITY: If not VM, you can ONLY see your own requests
    const cashierIdFromParams = searchParams.get('cashierId');
    let finalCashierId = cashierIdFromParams;
    if (!isVM) {
      finalCashierId = userId;
    }
    const locationId = searchParams.get('locationId');

    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
    if (finalCashierId) {
      query.cashierId = finalCashierId;
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

    if (startDate || endDate) {
      query.requestedAt = {};
      if (startDate) query.requestedAt.$gte = new Date(startDate);
      if (endDate) query.requestedAt.$lte = new Date(endDate);
    }

    const pipeline: any[] = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Ensure local IDs are strings for comparison
      {
        $addFields: {
          cashierIdStr: { $ifNull: [{ $toString: '$cashierId' }, '$cashierId'] },
          processedByStr: { $ifNull: [{ $toString: '$processedBy' }, '$processedBy'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'cashierIdStr',
          foreignField: '_id',
          as: 'cashierDetails'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'processedByStr',
          foreignField: '_id',
          as: 'processedByDetails'
        }
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
                                { $ifNull: ['$$user.profile.firstName', ''] },
                                ' ',
                                { $ifNull: ['$$user.profile.lastName', ''] }
                              ]
                            }
                          }
                        }
                      },
                      in: {
                        $cond: {
                          if: { $and: [{ $ne: ['$$fullName', null] }, { $ne: ['$$fullName', ''] }] },
                          then: '$$fullName',
                          else: { $ifNull: ['$$user.username', '$cashierId'] }
                        }
                      }
                    }
                  },
                  else: '$cashierId'
                }
              }
            }
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
                                { $ifNull: ['$$user.profile.firstName', ''] },
                                ' ',
                                { $ifNull: ['$$user.profile.lastName', ''] }
                              ]
                            }
                          }
                        }
                      },
                      in: {
                        $cond: {
                          if: { $and: [{ $ne: ['$$fullName', null] }, { $ne: ['$$fullName', ''] }] },
                          then: '$$fullName',
                          else: { $ifNull: ['$$user.username', '$processedBy'] }
                        }
                      }
                    }
                  },
                  else: '$processedBy'
                }
              }
            }
          }
        }
      },
      { $project: { cashierDetails: 0, processedByDetails: 0, cashierIdStr: 0, processedByStr: 0 } }
    ];

    const pendingRequests = await FloatRequestModel.aggregate(pipeline);

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

export async function POST(request: NextRequest) {
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

    const userId = userPayload._id as string;
    const username = userPayload.username as string;

    // STEP 2: Parse request
    const body = await request.json();
    const { 
      type, 
      amount, 
      denominations, 
      reason, 
      locationId, 
      cashierShiftId 
    } = body;

    if (!type || !amount || !locationId || !cashierShiftId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // STEP 3: Connect to DB and validate
    await connectDB();

    const vaultShift = await (await import('@/app/api/lib/models/vaultShift')).default.findOne({
      locationId,
      status: 'active'
    });

    if (!vaultShift) {
      return NextResponse.json(
        { success: false, error: 'No active vault shift found' },
        { status: 400 }
      );
    }

    // STEP 4: Create Float Request
    const { generateMongoId } = await import('@/lib/utils/id');
    const requestId = await generateMongoId();
    const now = new Date();

    const floatRequest = await FloatRequestModel.create({
      _id: requestId,
      locationId,
      cashierId: userId,
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
      auditLog: [{
        action: 'created',
        performedBy: userId,
        timestamp: now,
        notes: reason
      }]
    });

    // STEP 5: Create notification for Vault Manager
    try {
      const { createFloatRequestNotification } = await import('@/lib/helpers/vault/notifications');
      if (vaultShift.vaultManagerId) {
        await createFloatRequestNotification(
          floatRequest.toObject(),
          username,
          vaultShift.vaultManagerId
        );
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      message: 'Float request submitted successfully',
      floatRequest: floatRequest.toObject()
    });
  } catch (error) {
    console.error('Error creating float request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// ... POST method ...

export async function DELETE(request: NextRequest) {
  try {
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { requestId } = await request.json();
    if (!requestId) {
        return NextResponse.json(
            { success: false, error: 'Request ID required' },
            { status: 400 }
        );
    }

    await connectDB();
    const requestDoc = await FloatRequestModel.findById(requestId);
    
    if (!requestDoc) {
        return NextResponse.json(
            { success: false, error: 'Request not found' },
            { status: 404 }
        );
    }

    // Ownership check
    const isOwner = requestDoc.cashierId.toString() === userPayload._id;
    const isVM = (userPayload.roles as string[] || []).some(r => 
        ['admin', 'manager', 'vault-manager'].includes(r.toLowerCase())
    );

    if (!isOwner && !isVM) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 403 }
        );
    }

    const allowedStatuses = ['pending', 'approved_vm'];
    if (!allowedStatuses.includes(requestDoc.status)) {
        return NextResponse.json(
            { success: false, error: `Only ${allowedStatuses.join(' or ')} requests can be cancelled` },
            { status: 400 }
        );
    }

    // Update status to cancelled
    requestDoc.status = 'cancelled';
    requestDoc.auditLog.push({
        action: 'cancelled',
        performedBy: userPayload._id,
        timestamp: new Date(),
        notes: 'Cancelled by user'
    });
    
    await requestDoc.save();

    // DELETE NOTIFICATION
    try {
        const VaultNotificationModel = (await import('@/app/api/lib/models/vaultNotification')).default;
        await VaultNotificationModel.deleteMany({
            relatedEntityId: requestId,
            relatedEntityType: 'float_request'
        });
    } catch (notifError) {
        console.error('Failed to delete notification:', notifError);
        // Continue, don't block the cancellation
    }

    return NextResponse.json({
        success: true,
        message: 'Request cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling float request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
