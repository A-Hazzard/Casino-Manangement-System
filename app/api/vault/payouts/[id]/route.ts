/**
 * Payout Detail API Route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getPayoutById,
  updatePayout,
  transformPayoutForResponse,
} from '@/app/api/lib/helpers/vault/payouts';
import type { UpdatePayoutRequest } from '@/app/api/lib/types/vault';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const payoutId = pathname.split('/').pop();

  return withApiAuth(req, async () => {
    try {
      if (!payoutId)
        return NextResponse.json(
          { success: false, error: 'Payout ID is required' },
          { status: 400 }
        );

      const payout = await getPayoutById(payoutId);
      if (!payout)
        return NextResponse.json(
          { success: false, error: 'Payout not found' },
          { status: 404 }
        );

      return NextResponse.json({
        success: true,
        data: { payout: transformPayoutForResponse(payout) },
      });
    } catch (err: unknown) {
      console.error('[Payout Detail API] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}

export async function PUT(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const payoutId = pathname.split('/').pop();

  return withApiAuth(req, async () => {
    try {
      if (!payoutId)
        return NextResponse.json(
          { success: false, error: 'Payout ID is required' },
          { status: 400 }
        );

      const body = (await req.json()) as UpdatePayoutRequest;
      const payout = await getPayoutById(payoutId);
      if (!payout)
        return NextResponse.json(
          { success: false, error: 'Payout not found' },
          { status: 404 }
        );

      const updated = await updatePayout(payoutId, body);
      if (!updated)
        return NextResponse.json(
          { success: false, error: 'Failed to update payout' },
          { status: 500 }
        );

      return NextResponse.json({
        success: true,
        data: { payout: transformPayoutForResponse(updated) },
      });
    } catch (err: unknown) {
      console.error('[Payout Update API] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
