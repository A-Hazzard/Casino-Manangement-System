/**
 * Cabinet Raw Meters API Route
 *
 * Developer-only endpoint that returns all Meter documents for a machine,
 * including archived ones (bypasses soft-delete pre-hook).
 *
 * @module app/api/cabinets/[cabinetId]/meters/route
 *
 * Features:
 * - Returns all meters for a machine sorted by readAt desc
 * - Optional startDate/endDate date range filtering
 * - Bypasses soft-delete to include archived meters
 * - Restricted to developer role only
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Meters } from '@/app/api/lib/models/meters';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cabinets/[cabinetId]/meters
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Parse date range params
 * 3. Query meters via raw collection (bypasses soft-delete pre-hook)
 * 4. Return sorted results
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  return withApiAuth(req, async ({ userRoles }) => {
    const startTime = Date.now();

    // ============================================================================
    // STEP 1: Enforce developer-only access
    // ============================================================================
    const isDeveloper = userRoles?.includes('developer');
    if (!isDeveloper) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse params
    // ============================================================================
    const { cabinetId } = await params;
    if (!cabinetId) {
      return NextResponse.json({ success: false, error: 'cabinetId required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const apiPage = Math.max(1, parseInt(searchParams.get('apiPage') || '1'));

    const dateFilter: Record<string, unknown> = {};
    if (startDateParam || endDateParam) {
      dateFilter.readAt = {};
      if (startDateParam) (dateFilter.readAt as Record<string, unknown>).$gte = new Date(startDateParam);
      if (endDateParam) (dateFilter.readAt as Record<string, unknown>).$lte = new Date(endDateParam);
    }

    // ============================================================================
    // STEP 3: Connect and query — raw collection bypasses soft-delete pre-hook
    // ============================================================================
    await connectDB();
    const BATCH_SIZE = 100;
    const skip = (apiPage - 1) * BATCH_SIZE;

    const [rawMeters, totalCount] = await Promise.all([
      Meters.collection
        .find({ machine: cabinetId, ...dateFilter })
        .sort({ readAt: -1 })
        .skip(skip)
        .limit(BATCH_SIZE)
        .toArray(),
      Meters.collection.countDocuments({ machine: cabinetId, ...dateFilter }),
    ]);

    if (Date.now() - startTime > 1000) {
      console.warn(`[GET /api/cabinets/${cabinetId}/meters] Slow response: ${Date.now() - startTime}ms`);
    }

    // ============================================================================
    // STEP 4: Return
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: rawMeters,
      total: totalCount,
      apiPage,
      hasMore: skip + rawMeters.length < totalCount,
    });
  });
}
