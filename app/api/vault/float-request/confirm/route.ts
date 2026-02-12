/**
 * Vault Float Request Confirmation API
 * 
 * POST /api/vault/float-request/confirm
 * 
 * Allows a Cashier to confirm receipt of cash after a Vault Manager has approved their float request.
 * This finalizes the transaction, updates the ledger, and activates/adjusts the shift.
 * 
 * @module app/api/vault/float-request/confirm/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authentication
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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId' },
        { status: 400 }
      );
    }

    // STEP 3: Connect to DB and find request
    await connectDB();
    const floatRequest = await FloatRequestModel.findOne({ _id: requestId });

    if (!floatRequest) {
      return NextResponse.json(
        { success: false, error: 'Float request not found' },
        { status: 404 }
      );
    }

    // SECURITY: Ensure correct party is confirming
    const isVM = ((userPayload.roles as string[]) || []).some(r => ['admin', 'manager', 'vault-manager'].includes(r.toLowerCase()));
    
    const canConfirm = (
      (floatRequest.type === 'decrease' && isVM) || 
      (floatRequest.type === 'increase' && floatRequest.cashierId === userId) ||
      (!floatRequest.type && floatRequest.cashierId === userId) || // initial float is increase
      ((userPayload.roles as string[]) || []).includes('admin')
    );

    if (!canConfirm) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to confirm this request' },
        { status: 403 }
      );
    }

    if (floatRequest.status !== 'approved_vm') {
      return NextResponse.json(
        { success: false, error: `Request cannot be confirmed in current status: ${floatRequest.status}` },
        { status: 400 }
      );
    }

    // STEP 4/5/6/7: Finalize the transaction using the helper
    const { finalizeFloatRequest } = await import('@/app/api/lib/helpers/vault/finalizeFloat');
    
    const result = await finalizeFloatRequest(
      requestId,
      userId,
      username,
      floatRequest.type === 'decrease' ? 'Return receipt confirmed by VM' : 'Float receipt confirmed by cashier'
    );

    return NextResponse.json({
      success: true,
      floatRequest: result.floatRequest.toObject(),
      cashierShift: result.cashierShift.toObject(),
    });

  } catch (error) {
    console.error('Error confirming float request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
