/**
 * Float Request Detail API Route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getFloatRequestById,
  editFloatRequest,
  transformFloatRequestForResponse,
} from '@/app/api/lib/helpers/vault/floatRequests';
import { canEditFloatRequest } from '@/app/api/lib/helpers/vault/authorization';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(req, async () => {
    try {
      const requestId = params.id;
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(req, async ({ user: userPayload }) => {
    try {
      const requestId = params.id;
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

      const updated = await editFloatRequest(requestId, body.requestedDenom);
      if (!updated)
        return NextResponse.json(
          { error: 'Failed to update' },
          { status: 500 }
        );

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
