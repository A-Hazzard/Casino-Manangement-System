/**
 * Repair SAS Times Admin API Route
 *
 * This route handles repairing SAS times in collections by:
 * - Normalizing timestamps to 8AM Trinidad time (12:00 UTC)
 * - Finding previous collections for correct SAS time windows
 * - Calculating corrected SAS metrics
 * - Updating collections and machine timestamps (in commit mode)
 *
 * Supports:
 * - Dry-run mode (preview changes) and commit mode (apply changes)
 * - Filtering by locationReportId, machineId, or date range
 *
 * @module app/api/admin/repair-sas-times/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { repairSasTimesForCollections } from '@/app/api/lib/helpers/collectionReport/fixes/adminRepair';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type RepairMode = 'dry-run' | 'commit';

/**
 * POST /api/admin/repair-sas-times
 *
 * Repairs incorrect SAS timestamps in collection records by normalising them to
 * the 8 AM Trinidad-time gaming-day boundary and recalculating SAS metrics.
 * Run in 'dry-run' mode first to preview changes, then 'commit' to apply them.
 * No authentication guard in the handler — restrict at infrastructure level.
 *
 * Query params:
 * @param mode             {string}  Optional. 'dry-run' (default) previews changes; 'commit' applies them.
 * @param locationReportId {string}  Optional. Limit repair to collections belonging to this report ID.
 * @param machineId        {string}  Optional. Limit repair to collections for this machine ID.
 * @param startDate        {string}  Optional. ISO date string; only include collections at or after this timestamp.
 * @param endDate          {string}  Optional. ISO date string; only include collections at or before this timestamp.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') as RepairMode) || 'dry-run';
    const locationReportId = searchParams.get('locationReportId') || undefined;
    const machineId = searchParams.get('machineId') || undefined;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // ============================================================================
    // STEP 3: Build filter from parameters
    // ============================================================================
    const filter: Record<string, unknown> = {};
    if (locationReportId) filter.locationReportId = locationReportId;
    if (machineId) filter.machineId = machineId;

    if (startDateParam || endDateParam) {
      const ts: Record<string, Date> = {};
      if (startDateParam) ts.$gte = new Date(startDateParam);
      if (endDateParam) ts.$lte = new Date(endDateParam);
      filter.timestamp = ts;
    }

    // ============================================================================
    // STEP 4: Execute repair operation
    // ============================================================================
    const results = await repairSasTimesForCollections(filter, mode);

    // ============================================================================
    // STEP 5: Return repair results
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Admin Repair SAS Times POST API] Processed ${results.count} collections, ${results.changed} changed in ${mode} mode after ${duration}ms.`
    );

    return NextResponse.json(results);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Admin Repair SAS Times POST API] Error after ${duration}ms:`,
      errorMessage
    );

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

