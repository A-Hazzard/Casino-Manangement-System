/**
 * Cashier Shift Cancel API
 * 
 * POST /api/cashier/shift/cancel
 * 
 * Cancel a pending cashier shift opening request.
 * Removes the pending shift and associated float request.
 * Also actioned/dismisses any associated notifications for Vault Managers.
 *
 * @module app/api/cashier/shift/cancel/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import { markNotificationAsCancelledByEntity } from '@/lib/helpers/vault/notifications';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authentication
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

    // STEP 2: Connect to DB
    await connectDB();

    // STEP 3: Find the pending shift for this cashier
    const pendingShift = await CashierShiftModel.findOne({
      cashierId: userId,
      status: 'pending_start'
    });

    if (!pendingShift) {
      return NextResponse.json(
        { success: false, error: 'No pending shift request found to cancel' },
        { status: 404 }
      );
    }

    const shiftId = pendingShift._id;
    const locationId = pendingShift.locationId;

    // STEP 4: Find and delete associated float request
    const floatRequest = await FloatRequestModel.findOne({
      cashierShiftId: shiftId,
      status: 'pending'
    });

    if (floatRequest) {
      // Mark notification as actioned (cancelled)
      try {
        await markNotificationAsCancelledByEntity(floatRequest._id, 'float_request');
      } catch (notifError) {
        console.error('Failed to update notification status during cancel:', notifError);
      }

      await FloatRequestModel.updateOne({ _id: floatRequest._id }, { 
        status: 'cancelled',
        updatedAt: new Date(),
        vmNotes: 'Request cancelled by cashier',
        $push: {
          auditLog: {
            action: 'cancelled',
            performedBy: userId,
            timestamp: new Date(),
            notes: 'Cancelled by cashier'
          }
        }
      });
    }

    // STEP 5: Update the pending shift to cancelled
    await CashierShiftModel.updateOne({ _id: shiftId }, { 
      status: 'cancelled',
      closedAt: new Date(),
      notes: 'Shift opening request cancelled by cashier'
    });

    // STEP 6: Audit Activity
    await logActivity({
      userId,
      username,
      action: 'cancel',
      details: `Cashier shift opening request cancelled by cashier`,
      metadata: {
        resource: 'cashier_shift',
        resourceId: shiftId,
        locationId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Shift request cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling cashier shift request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
