/**
 * Payout Detail API Route
 */

import {
  calculateChanges,
  logActivity,
} from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getPayoutById,
  updatePayout,
  transformPayoutForResponse,
} from '@/app/api/lib/helpers/vault/payouts';
import {
  logRouteFetch,
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { UpdatePayoutRequest } from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching payout details
 *
 * @param {string} id - REQUIRED (path). The ID of the payout to fetch.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/payouts/[id]';
  const user = extractUserFromRequest(req);

  const { pathname } = req.nextUrl;
  const payoutId = pathname.split('/').pop();

  return withApiAuth(req, async () => {
    try {
      if (!payoutId) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/payouts/[id]',
          'Payout ID is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Payout ID is required' },
          { status: 400 }
        );
      }

      const payout = await getPayoutById(payoutId);
      if (!payout) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/payouts/[id]',
          'Payout not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Payout not found' },
          { status: 404 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/payouts/[id]',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: { payout: transformPayoutForResponse(payout) },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch payout';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/payouts/[id]',
        errorMessage,
        user
      );
      console.error('[Payout Detail API] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}

/**
 * Main PUT handler for updating a payout
 *
 * @param {string} id - REQUIRED (path). The ID of the payout to update.
 * @body {UpdatePayoutRequest} data - The updated payout data fields.
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/vault/payouts/[id]';
  const user = extractUserFromRequest(req);

  const { pathname } = req.nextUrl;
  const payoutId = pathname.split('/').pop();

  return withApiAuth(req, async ({ user: userPayload }) => {
    try {
      if (!payoutId) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/payouts/[id]',
          'Payout ID is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Payout ID is required' },
          { status: 400 }
        );
      }

      const body = (await req.json()) as UpdatePayoutRequest;
      console.log(
        `[Payout PUT] Request — payoutId: ${payoutId}, fields: ${Object.keys(body).join(', ')}`
      );

      const payout = await getPayoutById(payoutId);
      if (!payout) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/payouts/[id]',
          'Payout not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Payout not found' },
          { status: 404 }
        );
      }

      const updated = await updatePayout(payoutId, body);
      if (!updated) {
        logRouteError(
          functionName,
          'PUT',
          '/api/vault/payouts/[id]',
          'Failed to update payout',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Failed to update payout' },
          { status: 500 }
        );
      }

      console.log(`[Payout PUT] Updated payout ${payoutId}`);
      logActivity({
        action: 'update',
        details: `Payout ${payoutId} updated`,
        userId: String(userPayload._id),
        username: String(
          (userPayload as Record<string, unknown>).username ||
            (userPayload as Record<string, unknown>).emailAddress ||
            userPayload._id
        ),
        metadata: {
          resource: 'payout',
          resourceId: payoutId,
          resourceName: `Payout ${payoutId}`,
          changes: calculateChanges(
            payout as unknown as Record<string, unknown>,
            body as unknown as Record<string, unknown>
          ),
          previousData: payout,
          newData: updated,
        },
      }).catch(err => console.error('[Payout PUT] Activity log failed:', err));

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'PUT',
        '/api/vault/payouts/[id]',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: { payout: transformPayoutForResponse(updated) },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update payout';
      logRouteError(
        functionName,
        'PUT',
        '/api/vault/payouts/[id]',
        errorMessage,
        user
      );
      console.error('[Payout Update API] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
