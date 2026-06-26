/**
 * WOW Meters API Route
 *
 * Returns the meter readings for a WOW (Wheel of Wonders) machine to pre-fill a
 * collection report. WOW machines never have collector-entered meters — their
 * readings are synced into the Meters collection with `meterSource: 'WOW_SYNC'`
 * (absolute values in `drop` / `totalCancelledCredits`, never in `movement`).
 *
 * - Current meters: the latest WOW_SYNC meter at or before the report end time.
 * - Previous meters: the meter-in/out from the most recent prior collection
 *   (unified across V1 and V2 via `collectionMetersHistory`). For first-report
 *   machines (no history), the baseline date is resolved in priority order:
 *   startTime param → Machine.collectionTime → endTime (now). prevIn/prevOut are
 *   null when no WOW_SYNC record exists at or around the baseline date.
 *
 * GET /api/collection-reports/collections/wow-meters?machineId=<id>&startTime=<iso>&endTime=<iso>
 *
 * @module app/api/collection-reports/collections/wow-meters/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import type { MeterDocument } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Default lookback (days) for a machine's FIRST-EVER collection when no explicit
 * start is picked and the machine has no prior collectionTime. Replaces the old
 * "second-latest WOW_SYNC reading" baseline, which collapsed the window to seconds
 * for continuously-syncing WOW machines. Keep in sync with the batch route.
 */
const FIRST_REPORT_LOOKBACK_DAYS = 1;

/**
 * Resolve the WOW_SYNC meter that represents the cumulative reading at `at`:
 * the latest reading at or before `at`, falling back to the nearest reading
 * after `at` when none exists before it (machine synced after the requested time).
 */
async function resolveWowMeterAt(
  machineId: string,
  at: Date
): Promise<MeterDocument | null> {
  return (
    (await Meters.findOne({
      machine: machineId,
      meterSource: 'WOW_SYNC',
      readAt: { $lte: at },
    })
      .sort({ readAt: -1 })
      .lean<MeterDocument | null>()) ??
    (await Meters.findOne({
      machine: machineId,
      meterSource: 'WOW_SYNC',
      readAt: { $gt: at },
    })
      .sort({ readAt: 1 })
      .lean<MeterDocument | null>())
  );
}

