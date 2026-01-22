/**
 * Shift Detail API Route
 *
 * This route handles individual shift operations.
 * It supports:
 * - Getting shift details
 * - Updating shift (limited fields)
 *
 * @module app/api/vault/shifts/[id]/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import {
  getShiftById,
  transformShiftForResponse,
} from '@/app/api/lib/helpers/vault/shifts';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const shiftId = params.id;
    if (!shiftId) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }
    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shift = await getShiftById(shiftId);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Shift Detail API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: { shift: transformShiftForResponse(shift) },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Shift Detail API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
