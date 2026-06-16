/**
 * POST /api/collection-reports/check-variations
 *
 * Compares meter gross against SAS gross for a set of machines to detect discrepancies
 * before a collection report is submitted. Developer/admin only maintenance route.
 *
 * Body fields:
 * @param {string} locationId - Required. ID of the gaming location; used to look up the licencee's `includeJackpot` setting.
 * @param {Array} machines - Required. Array of machine meter snapshots to check. Each entry must include:
 *   - `machineId`        {string}   Required. Machine identifier.
 *   - `metersIn`         {number}   Required. Current coin-in meter reading.
 *   - `metersOut`        {number}   Required. Current coin-out meter reading.
 *   - `machineName`      {string}   Optional. Display name; resolved from DB if omitted.
 *   - `sasStartTime`     {string}   Optional. ISO timestamp for the start of the SAS window.
 *   - `sasEndTime`       {string}   Optional. ISO timestamp for the end of the SAS window.
 *   - `prevMetersIn`     {number}   Optional. Previous coin-in reading used to calculate meter gross.
 *   - `prevMetersOut`    {number}   Optional. Previous coin-out reading used to calculate meter gross.
 *   - `movementGross`    {number}   Optional. Pre-calculated movement gross from a saved collection; overrides raw-meter calculation (ensures RAM-clear entries match report page).
 * @param {boolean} [includeJackpot] - Optional. When true, subtracts jackpot from SAS gross. Defaults to the licencee setting if omitted.
 */

import type { NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/app/api/lib/utils/apiResponse';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type {
  GamingMachine,
  LicenceeDocument,
  MongooseId,
} from '@/shared/types';
import type { GamingLocationDocument } from '@/shared/types';
type CheckVariationsRequest = {
  locationId: string;
  machines: Array<{
    machineId: string;
    machineName?: string;
    metersIn: number;
    metersOut: number;
    sasStartTime?: string;
    sasEndTime?: string;
    prevMetersIn?: number;
    prevMetersOut?: number;
    movementGross?: number;
    /** Pre-computed SAS gross from a saved collection's sasMeters.gross.
     * When provided, skips the live Meters query for this machine and uses
     * this value directly. Required for offline SMIB machines to avoid
     * double-counting pre-offline SAS meters with the supplemental meter. */
    storedSasGross?: number;
  }>;
  includeJackpot?: boolean;
};

type MachineVariationData = {
  machineId: string;
  machineName: string;
  variation: number | string;
  sasGross: number | string;
  meterGross: number;
  sasStartTime?: string | null;
  sasEndTime?: string | null;
};

type CheckVariationsResponse = {
  hasVariations: boolean;
  totalVariation: number;
  machines: MachineVariationData[];
};

