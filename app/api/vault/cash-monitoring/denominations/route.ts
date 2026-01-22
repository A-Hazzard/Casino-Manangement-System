/**
 * Cash Monitoring Denominations API Route
 *
 * This route handles denomination breakdown queries.
 * It supports:
 * - Getting denomination breakdown for a location
 *
 * @module app/api/vault/cash-monitoring/denominations/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { getUserLocationFilter, getUserAccessibleLicenseesFromToken } from '@/app/api/lib/helpers/licenseeFilter';
import { getDenominationBreakdown } from '@/app/api/lib/helpers/vault/cashMonitoring';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
    }
    const licensee = searchParams.get('licensee') || searchParams.get('licencee');
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = user as { assignedLocations?: string[]; roles?: string[] };
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licensee || undefined,
      userPayload.assignedLocations || [],
      (userPayload.roles as string[]) || []
    );
    if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
      return NextResponse.json(
        { error: 'Forbidden: No access to this location' },
        { status: 403 }
      );
    }
    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;
    const breakdown = await getDenominationBreakdown(locationId, dateRange);
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Denominations API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ success: true, data: { breakdown } });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Denominations API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
