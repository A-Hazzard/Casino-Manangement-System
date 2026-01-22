/**
 * Payout Detail API Route
 *
 * This route handles individual payout operations.
 * It supports:
 * - Getting payout details
 * - Updating payout (limited fields)
 *
 * @module app/api/vault/payouts/[id]/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import {
  getPayoutById,
  updatePayout,
  transformPayoutForResponse,
} from '@/app/api/lib/helpers/vault/payouts';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { UpdatePayoutRequest } from '@/app/api/lib/types/vault';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const payoutId = params.id;
    if (!payoutId) {
      return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 });
    }
    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payout = await getPayoutById(payoutId);
    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Payout Detail API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: { payout: transformPayoutForResponse(payout) },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Payout Detail API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const payoutId = params.id;
    if (!payoutId) {
      return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 });
    }
    const body = (await req.json()) as UpdatePayoutRequest;
    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payout = await getPayoutById(payoutId);
    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    const updated = await updatePayout(payoutId, body);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 });
    }
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Payout Update API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: { payout: transformPayoutForResponse(updated) },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Payout Update API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