/**
 * Main POST handler for checking collection report variations
 *
 * Compares meter gross against SAS gross for a set of machines to detect discrepancies
 * before a collection report is submitted. Developer/admin only maintenance route.
 *
 * @param {NextRequest} request - Information about the incoming request
 * @body {string} locationId - Required. ID of the gaming location; used to look up the licencee's `includeJackpot` setting.
 * @body {Array} machines - Required. Array of machine meter snapshots to check.
 *   - machineId {string} Required. Machine identifier.
 *   - metersIn {number} Required. Current coin-in meter reading.
 *   - metersOut {number} Required. Current coin-out meter reading.
 *   - machineName {string} Optional. Display name
 *   - sasStartTime {string} Optional. ISO timestamp for SAS window
 *   - sasEndTime {string} Optional. ISO timestamp for SAS window
 *   - prevMetersIn {number} Optional. Previous coin-in reading
 *   - prevMetersOut {number} Optional. Previous coin-out reading
 *   - movementGross {number} Optional. Pre-calculated gross
 * @body {boolean} includeJackpot - Optional. When true, subtracts jackpot from SAS gross. Defaults to the licencee setting if omitted.
 *
 * Flow:
 * 1. Connect to the database
 * 2. Parse request body and validate required fields
 * 3. Fetch licencee's includeJackpot flag if not provided
 * 4. Fetch machine details for display
 * 5. Fetch SAS meter data for machines with SAS time ranges
 * 6. Calculate variations (meter gross vs SAS gross) for each machine
 * 7. Return variation data and total variance
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/collection-reports/check-variations';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body and validate required fields
    // ============================================================================
    const body = (await request.json()) as CheckVariationsRequest;
    const {
      locationId,
      machines,
      includeJackpot: userProvidedIncludeJackpot,
    } = body;

    if (!locationId || !machines || machines.length === 0) {
      logRouteError(
        functionName,
        'POST',
        '/api/collection-reports/check-variations',
        'Invalid request: locationId and machines array required',
        user
      );
      return createErrorResponse(
        'Invalid request: locationId and machines array required',
        400,
        'INVALID_REQUEST'
      );
    }

    // ============================================================================
    // STEP 3: Fetch licencee's includeJackpot flag if not provided
    // ============================================================================
    let includeJackpot = userProvidedIncludeJackpot ?? false;
    try {
      const location = await GamingLocations.findOne(
        { _id: locationId as unknown as MongooseId },
        { 'rel.licencee': 1 }
      ).lean<GamingLocationDocument>();

      const licenceeId = location?.rel?.licencee;
      if (licenceeId) {
        const { Licencee } = await import('@/app/api/lib/models/licencee');
        const licenceeDoc = await Licencee.findOne(
          { _id: licenceeId },
          { includeJackpot: 1 }
        ).lean<LicenceeDocument>();
        includeJackpot = Boolean(licenceeDoc?.includeJackpot);
      }
    } catch (err) {
      console.warn(
        '[Collection Report] Could not fetch licencee includeJackpot:',
        err
      );
      // Continue with default value
    }

    // ============================================================================
    // STEP 4: Fetch machine details for display
    // ============================================================================
    const machineIds = machines.map(
      machine => machine.machineId as unknown as MongooseId
    );
    const machineDetails = await Machine.find(
      { _id: { $in: machineIds } },
      {
        machineId: 1,
        serialNumber: 1,
        custom: 1,
        game: 1,
        machineCustomName: 1,
        machineName: 1,
        relayId: 1,
      }
    ).lean<GamingMachine[]>();

    const machineDetailsMap = new Map(
      machineDetails.map(machineDetail => [machineDetail._id, machineDetail])
    );

    // ============================================================================
    // STEP 5: Fetch SAS meter data for machines with SAS time ranges
    // Machines that provide storedSasGross skip the live query — their value
    // is pre-computed from the saved collection's sasMeters.gross, which is the
    // authoritative source for finalized collections (matches Machine Metrics).
    // ============================================================================
    const { Meters } = await import('@/app/api/lib/models/meters');

    const meterQueries = machines
      .filter(machine => machine.sasStartTime && machine.sasEndTime && machine.storedSasGross === undefined)
      .map(machine => ({
        machineId: machine.machineId,
        startTime: new Date(machine.sasStartTime!),
        endTime: new Date(machine.sasEndTime!),
      }));

    console.log(
      '[check-variations] RECEIVED ' + machines.length + ' machine(s) for location=' + locationId + ' includeJackpot=' + includeJackpot,
      machines.map(m => ({
        id: m.machineId,
        storedSasGross: m.storedSasGross,
        movementGross: m.movementGross,
        metersIn: m.metersIn,
        prevMetersIn: m.prevMetersIn,
        hasSasWindow: !!(m.sasStartTime && m.sasEndTime),
      }))
    );
    console.log(
      '[check-variations] Will query live Meters for ' + meterQueries.length + ' machine(s) ' +
      '(' + (machines.length - meterQueries.length) + ' machine(s) use storedSasGross, skipping live query)'
    );

    const allMeterData: Array<{
      _id: string;
      totalDrop: number;
      totalCancelled: number;
      totalJackpot: number;
    }> = [];

    if (meterQueries.length > 0) {
      const cursor = Meters.aggregate([
        {
          $match: {
            $or: meterQueries.map(query => ({
              machine: query.machineId,
              readAt: { $gte: query.startTime, $lte: query.endTime },
            })),
            meterSource: { $ne: 'COLLECTION_REPORT' },
          },
        },
        {
          $group: {
            _id: '$machine',
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelled: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
            totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          },
        },
      ]).cursor({ batchSize: 1000 });

      for await (const doc of cursor) {
        allMeterData.push(doc);
      }

      console.log(
        '[check-variations] Live meter query returned data for ' + allMeterData.length + ' machine(s):',
        allMeterData.map(d => ({
          machineId: d._id,
          totalDrop: d.totalDrop,
          totalCancelled: d.totalCancelled,
          sasGross: d.totalDrop - d.totalCancelled,
        }))
      );
    }

    // Create lookup map
    const meterDataMap = new Map(
      allMeterData.map(meterData => [
        meterData._id,
        {
          drop: meterData.totalDrop,
          cancelled: meterData.totalCancelled,
          jackpot: meterData.totalJackpot,
        },
      ])
    );

    // ============================================================================
    // STEP 6: Calculate variations for each machine
    // ============================================================================
    const machineVariations: MachineVariationData[] = [];
    let totalVariation = 0;

    for (const machine of machines) {
      const machineDetail = machineDetailsMap.get(machine.machineId);
      const hasRelayId = machineDetail?.relayId;

      // Use provided machine name if it exists, otherwise build it
      let machineName = machine.machineName;

      if (!machineName) {
        // Get display name components from DB fetch results
        const serialNumber = (machineDetail?.serialNumber || '').trim();
        const customName = (machineDetail?.custom?.name || '').trim();
        const game = (machineDetail?.game || '').trim();

        const mainIdentifier = serialNumber || customName || machine.machineId;
        const bracketParts: string[] = [];

        if (customName && customName !== mainIdentifier) {
          bracketParts.push(customName);
        }
        if (game) {
          bracketParts.push(game);
        }

        machineName =
          bracketParts.length > 0
            ? `${mainIdentifier} (${bracketParts.join(', ')})`
            : mainIdentifier;
      }

      // Calculate meter gross — prefer pre-calculated movement.gross when available (e.g. from saved
      // collection entries) to ensure RAM-clear machines produce the same value as the report page.
      const meterGross =
        machine.movementGross !== undefined
          ? machine.movementGross
          : (machine.metersIn || 0) -
            (machine.prevMetersIn || 0) -
            ((machine.metersOut || 0) - (machine.prevMetersOut || 0));

      // Get SAS data — prefer storedSasGross when provided (finalized collections),
      // otherwise query the live Meters collection.
      let sasGross = 0;
      let jackpot = 0;
      let hasNoSasData: boolean;

      if (machine.storedSasGross !== undefined) {
        sasGross = machine.storedSasGross;
        hasNoSasData = false;
        console.log(
          '[check-variations] STORED machine=' + machine.machineId + ' using storedSasGross=' + sasGross + ' (skipped live query)'
        );
      } else if (machine.sasStartTime && machine.sasEndTime) {
        const meterData = meterDataMap.get(machine.machineId);
        if (meterData) {
          sasGross = meterData.drop - meterData.cancelled;
          jackpot = meterData.jackpot;
          console.log(
            '[check-variations] LIVE_FOUND machine=' + machine.machineId +
            ' drop=' + meterData.drop + ' cancelled=' + meterData.cancelled +
            ' sasGross=' + sasGross + ' jackpot=' + jackpot
          );
        } else {
          console.log(
            '[check-variations] NO_LIVE_DATA machine=' + machine.machineId +
            ' for SAS window ' + String(machine.sasStartTime) + ' -> ' + String(machine.sasEndTime) +
            ' (meterSource!=COLLECTION_REPORT filter applied)'
          );
        }
        hasNoSasData = !meterDataMap.has(machine.machineId);
      } else {
        hasNoSasData = true;
        console.log(
          '[check-variations] NO_SAS_WINDOW machine=' + machine.machineId + ' -- hasNoSasData=true'
        );
      }

      // Apply jackpot adjustment
      const adjustedSasGross = includeJackpot
        ? sasGross - (jackpot || 0)
        : sasGross;

      // Skip variation check for no-SMIB machines (machines without relayId)
      let variation = 0;
      if (!hasRelayId) {
        variation = 0; // No-SMIB machines don't contribute to variation
      } else {
        variation = meterGross - (hasNoSasData ? 0 : adjustedSasGross);
        totalVariation += variation;
      }

      console.log(
        '[check-variations] RESULT machine=' + machine.machineId +
        ' hasRelayId=' + !!hasRelayId +
        ' meterGross=' + meterGross + ' sasGross=' + sasGross + ' adjustedSasGross=' + adjustedSasGross +
        ' hasNoSasData=' + hasNoSasData + ' variation=' + variation
      );
      machineVariations.push({
        machineId: machine.machineId,
        machineName,
        variation: hasRelayId ? variation : 'No SMIB',
        sasGross: hasRelayId
          ? hasNoSasData
            ? 'No SAS Data'
            : adjustedSasGross
          : 'No SMIB',
        meterGross,
        sasStartTime: machine.sasStartTime || null,
        sasEndTime: machine.sasEndTime || null,
      });
    }

    // ============================================================================
    // STEP 7: Return variation data and total variance
    // ============================================================================
    const hasVariations = machineVariations.some(
      m =>
        typeof m.variation === 'number' &&
        m.variation !== 0 &&
        Math.abs(m.variation) > 0.1
    );

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/collection-reports/check-variations',
      machines.length,
      user,
      duration
    );

    return createSuccessResponse<CheckVariationsResponse>(
      {
        hasVariations,
        totalVariation,
        machines: machineVariations,
      },
      'Variation check completed'
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logRouteError(
      functionName,
      'POST',
      '/api/collection-reports/check-variations',
      errorMessage,
      user
    );
    console.error('[API] check-variations error:', error);
    return createErrorResponse(
      'Failed to check variations',
      500,
      'CHECK_VARIATIONS_ERROR',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
