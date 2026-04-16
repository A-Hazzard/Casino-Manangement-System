/**
 * Float Request Detail API Route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getFloatRequestById,
  editFloatRequest,
  transformFloatRequestForResponse,
} from '@/app/api/lib/helpers/vault/floatRequests';
import { canEditFloatRequest } from '@/app/api/lib/helpers/vault/authorization';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = pathname.split('/').pop();

  return withApiAuth(req, async () => {
    try {
      if (!requestId)
        return NextResponse.json(
          { error: 'Float request ID is required' },
          { status: 400 }
        );

      const floatRequest = await getFloatRequestById(requestId);
      if (!floatRequest)
        return NextResponse.json(
          { error: 'Float request not found' },
          { status: 404 }
        );

      return NextResponse.json({
        success: true,
        data: { floatRequest: transformFloatRequestForResponse(floatRequest) },
      });
    } catch (err: unknown) {
      console.error('[Float Detail GET] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function PUT(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = pathname.split('/').pop();

  return withApiAuth(req, async ({ user: userPayload }) => {
    try {
      if (!requestId)
        return NextResponse.json(
          { error: 'Float request ID is required' },
          { status: 400 }
        );

      const body = await req.json();
      if (!body.requestedDenom)
        return NextResponse.json(
          { error: 'requestedDenom is required' },
          { status: 400 }
        );

      const floatRequest = await getFloatRequestById(requestId);
      if (!floatRequest)
        return NextResponse.json(
          { error: 'Float request not found' },
          { status: 404 }
        );

      const canEdit = await canEditFloatRequest(
        userPayload as unknown as {
          _id: string;
          assignedLicencees?: string[];
          assignedLocations?: string[];
          multiplier?: number;
        },
        floatRequest
      );
      if (!canEdit)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const previousDenom = floatRequest.requestedDenom;
      const updated = await editFloatRequest(requestId, body.requestedDenom);
      if (!updated)
        return NextResponse.json(
          { error: 'Failed to update' },
          { status: 500 }
        );

      console.log(`[Float Request PUT] Updated float request ${requestId} — denom: ${previousDenom} → ${body.requestedDenom}`);
      logActivity({
        action: 'update',
        details: `Float request ${requestId} denomination updated`,
        userId: String(userPayload._id),
        username: String((userPayload as Record<string, unknown>).username || (userPayload as Record<string, unknown>).emailAddress || userPayload._id),
        metadata: {
          resource: 'float-request',
          resourceId: requestId,
          resourceName: `Float Request ${requestId}`,
          changes: [{ field: 'requestedDenom', oldValue: previousDenom, newValue: body.requestedDenom }],
          previousData: { requestedDenom: previousDenom },
          newData: { requestedDenom: body.requestedDenom },
        },
      }).catch(err => console.error('[Float Request PUT] Activity log failed:', err));

      return NextResponse.json({
        success: true,
        data: { floatRequest: transformFloatRequestForResponse(updated) },
      });
    } catch (err: unknown) {
      console.error('[Float Detail PUT] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
