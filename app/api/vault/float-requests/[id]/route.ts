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
import {
  logRouteFetch,
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching float request details
 *
 * @param {string} id - REQUIRED (path). The ID of the float request to fetch.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/float-requests/[id]';
  const user = extractUserFromRequest(req);

  const { pathname } = req.nextUrl;
  const requestId = pathname.split('/').pop();

  return withApiAuth(req, async () => {
    try {
      // ============================================================================
      // STEP 1: Validate parameters
      // ============================================================================
      if (!requestId) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/float-requests/[id]',
          'Float request ID is required',
          user
        );
        return NextResponse.json(
          { error: 'Float request ID is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch and validate float request
      // ============================================================================
      const floatRequest = await getFloatRequestById(requestId);
      if (!floatRequest) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/float-requests/[id]',
          'Float request not found',
          user
        );
        return NextResponse.json(
          { error: 'Float request not found' },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 3: Return response
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/float-requests/[id]',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: { floatRequest: transformFloatRequestForResponse(floatRequest) },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch float request';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/float-requests/[id]',
        errorMessage,
        user
      );
      console.error('[Float Detail GET] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

/**
 * Main PUT handler for editing a float request
 *
 * @param {string} id - REQUIRED (path). The ID of the float request to update.
 * @body {number} requestedDenom - REQUIRED. The new denomination amount for the request.
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/vault/float-requests/[id]';
  const user = extractUserFromRequest(req);

  const { pathname } = req.nextUrl;
  const requestId = pathname.split('/').pop();

  return withApiAuth(req, async ({ user: userPayload }) => {
    try {
      // ============================================================================
      // STEP 1: Validate parameters and body
      // ============================================================================
      if (!requestId) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/float-requests/[id]',
          'Float request ID is required',
          user
        );
        return NextResponse.json(
          { error: 'Float request ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();
      if (!body.requestedDenom) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/float-requests/[id]',
          'requestedDenom is required',
          user
        );
        return NextResponse.json(
          { error: 'requestedDenom is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch and validate float request
      // ============================================================================
      const floatRequest = await getFloatRequestById(requestId);
      if (!floatRequest) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/float-requests/[id]',
          'Float request not found',
          user
        );
        return NextResponse.json(
          { error: 'Float request not found' },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 3: Authorize and execute update
      // ============================================================================
      const canEdit = await canEditFloatRequest(
        userPayload as unknown as {
          _id: string;
          assignedLicencees?: string[];
          assignedLocations?: string[];
          multiplier?: number;
        },
        floatRequest
      );
      if (!canEdit) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/float-requests/[id]',
          'Forbidden',
          user
        );
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const previousDenom = floatRequest.requestedDenom;
      const updated = await editFloatRequest(requestId, body.requestedDenom);
      if (!updated) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/float-requests/[id]',
          'Failed to update',
          user
        );
        return NextResponse.json(
          { error: 'Failed to update' },
          { status: 500 }
        );
      }

      // ============================================================================
      // STEP 4: Log activity and return response
      // ============================================================================
      console.log(
        `[Float Request PUT] Updated float request ${requestId} — denom: ${previousDenom} → ${body.requestedDenom}`
      );
      logActivity({
        action: 'update',
        details: `Float request ${requestId} denomination updated`,
        userId: String(userPayload._id),
        username: String(
          (userPayload as Record<string, unknown>).username ||
            (userPayload as Record<string, unknown>).emailAddress ||
            userPayload._id
        ),
        metadata: {
          resource: 'float-request',
          resourceId: requestId,
          resourceName: `Float Request ${requestId}`,
          changes: [
            {
              field: 'requestedDenom',
              oldValue: previousDenom,
              newValue: body.requestedDenom,
            },
          ],
          previousData: { requestedDenom: previousDenom },
          newData: { requestedDenom: body.requestedDenom },
        },
      }).catch(err =>
        console.error('[Float Request PUT] Activity log failed:', err)
      );

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'PUT',
        '/api/vault/float-requests/[id]',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: { floatRequest: transformFloatRequestForResponse(updated) },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update float request';
      logRouteError(
        functionName,
        'PUT',
        '/api/vault/float-requests/[id]',
        errorMessage,
        user
      );
      console.error('[Float Detail PUT] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
