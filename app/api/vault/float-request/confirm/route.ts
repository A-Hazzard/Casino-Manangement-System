/**
 * Vault Float Request Confirmation API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for confirming a float request
 *
 * @body {string} requestId - REQUIRED. ID of the request to confirm.
 * @body {string} notes - Optional. Confirmation notes.
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const { requestId, notes } = await request.json();
      if (!requestId)
        return NextResponse.json(
          { success: false, error: 'Missing requestId' },
          { status: 400 }
        );

      const floatRequest = await FloatRequestModel.findOne({ _id: requestId });
      if (!floatRequest)
        return NextResponse.json(
          { success: false, error: 'Float request not found' },
          { status: 404 }
        );

      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const isVM = normalizedRoles.some(r =>
        ['admin', 'developer', 'owner', 'manager', 'vault-manager'].includes(r)
      );
      const isOwner = floatRequest.cashierId.toString() === userPayload._id;

      const canConfirm =
        (floatRequest.type === 'decrease' && isVM) ||
        (floatRequest.type === 'increase' && isOwner) ||
        (!floatRequest.type && isOwner) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('developer') ||
        normalizedRoles.includes('owner');

      if (!canConfirm)
        return NextResponse.json(
          { success: false, error: 'Unauthorized to confirm' },
          { status: 403 }
        );
      if (floatRequest.status !== 'approved_vm')
        return NextResponse.json(
          { success: false, error: `Invalid status: ${floatRequest.status}` },
          { status: 400 }
        );

      const { finalizeFloatRequest } =
        await import('@/app/api/lib/helpers/vault/finalizeFloat');
      const result = await finalizeFloatRequest(
        requestId,
        userPayload._id,
        userPayload.username as string,
        notes || ''
      );

      return NextResponse.json({
        success: true,
        floatRequest: result.floatRequest.toObject(),
        cashierShift: result.cashierShift.toObject(),
      });
    } catch (error: unknown) {
      console.error('[Float Confirm API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