/**
 * GET handler for WOW meter pre-fill.
 *
 * Flow:
 * 1. Parse and validate query params (machineId required).
 * 2. Resolve current meters from the latest WOW_SYNC meter ≤ endTime.
 * 3. Resolve previous meters from the machine's most recent collection history
 *    entry (V1 or V2); fall back to the WOW_SYNC meter nearest startTime.
 * 4. Return current + previous meters.
 *
 * @param {string} machineId - REQUIRED. Query param: the machine's MongoDB ID.
 * @param {string} [startTime] - Optional ISO date: report start (for first-report fallback).
 * @param {string} [endTime] - Optional ISO date: report end (current reading cutoff).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  return withApiAuth(request, async () => {
    // ========================================================================
    // STEP 1: Parse request parameters
    // ========================================================================
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');
    const startTimeParam = searchParams.get('startTime');
    const endTimeParam = searchParams.get('endTime');

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: 'machineId query parameter is required' },
        { status: 400 }
      );
    }

    const endDate = endTimeParam ? new Date(endTimeParam) : new Date();
    const startDate = startTimeParam ? new Date(startTimeParam) : null;

        // ========================================================================
    // STEP 2: Resolve current meters (latest WOW_SYNC meter ≤ endTime)
    // ========================================================================
    // Resolve includeJackpot config for the machine
    let includeJackpot = false;
    const machineWithLoc = await Machine.findOne({ _id: machineId })
      .select('gamingLocation')
      .lean<{ _id: string; gamingLocation?: string }>();
    if (machineWithLoc?.gamingLocation) {
      const { GamingLocations } = await import('@/app/api/lib/models/gaminglocations');
      const { Licencee } = await import('@/app/api/lib/models/licencee');
      const loc = await GamingLocations.findOne({ _id: machineWithLoc.gamingLocation })
        .select('rel.licencee')
        .lean<{ _id: string; rel?: { licencee?: string } }>();
      if (loc?.rel?.licencee) {
        const lic = await Licencee.findOne({ _id: loc.rel.licencee })
          .select('includeJackpot')
          .lean<{ _id: string; includeJackpot?: boolean }>();
        includeJackpot = !!lic?.includeJackpot;
      }
    }

    const currentMeter = await Meters.findOne({
      machine: machineId,
      meterSource: 'WOW_SYNC',
      readAt: { $lte: endDate },
    })
      .sort({ readAt: -1 })
      .lean<MeterDocument | null>();

    const metersIn = currentMeter?.drop ?? null;
    const rawMetersOut = currentMeter?.totalCancelledCredits ?? null;
    const currentJackpot = currentMeter?.jackpot ?? 0;
    const metersOut = rawMetersOut !== null
      ? rawMetersOut + (includeJackpot ? currentJackpot : 0)
      : null;

    // ========================================================================
    // STEP 3: Resolve previous meters
    //   Priority 1: most recent collection history entry (unified V1 + V2).
    //   Priority 2 (first report): WOW_SYNC meter closest to the start time.
    // ========================================================================
    const machine = await Machine.findOne({ _id: machineId })
      .select('collectionMetersHistory collectionMeters collectionTime')
      .lean<{
        collectionMetersHistory?: Array<{
          metersIn?: number;
          metersOut?: number;
          timestamp?: Date;
        }>;
        collectionMeters?: { metersIn?: number; metersOut?: number };
        collectionTime?: Date;
      }>();

    const history = (machine?.collectionMetersHistory ?? [])
      .filter(entry => entry.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp as Date).getTime() -
          new Date(a.timestamp as Date).getTime()
      );

    let prevIn: number | null = null;
    let prevOut: number | null = null;
    let hasPrevious = false;

    if (startDate) {
      // Explicit period start — the caller is picking a custom window (date picker
      // or a re-fetch on start-time change). Derive the baseline straight from the
      // WOW_SYNC reading at/just-before startDate so changing the start updates
      // prevIn, instead of locking it to the last collection (history[0]).
      const baselineMeter = await resolveWowMeterAt(machineId, startDate);
      prevIn = baselineMeter?.drop ?? null;
      const rawBaselineOut = baselineMeter?.totalCancelledCredits ?? null;
      const baselineJackpot = baselineMeter?.jackpot ?? 0;
      prevOut = rawBaselineOut !== null
        ? rawBaselineOut + (includeJackpot ? baselineJackpot : 0)
        : null;
      hasPrevious = baselineMeter != null;
    } else if (history.length > 0) {
      // No explicit start — default "since last collection" behaviour.
      prevIn = history[0].metersIn ?? null;
      prevOut = history[0].metersOut ?? null;
      hasPrevious = true;
    } else {
      // First report for this machine and no start param — baseline date priority:
      //   1. Machine.collectionTime (last time this machine was collected)
      //   2. An N-day lookback from endDate, so the period covers a real window.
      // (Previously used the second-latest WOW_SYNC reading, which sits seconds before
      // the latest for continuously-syncing machines and collapsed the window.)
      const baselineDate = machine?.collectionTime
        ? new Date(machine.collectionTime)
        : new Date(endDate.getTime() - FIRST_REPORT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

      const baselineMeter = await resolveWowMeterAt(machineId, baselineDate);
      prevIn = baselineMeter?.drop ?? null;
      const rawBaselineOut = baselineMeter?.totalCancelledCredits ?? null;
      const baselineJackpot = baselineMeter?.jackpot ?? 0;
      prevOut = rawBaselineOut !== null
        ? rawBaselineOut + (includeJackpot ? baselineJackpot : 0)
        : null;
    }

    // ========================================================================
    // STEP 4: Return response
    // ========================================================================
    if (Date.now() - startTime > 1000) {
      console.warn(`[wow-meters] Slow response: ${Date.now() - startTime}ms`);
    }

    return NextResponse.json({
      success: true,
      data: {
        metersIn,
        metersOut,
        prevIn,
        prevOut,
        hasPrevious,
        currentReadAt: currentMeter?.readAt ?? null,
        jackpot: currentJackpot,
      },
    });
  });
}
